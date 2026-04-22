---
name: impact-statement
description: Write grant impact statements covering direct beneficiaries, short/medium/long-term outcomes, systems significance, and sustainability. Applies the [Action + Target + Outcome + Significance] formula and flags weak verbs. Use for executive summaries, outcomes, or strengthening "so what".
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, writing, impact, outcomes]
    category: grants
    requires_toolsets: [terminal]
---

# Impact Statement

Crafts impact statements that articulate who benefits, what changes at individual / community / systems levels, and why it matters beyond the project. Follows a 4-part formula and avoids the weak verbs that make proposals forgettable.

## When to Use

- Writing executive summaries.
- Developing outcomes sections.
- Creating compelling opening statements.
- Strengthening the "so what" factor on an existing draft.

## Procedure

1. **Understand impact.** Ask:
   - Who benefits directly?
   - What will change for them?
   - What broader community impact is expected?
   - What long-term changes will result?
   - How does this connect to larger systems change?

2. **Articulate at multiple levels.**

   **Individual Level**
   - Changes in knowledge, skills, attitudes
   - Changes in behavior
   - Changes in circumstances (employment, health, etc.)

   **Community Level**
   - Changes in community capacity
   - Changes in access to services
   - Changes in community conditions

   **Systems Level**
   - Policy changes
   - Practice changes across organizations
   - Sustainable infrastructure improvements

3. **Apply the formula.** Strong impact statements follow:

   ```
   [Action] + [Target population] + [Specific outcome] + [Broader significance]
   ```

   Example: *"This project will train 200 community health workers who will provide preventive health education to 5,000 residents in underserved neighborhoods, reducing emergency room visits and building sustainable community health infrastructure."*

4. **Compelling elements.**
   - **Numbers:** specific quantities (people, outcomes, timeframes).
   - **Stories:** brief examples that humanize.
   - **Contrast:** before/after or with/without.
   - **Ripple effects:** how direct impact leads to broader change.
   - **Sustainability:** how impact continues beyond funding.

5. **Writing tips.**

   Do:
   - Lead with the most compelling outcome.
   - Use active, vivid language.
   - Be specific with numbers and timeframes.
   - Connect to funder priorities.
   - Show understanding of root causes.

   Don't:
   - Use vague language ("help", "support", "improve").
   - Overstate what can be achieved.
   - Focus only on activities (what you'll do).
   - Ignore sustainability.
   - Forget the "so what".

6. **Output format.**

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

## Pitfalls

- **Symptom:** Impact statement reads like activities ("we will deliver workshops"). **Cause:** Activity-focused. **Fix:** Activities → outcomes → significance. Activities are means, not ends.
- **Symptom:** "We will help X people." **Cause:** Weak verb. **Fix:** Replace with specific verb + metric ("train", "enroll", "reduce X by Y%").
- **Symptom:** Numbers feel made up. **Cause:** No basis. **Fix:** Every number cites evidence (prior programs, literature, feasibility study) — otherwise mark as `[DATO PENDIENTE]`.
- **Symptom:** No sustainability plan. **Cause:** Forgot the "what happens after". **Fix:** Every impact statement ends with what survives funding (infrastructure, policy, practice).

## Verification

- Statement follows [Action + Target + Outcome + Significance] formula.
- Short/medium/long-term outcomes are distinguished.
- Every target number has a source or is explicitly pending.
- Weak verbs (help/support/improve) are absent or deliberately used with specifics.
- Impact metrics table has at least one outcome per time horizon.

## References

- `grants/write-objectives/SKILL.md` — SMART objectives that feed impact statements.
- `grants/write-section/SKILL.md` — executive summary and broader context.
- `grants/grant-review-6d/SKILL.md` — Dimension 2 (Problem & Impact).
