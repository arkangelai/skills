---
name: write-section
description: Draft or improve any grant proposal section — Executive Summary, Statement of Need, Goals & Objectives (with SMART framework), Methods, Evaluation, Impact Statement (with Action+Target+Outcome+Significance formula), Timeline, Budget Justification, Organizational Capacity, or Sustainability. Applies section-specific structures, style rules, and specialized frameworks where applicable. Use for "draft the needs statement", "improve the methods section", "write SMART objectives", or "write the impact statement".
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, writing, drafting, section, objectives, impact]
    category: grants
    requires_toolsets: [terminal]
---

# Grant Section Writer

Draft or improve individual sections of a grant proposal. Each section has a known structure funders expect — this skill applies the right one and aligns to funder priorities from the grant's `.cursorrules` and evidence in `sources/`. Two sections (Goals & Objectives, Impact Statement) include specialized frameworks (SMART and Action+Target+Outcome+Significance) invoked when the caller picks that section type.

## When to Use

- "Draft the <section>" or "improve the <section>" for any section listed below.
- "Write SMART objectives" → run the Goals & Objectives section with the SMART framework.
- "Write the impact statement" → run the Impact Statement section with the formula.
- Structuring an argument inside a specific section.
- Aligning existing content with funder priorities.

## Procedure

1. **Identify the section.** The caller names one of:
   - Executive Summary / Abstract
   - Statement of Need
   - Goals & Objectives *(uses the SMART framework in Step 3a)*
   - Methods / Approach
   - Evaluation Plan
   - Impact Statement *(uses the Action+Target+Outcome+Significance formula in Step 3b)*
   - Timeline
   - Budget Justification
   - Organizational Capacity
   - Sustainability Plan

2. **Check context.**
   - Review the grant's `.cursorrules` for funder priorities and limits.
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

### Step 3a — Goals & Objectives (SMART framework)

Only run if the requested section is Goals & Objectives.

1. **Confirm the project inputs:**
   - Overall project purpose.
   - Target population.
   - Desired changes or outcomes.
   - Project timeframe.
   - Available resources.

2. **Distinguish goals vs objectives.**

   **Goals (1–3 per project)**
   - Broad, long-term outcomes.
   - The "why" of the project.
   - Aligned with organization mission.
   - Example: *"Improve health outcomes for underserved communities."*

   **Objectives (2–4 per goal)**
   - Specific, measurable steps.
   - The "what" and "when".
   - Must pass the SMART check.

3. **Apply SMART** to every objective.
   - **Specific:** clearly states what, who, where.
   - **Measurable:** includes numbers/percentages, data source.
   - **Achievable:** realistic given budget, staff, timeline.
   - **Relevant:** addresses the stated need, aligns with funder.
   - **Time-bound:** has a deadline and milestones.

4. **Objective types.** Mix both.
   - **Process** (what you'll do): services delivered, people served, activities completed.
   - **Outcome** (what will change): knowledge gained, behaviors changed, conditions improved.

5. **Output format:**

   ```markdown
   ## Goal 1: [Broad outcome statement]

   ### Objective 1.1
   By [date], [number/percentage] of [target population] will
   [specific measurable change] as measured by [data source].

   **SMART Check:**
   - Specific: [explanation]
   - Measurable: [metric and data source]
   - Achievable: [justification]
   - Relevant: [connection to need]
   - Time-bound: [deadline]

   ### Objective 1.2
   [...]
   ```

6. **Before/after examples.**

   Weak: *"Improve participant employment."*
   Strong: *"By December 2025, 75% of program participants (n=100) will obtain employment within 90 days of program completion, as documented in participant follow-up surveys."*

   Weak: *"Increase awareness of services."*
   Strong: *"By June 2025, conduct 12 community outreach events reaching at least 500 community members, as tracked through event sign-in sheets."*

7. **Logic model connection.** Objectives sit at Outputs and Outcomes: Inputs → Activities → **Outputs** → **Outcomes** → Impact.

### Step 3b — Impact Statement (Action + Target + Outcome + Significance)

Only run if the requested section is Impact Statement.

1. **Understand impact.** Answer:
   - Who benefits directly?
   - What will change for them?
   - What broader community impact is expected?
   - What long-term changes will result?
   - How does this connect to larger systems change?

2. **Articulate at three levels:**

   **Individual** — changes in knowledge, skills, attitudes, behavior, circumstances (employment, health).
   **Community** — changes in community capacity, access to services, community conditions.
   **Systems** — policy changes, practice changes across organizations, sustainable infrastructure.

3. **Apply the formula:**

   ```
   [Action] + [Target population] + [Specific outcome] + [Broader significance]
   ```

   Example: *"This project will train 200 community health workers who will provide preventive health education to 5,000 residents in underserved neighborhoods, reducing emergency room visits and building sustainable community health infrastructure."*

4. **Compelling elements:** specific numbers, brief humanizing stories, before/after contrast, ripple effects, sustainability hooks.

5. **Do / don't.**
   - Do: lead with the most compelling outcome; active vivid language; numbers and timeframes; connect to funder priorities; show root-cause understanding.
   - Don't: vague verbs (help / support / improve); overstate; activity-only focus; ignore sustainability; forget the "so what".

6. **Output format:**

   ```markdown
   ## Project Impact

   ### Summary Statement
   [1-2 sentence compelling overview]

   ### Direct Beneficiaries
   [Who will benefit and how many]

   ### Expected Outcomes
   - Short-term (0-12 months): [outcomes]
   - Medium-term (1-3 years): [outcomes]
   - Long-term (3+ years): [outcomes]

   ### Broader Impact
   [How this contributes to community/systems change]

   ### Impact Metrics
   | Outcome | Target | Measurement |
   |---------|--------|-------------|
   | [Outcome 1] | [Number] | [How measured] |
   | [Outcome 2] | [Number] | [How measured] |
   ```

7. **Before/after examples.**

   Weak: *"This program will help youth in our community."*
   Strong: *"This program will provide 150 at-risk youth with paid summer internships, connecting them to career mentors and building professional skills. Based on our track record, we expect 85% of participants to graduate high school and 60% to pursue post-secondary education, breaking cycles of poverty and building the next generation of community leaders."*

### Step 4 — Writing style (applies to every section)

- Active voice.
- Specific with numbers and outcomes.
- No jargon.
- Write for a general audience.
- Persuasive but factual.
- Lead with impact.

### Step 5 — Output format

Well-structured Markdown with clear headers, bullets for lists, bold for emphasis, and in-line references to evidence in `sources/`.

## Pitfalls

- **Symptom:** Statement of Need reads like a literature review. **Cause:** Evidence without narrative. **Fix:** Lead with the human problem; use evidence to support, not drive.
- **Symptom:** Executive Summary is > 1 page. **Cause:** Repeated content from body sections. **Fix:** Compress to the 5-part structure; 1 page hard limit.
- **Symptom:** Methods section lists activities but doesn't tie to objectives. **Cause:** Activity-centric writing. **Fix:** Every activity points back to which objective it serves.
- **Symptom:** Evaluation plan lacks specific data collection method. **Cause:** Vague "we will evaluate". **Fix:** Name the instrument, cadence, and analysis plan.
- **Symptom:** 10+ weak objectives instead of 3–4 strong ones. **Cause:** Everything-is-an-objective thinking. **Fix:** Consolidate. 3–4 solid > 10 weak.
- **Symptom:** Objective has no measurement method. **Cause:** "Measurable" interpreted as "has a number". **Fix:** Measurable = number + data source. Name the instrument (survey, admin data, observation).
- **Symptom:** Objective isn't achievable in the timeframe. **Cause:** Over-promised. **Fix:** Reality-check against timeline and staff; reduce target or extend deadline.
- **Symptom:** Process objectives only — no outcomes. **Cause:** Activity-focused. **Fix:** For every process objective, add a corresponding outcome objective.
- **Symptom:** Impact statement reads like activities ("we will deliver workshops"). **Cause:** Activity-focused. **Fix:** Activities → outcomes → significance. Activities are means, not ends.
- **Symptom:** Impact uses "help / support / improve". **Cause:** Weak verb. **Fix:** Replace with specific verb + metric ("train", "enroll", "reduce X by Y%").
- **Symptom:** Impact numbers feel made up. **Cause:** No basis. **Fix:** Every number cites evidence (prior programs, literature, feasibility study) — otherwise mark as `[DATO PENDIENTE]`.
- **Symptom:** No sustainability plan inside the impact statement. **Cause:** Forgot the "what happens after". **Fix:** End with what survives funding (infrastructure, policy, practice).

## Verification

- Section follows the structure for its type.
- Every claim has a citation to evidence in `sources/` or a `.cursorrules`-approved funder fact.
- Word/character limits from `.cursorrules` are respected.
- No invented data. Gaps marked with `[DATO PENDIENTE]`.
- **If Goals & Objectives:** 1–3 goals, 2–4 objectives per goal; every objective passes all 5 SMART checks; each names both a metric and a data source; process + outcome mix.
- **If Impact Statement:** follows the Action+Target+Outcome+Significance formula; distinguishes short/medium/long-term outcomes; every target number has a source or is explicitly pending; weak verbs absent; metrics table has ≥1 outcome per time horizon.

## References

- `grants/develop-budget/SKILL.md` — budget section alignment with Methods and Timeline.
- `grants/develop-timeline/SKILL.md` — time-bound deadlines align with timeline.
- `grants/review-proposal/SKILL.md` — the 6-dimension rubric this section will be scored against.
- `grants/literature-review/SKILL.md` — evidence source for Statement of Need and Impact.
