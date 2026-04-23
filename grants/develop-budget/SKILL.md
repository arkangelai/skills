---
name: develop-budget
description: Create and justify a grant budget by standard categories (Personnel, Equipment, Supplies, Travel, Contractual, Other, Indirect). Produces a budget table + per-line justification tied to activities, respecting funder caps. Use for developing a budget section or justifying line items.
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

Creates well-justified grant budgets: every line item connects to a project activity, every number is calculated and defensible, and the format matches funder requirements.

## When to Use

- Creating a new project budget.
- Justifying specific budget line items.
- Aligning budget with the activities described in Methods.
- Ensuring funder requirements (caps, allowed categories, indirect rates, match) are met.

## Procedure

1. **Understand project scope.** Confirm:
   - Project activities (from Methods)
   - Project duration
   - Staff needs
   - Equipment and supplies needed
   - Travel requirements
   - Partnerships and subcontracts
   - Indirect cost rate (if applicable)

2. **Check funder requirements** in `.cursorrules` / call rules:
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

- `grants/write-section/SKILL.md` — for budget-justification narrative style.
- `grants/develop-timeline/SKILL.md` — budget spending must align with timeline.
- `grants/review-grant/SKILL.md` — Dimension 5 scoring criteria.
