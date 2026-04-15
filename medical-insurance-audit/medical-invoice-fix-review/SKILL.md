---
name: medical-invoice-fix-review
description: Reads human comments left on a medical-invoice glosa in the destination software, interprets the auditor's intent (modify finding, add, remove, change causal, adjust amount, approve as-is), applies the changes to the consolidated output, invokes claim-denial-generator to produce the next PDF version, and manages the workflow labels until the auditor explicitly approves with `claim-denial-ready`. Use it when a case has `needs-human-review` or `needs-fix-review` and a human left comments.
version: 1.0.0
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

   **Always recompute** after the patch:
   - `case_summary.score` = Σ weights of active findings.
   - `case_summary.total_objetado` = Σ `valor_objetado`.
   - `case_summary.total_a_pagar` = `invoice_total - total_objetado`.
   - `case_summary.zona` based on new values.

5. **Record in the audit-log** for traceability.
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audit-log
   {
     "actor": "fix-review",
     "triggered_by_comment": "comment_id",
     "intent": "modify_finding",
     "changes_applied": [...],
     "finding_id": "fx-003",
     "author_original": "auditor@eps.com",
     "timestamp": "..."
   }
   ```
   Never overwrite history — always append.

6. **Regenerate the PDF (invoke skill 7).**
   If there were changes → run `medical-invoice-claim-denial-generator` to produce `v{n+1}`.
   If only `ask_clarification` or `ambiguous` → do NOT regenerate.

7. **Reply to the auditor.**
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/comments
   {
     "reply_to": "comment_id",
     "author": "fix-review-bot",
     "body": "Applied: changed finding #3 amount from $1,200,000 to $1,500,000. Version v2 generated. Please review."
   }
   ```

   If the intent was `ambiguous`:
   ```
   body: "I could not interpret your comment on finding #3. Could you clarify whether you want to change the amount, the causal, or add evidence?"
   ```

8. **Handle final approval.**
   If intent = `approve`:
   ```
   DELETE /cases/{id}/labels/needs-human-review
   DELETE /cases/{id}/labels/needs-fix-review
   POST   /cases/{id}/labels   { "name": "claim-denial-ready" }
   PATCH  /cases/{id}          { "status": "claim_denial_ready" }
   ```

   **Requirement**: `approve` is only honored if:
   - The comment author has the auditor role (not another bot).
   - At least one PDF version exists (`v1` or later).

9. **Update `last_processed_at`.** Save the timestamp of the latest comment processed into case metadata so the next run does not reprocess.

## Pitfalls

- **Symptom:** the bot interprets "this is not right" as `approve`. **Cause:** LLM miscalibrated on negations. **Fix:** use a strict enum JSON schema plus few-shot negative examples in the prompt.
- **Symptom:** `approve` applied but the human had asked for edits earlier. **Cause:** the approval comment is newer, but another later comment asked for changes → processed out of order. **Fix:** process comments in ascending chronological order; `approve` only if it is the last one.
- **Symptom:** regenerated a PDF without real changes. **Cause:** intent was `add_evidence` applied to a null field. **Fix:** validate the patch produced a non-empty diff before invoking skill 7.
- **Symptom:** `valor_objetado` ends up negative. **Cause:** human asked "reduce by $500k" and the bot subtracted without validation. **Fix:** enforce `≥ 0`; if negative, reply asking for clarification.
- **Symptom:** bot loops with another bot. **Cause:** both reply to comments. **Fix:** skip if `author` ends in `-bot`; only process human comments.
- **Symptom:** applied changes do not appear in `v2`. **Cause:** PDF regenerated before the PATCH confirmed. **Fix:** PATCH → `GET /consolidated` to verify → only then invoke skill 7.
- **Symptom:** human asks to change the causal but the finding has multiple `rule_ids` mapping to different causales. **Cause:** dedup merged findings with potentially different causales. **Fix:** allow manual causal override; leave a note in `justificacion` that it was a human override.
- **Symptom:** `approve` bypass by an unauthorized author. **Cause:** role not validated. **Fix:** query the author's role in the software; if not auditor, treat as `ask_clarification`.

## Verification

- Every new comment produces an `audit-log` entry with a classified `intent`.
- If changes occurred: a new PDF version (`v{n+1}`) exists more recent than any processed comment.
- If `intent=approve` and valid: the case's current labels include `claim-denial-ready` and exclude `needs-human-review` / `needs-fix-review`.
- `total_objetado ≥ 0` and `≤ invoice_total` after each change.
- Every consolidated change has an `audit-log` entry with non-empty `triggered_by_comment`.
- The same `comment_id` was not processed twice (idempotent via `last_processed_at`).

## References

- Issue [arkangelai/audit-workflow#48](https://github.com/arkangelai/audit-workflow/issues/48).
- Related skill: `medical-invoice-claim-denial-generator` (invoked by this skill).
