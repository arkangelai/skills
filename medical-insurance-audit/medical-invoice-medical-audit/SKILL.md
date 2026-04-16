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

5. **Build and publish `medical_audit`.**

   Findings are **item-keyed** (one entry per audited line item, including conformes), with the rule that detected the issue nested under `rule_ids`:
   ```json
   {
     "audit_type": "medical",
     "score": <int>,
     "zona": "verde|amarilla|roja",
     "opinion": "<2-3 line clinical summary>",
     "findings": [
       {
         "item": 4,
         "codigo_cups": "M00102",
         "hallazgo": "glosa",
         "causal": "Pertinencia",
         "valor_facturado": 1800000,
         "valor_objetado": 1060000,
         "valor_a_reconocer": 740000,
         "rule_ids": ["MED.14", "MED.15"],
         "severidad": "critica",
         "peso": 3,
         "resultado": "fail",
         "motivo": "Remifentanilo seleccionado sin justificacion frente a alternativa de primera linea (fentanilo)",
         "evidencia": "epicrisis.pdf p.4 'EVOLUCION CLINICA': sin nota de justificacion para remifentanilo; GPC anestesia: fentanilo es primera linea para procedimientos ambulatorios.",
         "nota": "Pertinence flag: cheaper PBS alternative not used"
       },
       {
         "item": 5,
         "codigo_cups": "D08004",
         "hallazgo": "conforme",
         "causal": null,
         "valor_facturado": 380000,
         "valor_objetado": 0,
         "valor_a_reconocer": 380000,
         "rule_ids": [],
         "resultado": "pass"
       }
     ]
   }
   ```

   **Causal vocabulary** (Sura strict 6-set): `Facturacion | Tarifas | Soportes | Autorizacion | Cobertura | Pertinencia`. Map MED.* rules:
   - MED.01–MED.06 (CIE-10, GPC adherence) → `Pertinencia`
   - MED.07–MED.09 (orden medica, RETHUS, prescription) → `Soportes`
   - MED.10, MED.13 (procedure indication, quantity) → `Pertinencia`
   - MED.11–MED.12 (operative note, consent) → `Soportes`
   - MED.14–MED.15, MED.17 (medication pertinence, dose, supply proportionality) → `Pertinencia`
   - MED.16 (administration record) → `Soportes`
   - MED.18 (non-PBS without authorization) → `Cobertura`
   - MED.19–MED.21 (diagnostic aid pertinence) → `Pertinencia`
   - MED.22–MED.25 (admission, stay, interconsult) → `Pertinencia`
   - MED.26–MED.29 (epicrisis, discharge) → `Soportes`

   **Always emit a finding for every billed item**, including passes (`hallazgo="conforme"`, `valor_objetado=0`, `causal=null`).

   **Match items by `codigo_cups` first**, item index as tiebreaker.

   **Missing-attachment / catalog handling.** If a rule needs the GPC catalog or RETHUS lookup and ref_data is absent, emit `resultado="conditional"` -- never hallucinate.

   **Multi-causal per item.** A single item may carry both a Pertinencia finding (e.g. unjustified medication) and a Soportes finding (e.g. missing administration record). Emit one entry per (item, causal) pair.

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

- `GET /cases/{case_id}/audits?type=medical` returns exactly 1 record.
- The `findings[]` array has **one entry per invoice item** (conformes included).
- Every finding with `hallazgo="glosa"` has both `causal` (from the strict 6-set) and `codigo_cups` matching an item in the invoice.
- Every finding with `resultado=fail` has `evidencia` referencing a specific file and location.
- Per item: `valor_a_reconocer + valor_objetado == item.total_price`.
- For every `item_cups`: `Σ valor_objetado ≤ item.total_price`.
- Multi-causal per item allowed (e.g. one Pertinencia + one Soportes); same-causal duplicates are not.
- All 29 rules represented (in `rule_ids` of relevant findings; rules that pass for all items are reflected via the conforme entries).
- Weighted sum matches `score`.
- If `zona=roja`, at least one critical rule failed OR score ≥16.
- The skill did NOT read `admin_audit` nor `financial_audit` (independence).
- If HC OCR failed or GPC/RETHUS catalog is absent, findings affected emit `resultado=conditional` (never hallucinate).

## References

- GPC MinSalud — guidelines per pathology (https://www.minsalud.gov.co/salud/publica/PET/Paginas/Guias-de-Practica-Clinica.aspx).
- Resolución 1995/1999 — clinical history.
- MIPRES regulation — non-PBS prescription.
- RETHUS — registry of health professionals.
- Issue [arkangelai/audit-workflow#52](https://github.com/arkangelai/audit-workflow/issues/52).
