---
name: write-objectives
description: Develop SMART goals and objectives for a grant — broad goals (1-3) vs specific objectives (2-4 per goal). Applies SMART (Specific, Measurable, Achievable, Relevant, Time-bound), differentiates process vs outcome objectives, connects to the logic model. Use for goals/objectives.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, objectives, smart, writing]
    category: grants
    requires_toolsets: [terminal]
---

# Write Objectives

Writes strong goals and objectives for a grant proposal. Goals are broad ("why"); objectives are SMART steps ("what by when"). This skill enforces the distinction and runs each candidate objective through the SMART framework.

## When to Use

- Developing project goals and objectives from scratch.
- Making vague objectives specific and measurable.
- Aligning objectives with funder priorities.
- Creating a logic model (Inputs → Activities → Outputs → Outcomes → Impact).

## Procedure

1. **Understand the project.** Confirm:
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
   - Must be SMART.

3. **Apply the SMART framework** to every objective.
   - **Specific:** clearly states what, who, where.
   - **Measurable:** includes numbers/percentages, data source.
   - **Achievable:** realistic given budget, staff, timeline.
   - **Relevant:** addresses the stated need, aligns with funder.
   - **Time-bound:** has a deadline and milestones.

4. **Objective types.**

   **Process objectives** (what you'll do):
   - Number of services delivered
   - Number of people served
   - Activities completed

   **Outcome objectives** (what will change):
   - Knowledge gained
   - Behaviors changed
   - Conditions improved

5. **Output format.**

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

7. **Logic model connection.**
   Objectives primarily sit at the Outputs and Outcomes levels. Show:
   Inputs → Activities → **Outputs** → **Outcomes** → Impact.

## Pitfalls

- **Symptom:** 10+ weak objectives instead of 3–4 strong ones. **Cause:** Everything-is-an-objective thinking. **Fix:** Consolidate. 3–4 solid > 10 weak (Tip #8).
- **Symptom:** Objective has no measurement method. **Cause:** "Measurable" interpreted as "has a number". **Fix:** Measurable = number + data source. Name the instrument (survey, admin data, observation).
- **Symptom:** Objective isn't achievable in the timeframe. **Cause:** Over-promised. **Fix:** Reality-check against timeline and staff; reduce target or extend deadline.
- **Symptom:** Process objectives only — no outcomes. **Cause:** Activity-focused. **Fix:** For every process objective, add a corresponding outcome objective.

## Verification

- 1–3 goals, 2–4 objectives per goal.
- Every objective passes all 5 SMART checks.
- Each objective names both a metric and a data source.
- Mix of process and outcome objectives (not just process).
- Logic model shows how objectives connect inputs to impact.

## References

- `grants/write-section/SKILL.md` — the goals/objectives section lives inside proposal structure.
- `grants/impact-statement/SKILL.md` — outcomes feed impact statements.
- `grants/develop-timeline/SKILL.md` — time-bound deadlines align with timeline.
- `grants/grant-review-6d/SKILL.md` — Tip #8 (3–4 solid > 10 weak).
