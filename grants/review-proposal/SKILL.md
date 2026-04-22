---
name: review-proposal
description: Run a brutal sub-agent review of a v1 grant draft (6 checklist blocks A-F), apply ALL BLOCKERs into a clean v2, capture learnings, and hand off to the owner for merge. Use when a v1 PR has `draft-for-review`, when asked to "review this grant draft", or when activating Reviewer (Phases 4-6).
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, review, quality, depurador]
    category: grants
    requires_toolsets: [terminal]
---

# Review Proposal (Reviewer)

Reviewer audits the v1 with full skepticism, produces an independent self-review, applies every BLOCKER into a clean v2 (source of truth for the submission), captures organizational learnings, and prepares the draft for the owner to merge. Phase 4 must be brutal: if the sub-agent doesn't find at least 3 BLOCKERs on first pass, relaunch it.

## When to Use

- A v1 draft PR exists with label `draft-for-review`.
- The project owner says "start Reviewer for issue #NNN / PR #MMM".
- You are asked to "review this grant draft" or "depurate this proposal".
- You need to re-run review after v2 owner comments require a v3.

## Procedure

### Variables

```
ISSUE_NUMBER  = inherited from Writer
NOMBRE_KEBAB  = inherited from Writer
CARPETA       = inherited from Writer
BRANCH        = draft/<NOMBRE_KEBAB>
PR_NUMBER     = from gh pr list in Writer step 11
ARCHIVO_V1    = field-mapping-responses.md | proposal-v1.md
ARCHIVO_V2    = field-mapping-responses-v2.md | proposal-v2.md
FUNDER_KEBAB  = slug for learnings/by-funder
```

### Phase 4 — Independent review

1. **Launch a sub-agent with a clean context.** Exact prompt (substitute variables):

   > You are Reviewer, a skeptical senior editor of health and AI grants. You do not know the author. You have no prior memory. Assume a junior colleague wrote the draft. Your incentive is to find reasons to reject it before the funder does. If you don't find at least 3 BLOCKERs, re-read — unless you can justify block-by-block why none exist.
   >
   > Your only task: produce `drafts/self-review-v1.md` with the 6-block checklist. Do NOT modify the draft.
   >
   > The draft lives on branch `draft/<NOMBRE_KEBAB>`, not main. Try reading from the branch first. If a source is missing there, fall back to main. You MUST commit + push `self-review-v1.md` to `draft/<NOMBRE_KEBAB>`. Before reporting done, verify with `gh api` that the file exists in the branch.
   >
   > Read in this order:
   > 1. v1 draft on branch
   > 2. `evaluation-criteria.md`
   > 3. `rules.md`
   > 4. `form-fields.md` (if exists)
   > 5. `50_TIPS_GANAR_GRANTS.md`
   > 6. `learnings/by-funder/<FUNDER_KEBAB>.md` (if exists)
   >
   > Checklist blocks:
   > - **A — Completeness**
   > - **B — Limits and format**
   > - **C — Alignment with evaluation criteria** (most important)
   > - **D — Content quality**
   > - **E — Veracity** (zero tolerance for hallucinations)
   > - **F — Best practices**
   >
   > Any criterion with quality ≤ 2 is a BLOCKER. Any veracity failure is a CRITICAL BLOCKER.
   >
   > Output structure for `self-review-v1.md`:
   > ```
   > # Review report — <opportunity>
   > **Reviewed by:** Reviewer (sub-agent)
   > **Date:** YYYY-MM-DD
   > **Draft reviewed:** <ARCHIVO_V1>
   > **Mode:** sub-agent review
   >
   > ## Executive summary
   > ## Result
   > - BLOCKERs: [N]
   > - Suggested improvements: [N]
   > - Score vs criteria: [X/Y]
   > ## BLOCKERs (must resolve before submission)
   > ## Suggested improvements
   > ## Full checklist
   > ## Notes for depurador (Phase 5)
   > ## Organizational learnings to capture
   > ## Notes for the owner
   > ```
   > Commit + push + verify with:
   > `gh api "repos/<org>/grants/contents/proposals/<CARPETA>/drafts/self-review-v1.md?ref=draft/<NOMBRE_KEBAB>" --jq '.name'`

2. **Verify `self-review-v1.md` exists on the branch (blocking).**
   ```bash
   gh api "repos/<org>/grants/contents/proposals/<CARPETA>/drafts/self-review-v1.md?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
   ```
   Must return `self-review-v1.md`. On 404, the sub-agent did not push — do not advance.

3. **Audit the sub-agent's rigor.** Count BLOCKERs. If < 3, relaunch with: *"Your first review was lenient. Redo with rejection incentive. Minimum 3 BLOCKERs or demonstrate block-by-block why none apply."*

### Phase 5 — Depurate into v2 + learnings

4. **Switch to the PR branch.**
   ```bash
   git fetch origin draft/<NOMBRE_KEBAB>
   git checkout draft/<NOMBRE_KEBAB>
   git pull
   git branch --show-current   # must print draft/<NOMBRE_KEBAB>
   ```

5. **Produce v2 applying every BLOCKER.** Rules:
   - Apply all BLOCKERs.
   - Apply improvements unless they contradict a BLOCKER.
   - Use `[DATO PENDIENTE - requiere input de owner]` where info is missing.
   - Use `[SECCION PENDIENTE - FLAG N: ...]` for open FLAGs.
   - No internal comments in the body. v2 must read as a final submission.
   - If gaps remain, close with `## Gaps pendientes`.
   Write to `proposals/<CARPETA>/drafts/<ARCHIVO_V2>`.

6. **Produce `learnings-v1.md`** at `proposals/<CARPETA>/drafts/learnings-v1.md` with: date, funder, opportunity, top 3 observations, funder patterns, writing errors to avoid, recommendations for future applications, human decisions required.

7. **Generate `.docx` only for narrative proposals** (not for online forms).
   ```bash
   pandoc "proposals/<CARPETA>/drafts/proposal-v2.md" -o "proposals/<CARPETA>/drafts/proposal-v2.docx"
   ls -la "proposals/<CARPETA>/drafts/proposal-v2.docx"
   ```
   For `field-mapping-responses-v2.md`, skip this step.

8. **Update global learnings (append-only, never overwrite):**
   - `shared-resources/learnings/INDEX.md`
   - `shared-resources/learnings/by-funder/<FUNDER_KEBAB>.md` (create if missing)

9. **Commit v2 + learnings with triple verification.**
   ```bash
   git add "proposals/<CARPETA>/drafts/" "shared-resources/learnings/"
   git commit -m "fix(proposal): v2 + learnings for <NOMBRE_KEBAB> — refs #<ISSUE_NUMBER>"
   git push origin draft/<NOMBRE_KEBAB>

   # Verify all three artifacts are on the branch:
   gh api "repos/<org>/grants/contents/proposals/<CARPETA>/drafts/<ARCHIVO_V2>?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
   gh api "repos/<org>/grants/contents/proposals/<CARPETA>/drafts/learnings-v1.md?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
   gh api "repos/<org>/grants/contents/proposals/<CARPETA>/drafts/self-review-v1.md?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
   ```
   Paste all three outputs. Any 404 → do not advance.

### Phase 6 — Handoff to the owner

10. **Update `status.md` to READY_FOR_HUMAN_REVIEW** with PR link, v2 and learnings paths, date. Commit + push.

11. **Leave a summary comment on the Issue** with: PR link, BLOCKERs found, improvements applied, principal v1→v2 changes, open FLAGs (or "none"). Verify with `gh issue view`.

12. **Send the owner a Slack DM** with 3 blocks: (1) links (docx / md source of truth / self-review / learnings); (2) executive review summary (≤ 6 lines); (3) open FLAGs needing the owner's decision. Close with what you expect: approve (merge), return docx with edits, or resolve FLAGs.

13. **Wait for the merge.** Do not advance to Submission until the owner merges. If owner requests changes on the PR: apply them in the branch, regenerate docx if applicable, commit + push, verify with `gh api`, reply to the comment. If 24h silent, send one reminder, max.

## Pitfalls

- **Symptom:** Sub-agent reports 0-1 BLOCKERs. **Cause:** Lenient context or memory leak from the Writer. **Fix:** Relaunch with the stricter prompt in Step 3. Do not accept "no blockers" without block-by-block justification.
- **Symptom:** `proposal-v2.md` has internal comments or review notes. **Cause:** Forgot it's the source of truth. **Fix:** v2 must be submission-ready. Put all commentary in `self-review-v1.md`.
- **Symptom:** You accidentally commit to main. **Cause:** Forgot to checkout the PR branch. **Fix:** Always run `git branch --show-current` before any commit — must print `draft/<NOMBRE_KEBAB>`.
- **Symptom:** `learnings/INDEX.md` got overwritten. **Cause:** Used `>` instead of `>>` or edited without append rule. **Fix:** Learnings are append-only. Always add a dated entry at the end; never delete prior entries.
- **Symptom:** You merged the PR yourself. **Cause:** Role violation. **Fix:** Reviewer never merges. Only the project owner does.

## Verification

- `gh api "contents/.../drafts/self-review-v1.md?ref=draft/<NAME>" --jq '.name'` returns the filename.
- Same for `<ARCHIVO_V2>` and `learnings-v1.md`.
- `status.md` shows READY_FOR_HUMAN_REVIEW.
- Issue has a Phase-6 summary comment.
- Global `learnings/INDEX.md` has a new dated entry (verify with `git log -1 shared-resources/learnings/INDEX.md`).

## References

- `grants/grant-review-6d/SKILL.md` — the 6-dimension framework for the checklist.
- `grants/pipeline-overview/SKILL.md`
- `grants/draft-proposal/SKILL.md` — the previous role (Writer).
- `grants/submit-proposal/SKILL.md` — the next role after the owner merges.
- `shared-resources/50_TIPS_GANAR_GRANTS.md`
