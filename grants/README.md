# Grants Skills

This folder exposes **8 top-level skills** for taking a grant from discovery to submission. The public workflow is intentionally simple. Research, funder-fit analysis, evidence gathering, section writing, and PR-response work are still present, but they now live **inside** the top-level skills instead of appearing as separate top-level steps.

## Pipeline

```
1. scout-grants
2. chrome-navigate
3. develop-proposal
4. develop-timeline
5. develop-budget
6. grant-review
7. polish-grant
8. submit
```

## Skills

| Skill | Purpose |
|---|---|
| `scout-grants/` | Find opportunities, evaluate fit and eligibility, capture the opportunity in GitHub when available, and prepare the proposal workspace when the owner says go. |
| `chrome-navigate/` | Use a browser-capable agent to enrich an opportunity by extracting rules, eligibility, evaluation criteria, form fields, and templates; later reuse it to fill the final form without submitting. |
| `develop-proposal/` | Produce the first strong draft of the proposal from the source pack, including evidence gathering, section writing, and first-pass structure. |
| `develop-timeline/` | Build the project timeline so methods, staffing, reporting, and delivery are feasible. |
| `develop-budget/` | Build the budget and justification so the numbers tell the same story as the methods and timeline. |
| `grant-review/` | Run the full pre-submit review: weighted scoring, funder-alignment check, blocker list, v2 rewrite, and learnings capture. |
| `polish-grant/` | Read PR comments and owner feedback, apply accepted changes, reply to threads, and ship clean follow-up versions. |
| `submit/` | Verify the approved source of truth, reuse `chrome-navigate/` for form-fill, stop before submit, then close the loop after the owner submits. |

## Operating Model

- Every skill is atomic. The caller passes identifiers or paths; the skill reads the current state fresh.
- GitHub is preferred, but not required. If the grants repo or `gh` is unavailable, the skill should emit the same artifact in the conversation and write locally when possible.
- No skill polls, sleeps, runs cron, or sends notifications on its own.
- The browser agent never drafts. The drafting agent never submits.
- The owner remains the only human approval gate for: pursuing an opportunity, merging the reviewed draft, and clicking final submit.

## Standard Artifacts

Each opportunity should still converge on:

`proposals/YYYY-MM_Name/`
- `sources/`
- `drafts/`
- `attachments/`
- `final/`

If GitHub is unavailable, use the same folder structure locally and mirror the summary artifact in the conversation.

## Cross-Cutting Rules

- **Never invent data.** Use `[DATO PENDIENTE - requiere input de owner]`.
- **Verify before advancing.** If a branch, file, issue, PR, or label is expected, assert it exists before claiming success.
- **Keep the public workflow simple.** If a task feels like "section writing", "literature review", or "funder-fit scoring", perform it inside the appropriate top-level skill instead of surfacing a separate top-level step.
- **Only the owner submits.** Agents may prepare and fill; they do not click submit.

## References

- `shared-resources/50_TIPS_GANAR_GRANTS.md`
- `shared-resources/learnings/INDEX.md`
- The current project's `CLAUDE.md`
