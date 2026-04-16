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
  - name: CONFIDENCE_THRESHOLD
    prompt: Minimum confidence for automatic decisions (default 0.7)
    required_for: optional
  - name: ZONA_GREEN_MAX
    prompt: Maximum lost points for green zone (default 5)
    required_for: optional
  - name: ZONA_YELLOW_MAX
    prompt: Maximum lost points for yellow zone (default 15)
    required_for: optional
---

# medical-invoice-consolidator-audit

Unifies the outputs of the three sub-auditors (admin + medical + financial), deduplicates redundant findings, assigns Anexo 6 causales (Res. 3047/2008), and labels the case for the next step. Absorbs what was originally a separate `causal-assigner` skill.

The question it answers: **given what the three audits found, which findings are real, which causal do they belong to, and what is the next step (auto-approve, human review, or auto-denial)?**

## When to Use

- The orchestrator finishes the three parallel audits and the case enters state `consolidation`.
- The user asks "consolidate the audits for case {RAD}" or "prepare the case for glosa generation".
- Reconsolidation after a partial re-audit (e.g. only the financial audit was redone).

**Do not use:** if any of the three audits is missing; if the case already has `consolidated_findings` and a reconsolidation was not requested.

## Procedure

1. **Read the three audits for the case.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audits
   ```
   Validate that all three `audit_type` values exist: `admin`, `medical`, `financial`. If any is missing, abort and leave a note on the case.

2. **Collect every finding with `resultado=fail` or `conditional`.**
   Ignore `pass` — they do not produce findings for a glosa.

3. **Deduplicate by `(item_cups, causal)`.**

   Two findings are duplicates only when **both** match:
   - Same `codigo_cups` (or both case-level for invoice-wide rules), AND
   - Same `causal` (Sura vocabulary -- see step 6).

   This is critical for multi-error facturas: the same CUPS can have **independent** glosas under different causales (e.g. H30104 with FIN.13 Tarifas + FIN.36 phantom Facturacion → KEEP BOTH). Same CUPS + same causal across two auditors IS a duplicate.

   When merging duplicates:
   - `rule_ids` = list of every rule_id that detected the same finding (e.g. `["ADMIN.15", "FIN.20"]`).
   - `severidad` = maximum across merged.
   - `peso` = maximum.
   - `valor_objetado` = **maximum, not sum** (do not double-count money).
   - `evidencia` = formatted concatenation with source attribution.
   - `auditores_detectaron` = list (`["admin", "financial"]`).

   After all merges: enforce per-item cap `Σ valor_objetado for item_cups ≤ item.total_price`. If exceeded, reduce the lowest-severity contribution proportionally.

4. **Compute per-finding confidence** (0–1).
   ```
   confidence = 0.4 × evidence_clarity
              + 0.4 × unanimity (auditors_detected / auditors_capable)
              + 0.2 × citation_quality (exact file+page?)
   ```
   - `evidence_clarity`: 1 if the evidence contains a literal quote, 0.7 for a specific reference, 0.4 if generic.
   - `unanimity`: denominator is `auditors_capable_of_detecting`, NOT a hardcoded 3. FIN.* rules are capable=financial only; MED.* capable=medical only; ADMIN.* capable=admin only; cross-cutting rules capable=all 3. A FIN.13 finding detected only by financial → unanimity = 1.0, not 0.33.
   - `citation_quality`: 1 if file+page, 0.5 if file only, 0 if neither.

5. **Prioritize findings** in this order:
   - Severity descending: `critica > mayor > media > baja`.
   - Within the same severity: `valor_objetado` descending.
   - Within the same amount: `confianza` descending.

6. **Translate to canonical causal vocabulary.**

   Sub-agents emit findings using the **Sura strict 6-set**: `Facturacion | Tarifas | Soportes | Autorizacion | Cobertura | Pertinencia`. The consolidator emits BOTH `causal` (Sura) and `causal_anexo6` (Res. 3047 codes 1-7 with subcausal) on every finding.

   Translation table (Sura → Anexo 6):

   | Sura causal | Anexo 6 code | Anexo 6 name |
   |---|---|---|
   | `Cobertura` (exclusion) | `1` | No cobertura contractual |
   | `Cobertura` (cap exceeded) | `6` | Agotamiento de cobertura |
   | `Pertinencia` | `2` | No pertinencia clinica |
   | `Soportes` | `3` | Documentacion incompleta |
   | `Facturacion` (duplicate / unbundling) | `4` | Cobro duplicado |
   | `Tarifas` | `5` | Tarifa incorrecta |
   | `Autorizacion` | `7` | Generica (subcausal: falta autorizacion) |
   | `Facturacion` (phantom / dx-change / post-mortem) | `7` | Generica (subcausal: improcedencia) |

   Use the deterministic mapping. Assign `subcausal` if Anexo 6 defines one (e.g. `3.1` clinical documentation, `3.2` administrative documentation). If sub-agents disagree on causal for the same `(item_cups)`, treat as a contradiction and flag the case for `needs-fix-review`.

7. **Compute zone and amounts.**
   - `score` = Σ `peso` of deduplicated findings with `resultado=fail`.
   - `zona`:
     - Green: `score ≤ ZONA_GREEN_MAX` (default 5) **and** no critical rule fails.
     - Yellow: `score ≤ ZONA_YELLOW_MAX` (default 15) without criticals, or criticals with low confidence.
     - Red: `score > ZONA_YELLOW_MAX` **or** at least one critical with confidence ≥ `CONFIDENCE_THRESHOLD`.
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

9. **Causal-based forced routing (evaluate FIRST, before the matrix).**

   If any deduplicated finding has `causal in {Soportes, Cobertura, Pertinencia}`, the case **must** route to `needs-human-review` regardless of zone, confidence, or contradictions. Set `case_status = "Pendiente revision"`, `forced_human_review = true`, and `forced_human_review_reason` listing the triggering causales.

   Rationale: these three causales involve subjective judgment (clinical text reading, contract interpretation, clinical appropriateness) and have high reversal risk if auto-sent. The other three (`Facturacion`, `Tarifas`, `Autorizacion`) are objective and safe to auto-route.

10. **Apply workflow labels** (only if `forced_human_review = false`).
    ```
    POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/labels
    ```

    Decision matrix (only applies when all glosa causales are in `{Facturacion, Tarifas, Autorizacion}`):

    | Zone | Global confidence | Contradictions | Label | case_status |
    |---|---|---|---|---|
    | Green | ≥ 0.7 | No | `auto-approve` | `Lista para enviar` |
    | Green | < 0.7 | - | `needs-human-review` | `Pendiente revision` |
    | Yellow | any | No | `auto-route-send` | `Lista para enviar` |
    | Yellow | any | Yes | `needs-fix-review` | `Pendiente revision` |
    | Red | ≥ 0.7 | No | `auto-denial` | `Lista para enviar` |
    | Red | ≥ 0.7 | Yes | `needs-fix-review` | `Pendiente revision` |
    | Red | < 0.7 | - | `needs-human-review` | `Pendiente revision` |

    First matching row wins. Always add: `consolidated`.

11. **Update the case status.**
    ```
    PATCH {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
    { "status": "consolidated", "zona": "...", "score": ..., "total_objetado": ..., "case_status": "Lista para enviar | Pendiente revision" }
    ```

## Pitfalls

- **Symptom:** dedup merges findings that are NOT the same. **Cause:** semantic similarity too loose. **Fix:** require an exact match on at least one of the three criteria (doc evidence, invoice_item, description); do not rely on LLM similarity alone.
- **Symptom:** consolidated `valor_objetado` exceeds `invoice_total`. **Cause:** summing overlapping findings (same item across multiple rules). **Fix:** when totalling, group by `invoice_item` and take the maximum disputed amount per item, not the sum.
- **Symptom:** every case ends up in `needs-human-review`. **Cause:** threshold too high or evidence clarity miscomputed. **Fix:** temporarily lower `CONFIDENCE_THRESHOLD` to 0.6 and review the actual distribution; adjust weights.
- **Symptom:** causal assignment inconsistent across findings with the same root cause. **Cause:** the mapping ran per individual `rule_id`, ignoring the merge. **Fix:** run mapping **after** dedup on the merged `rule_ids` set.
- **Symptom:** yellow zone but a critical rule fails. **Cause:** zone logic evaluated before the critical-rule gate. **Fix:** a critical with high confidence ALWAYS forces red.
- **Symptom:** two labels applied simultaneously (`auto-denial` and `needs-human-review`). **Cause:** previous label not removed. **Fix:** before applying, `DELETE /cases/{id}/labels/*` for mutually exclusive labels.
- **Symptom:** contradictions between auditors go undetected (`needs-fix-review` never fires). **Cause:** contradiction check compares only `fail` findings, missing when one says `pass` and another `fail` on the same item. **Fix:** cross by invoice_item as well; if admin passes and financial fails on the same item → contradiction.
- **Symptom:** Soportes finding gets auto-approved (Green zone + high confidence). **Cause:** the causal-routing pre-rule (step 9) was skipped. **Fix:** ALWAYS evaluate the `{Soportes, Cobertura, Pertinencia}` trigger BEFORE the zone/confidence matrix. These causales force `Pendiente revision` regardless of any other signal.
- **Symptom:** same CUPS, two causales (Tarifas + Facturacion), merged into one finding. **Cause:** dedup keyed only on `invoice_item`. **Fix:** dedup key is `(item_cups, causal)` -- different causales on the same item are independent glosas, not duplicates.
- **Symptom:** financial-only finding (FIN.13) has confidence 0.5 because unanimity is 1/3. **Cause:** denominator hardcoded to 3. **Fix:** denominator is `auditors_capable_of_detecting`. FIN.* capable=financial only → unanimity 1.0.
- **Symptom:** per-item `Σ valor_objetado > item.total_price`. **Cause:** multiple causales on the same item summed without cap. **Fix:** after dedup, cap the lowest-severity contribution so the per-item sum equals `item.total_price`.
- **Symptom:** phantom-billing finding mapped to Anexo 6.3 (documentacion incompleta). **Cause:** confused with Soportes. **Fix:** phantom/impossible service → Anexo 6.7 (Generica). Soportes → 6.3.
- **Symptom:** consolidation runs with only 2 of 3 audits present. **Cause:** orchestrator dispatched the consolidator early. **Fix:** validate ALL three `audit_type` values exist; else abort and leave a case note.
- **Symptom:** `Lista para enviar` glosas list includes one with `valor_objetado = 0`. **Fix:** drop zero-value findings from the send list; keep them only in the audit trail.

## Verification

- `GET /cases/{case_id}/consolidated` returns an object with `consolidated_findings[]` and `case_summary`.
- Every finding has both `causal` (Sura strict 6-set) and `causal_anexo6` (numeric 1-7).
- Every finding references a `codigo_cups` matching an item in the invoice (or `case_level=true` for invoice-wide findings).
- For every `item_cups`: `Σ valor_objetado ≤ item.total_price`.
- Any finding with `causal in {Soportes, Cobertura, Pertinencia}` → `case_status = "Pendiente revision"` and `forced_human_review = true`.
- `case_status` ∈ `{"Lista para enviar", "Pendiente revision"}`, exactly one.
- No two findings with the same `(item_cups, causal)` and different `finding_id` (dedup correct).
- `total_facturado − total_objetado = total_a_pagar` within 1 COP.
- Exactly one decision label applied (`auto-approve`, `auto-route-send`, `auto-denial`, `needs-human-review`, `needs-fix-review`).
- If `zona=roja` with a high-confidence critical, label is `auto-denial` or `needs-fix-review` or `needs-human-review`, never `auto-approve`.
- Case status is `consolidated`.

## References

- Resolución 3047/2008 — Anexo 6, glosa causales (1-7).
- Decreto 4747/2007 — bilateral glosas.
- Issues [arkangelai/audit-workflow#41](https://github.com/arkangelai/audit-workflow/issues/41) and [#47](https://github.com/arkangelai/audit-workflow/issues/47) (absorbed).
