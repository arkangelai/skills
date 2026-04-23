---
name: chrome-navigate
description: Use a browser-capable agent to navigate a grant portal, extract rules and form structure, download templates, and later fill the final application without submitting. Use after scouting and again at submission time.
---

# Chrome Navigate

This skill is reused twice:

- `mode=navigate` to enrich the opportunity before drafting
- `mode=submit` to fill the approved application before the owner clicks submit

## When to Use

- After `scout-grants` identifies a real opportunity and the owner says `go`
- When the proposal needs official rules, eligibility notes, evaluation criteria, or form-field mapping
- After the proposal is approved and needs browser-assisted form fill

## Preflight

Before doing anything:

1. Resolve which browser-capable tool or agent will be used.
2. Confirm the owner, not the agent, will perform any login.
3. Confirm the destination folder or artifact path where outputs should land.

If no browser capability exists, stop and report that clearly.

## Mode `navigate`

Goal: create the source pack that `develop-proposal` will read.

### Produce

- `sources/rules.md`
- `sources/eligibility.md`
- `sources/evaluation-criteria.md`
- `sources/form-fields.md` if a form exists
- `sources/navigation-notes.md`
- downloaded templates in `sources/downloaded/` when available

### Workflow

1. Open the official opportunity page.
2. Determine submission type: `online form`, `downloadable narrative`, or `mixed`.
3. Extract the call rules, eligibility, evaluation criteria, and deadlines.
4. If a portal exists, map visible fields without filling them.
5. Download templates and supporting files where allowed.
6. Save outputs to GitHub if available; otherwise save locally and summarize in the conversation.

### `form-fields.md` minimum fields

- exact field name
- field type
- limit
- required or optional
- options
- placeholder
- page or step
- ambiguity flag when needed

## Mode `submit`

Goal: fill the approved application without submitting.

### Inputs

- approved source-of-truth file (`proposal-v2.md`, `proposal-v3.md`, or field mapping file)
- attachment list
- final form URL

### Workflow

1. Open the live form fresh.
2. Have the owner log in if needed.
3. Fill fields from the approved source-of-truth only.
4. Stop immediately if a required field still contains `[DATO PENDIENTE]` or `[SECCION PENDIENTE]`.
5. Upload required attachments.
6. Perform a final visual check.
7. Emit: `Form complete. Ready for owner review.`
8. Do **not** click submit.

## GitHub Fallback

If GitHub is unavailable, save locally and mirror a concise source summary in the conversation. The skill should not fail purely because it cannot create a PR or upload via `gh`.

## Pitfalls

- Filling fields during `mode=navigate`
- Using stale or unofficial call pages
- Entering credentials instead of letting the owner do it
- Improvising content in `mode=submit`
- Claiming completion before verifying all expected source artifacts exist

## References

- `grants/scout-grants/SKILL.md`
- `grants/develop-proposal/SKILL.md`
- `grants/submit/SKILL.md`
