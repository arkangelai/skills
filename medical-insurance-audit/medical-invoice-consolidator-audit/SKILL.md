---
name: medical-invoice-consolidator-audit
description: Consolidates the findings of the three audits (admin, medical, financial) for a Colombian medical invoice, deduplicates redundant findings across auditors, prioritizes by severity and disputed amount, computes a global confidence score, assigns Anexo 6 causales (Res. 3047/2008 codes 1-7 with subcausales) to each finding, determines the case zone (green/yellow/red), and applies workflow labels (auto-approve, needs-human-review, auto-denial, needs-fix-review) in the destination software. Use it once the three audits have run and the case must advance to glosa generation or human review.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, consolidator, anexo6, glosa-causales, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: DEST_SOFTWARE_BASE_URL
    prompt: Base URL of the destination software
    required_for: full functionality
  - name: DEST_SOFTWARE_API_KEY
    prompt: API key / bearer token
    required_for: full functionality
---

# medical-invoice-consolidator-audit

Unifies the outputs of the three sub-auditors (admin + medical + financial), deduplicates redundant findings, assigns Anexo 6 causales (Res. 3047/2008), and labels the case for the next step. Absorbs what was originally a separate `causal-assigner` skill.

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

Fetch via `GET /cases/{case_id}/audits` — validate that all three `instrumento` values are present; abort if any is missing.

Also reads `factura.pdf` directly to populate the `factura` block in the output. The `factura` block is **never copied from `metadata_input.json`** — fields like `paciente_nombre`, `paciente_documento`, `diagnostico_principal`, and `total_facturado` come from the invoice document, not from the filing envelope.

## Output Contract

**Template:** `output.json` in this directory — canonical structure for `hallazgos[]` (per CUPS item) and `resumen`. See `output.md` for detailed field-by-field specifications.

The skill produces the canonical `output.json` — single source of truth for the glosa generator and Gmail sender. Publish to `POST /cases/{caso_id}/consolidated` and persist as `output.json`.

**`hallazgo` values:**
- `conforme`: all three layers passed for this item. `capa`, `regla_aplicada`, `severidad`, `glosa_sugerida` are all `null`; `valor_objetado = 0`.
- `glosa`: formal objection with evidence; `valor_objetado > 0`, `glosa_sugerida` populated.
- `devolucion`: formal defect subsanable by document submission; `valor_objetado = 0` until the IPS responds.

**Money invariant:** `total_glosado = sum(hallazgos[].valor_objetado)`. Per item, `valor_a_reconocer = valor_facturado − valor_objetado`. Never double-count: when a rule from multiple layers flags the same item, take `max(valor_glosado)` per item, not the sum.

**`concepto_final` decision logic (evaluated in order; first match wins):**
1. `NO_APTA` + `accion_requerida: "Rechazo"` — any `critica` rule with `resultado = fail` that is not subsanable by document submission (e.g. missing HC entirely, expired contract, patient not covered on service date).
2. `DEVOLUCION` + `accion_requerida: "Complemento"` — any `critica` rule with `resultado = fail` that is subsanable by the IPS submitting additional documents (e.g. missing authorization, missing operative note).
3. `ESCALAR_HUMANO` + `accion_requerida: "Escalar"` — any `critica` rule with `confianza < 0.75`, OR anti-fraud rules F32–F36 with `confianza < 0.9`.
4. `APTA` + `accion_requerida: null` — all rules pass, `tasa_objecion = 0.0`, no devoluciones.
5. `APTA` + `accion_requerida: "Correccion"` — some glosas exist but all are partial and subsanable (`tasa_objecion > 0` but no critical fails).

## Procedure

1. **Read the three audits for the case.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audits
   ```
   Validate that all three `audit_type` values exist: `admin`, `medical`, `financial`. If any is missing, abort and leave a note on the case.

2. **Collect every finding with `resultado=fail` or `conditional`.**
   Ignore `pass` — they do not produce findings for a glosa.

3. **Deduplicate by "root cause".**

   Two findings are duplicates when:
   - They share the same documentary evidence (same file + same section), or
   - They point to the same `invoice_item` (CUPS + quantity + date), or
   - Their semantic description is equivalent (LLM check above a similarity threshold).

   When merging:
   - `rule_ids` = list of every rule_id that detected the same finding (e.g. `["ADMIN.15", "FIN.20"]`).
   - `severidad` = maximum across merged.
   - `peso` = maximum.
   - `valor_objetado` = **maximum, not sum** (do not double-count money).
   - `evidencia` = formatted concatenation with source attribution.
   - `auditores_detectaron` = list (`["admin", "financial"]`).

4. **Compute per-finding confidence** (0–1).
   ```
   confidence = 0.4 × evidence_clarity
              + 0.4 × unanimity (auditors that detected it / 3)
              + 0.2 × citation_quality (exact file+page?)
   ```
   - `evidence_clarity`: 1 if the evidence contains a literal quote, 0.7 for a specific reference, 0.4 if generic.
   - `unanimity`: if 2+ auditors detected it → very high confidence.
   - `citation_quality`: 1 if file+page, 0.5 if file only, 0 if neither.

5. **Prioritize findings** in this order:
   - Severity descending: `critica > mayor > media > baja`.
   - Within the same severity: `valor_objetado` descending.
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
   - If a finding could map to multiple causales, pick the most severe by this ranking: 4 > 2 > 5 > 1 > 3 > 6 > 7.
   - If no mapping applies → mark the finding as `needs-human-review` (do not force a causal).
   - Assign the **subcausal** if Anexo 6 defines one (e.g. `3.1` clinical documentation, `3.2` administrative documentation).

7. **Compute zone and amounts.**
   - `score` = Σ `peso` of deduplicated findings with `resultado=fail`.
   - `zona`:
     - Green: `score ≤ 5` **and** no critical rule fails.
     - Yellow: `score ≤ 15` without criticals, or criticals with low confidence.
     - Red: `score > 15` **or** at least one critical with high confidence.
   - `total_objetado` = Σ `valor_objetado` of failing findings.
   - `total_a_pagar` = `invoice_total - total_objetado`.
   - `confianza_global` = weighted average by `peso`.

8. **Publish the consolidated object.**
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/consolidated
   {
     "consolidated_findings": [
       {
         "finding_id": "fx-001",
         "rule_ids": ["ADMIN.15", "FIN.20"],
         "auditores_detectaron": ["admin", "financial"],
         "severidad": "critica",
         "peso": 3,
         "causal": 6,
         "subcausal": "6.1",
         "valor_objetado": 1200000,
         "confianza": 0.92,
         "evidencia": "autorizacion.pdf: annual cap $5M already consumed; invoice exceeds by $1.2M",
         "justificacion": "Coverage exhaustion per Anexo 6.6.1"
       }
     ],
     "case_summary": {
       "zona": "roja",
       "score": 22,
       "confianza_global": 0.88,
       "total_facturado": 8500000,
       "total_objetado": 3200000,
       "total_a_pagar": 5300000
     }
   }
   ```

9. **Apply workflow labels.**
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/labels
   ```

   Decision matrix:

   | Zone | Global confidence | Contradictions between auditors | Label |
   |---|---|---|---|
   | Green | ≥ 0.7 | No | `auto-approve` |
   | Green | < 0.7 | - | `needs-human-review` |
   | Yellow | any | - | `needs-human-review` |
   | Red | ≥ 0.7 | No | `auto-denial` |
   | Red | ≥ 0.7 | Yes (e.g. admin says OK, financial says fraud) | `needs-fix-review` |
   | Red | < 0.7 | - | `needs-human-review` |

   Always add: `consolidated`.

10. **Update the case status.**
    ```
    PATCH {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
    { "status": "consolidated", "zona": "...", "score": ..., "total_objetado": ... }
    ```

## Pitfalls

- **Symptom:** dedup merges findings that are NOT the same. **Cause:** semantic similarity too loose. **Fix:** require an exact match on at least one of the three criteria (doc evidence, invoice_item, description); do not rely on LLM similarity alone.
- **Symptom:** consolidated `valor_objetado` exceeds `invoice_total`. **Cause:** summing overlapping findings (same item across multiple rules). **Fix:** when totalling, group by `invoice_item` and take the maximum disputed amount per item, not the sum.
- **Symptom:** causal assignment inconsistent across findings with the same root cause. **Cause:** the mapping ran per individual `rule_id`, ignoring the merge. **Fix:** run mapping **after** dedup on the merged `rule_ids` set.
- **Symptom:** yellow zone but a critical rule fails. **Cause:** zone logic evaluated before the critical-rule gate. **Fix:** a critical with high confidence ALWAYS forces red.
- **Symptom:** two labels applied simultaneously (`auto-denial` and `needs-human-review`). **Cause:** previous label not removed. **Fix:** before applying, `DELETE /cases/{id}/labels/*` for mutually exclusive labels.
- **Symptom:** contradictions between auditors go undetected (`needs-fix-review` never fires). **Cause:** contradiction check compares only `fail` findings, missing when one says `pass` and another `fail` on the same item. **Fix:** cross by invoice_item as well; if admin passes and financial fails on the same item → contradiction.

## Verification

- `GET /cases/{case_id}/consolidated` returns an object with `consolidated_findings[]` and `case_summary`.
- Every finding has a `causal` ∈ `{1,2,3,4,5,6,7}` OR is flagged `needs-human-review`.
- No two findings with the same `evidencia` and different `finding_id` (dedup correct).
- `total_objetado ≤ invoice_total`.
- Exactly one decision label applied (`auto-approve`, `needs-human-review`, `auto-denial`, `needs-fix-review`).
- If `zona=roja` with a high-confidence critical, label is `auto-denial` or `needs-fix-review`, never `auto-approve`.
- Case status is `consolidated`.

## References

- Resolución 3047/2008 — Anexo 6, glosa causales (1-7).
- Decreto 4747/2007 — bilateral glosas.
- Issues [arkangelai/audit-workflow#41](https://github.com/arkangelai/audit-workflow/issues/41) and [#47](https://github.com/arkangelai/audit-workflow/issues/47) (absorbed).
