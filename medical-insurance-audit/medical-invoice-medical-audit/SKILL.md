---
name: medical-invoice-medical-audit
description: Runs the clinical-pertinence audit of a Colombian medical invoice (valid CIE-10 diagnosis, adherence to MinSalud Guías de Práctica Clínica, signed medical order with RETHUS-registered professional, procedures with indication and operative note, medications with correct dose/duration, justified diagnostic aids, inpatient stay with admission criteria and daily progress, and epicrisis with discharge plan). Generates medical_checklist_output.json with findings cited to the clinical history. Use it when the user asks to audit the clinical side of a case, review procedure pertinence, or run the medical sub-agent of the pipeline.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, clinical, gpc, cie10, rethus, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
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
4. If no GPC matches → `meta.gpc_aplicada = "n/a"`. Set rules M04, M06, M10, M14, M19, M22 to `resultado = "n/a"`. Audit continues normally — do not escalate solely because no GPC was found.

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
  "meta": { "caso_id": "...", "fecha_auditoria": "...", "agente": "agente-medico-v1", "gpc_aplicada": "<GPC filename or \"n/a\">" },
  "cierre": {
    "score_total": null,
    "concepto_final": "APTA | NO_APTA",
    "en_devolucion": false,
    "clasificacion": "Clinico",
    "accion_requerida": "Correccion | Rechazo | null",
    "resumen_ejecutivo": "<1-2 oraciones con GPC referenciada>"
  }
}
```

Generate `medical_checklist_output.json` from scratch using `checklist_base.json` as the schema template. Fill every rule. Return the complete filled checklist.

**`resultado`, `confianza`, and `glosa_sugerida`** follow the same rules as admin-audit. Evidence must cite the clinical document: `"HC ingreso p.3: motivo consulta dolor hipocondrio derecho..."`.

**Absence as evidence:** If looking for an operative note and it is not found after searching the full HC PDF by content keywords (`NOTA OPERATORIA`, `DESCRIPCIÓN QUIRÚRGICA`), the evidence must state: `"HC pp.1-40: no se encontro nota operatoria para CUPS {X}"`.

**`concepto_final` and `en_devolucion` decision logic:**
- `NO_APTA`: any rule with `resultado = "fail"` (positive evidence of clinical violation) that is not subsanable.
- `DEVOLUCION`: any rule with `resultado = "fail"` that is subsanable by the IPS submitting additional documents or corrections.
- `APTA`: all applicable rules have `resultado = "pass"` or `"n/a"`. Rules with `"n/a"` due to missing clinical information are observations — they do NOT prevent an APTA verdict.
- `en_devolucion = true`: any `critica` fail (positive evidence) subsanable by document resubmission — takes priority even when glosas also exist.
- `accion_requerida = "Rechazo"`: when `en_devolucion = true`.
- `accion_requerida = "Correccion"`: when `en_devolucion = false` and glosas exist.
- `accion_requerida = null`: when `concepto_final = APTA`.
- M06 (`fail` with positive evidence of GPC deviation) → `concepto_final = NO_APTA`; if clinical justification is absent from all documents, set `en_devolucion = true`.
- HC OCR failure → emit a single finding noting OCR quality issues, evaluate remaining rules with reduced confidence, note uncertainty in `resumen_ejecutivo`.
- Note: `ESCALAR_HUMANO` is no longer a valid concepto_final value. Rules with low confidence (`confianza < 0.75`) should still render a verdict and add an observation noting the low confidence.

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

1. **Load inputs.**
   Read `metadata_input.json` from the working directory. Read `case_evidence.json` (produced by Step 0 document-understanding skill) for pre-classified documents and extracted clinical facts.
   
   Load ALL files listed in `documentos[]` regardless of filename or extension. Use `case_evidence.json.clasificacion_documentos` to understand what each file contains. Do NOT search for files by document type name — the same clinical information may appear in an epicrisis, a combined HC PDF, or distributed across multiple documents.
   
   Use `case_evidence.json.disponibilidad_informacion` to determine what clinical information is available before evaluating rules. If information is not available, the corresponding rule becomes an observation (`resultado: "n/a"` with explanatory `observaciones`), not a fail.
   
   If `case_evidence.json` is not present, fall back to reading all files directly and classifying by content.

2. **Load clinical ref_data.**
   - `guias-clinicas/INDEX.md` + `guias-clinicas/{gpc}.md` — CIE-10 → GPC routing and full clinical criteria.

   `guias-clinicas/INDEX.md` MUST be loaded before running any rule. If the CIE-10 maps to a GPC file, that file MUST be loaded before running M04, M06, M10, M14, M19, M22. If no match is found, set `gpc_aplicada = "n/a"` and mark those rules `n/a`.

3. **Extract structured clinical data.**
   - `diagnostico_principal` (CIE-10 + description) and secondaries.
   - `procedimientos_realizados[]` (CUPS + date + professional).
   - `medicamentos_administrados[]` (CUM + dose + duration + route).
   - `ayudas_diagnosticas[]` (CUPS + result + impact on plan).
   - `estancia[]` (admission, daily progress notes, discharge).
   - `epicrisis` (discharge plan, recommendations, alarm signs).

4. **Run the PERT-CLIN rule checklist.**

   Load `checklist_base.json` (29 rules M01–M29) and follow `checklist_base.md` for each rule. Fill the four nullable fields per `checklist_base.md §2.3`:

   - **`resultado`**: `"pass"` · `"fail"` · `"n/a"`
     - `"pass"` — the clinical information required by this rule was found and satisfies the criteria.
     - `"fail"` — POSITIVE EVIDENCE of a clinical violation (e.g., procedure contradicts GPC, medication dose is wrong per evidence in the documents, documented clinical trajectory doesn't justify the stay). NEVER mark `"fail"` because a document type is absent.
     - `"n/a"` — the rule structurally does not apply (e.g. M11 for non-surgical CUPS), OR the clinical information needed to evaluate this rule is not available in any document and there is no evidence of a clinical violation. `observaciones` must explain what was searched for and not found.
     
     **Information over documents:** If the epicrisis contains the clinical information that a "complete HC" would contain (admission diagnosis, clinical trajectory, procedures, medications, discharge), evaluate rules against that information. Do not fail a rule because the information comes from an epicrisis instead of a standalone historia clinica document.
   - **`evidencia`**: unified format — `{file} [p.{page}] ["{quoted_text}"] [calc: {formula}]`. Reference the loaded GPC for rules M04, M06, M10, M14, M19, M22. Examples:
     - `HC p.5 "BNP 380 pg/mL en descenso. Se continúa furosemida IV" [calc: criterio estancia GPC_falla_cardiaca §3.2 cumplido]`.
     - `Ecocardiograma 2026-04-09 "FEVI 32%" [calc: consistente con GPC_falla_cardiaca §2 criterios Framingham]`.
     - Absence: `HC pp.1-40 "no se encontró nota operatoria para CUPS {X} (búsqueda: NOTA OPERATORIA, DESCRIPCIÓN QUIRÚRGICA)"`.
   - **`observaciones`**: mandatory for every rule — state explicitly why the rule is `pass`, `fail`, or `n/a` using the actual clinical evidence found. `pass`: cite the document and section that confirms the criterion is met (e.g. `"HC evolución 2026-04-10: BNP 380 pg/mL — criterio de estancia GPC_falla_cardiaca §3.2 cumplido"`). `fail`: cite the specific deficiency and its location (e.g. `"HC pp.1-40: no se encontró nota de evolución diaria para los días 2026-04-11 y 2026-04-12 — M23 incumplido"`). `n/a`: explain structurally why the rule cannot apply (e.g. `"No hay CUPS quirúrgicos en la factura — M11 nota operatoria no aplica"`). Vague phrases ("cumple", "no aplica", "se verifica") with no citation are invalid.
   - **`confianza`**: per scale in `checklist_base.md §2.3` — `0.90+` for unambiguous GPC-aligned evidence, `<0.75` on a critical rule → emit best-guess verdict and document uncertainty in `resumen_ejecutivo`.
   - **`glosa_sugerida`**: fill only when `resultado = "fail"`. Use causal map in `checklist_base.md §7`. Causales frecuentes: 3 (soportes), 4 (autorización), 6 (pertinencia).

   Special handling:
   - **M06 (GPC deviation):** If the agent finds positive evidence that a procedure deviates from the applicable GPC AND no justification is documented in any available clinical document, mark `resultado = "fail"`. If the agent cannot determine GPC alignment because clinical documentation is insufficient, mark `resultado = "n/a"` with an observation explaining what clinical information would be needed. Do NOT mark `"fail"` solely because the justification document is missing.
   - **HC OCR failure** → emit a single `conditional` finding noting OCR quality issues and evaluate remaining rules with reduced confidence. Do not abort all rules.

   See `checklist_base.md §6` for filled pass/fail examples (including M18 non-PBS without MIPRES).

5. **Compute `cierre` and publish the checklist.**

   Once all rules are filled, compute and append `cierre` per `checklist_base.md §2.4` and §4:
   - `concepto_final` — follow rule-based decision logic in `checklist_base.md §4`. Key overrides: M06 fail → `NO_APTA` (set `en_devolucion = true` if HC justification absent); any critical with `confianza < 0.75` → emit best-guess verdict and document uncertainty in `resumen_ejecutivo`.
   - `clasificacion`: `"Clinico"`.
   - `resumen_ejecutivo`: 1–2 sentences referencing the GPC applied and any critical finding.

   Generate `medical_checklist_output.json` from scratch and write to the working directory.

6. **Mandatory evidence citation.**
   - Format: `{file} p.{N}[, section "X"][, line "Y"]`.
   - Quote literal text when specific.
   - If the evidence is absence: `"HC pp.1-40: no operative note found for {CUPS}"`.

## Pitfalls

- **Symptom:** M01 flags a valid CIE-10 as invalid. **Cause:** outdated CIE-10 catalog (latest 2026 vs. local 2024). **Fix:** update catalog and retry; meanwhile use `resultado=conditional`.
- **Symptom:** M04 false positives — reports "non GPC-adherent" for a legitimate edge case. **Cause:** the loaded GPC does not capture all accepted exceptions. **Fix:** if the HC explicitly mentions an accepted exception criterion, mark `resultado=pass` with note; otherwise `conditional` and escalate.
- **Symptom:** M11 reports missing operative note when it is present. **Cause:** the note is embedded inside the main HC PDF, not a separate attachment. **Fix:** search by content ("NOTA OPERATORIA", "DESCRIPCIÓN QUIRÚRGICA") across the full HC PDF, not by filename.
- **Symptom:** M08 flags a valid RETHUS professional. **Cause:** professional is registered but not found in available documents. **Fix:** set `resultado=conditional` and request online RETHUS validation.
- **Symptom:** M18 denies a non-PBS with a valid MIPRES. **Cause:** MIPRES is in the authorization attachment but not in the structured field. **Fix:** also parse authorization PDFs looking for a MIPRES number.
- **Symptom:** M23 flags an unjustified inpatient day that actually had a criterion (waiting for intervention). **Cause:** justification is in nursing notes, not the medical record. **Fix:** consider nursing notes when evaluating stay.
- **Symptom:** many simultaneous critical findings, exploded `score`. **Cause:** HC PDF parsing (OCR) failed. **Fix:** before publishing, check that the extracted HC text has >N words; otherwise emit a single `conditional` finding asking for re-OCR.

## Verification

- `medical_checklist_output.json` exists in the working directory and contains exactly 1 record with 29 evaluated rules.
- Every finding with `resultado=fail` has `evidencia` referencing a specific file and location.
- If `concepto_final ≠ APTA`, at least one rule has `resultado=fail`; uncertainty (`confianza < 0.75` on a critical rule) is expressed in `resumen_ejecutivo`, not via a separate verdict value.
- The skill did NOT read `admin_audit` nor `financial_audit` (independence).
- If HC OCR failed, there is exactly one finding documenting the failure, `concepto_final = NO_APTA`, `en_devolucion = true`, and uncertainty is noted in `resumen_ejecutivo`.

## References

- GPC MinSalud — guidelines per pathology (https://www.minsalud.gov.co/salud/publica/PET/Paginas/Guias-de-Practica-Clinica.aspx).
- Resolución 1995/1999 — clinical history.
- MIPRES regulation — non-PBS prescription.
- RETHUS — registry of health professionals.
- Issue [arkangelai/audit-workflow#52](https://github.com/arkangelai/audit-workflow/issues/52).
