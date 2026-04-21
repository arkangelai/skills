---
name: medical-invoice-medical-audit
description: Runs the clinical-pertinence audit of a Colombian medical invoice (valid CIE-10 diagnosis, adherence to MinSalud Guías de Práctica Clínica, signed medical order with RETHUS-registered professional, procedures with indication and operative note, medications with correct dose/duration, justified diagnostic aids, inpatient stay with admission criteria and daily progress, and epicrisis with discharge plan). Publishes findings with citations to the clinical history in the destination software. Use it when the user asks to audit the clinical side of a case, review procedure pertinence, or run the medical sub-agent of the pipeline.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, clinical, gpc, cie10, rethus, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: DEST_SOFTWARE_BASE_URL
    prompt: Base URL of the destination software
    required_for: full functionality
  - name: DEST_SOFTWARE_API_KEY
    prompt: API key / bearer token
    required_for: full functionality
  - name: REF_DATA_PATH
    prompt: Folder with gpc_resumidas.json, rethus_snapshot.json, mipres_catalog.json
    required_for: full functionality
---

# medical-invoice-medical-audit

Medical sub-agent of the pipeline. Evaluates **~29 PERT-CLIN rules** on clinical pertinence against the MinSalud clinical guidelines. Runs independently of the admin and financial auditors.

The question it answers: **was what was billed clinically necessary, appropriate, and documented per the GPC?** It does not evaluate tariff or documentary formality — that belongs to the other two.

## When to Use

- The orchestrator dispatches the **clinical** leg of a case.
- The user asks "audit pertinence for invoice {RAD}" or "run the medical-auditor on case X".
- Re-auditing a case with doubtful clinical findings after human-review.
- Evaluating pertinence before authorizing a non-PBS service (preventive use).

**Do not use:** if the case does not have HC or epicrisis attached; if `medical_audit` is already published and a re-audit was not requested.

## Input Contract

**Template:** same `metadata_input.json` shape as admin-audit — see `../medical-invoice-gmail-intake/metadata_input.json`.

Additionally the skill resolves the applicable GPC before running rules:
1. Extracts `diagnostico_principal` (CIE-10) from `factura.pdf`.
2. Looks up the CIE-10 in `guias-clinicas/INDEX.md` (this skill's directory) to find the applicable GPC file.
3. Loads `guias-clinicas/{gpc_file}.md` for criteria, indications, and standard of care.
4. If no GPC matches → `meta.gpc_aplicada = null`, M04 → `n/a`, `concepto_final = ESCALAR_HUMANO`.

## Output Contract

**Template:** `checklist_base.json` in this directory — PERT-CLIN instrument, 29 rules (M01–M29). See `checklist_base.md` for rule descriptions and evidence requirements.

Load the template and fill every rule's nullable fields:
- `resultado`: `"pass" | "fail" | "n/a"`
- `evidencia`: `"{file} p.{N}[, section X][, line Y]: <literal quote>"` — use absence format when not found
- `confianza`: float 0.0–1.0
- `glosa_sugerida`: object (only when `resultado = "fail"`), else `null`

Then fill `meta` and append `cierre`:

```json
{
  "meta": { "caso_id": "...", "fecha_auditoria": "...", "agente": "agente-medico-v1", "gpc_aplicada": "<GPC filename or null>" },
  "cierre": {
    "score_total": 100.0,
    "concepto_final": "APTA | NO_APTA | DEVOLUCION | ESCALAR_HUMANO",
    "clasificacion": "Clinico",
    "accion_requerida": "Ninguna | Correccion | Complemento | Rechazo | Escalar",
    "resumen_ejecutivo": "<2-3 oraciones con GPC referenciada>"
  }
}
```

Publish to `POST /cases/{caso_id}/audits` and return the complete filled checklist.

**`resultado`, `confianza`, and `glosa_sugerida`** follow the same rules as admin-audit. Evidence must cite the clinical document: `"HC ingreso p.3: motivo consulta dolor hipocondrio derecho..."`.

**Absence as evidence:** If looking for an operative note and it is not found after searching the full HC PDF by content keywords (`NOTA OPERATORIA`, `DESCRIPCIÓN QUIRÚRGICA`), the evidence must state: `"HC pp.1-40: no se encontro nota operatoria para CUPS {X}"`.

**`concepto_final` specifics:**
- M06 (`fail`) → always `ESCALAR_HUMANO` (GPC deviation without justification requires human clinical judgment).
- HC OCR failure → single `conditional` finding, abort remaining rules, `ESCALAR_HUMANO`.

**`glosa_sugerida` shape (only when `resultado = fail`):**
```json
{
  "causal_num": "1 | 2 | 3 | 4 | 5 | 6 | 7",
  "causal_nombre": "<nombre causal Res. 3047 Anexo 6>",
  "texto": "<1-2 oraciones con cita de HC y regla GPC>",
  "valor_glosado": 0,
  "moneda": "COP"
}
```

## Procedure

1. **Read the case and clinical attachments.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
   ```
   Download: `clinical_history`, `epicrisis`, `operative_note` (if there is a surgical CUPS), `orden_medica`, `consentimiento_informado`, `administracion_medicamentos`, `interconsultas`.

2. **Load clinical ref_data.**
   - `$REF_DATA_PATH/gpc_resumidas.json` — pertinence rules per CIE-10.
   - `$REF_DATA_PATH/rethus_snapshot.json` — registered professionals.
   - `$REF_DATA_PATH/mipres_catalog.json` — authorizable non-PBS medications.

3. **Extract structured clinical data.**
   - `diagnostico_principal` (CIE-10 + description) and secondaries.
   - `procedimientos_realizados[]` (CUPS + date + professional).
   - `medicamentos_administrados[]` (CUM + dose + duration + route).
   - `ayudas_diagnosticas[]` (CUPS + result + impact on plan).
   - `estancia[]` (admission, daily progress notes, discharge).
   - `epicrisis` (discharge plan, recommendations, alarm signs).

4. **Run the PERT-CLIN checklist.**

   ### Group A — Diagnosis (Weight 3, critical)
   - **MED.01** Main CIE-10 code is **valid** (exists in the current catalog and has the minimum specificity — e.g. `K35` is invalid, must be `K35.0`, `K35.2`, etc.).
   - **MED.02** Main CIE-10 is **documented** in the HC with clinical criteria (not just the code).
   - **MED.03** Secondary diagnoses related or justified.

   ### Group B — GPC adherence (Weight 3, critical)
   - **MED.04** Management (procedures, medications, aids) matches the current GPC for the CIE-10 (`gpc_resumidas.json`).
   - **MED.05** Any deviation from the GPC is **explicitly justified** in the HC with clinical reasoning.
   - **MED.06** No underuse (omission of standard of care) nor overuse (unsupported interventions).

   ### Group C — Medical order (Weight 3, critical)
   - **MED.07** Medical order with signature + date + time.
   - **MED.08** Professional with current RETHUS registration for the required specialty.
   - **MED.09** CUPS + dose + route + frequency + duration specific (no generic orders).

   ### Group D — Procedure pertinence (Weight 3, critical)
   - **MED.10** Clear clinical indication documented for each CUPS.
   - **MED.11** Complete operative note (pre/post diagnosis, findings, technique, time, incidents, surgeon + assistants).
   - **MED.12** Procedure-specific informed consent, signed beforehand.
   - **MED.13** Billed quantity matches what is documented in operative notes.

   ### Group E — Medications (Weight 3, critical)
   - **MED.14** Appropriate indication for the diagnosis (per GPC).
   - **MED.15** Correct dose/route/frequency/duration per clinical standard.
   - **MED.16** Complete administration record (date, time, dose, responsible professional).
   - **MED.17** Supplies proportional to the procedure (no more gauze/syringes than reasonable).
   - **MED.18** Non-PBS with current MIPRES and explicit justification.

   ### Group F — Diagnostic aids (Weight 2, major)
   - **MED.19** Each aid has a clear diagnostic intent in the HC.
   - **MED.20** Result incorporated into the management plan.
   - **MED.21** No unjustified duplication (same study repeated without cause).

   ### Group G — Inpatient stay and consults (Weight 2/3)
   - **MED.22** Admission criterion documented (GPC or scale such as APACHE/NEWS).
   - **MED.23** Daily progress justifies continued stay (no "waiting for a bed" days).
   - **MED.24** Timely discharge when criteria are met.
   - **MED.25** Interconsultations with indication + documented response.

   ### Group H — Epicrisis and continuity (Weight 2, major)
   - **MED.26** Complete epicrisis (summary, discharge plan, recommendations, alarm signs).
   - **MED.27** Discharge prescription consistent with inpatient care.
   - **MED.28** Referral/counter-referral with documented response.
   - **MED.29** Clinical outcome documented (success, complications, readmissions, adverse events).

5. **Build and publish `medical_audit`.** Same shape as `admin_audit`:
   ```json
   {
     "audit_type": "medical",
     "score": <>,
     "zona": "verde|amarilla|roja",
     "opinion": "<2-3 line clinical summary>",
     "findings": [
       {
         "rule_id": "MED.11",
         "severidad": "critica",
         "peso": 3,
         "resultado": "fail",
         "evidencia": "HC p.12: no operative note for CUPS 471001 (colecistectomy) billed on 2026-03-10",
         "valor_objetado": 850000,
         "nota": "Surgical procedure without operative note — Res. 1995 requirement"
       }
     ]
   }
   ```
   Publish via `POST /cases/{case_id}/audits` plus each finding individually.

6. **Mandatory evidence citation.**
   - Format: `{file} p.{N}[, section "X"][, line "Y"]`.
   - Quote literal text when specific.
   - If the evidence is absence: `"HC pp.1-40: no operative note found for {CUPS}"`.

## Pitfalls

- **Symptom:** MED.01 flags a valid CIE-10 as invalid. **Cause:** outdated CIE-10 catalog (latest 2026 vs. local 2024). **Fix:** update catalog and retry; meanwhile use `resultado=conditional`.
- **Symptom:** MED.04 false positives — reports "non GPC-adherent" for a legitimate edge case. **Cause:** `gpc_resumidas.json` does not capture exceptions. **Fix:** if the HC explicitly mentions an accepted exception criterion, mark `resultado=pass` with note; otherwise `conditional` and escalate.
- **Symptom:** MED.11 reports missing operative note when it is present. **Cause:** the note is embedded inside the main HC PDF, not a separate attachment. **Fix:** search by content ("NOTA OPERATORIA", "DESCRIPCIÓN QUIRÚRGICA") across the full HC PDF, not by filename.
- **Symptom:** MED.08 flags a valid RETHUS professional. **Cause:** RETHUS snapshot stale (weekly). **Fix:** same pattern — `conditional` + note requesting online validation.
- **Symptom:** MED.18 denies a non-PBS with a valid MIPRES. **Cause:** MIPRES is in the authorization attachment but not in the structured field. **Fix:** also parse authorization PDFs looking for a MIPRES number.
- **Symptom:** MED.23 flags an unjustified inpatient day that actually had a criterion (waiting for intervention). **Cause:** justification is in nursing notes, not the medical record. **Fix:** consider nursing notes when evaluating stay.
- **Symptom:** many simultaneous critical findings, exploded `score`. **Cause:** HC PDF parsing (OCR) failed. **Fix:** before publishing, check that the extracted HC text has >N words; otherwise emit a single `conditional` finding asking for re-OCR.

## Verification

- `GET /cases/{case_id}/audits?type=medical` returns exactly 1 record with 29 evaluated rules.
- Every finding with `resultado=fail` has `evidencia` referencing a specific file and location.
- Weighted sum matches `score`.
- If `zona=roja`, at least one critical rule failed OR score ≥16.
- The skill did NOT read `admin_audit` nor `financial_audit` (independence).
- If HC OCR failed, there is exactly one `conditional` finding and the skill aborted the rest of the evaluation.

## References

- GPC MinSalud — guidelines per pathology (https://www.minsalud.gov.co/salud/publica/PET/Paginas/Guias-de-Practica-Clinica.aspx).
- Resolución 1995/1999 — clinical history.
- MIPRES regulation — non-PBS prescription.
- RETHUS — registry of health professionals.
- Issue [arkangelai/audit-workflow#52](https://github.com/arkangelai/audit-workflow/issues/52).
