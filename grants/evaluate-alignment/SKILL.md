---
name: evaluate-alignment
description: Score a grant draft's funder alignment across 7 dimensions (Mission, Priority, Target, Geography, Approach, Budget, Format) on a 1–5 scale, produce gap analysis with recommendations, and flag red-flag disqualifiers. Use before submission, when revising, or comparing funders.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, alignment, review, funder-fit]
    category: grants
    requires_toolsets: [terminal]
---

# Evaluate Alignment

Assesses funder alignment across 7 dimensions with 1–5 scoring, identifies strengths vs weak areas, recommends specific fixes, and flags red-flag disqualifiers before submission.

## When to Use

- Before submitting a proposal — final alignment pass.
- Revising a draft that feels off-target.
- Comparing multiple funding opportunities for the same project.
- Strengthening weak areas identified by review.

## Procedure

1. **Gather information.**
   - Review grant's `.cursorrules` for funder priorities.
   - Review the current proposal draft.
   - Check funder research in `sources/`.

2. **Run the alignment checklist.**

   **Mission Alignment**
   - [ ] Project addresses funder's focus areas?
   - [ ] Language reflects funder's values?
   - [ ] Target population is one the funder prioritizes?
   - [ ] Geographic focus matches?

   **Priority Alignment**
   - [ ] Which specific funder priorities does this address?
   - [ ] Are these priorities explicitly mentioned in the proposal?
   - [ ] Is the connection clear and compelling?

   **Approach Alignment**
   - [ ] Methodology matches funder preferences?
   - [ ] Evidence-based practice emphasized if required?
   - [ ] Partnerships / collaboration included if valued?
   - [ ] Innovation highlighted if the funder seeks it?

   **Format Compliance**
   - [ ] Meets page/word limits?
   - [ ] All required sections included?
   - [ ] Budget within allowed range?
   - [ ] Attachments complete?

3. **Score each area 1–5.**

   | Area | Score (1-5) | Notes |
   |------|-------------|-------|
   | Mission alignment | | |
   | Priority alignment | | |
   | Target population | | |
   | Geographic focus | | |
   | Approach / methods | | |
   | Budget fit | | |
   | Format compliance | | |
   | **Overall** | | |

   Scoring guide: 5 = perfect, 4 = strong, 3 = moderate, 2 = weak, 1 = poor/mismatch.

4. **Gap analysis.** Identify:
   - Areas of strong alignment (leverage these)
   - Areas of weak alignment (improve these)
   - Missing elements (add these)
   - Potential concerns (address these)

5. **Recommendations.**

   ```markdown
   ## Alignment Assessment Summary

   **Overall Score: X/5**

   ### Strengths
   - [What aligns well]

   ### Areas for Improvement
   - [What needs work]

   ### Specific Recommendations
   1. [Actionable suggestion with location in proposal]
   2. [Actionable suggestion with location in proposal]

   ### Language Suggestions
   - Replace "[current phrase]" with "[funder-aligned phrase]"
   - Add mention of [funder priority] in [section]
   ```

6. **Red flags.** Alert the user to disqualifiers:
   - Mission mismatch
   - Ineligible organization type
   - Budget outside allowed range
   - Missing required elements
   - Geographic restrictions violated

## Pitfalls

- **Symptom:** All 7 dimensions score 4. **Cause:** Not actually critical. **Fix:** Use 5 only when the alignment is genuinely perfect; most proposals have at least one 2 or 3 before revisions.
- **Symptom:** Alignment report is vague ("improve language to match funder"). **Cause:** No proposal citations. **Fix:** Every recommendation names the section and proposes the concrete replacement.
- **Symptom:** Red flag missed (e.g., org-type ineligible). **Cause:** Didn't read eligibility fully. **Fix:** Start with a pass specifically on eligibility and format compliance; those are disqualifiers.

## Verification

- Every dimension has a score 1–5 and a short note.
- Overall score is the weighted or averaged dimensional score.
- Recommendations reference specific proposal sections.
- Any red flag identified has a "do this before submission" fix.

## References

- `grants/grant-review-6d/SKILL.md` — deeper review including methodology and writing.
- `grants/research-funder/SKILL.md` — upstream research feeding the alignment check.
- `grants/write-section/SKILL.md` — where to apply language suggestions.
