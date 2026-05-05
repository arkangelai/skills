---
name: develop-budget
description: Create and justify a grant budget by standard categories (Personnel, Equipment, Supplies, Travel, Contractual, Other, Indirect). Use after the first proposal pass so budget, methods, and timeline tell the same story.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, budget, finance, writing]
    category: grants
    requires_toolsets: [terminal]
---

# Develop Budget

Build the budget after `develop-proposal` has produced a coherent first pass and before `grant-review` scores feasibility. Every line item should connect to a project activity, fit the timeline, and survive reviewer scrutiny.

## When to Use

- After `develop-proposal` produces the first pass of the grant.
- When a draft has methods but weak or missing budget logic.
- Before `grant-review` so feasibility scoring has a real budget to inspect.
- When you need a budget table plus line-by-line justification.

## Inputs

The caller should pass or identify:

- `CARPETA` or the local proposal path
- funder cap / indirect-rate rules if known
- the current draft section that describes methods and staffing

If GitHub is unavailable, operate on the local proposal folder and emit the summary artifact in the conversation.

## Procedure

1. **Understand project scope.** Confirm:
   - Project activities (from Methods)
   - Project duration
   - Staff needs
   - Equipment and supplies needed
   - Travel requirements
   - Partnerships and subcontracts
   - Indirect cost rate (if applicable)

2. **Check funder requirements** in the proposal source pack (`sources/rules.md`, `sources/eligibility.md`, `.cursorrules`, or equivalent local notes):
   - Maximum budget allowed
   - Allowed expense categories
   - Indirect cost limits
   - Matching / cost-share requirements
   - Specific budget format required

3. **Organize by standard categories.**

   **Personnel**
   - Salaries (% FTE × annual rate)
   - Fringe benefits (rate applied)
   - Consultants (daily/hourly rates)

   **Equipment**
   - Items over $5,000 (or funder threshold)
   - Justify necessity for project

   **Supplies**
   - Office supplies
   - Program supplies
   - Technology / software

   **Travel**
   - Local travel (mileage)
   - Conference / training travel
   - Staff travel for project activities

   **Contractual / Subcontracts**
   - Partner organizations
   - Evaluation consultants
   - Other contracted services

   **Other Direct Costs**
   - Printing and publications
   - Communication costs
   - Participant costs (stipends, incentives)
   - Training and meetings

   **Indirect Costs**
   - Apply approved rate or funder limit

4. **Write the budget justification.** For every line item: what it is, why it's necessary, how it was calculated, how it connects to project activities.

5. **Output format.**

   Budget table:
   ```markdown
   | Category | Description | Amount |
   |----------|-------------|--------|
   | Personnel | Project Director (0.25 FTE x $80,000) | $20,000 |
   | Personnel | Fringe Benefits (30%) | $6,000 |
   | ... | ... | ... |
   | **Total Direct Costs** | | $XX,XXX |
   | Indirect Costs (X%) | | $X,XXX |
   | **TOTAL** | | $XX,XXX |
   ```

   Budget justification:
   ```markdown
   ## Personnel

   **Project Director (0.25 FTE — $20,000)**
   The Project Director will provide overall leadership and management
   of the project, including supervision of staff, coordination with
   partners, and reporting to the funder. The rate is based on the
   organization's established salary scale.
   ```

6. **Best practices.**
   - Every item connects to an activity.
   - Show the calculation.
   - Be specific — no "miscellaneous".
   - Include in-kind contributions if relevant.
   - Personnel time adds up correctly across roles.
   - Round to reasonable amounts.
   - If the draft or timeline changes materially, rerun this skill instead of patching numbers by hand.

## Pitfalls

- **Symptom:** Budget total exceeds funder cap. **Cause:** Didn't check cap first. **Fix:** Always pull the cap from `.cursorrules` / rules before drafting line items.
- **Symptom:** Indirect cost rate rejected. **Cause:** Used org's federally negotiated rate when funder caps it lower. **Fix:** Use the funder cap if lower, and note "capped per funder guidelines" in justification.
- **Symptom:** Personnel FTEs don't add up (e.g., PI at 0.5 FTE on two overlapping grants summing to 1.4). **Cause:** Didn't reconcile across projects. **Fix:** Verify total FTE ≤ 1.0 per person across all concurrent projects.
- **Symptom:** Reviewer flags "miscellaneous" line. **Cause:** Vague item. **Fix:** Break into specific components with calculations.

## Verification

- Budget table totals direct + indirect correctly; grand total ≤ funder cap.
- Every line has a justification paragraph.
- Every line maps to a specific activity in Methods.
- Personnel FTE totals reconcile.
- Indirect rate ≤ funder cap.

## References

- `skills/develop-proposal/SKILL.md` — first-pass methods, staffing, and narrative inputs.
- `skills/develop-timeline/SKILL.md` — budget spending must align with timeline.
- `skills/grant-review/SKILL.md` — the later review pass scores feasibility and budget coherence.
