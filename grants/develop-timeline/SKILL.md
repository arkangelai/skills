---
name: develop-timeline
description: Create realistic grant project timelines (table, milestone, or narrative). Use after the first proposal pass so activities, staffing, evaluation, and reporting are feasible before review.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, timeline, planning, feasibility]
    category: grants
    requires_toolsets: [terminal]
---

# Develop Timeline

Build the execution timeline after `develop-proposal` has produced the first pass of methods and objectives. The goal is to make the project look deliverable, not just interesting.

## When to Use

- After `develop-proposal` has drafted methods, objectives, and evaluation.
- Before `develop-budget` and `grant-review`.
- When a proposal looks promising but not yet operationally believable.
- When you need a table, milestones, or narrative timeline.

## Inputs

The caller should pass or identify:

- `CARPETA` or the local proposal path
- grant duration
- the current methods/objectives/evaluation draft
- any fixed reporting or deliverable deadlines from the call

If GitHub is unavailable, operate on the local proposal folder and emit the summary artifact in the conversation.

## Procedure

1. **Gather project info:**
   - Total project duration
   - Start date (or estimated)
   - Key activities from Methods section
   - Dependencies between activities
   - Required milestones or deliverables
   - Reporting periods

2. **Timeline principles.**
   - **Realistic:** account for startup, holidays, unexpected delays.
   - **Show phases:** group related activities together.
   - **Include milestones:** mark key achievements.
   - **Allow overlap:** many activities run concurrently.
   - **Build in evaluation:** include data collection throughout.

3. **Standard phases.**

   **Phase 1: Startup (Months 1–3)**
   - Hire staff
   - Finalize partnerships
   - Develop materials / protocols
   - Set up systems

   **Phase 2: Implementation (main period)**
   - Deliver core activities
   - Recruit participants
   - Provide services
   - Ongoing monitoring

   **Phase 3: Evaluation & Closeout (final months)**
   - Data analysis
   - Final evaluation
   - Reporting
   - Sustainability planning

4. **Output formats.**

   **Table format:**
   ```markdown
   | Activity | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Responsible |
   |----------|----|----|----|----|----|----|-------------|
   | Hire Project Manager | X |   |   |   |   |   | Director |
   | Develop curriculum | X | X |   |   |   |   | PM |
   | Recruit participants |   | X | X | X | X |   | PM |
   | Deliver workshops |   |   | X | X | X | X | Staff |
   | Data collection |   | X | X | X | X | X | Evaluator |
   | Final report |   |   |   |   |   | X | PM |
   ```

   **Milestone format:**
   ```markdown
   ## Project Milestones
   | Milestone | Target Date | Deliverable |
   |-----------|-------------|-------------|
   | Staff hired | Month 2 | Signed offer letters |
   | Curriculum finalized | Month 3 | Training manual |
   | First cohort enrolled | Month 4 | 25 participants |
   | Mid-point evaluation | Month 6 | Interim report |
   | Program completion | Month 11 | Final data collected |
   | Final report submitted | Month 12 | Evaluation report |
   ```

   **Narrative format:**
   ```markdown
   ## Project Timeline
   ### Year 1, Quarter 1 (Months 1–3)
   - Hire Project Manager (Month 1)
   - Establish MOUs with partner organizations (Month 2)
   - Develop and pilot training curriculum (Months 2–3)
   - Set up participant tracking database (Month 3)
   ```

5. **Best practices.**
   - Allow 2–3 months for startup.
   - Don't front-load too many activities.
   - Include specific deliverables at milestones.
   - Show who is responsible for each activity.
   - Align timeline with budget spending.
   - Include quarterly / annual reporting deadlines.
   - Build in time for sustainability planning at the end.

6. **Reality check.** Verify:
   - Staff time available matches activities.
   - Budget spending aligns with timeline.
   - Objectives can be achieved in the timeframe.
   - Evaluation data collection is feasible.
   - No month is overloaded with activities.

7. **Visual options** for final presentation: table in Word/Google Docs, Gantt chart (Asana, Monday, Excel), timeline graphics (Canva, PowerPoint).
8. **Push the result back into the draft.** If the timeline exposes impossible sequencing, missing staffing, or overloaded quarters, update the proposal inputs before moving to `develop-budget` or `grant-review`.

## Pitfalls

- **Symptom:** Critical milestone falls in the final quarter. **Cause:** Back-loaded timeline. **Fix:** Shift critical deliverables earlier; final quarter reserved for analysis and reporting only (Tip #36).
- **Symptom:** Timeline says "recruitment Month 1" but recruitment requires curriculum that isn't ready until Month 3. **Cause:** Ignored dependencies. **Fix:** Map dependencies first; activities start only after their prerequisites.
- **Symptom:** Personnel time exceeds 1.0 FTE in busy quarters. **Cause:** Didn't check staff availability. **Fix:** Sum % FTE by person by month; redistribute or add staff.
- **Symptom:** Timeline runs 14 months but grant is 12. **Cause:** Over-ambitious scope. **Fix:** Cut scope or drop optional activities; never ask for a no-cost extension in the initial proposal.

## Verification

- Timeline duration matches the grant period.
- Every activity has a responsible party and a deliverable.
- No month has more activities than staff FTE can support.
- Reporting milestones align with funder reporting schedule.
- Final quarter has only analysis, reporting, and closeout — no new activity starts.

## References

- `grants/develop-budget/SKILL.md` — budget spending must match timeline.
- `grants/develop-proposal/SKILL.md` — objectives and methods drive the activities.
- `grants/grant-review/SKILL.md` — the later review pass scores feasibility and execution realism.
