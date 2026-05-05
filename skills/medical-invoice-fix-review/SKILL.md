---
name: medical-invoice-fix-review
description: Reads human comments from comments.json in the working directory, interprets the auditor's intent (modify finding, add, remove, change causal, adjust amount, approve as-is), applies the changes to output.json, and manages the workflow labels until the auditor explicitly approves with `claim-denial-ready`. Use it when a case has `needs-human-review` or `needs-fix-review` and a human left comments.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, human-review, fix, edits, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
---

# medical-invoice-fix-review

Bridge between the human auditor and the automated pipeline. It watches the comments a human leaves on a case, turns them into concrete edits to the consolidated output, and manages workflow labels until the human approves. PDF regeneration is a separate step — invoke `medical-invoice-claim-denial-generator` after this skill signals changes.

The question it answers: **what did the human ask for and how do I apply it to the consolidated output + PDF without breaking traceability?**

## When to Use

- The case has `needs-human-review` or `needs-fix-review` and new comments exist since the last pass.
- The orchestrator receives a `comment.created` webhook on a case with a `claim_denial_draft` PDF.
- The user asks "apply the edits from auditor X to case {RAD}".

**Do not use:** if no new comments exist (polling with no work); if the case already has `claim-denial-ready`; if the comment does not concern the glosa (e.g. general chat).

## Input Contract

The skill reads the current `output.json` from the consolidator plus the human comment objects:

```json
{
  "output": {
    "caso_id": "RAD-YYYYMMDD-{num_factura}",
    "factura": { /* ... */ },
    "hallazgos": [ /* current state, may have been patched by prior fix-review runs */ ],
    "resumen": { /* current state */ }
  },
  "comments": [
    {
      "comment_id": "<uuid>",
      "author": "<email>",
      "author_role": "auditor | viewer | bot",
      "text": "<human comment text>",
      "target_item": 1,
      "created_at": "YYYY-MM-DDTHH:MM:SS-05:00"
    }
  ]
}
```

Comments must be processed in ascending chronological order. Only comments where `author_role = auditor` can trigger `approve`. Skip comments where `author` ends in `-bot`.

## Output Contract

**When changes were applied:**

```json
{
  "caso_id": "RAD-YYYYMMDD-{num_factura}",
  "comments_processed": [
    {
      "comment_id": "<uuid>",
      "intent": "modify_finding | add_finding | remove_finding | change_causal | adjust_value | add_evidence | approve | ask_clarification | ambiguous",
      "target_item": 1,
      "changes_applied": [
        { "op": "replace", "path": "/hallazgos/2/valor_glosado", "value": 1500000 }
      ]
    }
  ],
  "output_updated": {
    "hallazgos": [ /* full updated array */ ],
    "resumen": {
      "total_facturado": 0,
      "total_aprobado": 0,
      "total_glosado": 0,
      "concepto_final": "APTA | NO_APTA | DEVOLUCION | ESCALAR_HUMANO",
      "accion_requerida": "..."
    }
  },
  "pdf_regeneration_needed": true,
  "last_processed_at": "YYYY-MM-DDTHH:MM:SS-05:00"
}
```

**When `intent = approve` (and valid):** the `output.json` is not modified. The case label changes to `claim-denial-ready` and the returned object includes `{ "approved": true, "approved_by": "<email>", "pdf_version_approved": "v2" }`.

**When no changes (only clarifications or ambiguous):** `pdf_regenerated: false`, `new_pdf_version: null`.

**Money invariants after every patch:**
- `resumen.total_glosado = sum(hallazgos[].valor_glosado)` — always recomputed.
- `resumen.total_aprobado = factura.total_facturado − resumen.total_glosado`.
- `hallazgos[].valor_glosado ≥ 0` always — if a patch would make it negative, reject and reply asking for clarification.
- `resumen.total_glosado ≤ factura.total_facturado` always.

## Procedure

1. **Load comments.**
   Read `comments.json` from the working directory, filtered to entries with `created_at > last_processed_at`. If none → exit with no changes.

   For every comment capture: `comment_id`, `author`, `text`, `target` (specific finding or whole case), `created_at`.

2. **Classify the intent per comment (LLM + rules).**

   Intent categories:

   | Intent | Signal | Action |
   |---|---|---|
   | `modify_finding` | "change", "fix", "adjust", "the amount is", "the causal should be" | Update fields of the target finding |
   | `add_finding` | "add", "missing", "there is also", "additional" | Insert new finding |
   | `remove_finding` | "remove", "delete", "does not apply", "not deniable" | Mark finding as `resultado=pass` |
   | `change_causal` | "the right causal is", "it is not X but Y" | Reassign `causal`/`subcausal` |
   | `adjust_value` | "the disputed amount is $X" | Change `valor_glosado` |
   | `add_evidence` | "the evidence is at", "see page Y" | Append text to `evidencia` |
   | `approve` | "approved", "ready", "send it", "OK as is" | Label change to `claim-denial-ready` |
   | `escalate` | "escalate", "need a senior", "cannot decide", "unsure" | Set `concepto_final = ESCALAR_HUMANO`, exit loop |
   | `ask_clarification` | "why", "do not understand", "explain" | Reply on the case, do NOT modify |
   | `ambiguous` | unclassifiable | Reply asking for clarification, do NOT modify |

   Use an LLM with **structured output** (JSON schema) — never free prose.

3. **Resolve the target finding.**
   - If the comment is bound to a `finding_id` (via `target`) → direct.
   - If the text mentions a finding number (`"finding #3"`, `"item 2"`) → look up by index.
   - If it mentions a CUPS or description → match by content.
   - If it cannot be resolved → classify as `ambiguous`.

4. **Apply changes to output.json.**

   For each actionable intent, apply the JSON Patch operations directly to `output.json` on disk. Example operations:
   ```json
   [
     { "op": "replace", "path": "/hallazgos/2/valor_glosado", "value": 1500000 },
     { "op": "replace", "path": "/hallazgos/2/glosa_sugerida/causal_num", "value": "5" },
     { "op": "add", "path": "/hallazgos/-", "value": { "...": "new finding" } },
     { "op": "replace", "path": "/hallazgos/0/hallazgo", "value": "conforme" }
   ]
   ```

   **Always recompute** after the patch:
   - `case_summary.score` = Σ weights of active findings.
   - `case_summary.total_objetado` = Σ `valor_glosado`.
   - `case_summary.total_a_pagar` = `invoice_total - total_objetado`.
   - `case_summary.zona` based on new values.

5. **Append to audit-log.json** for traceability.
   Append the entry to `audit-log.json` in the working directory. Never overwrite — always append:
   ```json
   {
     "actor": "fix-review",
     "triggered_by_comment": "comment_id",
     "intent": "modify_finding",
     "changes_applied": [],
     "finding_id": "fx-003",
     "author_original": "auditor@eps.com",
     "timestamp": "..."
   }
   ```

6. **Signal PDF regeneration.**
   If there were changes → set `resumen.pdf_regeneration_needed = true` in `output.json`. The orchestrator or user invokes `medical-invoice-claim-denial-generator` separately to produce the next version.
   If only `ask_clarification` or `ambiguous` → no status change.

7. **Write bot reply.**
   Append the bot reply to `comments.json` in the working directory (with `author: "fix-review-bot"`):
   ```json
   {
     "reply_to": "comment_id",
     "author": "fix-review-bot",
     "body": "Applied: changed finding #3 amount from $1,200,000 to $1,500,000. Version v2 generated. Please review.",
     "created_at": "..."
   }
   ```

   If the intent was `ambiguous`, set body to: `"I could not interpret your comment on finding #3. Could you clarify whether you want to change the amount, the causal, or add evidence?"`

8. **Handle final approval or escalation.**

   If intent = `approve`:
   Set `output.json resumen.label = "claim-denial-ready"` and `resumen.status = "claim_denial_ready"`.
   **Requirement**: `approve` is only honored if the comment author has the auditor role and at least one PDF version exists (`v1` or later).

   If intent = `escalate`:
   Set `output.json resumen.label = "needs-human-review"`, `resumen.status = "escalated"`, and `resumen.concepto_final = "ESCALAR_HUMANO"`.
   Loop exits. No PDF regeneration.

9. **Update `last_processed_at`.** Save the timestamp of the latest comment processed into case metadata so the next run does not reprocess.

## Pitfalls

- **Symptom:** the bot interprets "this is not right" as `approve`. **Cause:** LLM miscalibrated on negations. **Fix:** use a strict enum JSON schema plus few-shot negative examples in the prompt.
- **Symptom:** `approve` applied but the human had asked for edits earlier. **Cause:** the approval comment is newer, but another later comment asked for changes → processed out of order. **Fix:** process comments in ascending chronological order; `approve` only if it is the last one.
- **Symptom:** regenerated a PDF without real changes. **Cause:** intent was `add_evidence` applied to a null field. **Fix:** validate the patch produced a non-empty diff before invoking skill 7.
- **Symptom:** `valor_glosado` ends up negative. **Cause:** human asked "reduce by $500k" and the bot subtracted without validation. **Fix:** enforce `≥ 0`; if negative, reply asking for clarification.
- **Symptom:** bot loops with another bot. **Cause:** both reply to comments. **Fix:** skip if `author` ends in `-bot`; only process human comments.
- **Symptom:** applied changes do not appear in `v2`. **Cause:** PDF regenerated before the PATCH confirmed. **Fix:** PATCH → `GET /consolidated` to verify → only then invoke skill 7.
- **Symptom:** human asks to change the causal but the finding has multiple `rule_ids` mapping to different causales. **Cause:** dedup merged findings with potentially different causales. **Fix:** allow manual causal override; leave a note in `justificacion` that it was a human override.
- **Symptom:** `approve` bypass by an unauthorized author. **Cause:** role not validated. **Fix:** query the author's role in the software; if not auditor, treat as `ask_clarification`.

## Verification

- Every new comment produces an `audit-log` entry with a classified `intent`.
- If changes occurred: `output.json resumen.pdf_regeneration_needed` is `true`.
- If `intent=approve` and valid: `output.json resumen.label` is `claim-denial-ready` and `resumen.status` is `claim_denial_ready`.
- `total_objetado ≥ 0` and `≤ invoice_total` after each change.
- Every consolidated change has an `audit-log` entry with non-empty `triggered_by_comment`.
- The same `comment_id` was not processed twice (idempotent via `last_processed_at`).

## References

- Issue [arkangelai/audit-workflow#48](https://github.com/arkangelai/audit-workflow/issues/48).
- Related skill: `medical-invoice-claim-denial-generator` (invoke separately after this skill signals `pdf_regeneration_needed`).
