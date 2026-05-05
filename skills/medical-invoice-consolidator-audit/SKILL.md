---
name: medical-invoice-consolidator-audit
description: Consolidates the findings of the three audits (admin, medical, financial) for a Colombian medical invoice, groups failing rules by invoice item, assigns Anexo 6 causales (Res. 3047/2008 codes 1-7) to each finding using severity ranking, and determines concepto_final and en_devolucion by rule-based logic. Use it once the three audits have run and the case must advance to glosa generation or human review.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, consolidator, anexo6, glosa-causales, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
---

# medical-invoice-consolidator-audit

Unifies the outputs of the three sub-auditors (admin + medical + financial), groups failing rules by invoice item without deduplication, assigns Anexo 6 causales (Res. 3047/2008), and determines `concepto_final` and `en_devolucion` for the case.

The question it answers: **given what the three audits found, which findings are real, which causal do they belong to, and is the case APTA, glosada, or in devolucion?**

## When to Use

- The orchestrator finishes the three parallel audits and the case enters state `consolidation`.
- The user asks "consolidate the audits for case {RAD}" or "prepare the case for glosa generation".
- Reconsolidation after a partial re-audit (e.g. only the financial audit was redone).

**Do not use:** if any of the three audits is missing; if the case already has `consolidated_findings` and a reconsolidation was not requested.

## Input Contract

Reads the three filled checklists published by the parallel audit skills:

| Instrumento | Skill | Template shape |
|---|---|---|
| `DAMA-UK` (admin) | `medical-invoice-admin-audit` | `../medical-invoice-admin-audit/checklist_base.json` — 27 rules (A01–A27) |
| `PERT-CLIN` (médico) | `medical-invoice-medical-audit` | `../medical-invoice-medical-audit/checklist_base.json` — 29 rules (M01–M29) |
| `FIN-CTR` (financiero) | `medical-invoice-financial-audit` | `../medical-invoice-financial-audit/checklist_base.json` — 42 rules (F01–F42) |

Read `admin_checklist_output.json`, `medical_checklist_output.json`, and `financial_checklist_output.json` from the working directory. Validate all three `instrumento` values are present; abort if any file is missing or its `instrumento` field is wrong.

Also reads `factura.pdf` directly to populate the `factura` block in the output. The `factura` block is **never copied from `metadata_input.json`** — fields like `paciente_nombre`, `paciente_documento`, `diagnostico_principal`, and `total_facturado` come from the invoice document, not from the filing envelope.

## Output Contract

**Template:** `references/output_template.json` — canonical structure for `hallazgos[]` (per CUPS item) and `resumen`. See `references/output_template.md` for detailed field-by-field specifications.

The skill produces the canonical `output.json` — single source of truth for the glosa generator and Gmail sender. Generate from scratch using `references/output_template.json` as the schema reference. Write to the working directory.

**`hallazgo` values (item level):**
- `conforme`: all layers passed for this item. `capa`, `regla_aplicada`, `severidad`, `glosa_sugerida` are all `null`; `valor_objetado = 0`.
- `glosa`: formal objection with evidence; `valor_objetado > 0`, `glosa_sugerida` populated.

`devolucion` does not exist as an item-level hallazgo value — it is expressed via `resumen.en_devolucion = true` at the case level.

**New: `observaciones` array (case-level):**

The output now includes an `observaciones` array alongside `hallazgos`. This array contains rules that could not be evaluated due to missing information (`resultado = "n/a"` where the reason is missing documents or inaccessible external systems, not structural inapplicability).

```json
{
  "hallazgos": [ /* items with hallazgo="conforme" or hallazgo="glosa" — only rules with resultado="pass" or "fail" */ ],
  "observaciones": [
    {
      "regla": "A16",
      "nombre": "Historia clinica completa y firmada",
      "capa": "administrativo",
      "motivo": "No se encontro historia clinica de ingreso completa. La informacion clinica disponible proviene de epicrisis.pdf y nota_quirurgica.pdf. No se detecto violacion.",
      "informacion_buscada": "Notas de ingreso con anamnesis y examen fisico completo",
      "documentos_revisados": ["epicrisis.pdf", "nota_quirurgica.pdf", "kardex_medicamentos.txt"],
      "impacto_en_veredicto": "ninguno — observacion informativa"
    }
  ],
  "resumen": { /* concepto_final computed ONLY from hallazgos, NOT from observaciones */ }
}
```

Observations do NOT affect `concepto_final`, `total_glosado`, `tasa_objecion`, or any aggregate metric. They are informational items for the human auditor to optionally investigate.

**`regla_aplicada`**: single string ID of the most severe rule that triggered the hallazgo (not an array).

**`valor_objetado`**: the per-item objected amount (replaces any reference to `valor_glosado` per item).

**`resumen` fields:**
- `en_devolucion`: boolean — always present, never null.
- `total_aprobado` (replaces `total_a_pagar`).
- `resumen_ejecutivo`: 1–2 sentences for the dashboard.
- Removed: `num_devoluciones`, `zona`, `label`, `tags`, `status`, `confianza_global`.

**Money invariant:** `total_aprobado + total_glosado = total_facturado` always. Per item, `valor_a_reconocer = valor_facturado − valor_objetado`.

**`concepto_final` and `en_devolucion` decision logic:**

Count ONLY rules with `resultado = "fail"` (positive evidence of violation) toward the verdict. Rules with `resultado = "n/a"` (including those due to missing information) are listed in `observaciones` and do NOT affect the verdict.

1. `NO_APTA + accion_requerida="Rechazo"` — any rule with `resultado = "fail"` (positive evidence) that is not subsanable (e.g. confirmed expired contract, confirmed patient not covered, confirmed clinical violation without possible correction).
2. `NO_APTA + accion_requerida="Complemento" + en_devolucion=true` — any rule with `resultado = "fail"` that is subsanable by the IPS submitting corrections (e.g. wrong tariff applied, fixable billing error, missing signature on a document that IS present).
3. `APTA + accion_requerida=null` — all rules have `resultado = "pass"` or `"n/a"`, `tasa_objecion = 0.0`. Observations are listed separately.
4. `APTA + accion_requerida="Correccion"` — some minor glosas exist (non-critical `resultado = "fail"`) but all are partial and subsanable (`tasa_objecion > 0` but no critical fails with positive evidence).

Note: `ESCALAR_HUMANO` is no longer a valid concepto_final. Low-confidence findings are flagged as observations with a note about confidence level.

## Procedure

1. **Load the three audit outputs.**
   Read `admin_checklist_output.json`, `medical_checklist_output.json`, and `financial_checklist_output.json` from the working directory. Validate all three `instrumento` values are present; abort if any file is missing or its `instrumento` field is wrong.

   Read `meta.audit_perspective` from `medical_checklist_output.json` (default: `"aseguradora"` if absent). This value must be propagated to `resumen.audit_perspective` in the final output and governs the framing of `resumen_ejecutivo`.

2. **Separate findings from observations.**
   - Collect every rule with `resultado = "fail"` → these become `hallazgos` (actual findings with positive evidence of violation).
   - Collect every rule with `resultado = "n/a"` WHERE the reason is missing information (not structural inapplicability) → these become `observaciones` (items the human auditor can optionally investigate).
   - Rules with `resultado = "pass"` → these become `conforme` items in `hallazgos`.
   - Rules with `resultado = "n/a"` due to structural inapplicability (e.g., A14 ambulance for non-transport case) → omit from both arrays.

3. **Group findings by invoice item (CUPS + date).**
   No deduplication — all failing rules are preserved. For each invoice item, collect every `rule_id` from every layer that flagged it into `reglas_aplicadas[]`. The detail evidence per rule stays in the individual checklist JSONs; callers read those directly if they need per-rule evidence.

4. **Prioritize findings** in this order:
   - Severity descending: `critica > mayor > menor`.
   - Within the same severity: `valor_glosado` descending.
   - Within the same amount: `confianza` descending.

5. **Assign an Anexo 6 causal to each finding** (Res. 3047 Art. 5):

   | Causal | Name | Typical triggers |
   |---|---|---|
   | **1** | No cobertura contractual | F06 (plan excludes), F22 (pre-existing), A07 (wrong modality) |
   | **2** | No pertinencia clínica | M04–M06 (GPC), M10–M13 (procedures), M14–M15 (medications) |
   | **3** | Documentación incompleta | A08–A11 (authorization/coding), A17–A19 (HC annexes), M11 (operative note), M16 |
   | **4** | Cobro duplicado | F32 (same patient unicidad), F33 (overlap), F38 (unbundling) |
   | **5** | Tarifa incorrecta | F07–F09 (manual/UVB), F13–F16 (liquidation), F23–F25 (copays) |
   | **6** | Agotamiento de cobertura | F20 (caps), F21 (carencia period) |
   | **7** | Genérica / devolución | A12–A14 (support docs), A24 (timeliness), F29–F31 (dates/consecutive) |

   Rules:
   - Use the deterministic mapping table first.
   - If a finding's `reglas_aplicadas[]` maps to multiple causales, pick the most severe by ranking: 4 > 2 > 5 > 1 > 3 > 6 > 7. Ties broken by highest `valor_glosado`.
   - If no mapping applies → set `causal_num = null` and document the unresolved causal in `resumen_ejecutivo`. The task system handles escalation to human review.
   - Assign the **subcausal** if Anexo 6 defines one (e.g. `3.1` clinical documentation, `3.2` administrative documentation).

6. **Compute amounts and flags.**
   - `total_glosado` = Σ `valor_objetado` of glosa items (per item, not per rule — avoid double-counting).
   - `total_aprobado` = `total_facturado − total_glosado`.
   - `tasa_objecion` = `total_glosado / total_facturado × 100` (one decimal).
   - `glosas_por_capa` = sum of `valor_objetado` for glosa items per layer.
   - `en_devolucion` = `true` if any critica fail is subsanable by document resubmission; `false` otherwise.
   - `concepto_final` = per decision logic above.
   - `resumen_ejecutivo` = 1–2 sentences for the dashboard mentioning `concepto_final`, `en_devolucion`, and key findings. **If `audit_perspective = "hospital"`**: frame every finding as an internal action item — use "corrija antes de radicar", "riesgo de glosa causal X", "el pagador objetará si no se corrige". Do not use language that implies the payer has already decided (no "se glosa", no "se rechaza").
   - `audit_perspective` = propagate the value read from `medical_checklist_output.json.meta.audit_perspective`.

7. **Generate output.json.**
   Using `references/output_template.json` as the schema reference, build the consolidated object from scratch. Example shape:
   ```json
   {
     "caso_id": "RAD-20260402-FV08142",
     "factura": {
       "num_factura": "FE-2026-04871",
       "prestador": "Clínica San Rafael",
       "prestador_nit": "800.123.456-7",
       "paciente_nombre": "Juan Pérez",
       "paciente_documento": "CC 52489731",
       "fecha_atencion": "2026-04-01",
       "fecha_factura": "2026-04-10",
       "diagnostico_principal": "K80.1 - Cálculo de la vesícula biliar",
       "plan_afiliado": "PLATA",
       "total_facturado": 8500000
     },
     "hallazgos": [
       {
         "item": 1,
         "codigo_cups": "890201",
         "descripcion": "Consulta especializada",
         "valor_facturado": 1500000,
         "hallazgo": "glosa",
         "capa": "financiero",
         "regla_aplicada": "F13",
         "severidad": "mayor",
         "valor_objetado": 300000,
         "valor_a_reconocer": 1200000,
         "confianza": 0.95,
         "evidencia_requerida": null,
         "glosa_sugerida": {
           "causal_num": "5",
           "causal_nombre": "Tarifa incorrecta",
           "texto": "CUPS 890201: esperado=$1.200.000 (tarifario_contrato_eps_2026.csv); cobrado=$1.500.000; delta=+$300.000 (25%)",
           "valor_glosado": 300000,
           "moneda": "COP"
         }
       }
     ],
     "resumen": {
       "total_facturado": 8500000,
       "total_aprobado": 8200000,
       "total_glosado": 300000,
       "num_items": 4,
       "num_conformes": 3,
       "num_glosas": 1,
       "tasa_objecion": 3.5,
       "glosas_por_capa": { "administrativo": 0, "medico": 0, "financiero": 300000 },
       "concepto_final": "NO_APTA",
       "en_devolucion": false,
       "accion_requerida": "Correccion",
       "audit_perspective": "aseguradora",
       "resumen_ejecutivo": "Factura con 1 glosa financiera (F13 sobretarifa CUPS 890201, $300.000). Concepto NO_APTA con corrección requerida."
     }
   }
   ```
   Write to `output.json` in the working directory.

The `concepto_final` and `en_devolucion` fields drive the app-level workflow. The agent does not set `label`, `status`, or `zona` — those are derived by the task system from the output JSON.

## Pitfalls

- **Symptom:** consolidated `total_glosado` exceeds `invoice_total`. **Cause:** summing `valor_glosado` per rule rather than per item. **Fix:** when totalling, group by invoice item and take one `valor_glosado` per item (from the most severe rule), not the sum across all rules.
- **Symptom:** causal assignment picks wrong causal when multiple rules apply. **Cause:** ranking not applied. **Fix:** always apply severity ranking 4 > 2 > 5 > 1 > 3 > 6 > 7; ties broken by `valor_glosado`.
- **Symptom:** contradictions between auditors go undetected. **Cause:** contradiction check compares only `fail` findings, missing when one says `pass` and another `fail` on the same item. **Fix:** cross by invoice_item as well; if admin passes and financial fails on the same item → document the contradiction in `resumen_ejecutivo`.

## Verification

- `output.json` exists in the working directory and contains the consolidated object.
- Every finding has `causal_num` ∈ `{1,2,3,4,5,6,7}` OR `causal_num = null` (uncertainty documented in `resumen_ejecutivo`).
- `total_glosado ≤ total_facturado`.
- `total_aprobado + total_glosado = total_facturado`.
- `en_devolucion` is a boolean (never null) in the final output.
- `concepto_final` is `APTA` or `NO_APTA` — never `DEVOLUCION` or `ESCALAR_HUMANO`.
- When `en_devolucion = true`, `resumen_ejecutivo` identifies the missing document(s).

## References

- Resolución 3047/2008 — Anexo 6, glosa causales (1-7).
- Decreto 4747/2007 — bilateral glosas.
- Issues [arkangelai/audit-workflow#41](https://github.com/arkangelai/audit-workflow/issues/41) and [#47](https://github.com/arkangelai/audit-workflow/issues/47) (absorbed).
