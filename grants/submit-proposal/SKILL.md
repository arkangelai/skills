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

## Procedure

### Variables

```
ISSUE_NUMBER      = inherited
NOMBRE_KEBAB      = inherited
CARPETA           = inherited
PR_NUMBER         = inherited
TIPO_ENVIO        = online form | narrative | mixed
ARCHIVO_V2        = source-of-truth file Chrome reads
ARCHIVOS_ADJUNTOS = attachments (if any)
FORMULARIO_URL    = funder platform URL, from sources/rules.md or navigation-notes.md
FUNDER            = funder name
FUNDER_KEBAB      = learnings slug
```

If `TIPO_ENVIO` is mixed, define both the main source-of-truth and the attachments explicitly.

### Steps

1. **Confirm the PR is actually merged.**
   ```bash
   gh pr view <PR_NUMBER> --repo <org>/grants --json state,merged,mergeCommit,url
   ```
   Output must contain `"state":"MERGED"` and `"merged":true`. If `OPEN` or `false`, do not advance.

2. **Sync main and verify deliverables exist there.**
   ```bash
   git checkout main && git pull
   ```
   Then verify via `gh api` according to type:
   - Online form: `proposals/<CARPETA>/drafts/field-mapping-responses-v2.md`
   - Narrative: `proposals/<CARPETA>/drafts/proposal-v2.md` (+ `proposal-v2.docx` if generated)
   - Mixed: `<ARCHIVO_V2>` + required `<ARCHIVOS_ADJUNTOS>`

   At minimum `<ARCHIVO_V2>` must exist on main. Required attachments also must exist before advancing. Any 404 → stop.

3. **Prepare the Chrome prompt.** Exact text to hand the owner to forward:

   > Chrome, Phase 7 — fill the form for `<FUNDER>`.
   >
   > Form URL:
   > `<FORMULARIO_URL>`
   >
   > Source-of-truth input (raw URL on main):
   > `https://raw.githubusercontent.com/<org>/grants/main/proposals/<CARPETA>/drafts/<ARCHIVO_V2>`
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
   > 6. Notify the owner when the form is ready for final review.
   >
   > Reminder: the owner submits, not you.

4. **Leave constancy on the Issue.**
   ```bash
   gh issue comment <ISSUE_NUMBER> --repo <org>/grants --body "Phase 7 ready. Chrome prompt handed off. Chrome will fill without submitting using source of truth \`proposals/<CARPETA>/drafts/<ARCHIVO_V2>\`. Owner submits."
   gh issue view <ISSUE_NUMBER> --repo <org>/grants --comments | tail -10
   ```
   Then **stop**. Wait for the owner to confirm submit, or for Chrome to report a blocker.

5. **Wait for owner confirmation of submit.** Do not advance until you hear an explicit "Submitted, continue with status.md". If Chrome reports `[DATO PENDIENTE]`, `[SECCION PENDIENTE]`, a missing attachment, or inconsistencies: alert the owner immediately; no submission with gaps. If the owner wants last-minute content changes, do NOT edit in Phase 7 — go back to Reviewer for v3.

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

   gh api "repos/<org>/grants/contents/proposals/<CARPETA>/status.md" --jq '.sha'
   ```
   Must return a SHA, not 404.

7. **Swap Issue labels.**
   ```bash
   gh issue edit <ISSUE_NUMBER> --repo <org>/grants --remove-label "draft-for-review" --add-label "submitted"
   gh issue view <ISSUE_NUMBER> --repo <org>/grants --json labels --jq '[.labels[].name]'
   ```
   Output must include `submitted` and exclude `draft-for-review`.

8. **Send the owner the closing DM.** Format:
   ```
   Submitted — <FUNDER> <grant name>

   - Folder: proposals/<CARPETA>
   - Date: <YYYY-MM-DD>
   - Type: <TIPO_ENVIO>
   - Issue: #<ISSUE_NUMBER> (label: submitted)
   - PR: https://github.com/<org>/grants/pull/<PR_NUMBER>
   - Learnings captured in shared-resources/learnings/by-funder/<FUNDER_KEBAB>.md

   Cycle closed.
   ```
   End of the Submission role. Next cycle returns to Scout.

## Pitfalls

- **Symptom:** Owner said "merged", but `gh pr view` shows `OPEN`. **Cause:** The merge did not complete, or the owner confused PRs. **Fix:** Ask the owner to confirm. Do not advance until `merged: true`.
- **Symptom:** Chrome hits `[DATO PENDIENTE]` mid-form. **Cause:** v2 was not fully depurated. **Fix:** Stop the cycle. Go back to Reviewer for v3. Never submit with pending data.
- **Symptom:** A required attachment is missing from `proposals/<CARPETA>/attachments/`. **Cause:** Attachments were never gathered. **Fix:** Escalate to the owner before advancing. Do not submit incomplete.
- **Symptom:** Owner wants a last-minute copy edit. **Cause:** Post-merge tweaks. **Fix:** Do NOT edit in Phase 7. Return to Reviewer, produce v3, re-merge.
- **Symptom:** Someone clicked submit (agent, Chrome, or CI). **Cause:** Role violation. **Fix:** Stop immediately. Only the owner clicks submit. If it happened, document it and review the cycle.
- **Symptom:** Chrome improvises responses outside `<ARCHIVO_V2>`. **Cause:** Chrome interpreted fields beyond the mapping. **Fix:** Stop Chrome, correct with the exact mapping.

## Verification

- `gh pr view <PR_NUMBER> --json merged --jq '.merged'` returns `true`.
- `gh api repos/<org>/grants/contents/proposals/<CARPETA>/status.md --jq '.sha'` returns a SHA.
- `gh issue view <ISSUE_NUMBER> --json labels --jq '[.labels[].name]'` contains `submitted` and not `draft-for-review`.
- Owner received the closing DM.

## References

- `grants/pipeline-overview/SKILL.md`
- `grants/chrome-navigate-grant/SKILL.md` — how the browser agent fills forms (Role B).
- `grants/review-proposal/SKILL.md` — the previous role and v3 path for last-minute changes.
- `grants/slack-briefings/SKILL.md` — closing message format.
