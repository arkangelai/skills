---
name: research-funder
description: Research a funding opportunity and document funder mission, priorities, grant sizes, eligibility, deadlines, review criteria, and past funded projects. Produces an alignment analysis and suggests `.cursorrules` updates. Use when starting a new grant or writing a proposal for an unfamiliar funder.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, research, funder, discovery]
    category: grants
    requires_toolsets: [terminal]
---

# Research Funder

Gathers and organizes information about a funding opportunity and analyzes fit with the project. Outputs a summary in the grant's `sources/` directory and proposes `.cursorrules` updates.

## When to Use

- Identifying potential funders for a project.
- Understanding a new funder's requirements and priorities.
- Preparing to write a grant proposal for an unfamiliar funder.
- Evaluating fit before committing to a scout → write cycle.

## Procedure

1. **Clarify the project.** Confirm:
   - Focus area (health, education, environment, etc.)
   - Geographic scope (local / regional / national / international)
   - Target population
   - Approximate budget range
   - Type of support needed (program, capacity, capital, research)

2. **Research the funder.** Gather:
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

4. **Document findings** in `proposals/<folder>/sources/funder-research.md` (or equivalent):

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

## Pitfalls

- **Symptom:** Summary misses eligibility deal-breakers. **Cause:** Skimmed the call instead of reading eligibility. **Fix:** Read the full eligibility page; list every requirement, not just the headline ones.
- **Symptom:** "Typical grant size" is wrong. **Cause:** Read old program page. **Fix:** Check the current funding round / RFA; funders shift amounts year over year.
- **Symptom:** Alignment section is generic. **Cause:** Didn't cross-reference project's specific goals. **Fix:** For each funder priority, cite the project section that addresses it (or flag as gap).

## Verification

- `funder-research.md` exists in `sources/` with all 5 sections populated.
- Grant range and deadline are sourced from the current call page (not a general funder page).
- Alignment section lists specific project goals mapped to specific funder priorities.
- Recommendation ends with Yes/Maybe/No + reasoning.

## References

- `grants/evaluate-alignment/SKILL.md` — deeper alignment scoring.
- `grants/scout-opportunities/SKILL.md` — pipeline entry for new opportunities.
- `grants/draft-proposal/SKILL.md` — what comes after funder research is done.
