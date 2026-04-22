---
name: medical-invoice-consolidator-audit
description: Consolidates the findings of the three audits (admin, medical, financial) for a Colombian medical invoice, groups failing rules by invoice item, builds per-layer narrative summaries (resumen_por_capa), assigns Anexo 6 causales (Res. 3047/2008 codes 1-7) to each finding using severity ranking, determines the case zone (red/yellow/green) by rule-based logic, and applies workflow labels (auto-approve, needs-human-review, auto-denial, needs-fix-review). Use it once the three audits have run and the case must advance to glosa generation or human review.
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

Unifies the outputs of the three sub-auditors (admin + medical + financial), groups failing rules by invoice item without deduplication, builds per-layer narrative summaries, assigns Anexo 6 causales (Res. 3047/2008), and labels the case for the next step.

The question it answers: **given what the three audits found, which findings are real, which causal do they belong to, and what is the next step (auto-approve, human review, or auto-denial)?**

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

**Template:** `output.json` in this directory — canonical structure for `hallazgos[]` (per CUPS item) and `resumen`. See `output.md` for detailed field-by-field specifications.

The skill produces the canonical `output.json` — single source of truth for the glosa generator and Gmail sender. Generate from scratch using the `output.json` template as the schema reference. Write to the working directory.

**`hallazgo` values (item level):**
- `conforme`: all layers passed for this item. `capa`, `reglas_aplicadas`, `severidad`, `glosa_sugerida` are all `null`; `valor_glosado = 0`.
- `glosa`: formal objection with evidence; `valor_glosado > 0`, `glosa_sugerida` populated.

`"devolucion"` is **case-level only** — expressed via `resumen.concepto_final = "DEVOLUCION"` when a global invalidity condition (e.g. expired contract, patient not affiliated) makes the whole invoice invalid.

**Money invariant:** `total_glosado = sum(hallazgos[].valor_glosado)`. Per item, `valor_a_reconocer = valor_facturado − valor_glosado`.

**`concepto_final` decision logic (evaluated in order; first match wins):**
1. `NO_APTA` + `accion_requerida: "Rechazo"` — any `critica` rule with `resultado = fail` that is not subsanable by document submission (e.g. missing HC entirely, expired contract, patient not covered on service date).
2. `DEVOLUCION` + `accion_requerida: "Complemento"` — any `critica` rule with `resultado = fail` that is subsanable by the IPS submitting additional documents (e.g. missing authorization, missing operative note).
3. `ESCALAR_HUMANO` + `accion_requerida: "Escalar"` — any `critica` rule with `confianza < 0.75`, OR anti-fraud rules F32–F36 with `confianza < 0.9`.
4. `APTA` + `accion_requerida: null` — all rules pass, `tasa_objecion = 0.0`, no devoluciones.
5. `APTA` + `accion_requerida: "Correccion"` — some glosas exist but all are partial and subsanable (`tasa_objecion > 0` but no critical fails).

## Procedure

1. **Load the three audit outputs.**
   Read `admin_checklist_output.json`, `medical_checklist_output.json`, and `financial_checklist_output.json` from the working directory. Validate all three `instrumento` values are present; abort if any file is missing or its `instrumento` field is wrong.

2. **Collect every finding with `resultado=fail` or `conditional`.**
   Ignore `pass` — they do not produce findings for a glosa.

3. **Group findings by invoice item (CUPS + date).**
   No deduplication — all failing rules are preserved. For each invoice item, collect every `rule_id` from every layer that flagged it into `reglas_aplicadas[]`. The detail evidence per rule stays in the individual checklist JSONs; callers read those directly if they need per-rule evidence.

4. **Build per-layer narrative summaries (`resumen_por_capa`).**
   For each of the three layers, write a 1–2 sentence Spanish paragraph summarizing what was found:
   - `administrativo`: e.g. `"2 reglas críticas fallidas (A01, A08): CUV inválido y autorización ausente."`.
   - `medico`: e.g. `"1 regla crítica fallida (M06): desviación de GPC sin justificación clínica."`.
   - `financiero`: e.g. `"3 reglas fallidas (F13, F33, F37): sobretarifa H30103, duplicación y upcoding."`.
   These are the at-a-glance summaries; full evidence is in each checklist JSON.

5. **Prioritize findings** in this order:
   - Severity descending: `critica > mayor > menor`.
   - Within the same severity: `valor_glosado` descending.
   - Within the same amount: `confianza` descending.

6. **Assign an Anexo 6 causal to each finding** (Res. 3047 Art. 5):

   | Causal | Name | Typical triggers |
   |---|---|---|
   | **1** | No cobertura contractual | FIN.06 (plan excludes), FIN.22 (pre-existing), ADMIN.07 (wrong modality) |
   | **2** | No pertinencia clínica | MED.04-06 (GPC), MED.10-13 (procedures), MED.14-15 (medications) |
   | **3** | Documentación incompleta | ADMIN.08-11 (RIPS), ADMIN.17-19 (HC), MED.11 (operative note), MED.16 |
   | **4** | Cobro duplicado | FIN.21 (repeated study), FIN.33 (overlap), FIN.38 (unbundling) |
   | **5** | Tarifa incorrecta | FIN.07-09 (manual/UVB), FIN.13-16 (liquidation), FIN.23-25 (copays) |
   | **6** | Agotamiento de cobertura | FIN.20 (caps), FIN.21 (grace period) |
   | **7** | Genérica / devolución | ADMIN.12-14 (DIAN invoice), ADMIN.24 (timeliness), FIN.29-31 (dates/consecutive) |

   Rules:
   - Use the deterministic mapping table first.
   - If a finding's `reglas_aplicadas[]` maps to multiple causales, pick the most severe by ranking: 4 > 2 > 5 > 1 > 3 > 6 > 7. Ties broken by highest `valor_glosado`.
   - If no mapping applies → set `causal_num = null` AND `concepto_final = ESCALAR_HUMANO`. A human reviewer assigns the causal during fix-review.
   - Assign the **subcausal** if Anexo 6 defines one (e.g. `3.1` clinical documentation, `3.2` administrative documentation).

7. **Compute zone and amounts (rule-based, no score).**
   - `zona`:
     - Red: any `critica` rule with `resultado=fail` (regardless of confidence).
     - Yellow: no critical fails, but ≥1 `mayor` rule with `resultado=fail`.
     - Green: all applicable rules `pass` or only `menor` fails.
   - `total_glosado` = Σ `valor_glosado` of failing findings (per item, not per rule — avoid double-counting the same item).
   - `total_a_pagar` = `invoice_total - total_glosado`.
   - `confianza_global` = weighted average by `peso`.

8. **Generate output.json.**
   Using the `output.json` template as the schema reference, build the consolidated object from scratch. Example shape:
   ```json
   {
     "hallazgos": [
       {
         "item": 1,
         "codigo_cups": "890201",
         "descripcion": "Consulta especializada",
         "valor_facturado": 1500000,
         "hallazgo": "glosa",
         "reglas_aplicadas": ["ADMIN.15", "FIN.20"],
         "severidad": "critica",
         "valor_glosado": 1200000,
         "valor_a_reconocer": 300000,
         "glosa_sugerida": { "causal_num": "6", "causal_nombre": "Agotamiento de cobertura", "texto": "Cupo anual $5M agotado; excedente $1.2M", "valor_glosado": 1200000, "moneda": "COP" },
         "confianza": 0.92
       }
     ],
     "resumen_por_capa": {
       "administrativo": "1 regla crítica fallida (A15): agotamiento de cupo anual.",
       "medico": "Sin hallazgos.",
       "financiero": "1 regla crítica fallida (F20): excede límite de cobertura contractual."
     },
     "resumen": {
       "zona": "roja",
       "confianza_global": 0.92,
       "total_facturado": 8500000,
       "total_glosado": 1200000,
       "total_a_pagar": 7300000,
       "concepto_final": "NO_APTA",
       "accion_requerida": "Rechazo",
       "label": "auto-denial",
       "tags": ["consolidated"],
       "status": "consolidated"
     }
   }
   ```
   Write to `output.json` in the working directory.

9. **Set the workflow label.**

   Decision matrix:

   | Zone | Global confidence | Contradictions between auditors | Label |
   |---|---|---|---|
   | Green | ≥ 0.7 | No | `auto-approve` |
   | Green | < 0.7 | - | `needs-human-review` |
   | Yellow | any | - | `needs-human-review` |
   | Red | ≥ 0.7 | No | `auto-denial` |
   | Red | ≥ 0.7 | Yes (e.g. admin says OK, financial says fraud) | `needs-fix-review` |
   | Red | < 0.7 | - | `needs-human-review` |

   Set `output.json resumen.label` to the determined label. Set `resumen.tags = ["consolidated"]`. Set `resumen.status = "consolidated"`, `resumen.zona`, and `resumen.total_glosado`. Ensure only one mutually exclusive label is set before writing.

## Pitfalls

- **Symptom:** consolidated `total_glosado` exceeds `invoice_total`. **Cause:** summing `valor_glosado` per rule rather than per item. **Fix:** when totalling, group by invoice item and take one `valor_glosado` per item (from the most severe rule), not the sum across all rules.
- **Symptom:** causal assignment picks wrong causal when multiple rules apply. **Cause:** ranking not applied. **Fix:** always apply severity ranking 4 > 2 > 5 > 1 > 3 > 6 > 7; ties broken by `valor_glosado`.
- **Symptom:** yellow zone but a critical rule fails. **Cause:** zone logic evaluated before the critical-rule gate. **Fix:** any critical `fail` ALWAYS forces red zone regardless of other findings.
- **Symptom:** two mutually exclusive labels in `output.json`. **Cause:** previous label not cleared before writing. **Fix:** ensure only one mutually exclusive label is set in `output.json resumen.label` before writing the file.
- **Symptom:** contradictions between auditors go undetected (`needs-fix-review` never fires). **Cause:** contradiction check compares only `fail` findings, missing when one says `pass` and another `fail` on the same item. **Fix:** cross by invoice_item as well; if admin passes and financial fails on the same item → contradiction.

## Verification

- `output.json` exists in the working directory and contains the consolidated object.
- Every finding has `causal_num` ∈ `{1,2,3,4,5,6,7}` OR `causal_num = null` with `concepto_final = ESCALAR_HUMANO`.
- `total_glosado ≤ invoice_total`.
- Exactly one decision label set in `output.json resumen.label` (`auto-approve`, `needs-human-review`, `auto-denial`, `needs-fix-review`).
- If `zona=roja`, label is `auto-denial` or `needs-fix-review`, never `auto-approve`.
- `resumen_por_capa` contains a non-empty string for each of the three layers.
- `output.json resumen.status` is `consolidated`.

## References

- Resolución 3047/2008 — Anexo 6, glosa causales (1-7).
- Decreto 4747/2007 — bilateral glosas.
- Issues [arkangelai/audit-workflow#41](https://github.com/arkangelai/audit-workflow/issues/41) and [#47](https://github.com/arkangelai/audit-workflow/issues/47) (absorbed).
