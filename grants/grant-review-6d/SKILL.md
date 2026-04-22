---
name: grant-review-6d
description: Brutal impartial review of a grant across 6 weighted dimensions (Funder 25/Impact 20/Science 20/Feasibility 15/Budget 10/Writing 10), plus 50-tips, org-alignment, and auto-fail checks. Outputs a graded A-F report with prioritized fixes. Use for "critically review this grant" or pre-submit scrub.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, review, quality, scoring, pre-submit]
    category: grants
    requires_toolsets: [terminal]
---

# Grant Review — 6-Dimension Critical Audit

Impartial senior-grant-reviewer framework. Not lenient. The goal is perfection, not approval. Evaluates a completed proposal against 6 weighted dimensions, checks 50-tips compliance, org-alignment, and auto-fail disqualifiers. Outputs a structured graded report an evaluator could drop straight into a PR or a handoff comment.

## When to Use

- "Critically review this grant proposal" / "score this proposal".
- Pre-submit scrub before the final merge.
- Comparing drafts of the same proposal (v1 vs v2).
- Auditing a proposal that passed Reviewer but still feels soft.
- Reviewing a grant that was rejected, to understand why.

**Do not use:** to produce a quick read or "looks fine" summary. This is the full audit — if the user wants only a light pass, redirect.

## Procedure

### Step 0 — Identify the grant

User provides a path to a grant folder (e.g., `proposals/2026-09_HORIZON-EDCTP3-DIGIT-02`). Verify it exists. If only a name is given, search the repo root (proposals/) and ask to pick if ambiguous.

### Step 1 — Gather all context (read in parallel)

**Grant-specific files:**
- `.cursorrules` (if present) — funder-specific priorities and terminology
- `proposal.md` or `drafts/proposal-v2.md` — main document
- `budget.md` — budget + justification
- Everything in `sources/` — supporting evidence
- Everything in `attachments/` — CVs, letters, org docs
- Everything in `archivo-final/` — final consolidated docs (if exists)

**Repo-wide standards:**
- `shared-resources/50_TIPS_GANAR_GRANTS.md`
- `shared-resources/Arkangel_alineacion_para_grants.md` (or the equivalent org-alignment doc)
- Funder-specific tips if present (e.g., `shared-resources/50_TIPS_BARDA_ESPECIFICO.md`)

Do NOT skip files. Read everything before starting.

### Step 2 — Critical review across 6 dimensions

Score each 1–5, with detailed findings.

**1. Funder Alignment (25%)** — Using `.cursorrules`/funder priorities:
- Responds EXACTLY to the call? (Tip #2)
- Language matches funder's preferred terminology?
- Funder-specific priorities explicitly addressed?
- Target population aligned with funder focus?
- Geographic focus appropriate?
- Uses the funder's evaluation-criteria language?

**2. Problem & Impact (20%)** — Tips #11–20:
- Problem defined in human terms, not technical (Tip #11)?
- Numbers current, credible, cited (Tip #12)?
- Urgency established — why NOW (Tip #13)?
- Consequences of inaction clear (Tip #14)?
- Impact measurable with specific metrics (Tip #18)?
- Real adoption/scalability plan (Tip #19)?
- Answers "and then what?" (Tip #20)?
- Beneficiaries explicitly identified (Tip #17)?

**3. Scientific Design & Methodology (20%)** — Tips #21–30:
- As simple as possible but complete (Tip #21)?
- Every methodological decision justified (Tip #23)?
- Success/failure criteria measurable (Tip #24)?
- Biases anticipated and controlled (Tip #25)?
- If AI used, advantage over traditional methods clear (Tip #26)?
- Limitations shown and addressed (Tip #27)?
- Analysis plan concrete, not narrative (Tip #28)?
- Objectives SMART; 3–4 solid > 10 weak (Tip #8)?

**4. Feasibility & Execution (15%)** — Tips #31–40:
- Prior similar work demonstrated (Tip #31)?
- Preliminary results / pilots / proof of concept (Tip #32)?
- Every work package has clear deliverables (Tip #33)?
- Timeline realistic, not over-ambitious (Tip #34)?
- Risks with credible Plan B's (Tip #35)?
- Critical tasks NOT in final quarter (Tip #36)?
- Governance clear — who leads, who executes (Tip #39)?
- All partners essential, no decorative partners (Tip #38)?
- Team expertise appropriate for every role?

**5. Budget & Format (10%)** — Tips #41–45:
- Budget tells the same story as the text (Tip #41)?
- Each expense justified and necessary (Tip #43)?
- Costs reasonable and defensible (Tip #42)?
- Exact format and limits respected (Tip #45)?
- No expenses the grant explicitly doesn't fund (Tip #44)?
- Personnel time allocations add up?

**6. Writing & Communication (10%)** — Tips #46–50 + the "uncomfortable truth":
- Evaluator can understand in 5 minutes (Tip #6)?
- Idea fits in one clear sentence (Tip #3)?
- Impact > methodological elegance (Tip #4)?
- Good story supports the technical model (Tip #5)?
- Titles informative (answer questions) (Tip #46)?
- One idea per paragraph (Tip #47)?
- Strategic use of bullets (Tip #48)?
- Language clear for non-expert (Tip #49)?
- Active voice, short sentences, accessible?

### Step 3 — Org alignment check

Using the org-alignment doc, verify:
- Core capabilities correctly represented
- Key impact numbers included (people served, hospitals, countries)
- Positioning appropriate for this funder (elevator / sovereignty / problem-solution-impact)
- Published evidence and compliance cited
- No false capability claims

### Step 4 — Auto-fail check

Disqualifiers (any one triggers a fail warning):
- NGO-only / academic-only eligibility claimed when not applicable
- Individual fellowship language used
- Non-healthcare sector language (if health-AI org)
- Pure education/training (not product deployment)
- No direct clinical data application
- Unsupported claims without citations
- References older than 5 years as primary evidence
- Missing required sections per funder guidelines

### Step 5 — 50-tips compliance table

Run all 50 tips, mark each: PASS / PARTIAL / FAIL / N/A. Group by category (Mindset, Problem, Design, Feasibility, Budget, Writing).

### Step 6 — Output the review

Exact format:

```
## GRANT REVIEW: <Grant Name>
**Funder:** <from .cursorrules>
**Reviewer:** AI Critical Review Agent
**Date:** <YYYY-MM-DD>
**Overall Grade:** <A-F> (<weighted>/5)

---

### EXECUTIVE SUMMARY
<2-3 sentences: Is this competitive? Biggest strength? Biggest weakness?>

---

### SCORES BY DIMENSION
| Dimension | Score (1-5) | Weight | Weighted | Key Issue |
|-----------|-------------|--------|----------|-----------|
| Funder Alignment | X | 25% | X.XX | <one-liner> |
| Problem & Impact | X | 20% | X.XX | <one-liner> |
| Scientific Design | X | 20% | X.XX | <one-liner> |
| Feasibility | X | 15% | X.XX | <one-liner> |
| Budget & Format | X | 10% | X.XX | <one-liner> |
| Writing & Comms | X | 10% | X.XX | <one-liner> |
| **TOTAL** | | **100%** | **X.XX/5** | |

**Grade mapping:** A: 4.5-5.0 | B: 3.5-4.4 | C: 2.5-3.4 | D: 1.5-2.4 | F: 1.0-1.4

---

### CRITICAL ISSUES (must fix before submission)
<Numbered, specific — section + problem + fix>

### MAJOR ISSUES (strongly recommended fixes)
### MINOR ISSUES (polish items)

---

### STRENGTHS (what works well)

---

### 50 TIPS COMPLIANCE
| # | Tip | Status | Notes |

**Summary:** X/50 PASS | X/50 PARTIAL | X/50 FAIL | X/50 N/A

---

### ORG ALIGNMENT CHECK
- [ ] Core capabilities correctly represented
- [ ] Key impact numbers included
- [ ] Appropriate positioning for funder
- [ ] Published evidence referenced
- [ ] No false capability claims

---

### AUTO-FAIL CHECK
<Each criterion: PASS/FAIL>

---

### TOP 5 RECOMMENDATIONS (prioritized)
1. <Most impactful — what, where, why>
2.
3.
4.
5.
```

## Hard Rules

1. **Be completely impartial.** Review as if from an unknown organization. No leniency.
2. **Be specific.** Not "methodology is weak". Say: "Section 3.2 lacks justification for logistic regression over competing approaches. Add a comparison table."
3. **Cite the tips.** When a tip is violated, reference the number ("Violates Tip #34: 3 critical milestones in the final quarter").
4. **Read everything.** Do not review without reading all available files first.
5. **No sugar-coating.** Find every weakness before the funder does. A rejected proposal helps nobody.
6. **Actionable feedback.** Every issue must include a specific recommendation for how to fix it.
7. **Use funder lens.** Evaluate through the specific funder's criteria, not generic quality. A great NIH proposal might be terrible for EIC.
8. **Respect the uncomfortable truth.** Most grants are lost due to poor communication, not poor science. Prioritize clarity issues.

## Pitfalls

- **Symptom:** Review reads "looks good overall". **Cause:** Lenient mode. **Fix:** Apply Hard Rule #1 — impartial, no approval bias.
- **Symptom:** Weighted total doesn't match the grade bucket. **Cause:** Arithmetic error. **Fix:** Recompute; show the weighted column.
- **Symptom:** Review misses a funder-specific priority. **Cause:** Skipped `.cursorrules` or `50_TIPS_<FUNDER>.md`. **Fix:** Restart Step 1 — read funder-specific files first.
- **Symptom:** Issues list has vague items ("improve clarity"). **Cause:** Not specific enough. **Fix:** Every issue = section + problem + recommended change. No generic items.

## Verification

- Final report has all required sections in the exact order above.
- Every dimension has a score 1-5 and a one-liner key issue.
- Total weighted score falls in the stated grade bucket.
- 50-tips table has 50 rows (or explicit N/A for inapplicable).
- Top 5 recommendations are prioritized and actionable.

## References

- `shared-resources/50_TIPS_GANAR_GRANTS.md`
- `shared-resources/Arkangel_alineacion_para_grants.md`
- Funder-specific tip files where available.
- `grants/review-proposal/SKILL.md` — uses this framework inside the pipeline's Phase 4.
