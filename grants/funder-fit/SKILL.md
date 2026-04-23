---
name: funder-fit
description: Two-mode skill for funder analysis. `mode=profile` researches a funder and documents mission, priorities, grant sizes, eligibility, deadlines, review criteria, and past funded projects. `mode=score` evaluates an existing draft's alignment across 7 dimensions on a 1–5 scale, produces a gap analysis with specific recommendations, and flags red-flag disqualifiers. Use before drafting (profile), before submission (score), or both.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, funder, research, alignment, review]
    category: grants
    requires_toolsets: [terminal]
---

# Funder Fit

One skill, two modes. `profile` builds the funder's information sheet so the draft can target the funder correctly. `score` evaluates an existing draft against the funder across 7 dimensions and flags disqualifiers.

## When to Use

**`mode=profile`** (research):
- Identifying potential funders for a project.
- Preparing to write a proposal for an unfamiliar funder.
- Evaluating fit before committing to a scout → write cycle.

**`mode=score`** (alignment scoring):
- Before submitting — final alignment pass.
- Revising a draft that feels off-target.
- Comparing multiple funding opportunities for the same project.
- Strengthening weak areas identified by review.

The caller chooses the mode at invocation. If unclear, ask the caller which is needed.

## Procedure

### MODE A — `profile` (research the funder)

1. **Clarify the project.** Confirm:
   - Focus area (health, education, environment, etc.)
   - Geographic scope (local / regional / national / international)
   - Target population
   - Approximate budget range
   - Type of support needed (program, capacity, capital, research)

2. **Research the funder.** Gather from the current call page (not an archived or general funder page):
   - Mission and priorities
   - Typical grant sizes
   - Eligibility requirements
   - Application deadlines
   - Review criteria
   - Past funded projects
   - Success rates (if available)

3. **Analyze alignment.**
   - Compare project goals to funder priorities.
   - Identify strong alignment points.
   - Note potential misalignments or concerns.
   - Suggest how to frame the project for this funder.

4. **Document findings** in `proposals/<folder>/sources/funder-research.md`:

   ```markdown
   # <Funder Name> Research Summary

   ## Mission and Priorities
   - [Key priority areas]

   ## Grant Requirements
   - Eligibility: [requirements]
   - Grant range: [typical amounts]
   - Deadline: [dates]
   - Format: [application requirements]

   ## Review Criteria
   - [How proposals are evaluated]

   ## Alignment Analysis
   - Strong fits: [areas of alignment]
   - Potential concerns: [gaps to address]

   ## Recommendations
   - [How to approach this funder]
   ```

5. **Update the grant rules.** Propose updates to `.cursorrules` (or `proposals/<folder>/.cursorrules`) with:
   - Funder name and contact info
   - Key priorities to emphasize
   - Required sections and formats
   - Word/page limits
   - Specific terminology to use

6. **Final actionable recommendation:** Good fit? (Yes / Maybe / No) with explanation. Key priorities to emphasize. Potential challenges and how to address them. Timeline for application.

### MODE B — `score` (alignment scoring)

1. **Gather information.**
   - Review grant's `.cursorrules` for funder priorities.
   - Review the current proposal draft.
   - Check funder research in `sources/funder-research.md` (from mode `profile`).

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

6. **Red flags.** Alert the caller to disqualifiers:
   - Mission mismatch
   - Ineligible organization type
   - Budget outside allowed range
   - Missing required elements
   - Geographic restrictions violated

## Pitfalls

### Mode `profile`
- **Symptom:** Summary misses eligibility deal-breakers. **Cause:** Skimmed the call instead of reading eligibility. **Fix:** Read the full eligibility page; list every requirement, not just the headline ones.
- **Symptom:** "Typical grant size" is wrong. **Cause:** Read old program page. **Fix:** Check the current funding round / RFA; funders shift amounts year over year.
- **Symptom:** Alignment section is generic. **Cause:** Didn't cross-reference project's specific goals. **Fix:** For each funder priority, cite the project section that addresses it (or flag as gap).

### Mode `score`
- **Symptom:** All 7 dimensions score 4. **Cause:** Not actually critical. **Fix:** Use 5 only when the alignment is genuinely perfect; most proposals have at least one 2 or 3 before revisions.
- **Symptom:** Alignment report is vague ("improve language to match funder"). **Cause:** No proposal citations. **Fix:** Every recommendation names the section and proposes the concrete replacement.
- **Symptom:** Red flag missed (e.g., org-type ineligible). **Cause:** Didn't read eligibility fully. **Fix:** Start with a pass specifically on eligibility and format compliance; those are disqualifiers.

## Verification

### Mode `profile`
- `funder-research.md` exists in `sources/` with all 5 sections populated.
- Grant range and deadline are sourced from the current call page (not a general funder page).
- Alignment section lists specific project goals mapped to specific funder priorities.
- Recommendation ends with Yes/Maybe/No + reasoning.

### Mode `score`
- Every dimension has a score 1–5 and a short note.
- Overall score is the weighted or averaged dimensional score.
- Recommendations reference specific proposal sections.
- Any red flag identified has a "do this before submission" fix.

## References

- `grants/review-proposal/SKILL.md` — deeper pre-submit audit (6 weighted dimensions + 50-tips + auto-fail).
- `grants/scout-opportunities/SKILL.md` — pipeline entry for new opportunities.
- `grants/draft-proposal/SKILL.md` — consumer of the profile output.
- `grants/write-section/SKILL.md` — where `score` mode's language suggestions are applied.
