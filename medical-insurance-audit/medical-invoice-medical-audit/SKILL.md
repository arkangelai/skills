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
- `observaciones`: mandatory per-rule explanation stating explicitly why the rule passed, failed, or does not apply — must cite the specific evidence found (or its absence). Generic phrases such as "se verificó", "cumple", or "no aplica" without justification are invalid.
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

4. **Run the PERT-CLIN rule checklist.**

   Load `checklist_base.json` (29 rules M01–M29) and follow `checklist_base.md` for each rule. Fill the four nullable fields per `checklist_base.md §2.3`:

   - **`resultado`**: `"pass"` · `"fail"` · `"n/a"` — `"n/a"` only when the rule structurally cannot apply (e.g. M11 operative note for a case with no surgical CUPS).
   - **`evidencia`**: specific to the clinical domain. Reference the loaded GPC for rules M04, M06, M10, M14, M19, M22. Examples:
     - `"HC evolución 2026-04-10 08:30: 'BNP 380 pg/mL en descenso. Se continúa furosemida IV.' — criterio de estancia GPC_falla_cardiaca §3.2"`.
     - `"Ecocardiograma 2026-04-09, FEVI 32% — consistente con GPC_falla_cardiaca §2 criterios Framingham"`.
     - Absence: `"HC pp.1-40: no se encontró nota operatoria (búsqueda: 'NOTA OPERATORIA', 'DESCRIPCIÓN QUIRÚRGICA') para CUPS {X}"`.
   - **`observaciones`**: mandatory for every rule — state explicitly why the rule is `pass`, `fail`, or `n/a` using the actual clinical evidence found. `pass`: cite the document and section that confirms the criterion is met (e.g. `"HC evolución 2026-04-10: BNP 380 pg/mL — criterio de estancia GPC_falla_cardiaca §3.2 cumplido"`). `fail`: cite the specific deficiency and its location (e.g. `"HC pp.1-40: no se encontró nota de evolución diaria para los días 2026-04-11 y 2026-04-12 — M09 incumplido"`). `n/a`: explain structurally why the rule cannot apply (e.g. `"No hay CUPS quirúrgicos en la factura — M11 nota operatoria no aplica"`). Vague phrases ("cumple", "no aplica", "se verifica") with no citation are invalid.
   - **`confianza`**: per scale in `checklist_base.md §2.3` — `0.90+` for unambiguous GPC-aligned evidence, `<0.75` forces human escalation.
   - **`glosa_sugerida`**: fill only when `resultado = "fail"`. Use causal map in `checklist_base.md §7`. Causales frecuentes: 3 (soportes), 4 (autorización), 6 (pertinencia).

   Two hard rules regardless of confidence:
   - **M06 `fail` always forces `concepto_final = "ESCALAR_HUMANO"`** — GPC deviation without HC justification requires a human medical auditor.
   - **HC OCR failure** → emit a single `conditional` finding and abort all remaining rules → `ESCALAR_HUMANO`.

   See `checklist_base.md §6` for filled pass/fail examples (including M18 non-PBS without MIPRES).

5. **Compute `cierre` and publish the checklist.**

   Once all rules are filled, compute and append `cierre` per `checklist_base.md §2.4` and §4:
   - `score_total = round(Σ(peso × 1 si pass) / Σ(peso) × 100, 1)` over rules with `resultado ≠ "n/a"`.
   - `concepto_final` — follow decision logic in `checklist_base.md §4`. Key overrides: M06 fail → always `ESCALAR_HUMANO`; any critical with `confianza < 0.75` → `ESCALAR_HUMANO`.
   - `clasificacion`: `"Clinico"`.
   - `resumen_ejecutivo`: 1–2 sentences referencing the GPC applied and any critical finding.

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
