---
name: review-grant
description: Full critical review of a grant — brutal impartial audit across 6 weighted dimensions (Funder 25/Impact 20/Science 20/Feasibility 15/Budget 10/Writing 10), 50-tips compliance, org-alignment, and auto-fail checks. Produces a graded A-F self-review, applies every BLOCKER into a clean v2, captures learnings, and hands off to the owner. Use when a v1 PR has `draft-for-review`, when invoked to "review this grant", "score this proposal", or "pre-submit audit", or when activating the Reviewer role (Phases 4-6). The scoring rubric is also usable as a standalone audit on any completed grant (skip Phases 5-6).
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, review, quality, scoring, pre-submit]
    category: grants
    requires_toolsets: [terminal]
---

# Review Proposal (Reviewer)

Audits a v1 draft with full skepticism using a 6-dimension weighted rubric, produces a self-review report, applies every BLOCKER into a clean v2 (source of truth for the submission), captures organizational learnings, and prepares the draft for the owner to merge. Phase 4 must be brutal: if the first pass doesn't find at least 3 BLOCKERs, redo the review with a stricter mindset.

## When to Use

- A v1 draft PR exists with label `draft-for-review`.
- The caller invokes "Reviewer for issue #NNN / PR #MMM".
- "Review this grant draft" / "score this proposal" / "pre-submit scrub".
- Re-running review after v2 owner comments require a v3.
- Standalone audit of a completed proposal (use the rubric in Phase 4 only; skip Phases 5–6 if you don't need to produce v2).

## Inputs (passed by the caller)

The skill is atomic — it does not inherit session state from a prior invocation. The caller passes:

```
ISSUE_NUMBER     e.g. 260
PR_NUMBER        e.g. 42          (skip if standalone audit)
ORG              GitHub org owning the grants repo
NOMBRE_KEBAB     e.g. horizon-edctp3-digit-02   (derivable from branch name)
CARPETA          e.g. 2026-09_HORIZON-EDCTP3-DIGIT-02   (derivable from folder on branch)
FUNDER_KEBAB     slug for shared-resources/learnings/by-funder/<slug>.md
```

Branch name is always `draft/<NOMBRE_KEBAB>`. File conventions:
- Online-form drafts: `field-mapping-responses.md` (v1) → `field-mapping-responses-v2.md` (v2)
- Narrative drafts: `proposal-v1.md` → `proposal-v2.md`

## Preflight

Before executing, verify:
1. `gh` is available and authenticated for `<ORG>/grants`:
   ```bash
   gh auth status
   gh repo view <ORG>/grants --json name --jq '.name'
   ```
   If either fails, abort and report the missing access to the caller. Do not attempt to install `gh` — the caller configures their harness.
2. `git` is available and the repo is a working tree for `<ORG>/grants`.

## Procedure

Execute one step at a time. After every verification command, compare output to the expected pattern below the command and **abort on mismatch** — do not report success from local state alone.

### Phase 4 — Independent review

1. **Produce `self-review-v1.md` using the 6-dimension rubric (see "Scoring Rubric" below).** Two execution modes:

   - **Preferred: fresh-context sub-agent** — if the harness supports sub-agents, launch one with a clean context using the prompt in "Sub-agent prompt" below. Sub-agents reduce author-bias.
   - **Fallback: fresh mental pass** — if the harness does not support sub-agents, perform the review yourself with the same impartial mindset. Pretend you did not write the draft. Apply the exact same rubric, output format, and brutality bar.

   Either way, the output is `proposals/<CARPETA>/drafts/self-review-v1.md` committed to `draft/<NOMBRE_KEBAB>`.

2. **Assert `self-review-v1.md` exists on the branch (blocking).**
   ```bash
   gh api "repos/<ORG>/grants/contents/proposals/<CARPETA>/drafts/self-review-v1.md?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
   ```
   Expected output: `self-review-v1.md`. On 404 or any other response, abort — the commit did not land.

3. **Audit rigor.** Count BLOCKERs in the self-review. If < 3, redo the review with: *"Your first pass was lenient. Redo with rejection incentive. Minimum 3 BLOCKERs or demonstrate block-by-block why none apply."* Any dimension scoring ≤ 2 is a BLOCKER. Any veracity failure is a CRITICAL BLOCKER.

### Phase 5 — Depurate into v2 + learnings

4. **Switch to the PR branch and assert.**
   ```bash
   git fetch origin draft/<NOMBRE_KEBAB>
   git checkout draft/<NOMBRE_KEBAB>
   git pull
   git branch --show-current
   ```
   Expected output of the last command: `draft/<NOMBRE_KEBAB>`. On mismatch, abort.

5. **Produce v2 applying every BLOCKER.** Rules:
   - Apply all BLOCKERs.
   - Apply improvements unless they contradict a BLOCKER.
   - Use `[DATO PENDIENTE - requiere input de owner]` where info is missing.
   - Use `[SECCION PENDIENTE - FLAG N: ...]` for open FLAGs.
   - No internal comments in the body. v2 must read as a final submission.
   - If gaps remain, close with `## Gaps pendientes`.
   Write to `proposals/<CARPETA>/drafts/<ARCHIVO_V2>` (where `<ARCHIVO_V2>` is `proposal-v2.md` or `field-mapping-responses-v2.md` depending on deliverable type).

6. **Produce `learnings-v1.md`** at `proposals/<CARPETA>/drafts/learnings-v1.md` with: date, funder, opportunity, top 3 observations, funder patterns, writing errors to avoid, recommendations for future applications, human decisions required.

7. **Update global learnings (append-only, never overwrite):**
   - `shared-resources/learnings/INDEX.md`
   - `shared-resources/learnings/by-funder/<FUNDER_KEBAB>.md` (create if missing)

8. **Commit v2 + learnings with triple verification.**
   ```bash
   git add "proposals/<CARPETA>/drafts/" "shared-resources/learnings/"
   git commit -m "fix(proposal): v2 + learnings for <NOMBRE_KEBAB> — refs #<ISSUE_NUMBER>"
   git push origin draft/<NOMBRE_KEBAB>

   gh api "repos/<ORG>/grants/contents/proposals/<CARPETA>/drafts/<ARCHIVO_V2>?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
   gh api "repos/<ORG>/grants/contents/proposals/<CARPETA>/drafts/learnings-v1.md?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
   gh api "repos/<ORG>/grants/contents/proposals/<CARPETA>/drafts/self-review-v1.md?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
   ```
   Each call must return its filename. Any 404 or empty response → abort.

### Phase 6 — Handoff to the owner

9. **Update `status.md` to READY_FOR_HUMAN_REVIEW** with PR link, v2 and learnings paths, date. Commit + push. Assert the file exists on branch with `gh api ... --jq '.name'`.

10. **Leave a summary comment on the Issue** with: PR link, BLOCKERs found, improvements applied, principal v1→v2 changes, open FLAGs (or "none"). Verify with:
    ```bash
    gh issue view <ISSUE_NUMBER> --repo <ORG>/grants --comments | tail -5
    ```
    Expected: your most recent comment appears at the tail.

11. **Produce the Phase-6 handoff briefing** (artifact only — delivery is the caller's job). 3 blocks in this exact order:

    **Block 1 — Links (absolute GitHub URLs):**
    - Source of truth: `proposal-v2.md` (or `field-mapping-responses-v2.md`)
    - Reviewer comments: `self-review-v1.md`
    - Learnings captured: `learnings-v1.md`

    **Block 2 — Executive review summary (≤ 6 lines):**
    - BLOCKERs found + BLOCKERs applied
    - Improvements suggested + improvements applied
    - 3–5 principal v1 → v2 changes

    **Block 3 — Open FLAGs (decisions only the owner can make):**
    - Short list (detail in Issue comment)
    - Or "None"

    **Closing line:** what's expected from the owner — approve (merge), return with edits, or resolve FLAGs.

12. **Exit and wait for the merge event.** The skill does not poll or sleep: exit cleanly after Step 11. The harness re-invokes on `pull_request: closed` + merged, or on manual trigger. If the owner requests changes on the PR, the harness re-invokes this skill at Phase 5 — apply the changes in the branch, commit + push, assert with `gh api`, reply to the comment, and exit again. Reminder cadence for silent PRs is the harness's job.

## Scoring Rubric (6 dimensions)

The self-review file must score each dimension 1–5 with detailed findings. Weights sum to 100%; the weighted average maps to an A-F grade.

### Required context before scoring

Read in this order:
1. v1 draft on `draft/<NOMBRE_KEBAB>`
2. `sources/evaluation-criteria.md`
3. `sources/rules.md`
4. `sources/form-fields.md` (if exists)
5. `sources/eligibility.md`
6. `shared-resources/50_TIPS_GANAR_GRANTS.md`
7. `shared-resources/Arkangel_alineacion_para_grants.md` (or equivalent org-alignment doc)
8. `shared-resources/learnings/by-funder/<FUNDER_KEBAB>.md` (if exists)
9. Funder-specific tip files if present (e.g., `shared-resources/50_TIPS_BARDA_ESPECIFICO.md`)

Read everything. Do not score without the full context.

### Dimensions

**1. Funder Alignment (25%)**
- Responds exactly to the call (Tip #2)?
- Language matches funder's terminology?
- Funder-specific priorities explicitly addressed?
- Target population aligned with funder focus?
- Geographic focus appropriate?
- Uses the funder's evaluation-criteria language?

**2. Problem & Impact (20%)** (Tips #11–20)
- Problem defined in human terms, not technical (Tip #11)?
- Numbers current, credible, cited (Tip #12)?
- Urgency established — why NOW (Tip #13)?
- Consequences of inaction clear (Tip #14)?
- Impact measurable with specific metrics (Tip #18)?
- Real adoption/scalability plan (Tip #19)?
- Answers "and then what?" (Tip #20)?
- Beneficiaries explicitly identified (Tip #17)?

**3. Scientific Design & Methodology (20%)** (Tips #21–30)
- As simple as possible but complete (Tip #21)?
- Every methodological decision justified (Tip #23)?
- Success/failure criteria measurable (Tip #24)?
- Biases anticipated and controlled (Tip #25)?
- If AI used, advantage over traditional methods clear (Tip #26)?
- Limitations shown and addressed (Tip #27)?
- Analysis plan concrete, not narrative (Tip #28)?
- Objectives SMART; 3–4 solid > 10 weak (Tip #8)?

**4. Feasibility & Execution (15%)** (Tips #31–40)
- Prior similar work demonstrated (Tip #31)?
- Preliminary results / pilots / proof of concept (Tip #32)?
- Every work package has clear deliverables (Tip #33)?
- Timeline realistic, not over-ambitious (Tip #34)?
- Risks with credible Plan B's (Tip #35)?
- Critical tasks NOT in final quarter (Tip #36)?
- Governance clear — who leads, who executes (Tip #39)?
- All partners essential, no decorative partners (Tip #38)?
- Team expertise appropriate for every role?

**5. Budget & Format (10%)** (Tips #41–45)
- Budget tells the same story as the text (Tip #41)?
- Each expense justified and necessary (Tip #43)?
- Costs reasonable and defensible (Tip #42)?
- Exact format and limits respected (Tip #45)?
- No expenses the grant explicitly doesn't fund (Tip #44)?
- Personnel time allocations add up?

**6. Writing & Communication (10%)** (Tips #46–50 + the "uncomfortable truth")
- Evaluator can understand in 5 minutes (Tip #6)?
- Idea fits in one clear sentence (Tip #3)?
- Impact > methodological elegance (Tip #4)?
- Good story supports the technical model (Tip #5)?
- Titles informative (Tip #46)?
- One idea per paragraph (Tip #47)?
- Strategic use of bullets (Tip #48)?
- Language clear for non-expert (Tip #49)?
- Active voice, short sentences, accessible?

### Org alignment check

Using the org-alignment doc:
- Core capabilities correctly represented
- Key impact numbers included (people served, hospitals, countries)
- Positioning appropriate for this funder
- Published evidence and compliance cited
- No false capability claims

### Auto-fail check

Any one triggers a fail warning:
- NGO-only / academic-only eligibility claimed when not applicable
- Individual fellowship language used
- Non-healthcare sector language (if health-AI org)
- Pure education/training (not product deployment)
- No direct clinical data application
- Unsupported claims without citations
- References older than 5 years as primary evidence
- Missing required sections per funder guidelines

### 50-tips compliance

Run all 50 tips, mark each: PASS / PARTIAL / FAIL / N/A. Group by category (Mindset, Problem, Design, Feasibility, Budget, Writing).

### Output format (exact)

```
# Review report — <opportunity>
**Reviewed by:** Reviewer (sub-agent or self)
**Date:** YYYY-MM-DD
**Draft reviewed:** <ARCHIVO_V1>
**Mode:** sub-agent | self
**Overall Grade:** <A-F> (<weighted>/5)

---

## EXECUTIVE SUMMARY
<2-3 sentences: Is this competitive? Biggest strength? Biggest weakness?>

---

## SCORES BY DIMENSION
| Dimension | Score (1-5) | Weight | Weighted | Key Issue |
|-----------|-------------|--------|----------|-----------|
| Funder Alignment | X | 25% | X.XX | <one-liner> |
| Problem & Impact | X | 20% | X.XX | <one-liner> |
| Scientific Design | X | 20% | X.XX | <one-liner> |
| Feasibility | X | 15% | X.XX | <one-liner> |
| Budget & Format | X | 10% | X.XX | <one-liner> |
| Writing & Comms | X | 10% | X.XX | <one-liner> |
| **TOTAL** | | **100%** | **X.XX/5** | |

Grade mapping: A: 4.5-5.0 | B: 3.5-4.4 | C: 2.5-3.4 | D: 1.5-2.4 | F: 1.0-1.4

---

## BLOCKERs (must resolve before submission)
<Numbered, specific — section + problem + fix>

## MAJOR ISSUES (strongly recommended fixes)

## MINOR ISSUES (polish items)

---

## STRENGTHS (what works well)

---

## 50 TIPS COMPLIANCE
| # | Tip | Status | Notes |

**Summary:** X/50 PASS | X/50 PARTIAL | X/50 FAIL | X/50 N/A

---

## ORG ALIGNMENT CHECK
- [ ] Core capabilities correctly represented
- [ ] Key impact numbers included
- [ ] Appropriate positioning for funder
- [ ] Published evidence referenced
- [ ] No false capability claims

---

## AUTO-FAIL CHECK
<Each criterion: PASS/FAIL>

---

## TOP 5 RECOMMENDATIONS (prioritized)
1. <Most impactful — what, where, why>
2.
3.
4.
5.

---

## Notes for depurador (Phase 5)
## Organizational learnings to capture
## Notes for the owner
```

### Hard rules

1. **Impartial.** Review as if from an unknown organization. No leniency.
2. **Specific.** Not "methodology is weak". Say: "Section 3.2 lacks justification for logistic regression over competing approaches. Add a comparison table."
3. **Cite the tips.** When a tip is violated, reference the number ("Violates Tip #34: 3 critical milestones in the final quarter").
4. **Read everything.** Do not review without reading all available files first.
5. **No sugar-coating.** Find every weakness before the funder does.
6. **Actionable feedback.** Every issue includes a specific recommendation.
7. **Use the funder's lens.** Evaluate through the specific funder's criteria, not generic quality.
8. **Respect the uncomfortable truth.** Most grants are lost due to poor communication, not poor science. Prioritize clarity issues.

## Sub-agent prompt (Phase 4, Step 1, preferred mode)

Launch a sub-agent with a clean context using this prompt (substitute variables):

> You are Reviewer, a skeptical senior editor of health and AI grants. You do not know the author. You have no prior memory. Assume a junior colleague wrote the draft. Your incentive is to find reasons to reject it before the funder does. If you don't find at least 3 BLOCKERs, re-read — unless you can justify block-by-block why none exist.
>
> Your only task: produce `drafts/self-review-v1.md` in the exact format and with the exact rubric defined in `grants/review-grant/SKILL.md` (6 dimensions, 50-tips table, org-alignment, auto-fail, top-5 recommendations, overall grade). Do NOT modify the draft.
>
> The draft lives on branch `draft/<NOMBRE_KEBAB>`, not main. Read from the branch first; fall back to main only if a source is missing there. Commit + push `self-review-v1.md` to `draft/<NOMBRE_KEBAB>`. Before reporting done, assert the file exists with:
>
> `gh api "repos/<ORG>/grants/contents/proposals/<CARPETA>/drafts/self-review-v1.md?ref=draft/<NOMBRE_KEBAB>" --jq '.name'`
>
> Expected output: `self-review-v1.md`. On any other response, report the failure — do not claim success.

## Pitfalls

- **Symptom:** Self-review reports 0-1 BLOCKERs. **Cause:** Lenient context or author-bias leak. **Fix:** Redo with Step 3 stricter prompt. Do not accept "no blockers" without block-by-block justification.
- **Symptom:** Review reads "looks good overall". **Cause:** Lenient mode. **Fix:** Apply Hard Rule #1 — impartial, no approval bias.
- **Symptom:** Weighted total doesn't match the grade bucket. **Cause:** Arithmetic error. **Fix:** Recompute; show the weighted column.
- **Symptom:** Review misses a funder-specific priority. **Cause:** Skipped `.cursorrules` or `50_TIPS_<FUNDER>.md`. **Fix:** Redo the required-context read; funder files first.
- **Symptom:** Issues list has vague items ("improve clarity"). **Cause:** Not specific enough. **Fix:** Every issue = section + problem + recommended change.
- **Symptom:** `proposal-v2.md` has internal comments or review notes. **Cause:** Forgot it's the source of truth. **Fix:** v2 must be submission-ready. Put all commentary in `self-review-v1.md`.
- **Symptom:** Accidentally commit to main. **Cause:** Forgot to checkout the PR branch. **Fix:** Every Reviewer step asserts `git branch --show-current` matches `draft/<NOMBRE_KEBAB>` before committing.
- **Symptom:** `learnings/INDEX.md` got overwritten. **Cause:** Used `>` instead of `>>` or edited without append rule. **Fix:** Learnings are append-only. Always add a dated entry at the end.
- **Symptom:** You merged the PR yourself. **Cause:** Role violation. **Fix:** Reviewer never merges. Only the project owner does.
- **Symptom:** Ran standalone scoring and produced a v2 anyway. **Cause:** Ignored "standalone audit skips Phases 5–6". **Fix:** If the caller wants only a pre-submit audit, stop after Phase 4.

## Verification

- `gh api "contents/.../drafts/self-review-v1.md?ref=draft/<NAME>" --jq '.name'` returns the filename.
- Same assertions for `<ARCHIVO_V2>` and `learnings-v1.md`.
- `self-review-v1.md` has all required sections in the exact order (executive summary, scores table, issues buckets, strengths, 50-tips, org alignment, auto-fail, top-5).
- Every dimension has a score 1–5 and a one-liner key issue.
- Total weighted score falls in the stated grade bucket.
- 50-tips table has 50 rows (or explicit N/A).
- Top-5 recommendations are prioritized and actionable.
- `status.md` shows READY_FOR_HUMAN_REVIEW.
- Issue has a Phase-6 summary comment.
- Global `learnings/INDEX.md` has a new dated entry (verify with `git log -1 shared-resources/learnings/INDEX.md`).

## References

- `grants/draft-proposal/SKILL.md` — the previous role (Writer).
- `grants/submit-proposal/SKILL.md` — the next role after the owner merges.
- `grants/funder-fit/SKILL.md` — lighter alignment pass (7-dimension); this skill is the deeper audit.
- `shared-resources/50_TIPS_GANAR_GRANTS.md`
- `shared-resources/Arkangel_alineacion_para_grants.md`
