---
name: medical-invoice-fix-review
description: Reads human comments left on a medical-invoice glosa in the destination software, interprets the auditor's intent (modify finding, add, remove, change causal, adjust amount, approve as-is), applies the changes to the consolidated output, invokes claim-denial-generator to produce the next PDF version, and manages the workflow labels until the auditor explicitly approves with `claim-denial-ready`. Use it when a case has `needs-human-review` or `needs-fix-review` and a human left comments.
version: 1.1.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, human-review, fix, edits, colombia, eps]
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

# medical-invoice-fix-review

Bridge between the human auditor and the automated pipeline. It watches the comments a human leaves on a case, turns them into concrete edits to the consolidated output, regenerates the PDF via skill 7, and ping-pongs until the human approves.

The question it answers: **what did the human ask for and how do I apply it to the consolidated output + PDF without breaking traceability?**

## When to Use

- The case has `needs-human-review` or `needs-fix-review` and new comments exist since the last pass.
- The orchestrator receives a `comment.created` webhook on a case with a `claim_denial_draft` PDF.
- The user asks "apply the edits from auditor X to case {RAD}".

**Do not use:** if no new comments exist (polling with no work); if the case already has `claim-denial-ready`; if the comment does not concern the glosa (e.g. general chat).

## Routing Policy (when does fix-review run?)

`fix-review` runs only on cases the consolidator routed to human review. The router applies:

| Tier | Causales found | Flow |
|---|---|---|
| **Auto-send** | only `Facturacion`, `Tarifas`, `Autorizacion` | consolidator -> denial-generator -> sender directly. fix-review NOT invoked. |
| **Always-review** | any of `Soportes`, `Cobertura`, `Pertinencia` | case routed to `needs-human-review`. fix-review runs when the auditor leaves comments. |

Auto-send cases can also be manually flagged via a human comment that asks for review on the `claim-denial-ready` document; in that case fix-review runs after the manual flag.

## Editable vs Immutable Finding Fields

Restrict patches to the editable subset. Reject patches to immutable fields with `400 forbidden_field`.

| Field | Editable | Notes |
|---|---|---|
| `finding_id`, `rule_ids`, `cups`, `descripcion_servicio`, `valor_facturado`, `detected_by`, `created_at` | NO | Core identity / provenance |
| `causal_familia` | NO | Derived from `causal` -- do not patch directly |
| `causal`, `subcausal` | YES | Re-classify Anexo 6 code |
| `valor_objetado` | YES | Constraint: `0 <= v <= valor_facturado` |
| `decision`, `resultado` | YES | `pass` == remove_finding |
| `motivo`, `justificacion` | YES | 10-2000 chars |
| `evidencia` | YES (append-only) | Never delete prior entries |
| `last_modified_at`, `last_modified_by`, `human_override` | AUTO | Set by this skill on every edit |

## Procedure

1. **Detect new comments.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/comments?since={last_processed_at}
   ```
   If 0 results → exit with no changes.

   For every comment capture: `comment_id`, `author`, `text`, `target` (specific finding or whole case), `created_at`.

2. **Classify the intent per comment (LLM + rules).**

   Intent categories:

   | Intent | Signal | Action |
   |---|---|---|
   | `modify_finding` | "change", "fix", "adjust", "the amount is", "the causal should be" | Update fields of the target finding |
   | `add_finding` | "add", "missing", "there is also", "additional" | Insert new finding |
   | `remove_finding` | "remove", "delete", "does not apply", "not deniable" | Mark finding as `resultado=pass` |
   | `change_causal` | "the right causal is", "it is not X but Y" | Reassign `causal`/`subcausal` |
   | `adjust_value` | "the disputed amount is $X" | Change `valor_objetado` |
   | `add_evidence` | "the evidence is at", "see page Y" | Append text to `evidencia` |
   | `approve` | "approved", "ready", "send it", "OK as is" | Label change to `claim-denial-ready` |
   | `ask_clarification` | "why", "do not understand", "explain" | Reply on the case, do NOT modify |
   | `ambiguous` | unclassifiable | Reply asking for clarification, do NOT modify |

   Use an LLM with **structured output** (JSON schema) — never free prose.

3. **Resolve the target finding.**
   - If the comment is bound to a `finding_id` (via `target`) → direct.
   - If the text mentions a finding number (`"finding #3"`, `"item 2"`) → look up by index.
   - If it mentions a CUPS or description → match by content.
   - If it cannot be resolved → classify as `ambiguous`.

4. **Apply changes to the consolidated output.**

   For each actionable intent:
   ```
   PATCH {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/consolidated
   {
     "changes": [
       { "op": "replace", "path": "/consolidated_findings/2/valor_objetado", "value": 1500000 },
       { "op": "replace", "path": "/consolidated_findings/2/causal", "value": 5 },
       { "op": "add", "path": "/consolidated_findings/-", "value": { ...new finding } },
       { "op": "replace", "path": "/consolidated_findings/0/resultado", "value": "pass" }
     ]
   }
   ```

   If the destination software does not support JSON Patch, use `PATCH` with the full updated object.

   **Always recompute** after the patch (integer COP -- no decimals):
   ```
   active = [f for f in consolidated_findings if f.resultado == "fail"]
   total_objetado = sum(f.valor_objetado for f in active)
   total_a_pagar  = invoice_total - total_objetado
   score          = sum(CAUSAL_WEIGHTS[f.causal] for f in active)

   zona = "verde"     if score < 30
        = "amarilla"  if 30 <= score < 70
        = "roja"      if score >= 70
   ```

   `CAUSAL_WEIGHTS` lives in `$REF_DATA_PATH/causal_weights.json`, versioned with the ruleset.

   **Invariants (enforce, rollback on failure):**
   - `total_objetado >= 0`
   - `total_objetado <= invoice_total`
   - `total_a_pagar >= 0`
   - `total_a_pagar + total_objetado == invoice_total` (integer equality)
   - Every finding: `0 <= valor_objetado <= valor_facturado`
   - Per-item: `Σ valor_objetado for item_cups <= item.total_price`

   Round-trip: GET `/consolidated` after PATCH must match the recomputed resumen before invoking `claim-denial-generator`.

5. **Record in the audit-log** for traceability (append-only; 5-year retention per Res 3047-08).

   Capture **before/after** values for every change so the auditor can reconstruct the decision trail:
   ```json
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audit-log
   {
     "actor": "fix-review-bot",
     "triggered_by_comment": "cm_456",
     "comment_author": "ana.medica@eps.com.co",
     "intent": "modify_finding",
     "finding_id": "fx-003",
     "changes": [
       { "field": "valor_objetado", "old": 1200000, "new": 1500000 },
       { "field": "justificacion", "old": "...", "new": "..." }
     ],
     "consolidated_version_before": 4,
     "consolidated_version_after": 5,
     "timestamp": "2026-04-14T12:34:56Z"
   }
   ```
   Never overwrite history — always append.

6. **Regenerate the PDF (invoke skill 7).**
   If there were changes → run `medical-invoice-claim-denial-generator` to produce `v{n+1}`.
   If only `ask_clarification` or `ambiguous` → do NOT regenerate.

7. **Reply to the auditor (Spanish, standardized templates).**

   | Intent | Template |
   |---|---|
   | `modify_finding` | "Aplicado: {campo} del hallazgo #{n} cambiado de `{old}` a `{new}`. Version v{n+1} generada." |
   | `add_finding` | "Agregado hallazgo nuevo #{n} (causal {c}, objetado ${v}). Version v{n+1}." |
   | `remove_finding` | "Hallazgo #{n} marcado como `pass`. Version v{n+1}." |
   | `change_causal` | "Causal del #{n}: {old} -> {new}. `human_override=true`. Version v{n+1}." |
   | `adjust_value` | "Valor objetado del #{n}: ${old} -> ${new}. Total objetado: ${tot}." |
   | `add_evidence` | "Evidencia agregada al #{n}: {ref}. Version v{n+1}." |
   | `approve` honored | "Aprobado. Caso {RAD} listo (`claim-denial-ready`). Documento final: v{n}." |
   | `approve` stale | "No puedo aprobar: documento v{n} es anterior a los ultimos cambios. Regenerando v{n+1}." |
   | `approve` wrong role | "Solo auditores medicos o financieros pueden aprobar. Tu rol: {role}." |
   | `needs_clarification` | "No logre interpretar tu comentario. A cual hallazgo y que cambio?" |

8. **Handle final approval.**
   If intent = `approve`:
   ```
   DELETE /cases/{id}/labels/needs-human-review
   DELETE /cases/{id}/labels/needs-fix-review
   POST   /cases/{id}/labels   { "name": "claim-denial-ready" }
   PATCH  /cases/{id}          { "status": "claim_denial_ready", "approved_by": "<author>", "approved_at": "..." }
   ```

   **Pre-flight checks (all must pass):**
   - The comment author has an auditor role (medical or financial).
   - At least one document version exists (`v1` or later).
   - The latest document version is fresh: `latest_document.generated_at >= consolidated.updated_at` (no edits since last regen). If stale, regenerate `v{n+1}` first, then approve.
   - No newer edit-comment has arrived since this approve was queued (chronological order; defer approve if mixed-batch).
   - Approve must use an explicit token from a closed set: `aprobar`, `listo`, `enviar`, `OK`, `go`, `aprobado`. Hedged language ("probemos") -> `needs_clarification`.

   **On approve, remove BOTH** `needs-human-review` AND `needs-fix-review`. Final label set must be exactly `{claim-denial-ready}`.

9. **Update `last_processed_at`.** Save the timestamp of the latest comment processed into case metadata so the next run does not reprocess.

## Pitfalls

- **Symptom:** the bot interprets "this is not right" as `approve`. **Cause:** LLM miscalibrated on negations. **Fix:** use a strict enum JSON schema plus few-shot negative examples in the prompt.
- **Symptom:** `approve` applied but the human had asked for edits earlier. **Cause:** the approval comment is newer, but another later comment asked for changes → processed out of order. **Fix:** process comments in ascending chronological order; `approve` only if it is the last one.
- **Symptom:** regenerated a PDF without real changes. **Cause:** intent was `add_evidence` applied to a null field. **Fix:** validate the patch produced a non-empty diff before invoking skill 7.
- **Symptom:** `valor_objetado` ends up negative. **Cause:** human asked "reduce by $500k" and the bot subtracted without validation. **Fix:** enforce `≥ 0`; if negative, reply asking for clarification.
- **Symptom:** bot loops with another bot. **Cause:** both reply to comments. **Fix:** skip if `author` ends in `-bot`; only process human comments.
- **Symptom:** applied changes do not appear in `v2`. **Cause:** PDF regenerated before the PATCH confirmed. **Fix:** PATCH → `GET /consolidated` to verify → only then invoke skill 7.
- **Symptom:** human asks to change the causal but the finding has multiple `rule_ids` mapping to different causales. **Cause:** dedup merged findings with potentially different causales. **Fix:** allow manual causal override; leave a note in `justificacion` that it was a human override.
- **Symptom:** `approve` bypass by an unauthorized author. **Cause:** role not validated. **Fix:** query the author's role in the software; if not auditor, reply with the wrong-role template.
- **Symptom:** concurrent auditor edits cause lost updates (no ETag). **Fix:** `If-Match: {etag}` on PATCH; on 409, refetch + replay + retry.
- **Symptom:** stale document at approval (regen failed silently between PATCH and approve). **Fix:** pre-flight `latest_document.generated_at >= consolidated.updated_at`. If stale, force regen before allowing approve.
- **Symptom:** `valor_objetado > valor_facturado` (typo: 15M vs 1.5M). **Fix:** invariant + rollback + reply showing both numbers for human confirmation.
- **Symptom:** index mismatch (UI 1-indexed, API 0-indexed). **Fix:** 1-indexed everywhere except the JSON-Patch path boundary; unit-test conversions.
- **Symptom:** ambiguous CUPS match (two lines share a CUPS). **Fix:** if > 1 candidate, reply listing candidates with indexes; do NOT patch.
- **Symptom:** auditor regrets an approval. **Fix:** allow `reopen` intent on `claim-denial-ready` (only before `claim-denial-sent`); back to `needs-fix-review`.
- **Symptom:** auditor asks "revert mi ultimo cambio". **Fix:** add `revert` intent; inverse-apply the last audit-log entry by that author within 24h.
- **Symptom:** duplicate evidence ref added on append. **Fix:** dedup before patching `evidencia`; no-op + reply "Esa evidencia ya estaba registrada."
- **Symptom:** PDF regen crash advances label anyway. **Fix:** label change is the LAST step, gated on regen success. On failure, leave label at `needs-human-review`, log, reply "Error regenerando documento, reintentando."
- **Symptom:** `add_finding` missing required fields. **Fix:** require `{causal, valor_objetado, motivo, justificacion}` minimum; else reply asking for the missing fields.
- **Symptom:** two auditors approve simultaneously. **Fix:** second approve is a no-op; reply "Ya aprobado por {first} a las {time}."
- **Symptom:** threaded comment "eso esta bien" on a specific finding misread as case-level approve. **Fix:** case-scope `approve` requires a case-level comment. Threaded comments on a finding are `acknowledge` only.
- **Symptom:** orphan label on approve (only removed one of two review labels). **Fix:** on approve, remove BOTH; assert final label set is exactly `{claim-denial-ready}`.

## Verification

- Every new comment produces an `audit-log` entry with a classified `intent` and before/after values for any field changes.
- If changes occurred: a new document version (`v{n+1}`) exists with `generated_at >= consolidated.updated_at`.
- If `intent=approve` and valid: case labels include `claim-denial-ready` and exclude both `needs-human-review` and `needs-fix-review`.
- After every change: `total_objetado >= 0`, `total_objetado <= invoice_total`, `total_a_pagar >= 0`, `total_objetado + total_a_pagar == invoice_total`.
- Every finding: `0 <= valor_objetado <= valor_facturado`.
- No finding has `resultado=fail` AND `valor_objetado=0` (vacuous glosa).
- For every `item_cups`: `Σ valor_objetado <= item.total_price`.
- The same `comment_id` was not processed twice (idempotent via `last_processed_at`).
- Every `human_override == true` finding has a matching audit-log entry.
- On pipeline crash: label STILL `needs-human-review` (not advanced); audit log has an `error` entry.

## References

- Issue [arkangelai/audit-workflow#48](https://github.com/arkangelai/audit-workflow/issues/48).
- Related skill: `medical-invoice-claim-denial-generator` (invoked by this skill).
