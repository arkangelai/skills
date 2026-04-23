---
name: submit-proposal
description: Coordinate Phase 7 after the owner merges the grant draft PR. Confirms merge, verifies v2 on main, builds the Chrome form-fill prompt (no-submit rule), and — after manual owner submit — updates status to SUBMITTED. Use when a grant PR was merged or when asked to "submit grant #NNN".
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, submission, handoff, closeout]
    category: grants
    requires_toolsets: [terminal]
---

# Submit Proposal (Submission)

Submission activates when the owner merges the draft PR. Its job is narrow: confirm the merge, confirm v2 is on main, hand the browser agent a prompt to fill the form without submitting, leave constancy, wait for the owner to confirm manual submission, and then update status + labels + send the closing message. **The agent never submits. The browser agent never submits. Only the project owner submits.**

## When to Use

- The owner merged the draft PR and says "activate Submission for issue #NNN".
- A grant proposal is in state `APPROVED_FOR_SUBMISSION` and needs form-fill orchestration.
- You need to close a submitted cycle (label swap, status update, learnings link).

## Inputs (passed by the caller)

The skill is atomic. The caller passes:

```
ISSUE_NUMBER      e.g. 260
PR_NUMBER         e.g. 42
ORG               GitHub org owning the grants repo
NOMBRE_KEBAB      e.g. horizon-edctp3-digit-02
CARPETA           e.g. 2026-09_HORIZON-EDCTP3-DIGIT-02
TIPO_ENVIO        online form | narrative | mixed
ARCHIVO_V2        source-of-truth file the browser agent reads
ARCHIVOS_ADJUNTOS attachments (if any)
FORMULARIO_URL    funder platform URL, from sources/rules.md or navigation-notes.md
FUNDER            funder name
FUNDER_KEBAB      learnings slug
```

If `TIPO_ENVIO` is `mixed`, define both the main source-of-truth and the attachments explicitly. All GitHub state is read from the PR and Issue at invocation time — the skill does not assume session memory from prior phases.

## Preflight

1. **`gh` access.** Verify `gh` is available and authenticated for `<ORG>/grants`:
   ```bash
   gh auth status
   gh repo view <ORG>/grants --json name --jq '.name'
   ```
   Expected: "Logged in" + `grants`. Abort and report if either fails.
2. **Browser agent.** Phase 7 needs a browser agent to fill the submission form. Before starting, run the preflight in `grants/chrome-navigate-grant/SKILL.md` — it resolves whether the harness has a built-in browser capability and, if not, asks the user which browser agent to use.

## Procedure

After every verification command, compare output to the expected pattern and **abort on mismatch**.

1. **Confirm the PR is actually merged.**
   ```bash
   gh pr view <PR_NUMBER> --repo <ORG>/grants --json state,merged,mergeCommit,url
   ```
   Expected output must contain `"state":"MERGED"` and `"merged":true`. On `OPEN` or `false`, abort — do not advance.

2. **Sync main and assert deliverables exist there.**
   ```bash
   git checkout main && git pull
   ```
   Then assert via `gh api` according to type:
   - Online form: `proposals/<CARPETA>/drafts/field-mapping-responses-v2.md`
   - Narrative: `proposals/<CARPETA>/drafts/proposal-v2.md`
   - Mixed: `<ARCHIVO_V2>` + required `<ARCHIVOS_ADJUNTOS>`

   At minimum `<ARCHIVO_V2>` must exist on main. Required attachments also must exist before advancing. Any 404 → abort.

3. **Prepare the browser-agent prompt.** Exact text to hand off (the browser agent resolved in the Preflight executes it):

   > Browser agent, Phase 7 — fill the form for `<FUNDER>`.
   >
   > Form URL:
   > `<FORMULARIO_URL>`
   >
   > Source-of-truth input (raw URL on main):
   > `https://raw.githubusercontent.com/<ORG>/grants/main/proposals/<CARPETA>/drafts/<ARCHIVO_V2>`
   >
   > Additional attachments / references:
   > `[list or 'none']`
   >
   > Instructions:
   > 1. The owner logs in to the platform.
   > 2. Fill each field with the exact response from the mapping or source file. Do NOT improvise.
   > 3. If the input says `[DATO PENDIENTE]` or `[SECCION PENDIENTE - FLAG N]`, STOP and notify. Do not fill with anything invented.
   > 4. If the form requests an attachment, identify which one and flag if missing.
   > 5. When all fields are complete, do NOT click submit.
   > 6. Emit "Form complete. <X> fields filled. Ready for owner review."
   >
   > Reminder: the owner submits, not you.

4. **Leave constancy on the Issue.**
   ```bash
   gh issue comment <ISSUE_NUMBER> --repo <ORG>/grants --body "Phase 7 ready. Browser-agent prompt handed off. Agent will fill without submitting using source of truth \`proposals/<CARPETA>/drafts/<ARCHIVO_V2>\`. Owner submits."
   gh issue view <ISSUE_NUMBER> --repo <ORG>/grants --comments | tail -5
   ```
   Expected: your most recent comment appears at the tail. Abort on mismatch. Then **exit the skill**. The harness re-invokes this skill for Phase-7 closeout when the owner confirms submission (step 6 onward). If the browser agent reports `[DATO PENDIENTE]`, `[SECCION PENDIENTE]`, a missing attachment, or inconsistencies: emit a blocker artifact and exit; no submission with gaps. If the owner wants last-minute content changes, do NOT edit in Phase 7 — return to Reviewer for v3.

5. **Re-invocation for closeout (Phase 7b).** On a second invocation triggered by the owner's explicit "submitted" signal, proceed to step 6. Otherwise stay exited.

6. **Update `status.md` to SUBMITTED** (after owner confirms).
   ```bash
   git checkout main && git pull
   # Edit proposals/<CARPETA>/status.md with:
   # - Estado actual: SUBMITTED
   # - Fecha de submission: <YYYY-MM-DD>
   # - Versión sometida: drafts/<ARCHIVO_V2>
   # - Tipo de envío: <TIPO_ENVIO>
   # - Issue: #<ISSUE_NUMBER>
   # - PR: #<PR_NUMBER>
   # - Submission realizado por: <owner>
   git add "proposals/<CARPETA>/status.md"
   git commit -m "docs(status): submitted <NOMBRE_KEBAB> — refs #<ISSUE_NUMBER>"
   git push origin main

   gh api "repos/<ORG>/grants/contents/proposals/<CARPETA>/status.md" --jq '.sha'
   ```
   Expected: a non-empty SHA string. On 404 or empty, abort.

7. **Swap Issue labels.**
   ```bash
   gh issue edit <ISSUE_NUMBER> --repo <ORG>/grants --remove-label "draft-for-review" --add-label "submitted"
   gh issue view <ISSUE_NUMBER> --repo <ORG>/grants --json labels --jq '[.labels[].name]'
   ```
   Expected output: a JSON array that includes `submitted` and excludes `draft-for-review`. Abort on mismatch.

8. **Emit the closing briefing (artifact only — the caller decides where to route it).**
   ```
   Submitted — <FUNDER> <grant name>

   - Folder: proposals/<CARPETA>
   - Date: <YYYY-MM-DD>
   - Type: <TIPO_ENVIO>
   - Issue: #<ISSUE_NUMBER> (label: submitted)
   - PR: https://github.com/<ORG>/grants/pull/<PR_NUMBER>
   - Learnings captured in shared-resources/learnings/by-funder/<FUNDER_KEBAB>.md

   Cycle closed.
   ```
   End of the Submission role. Next cycle returns to Scout.

## Pitfalls

- **Symptom:** Caller said "merged", but `gh pr view` shows `OPEN`. **Cause:** The merge did not complete, or the wrong PR was named. **Fix:** Abort and ask the caller to confirm. Do not advance until `merged: true`.
- **Symptom:** Browser agent hits `[DATO PENDIENTE]` mid-form. **Cause:** v2 was not fully depurated. **Fix:** Exit this phase and return to Reviewer for v3. Never submit with pending data.
- **Symptom:** A required attachment is missing from `proposals/<CARPETA>/attachments/`. **Cause:** Attachments were never gathered. **Fix:** Escalate to the caller before advancing. Do not submit incomplete.
- **Symptom:** Owner wants a last-minute copy edit. **Cause:** Post-merge tweaks. **Fix:** Do NOT edit in Phase 7. Return to Reviewer, produce v3, re-merge.
- **Symptom:** Someone clicked submit (agent, browser agent, or CI). **Cause:** Role violation. **Fix:** Stop immediately. Only the owner clicks submit. If it happened, document it and review the cycle.
- **Symptom:** Browser agent improvises responses outside `<ARCHIVO_V2>`. **Cause:** Agent interpreted fields beyond the mapping. **Fix:** Stop the agent, correct with the exact mapping.
- **Symptom:** Phase 7 skill ran straight to closeout before the owner submitted. **Cause:** Ignored the exit-and-re-invoke split in steps 4–5. **Fix:** Phase 7 is two invocations — handoff, then closeout. No in-process wait.

## Verification

- `gh pr view <PR_NUMBER> --json merged --jq '.merged'` returns `true`.
- `gh api repos/<ORG>/grants/contents/proposals/<CARPETA>/status.md --jq '.sha'` returns a non-empty SHA.
- `gh issue view <ISSUE_NUMBER> --json labels --jq '[.labels[].name]'` contains `submitted` and not `draft-for-review`.
- Closing briefing artifact was emitted to stdout (the caller forwards it wherever needed).

## References

- `grants/README.md`
- `grants/chrome-navigate-grant/SKILL.md` — how the browser agent fills forms (Role B).
- `grants/review-grant/SKILL.md` — the previous role and v3 path for last-minute changes.
