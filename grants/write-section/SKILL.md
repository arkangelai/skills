---
name: write-section
description: Draft or improve a specific grant proposal section (Exec Summary, Needs Statement, Goals, Methods, Evaluation, Timeline, Budget Justification, Capacity, Sustainability). Provides section-specific structures and style rules. Use for "draft the needs statement" or "improve the methods section".
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, writing, drafting, section]
    category: grants
    requires_toolsets: [terminal]
---

# Grant Section Writer

Helps draft or improve individual sections of a grant proposal. Each section has a known structure funders expect — this skill applies the right one and aligns to funder priorities from the grant-specific `.cursorrules` and evidence in `sources/`.

## When to Use

- "Draft the needs statement / executive summary / methods section".
- "Improve this paragraph for <section>".
- Structuring an argument inside a specific section.
- Aligning existing content with funder priorities.

## Procedure

1. **Identify the section.** Ask which section is being written:
   - Executive Summary / Abstract
   - Statement of Need
   - Goals and Objectives
   - Methods / Approach
   - Evaluation Plan
   - Timeline
   - Budget Justification
   - Organizational Capacity
   - Sustainability Plan

2. **Check context.**
   - Review the grant's `.cursorrules` for funder priorities.
   - Read relevant files in `sources/` for evidence and data.
   - Understand the organization's positioning.

3. **Apply section-specific structure.**

   **Executive Summary (≈ 1 page):**
   - Problem statement (2–3 sentences)
   - Proposed solution (2–3 sentences)
   - Goals and expected outcomes (2–3 sentences)
   - Organization qualifications (1–2 sentences)
   - Budget request (1 sentence)

   **Statement of Need:**
   - The problem (what issue are you addressing)
   - Evidence (data and statistics supporting the need)
   - Who is affected (target population and their situation)
   - Consequences (what happens if nothing is done)
   - Gap (why existing solutions are insufficient)
   - Opportunity (why now is the right time)

   **Goals and Objectives:**
   - Goals: broad, long-term outcomes (1–3)
   - Objectives: specific, measurable steps in SMART format (Specific, Measurable, Achievable, Relevant, Time-bound)

   **Methods / Approach:**
   - Describe activities in detail
   - Explain why this approach will work
   - Reference evidence-based practices
   - Identify responsible parties
   - Connect activities to objectives

   **Evaluation Plan:**
   - How success will be measured
   - Both process and outcome evaluation
   - Data collection methods
   - Evaluation timeline
   - How results will be used

   **Organizational Capacity:**
   - Relevant experience and track record
   - Staff qualifications
   - Partnerships and collaborations
   - Infrastructure and resources
   - Previous similar projects

   **Sustainability Plan:**
   - How the project continues after funding
   - Diversified funding strategies
   - Institutional commitment
   - Community support
   - Long-term viability

4. **Writing style.**
   - Active voice.
   - Specific with numbers and outcomes.
   - No jargon.
   - Write for a general audience.
   - Persuasive but factual.
   - Lead with impact.

5. **Output format.** Well-structured markdown with clear headers, bullets for lists, bold for emphasis, and in-line references to evidence in `sources/`.

## Pitfalls

- **Symptom:** Statement of Need reads like a literature review. **Cause:** Evidence without narrative. **Fix:** Lead with the human problem; use evidence to support, not drive.
- **Symptom:** Executive Summary is > 1 page. **Cause:** Repeated content from body sections. **Fix:** Compress to the 5-part structure; 1 page hard limit.
- **Symptom:** Methods section lists activities but doesn't tie to objectives. **Cause:** Activity-centric writing. **Fix:** Every activity points back to which objective it serves.
- **Symptom:** Evaluation plan lacks specific data collection method. **Cause:** Vague "we will evaluate". **Fix:** Name the instrument, cadence, and analysis plan.

## Verification

- Section follows the structure for its type.
- Every claim has a citation to evidence in `sources/` or a `.cursorrules`-approved funder fact.
- Word/character limits from `.cursorrules` are respected.
- No invented data. Gaps marked with `[DATO PENDIENTE]`.

## References

- `grants/write-objectives/SKILL.md`
- `grants/impact-statement/SKILL.md`
- `grants/develop-budget/SKILL.md`
- `grants/develop-timeline/SKILL.md`
- `grants/grant-review-6d/SKILL.md` — the criteria this section will be scored against.
