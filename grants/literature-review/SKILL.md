---
name: literature-review
description: Find and summarize research evidence for a grant — need evidence, approach evidence, population data, best practices. Prioritizes source strength (peer-reviewed > gov > reports > evaluations > news) and outputs a citations summary in `sources/`. Use to document need or support claims.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, evidence, research, literature]
    category: grants
    requires_toolsets: [terminal]
---

# Literature / Evidence Review

Finds and organizes research evidence to back claims in a grant proposal. Structures the output so specific statistics, findings, and best practices can be pulled into the narrative with proper citations.

## When to Use

- Documenting the need for a project (how big is the problem?).
- Finding evidence for a proposed approach.
- Supporting specific claims with research.
- Identifying best practices from similar programs.

## Procedure

1. **Clarify the evidence need.** Ask which type is needed:
   - **Need evidence:** statistics and research showing the problem exists.
   - **Approach evidence:** research supporting the proposed methods.
   - **Population data:** demographics and characteristics of the target group.
   - **Best practices:** what works in similar programs.

2. **Search strategy.** Source type depends on topic:
   - Government data (Census, CDC, BLS, WHO, MinSalud, etc.)
   - Peer-reviewed research (PubMed, Google Scholar)
   - Foundation reports and white papers
   - Local / state / regional health departments
   - Community needs assessments
   - Program evaluation reports

3. **Evidence hierarchy (strongest to weakest).**
   - Peer-reviewed research (strongest)
   - Government statistics
   - Reports from reputable organizations
   - Program evaluations
   - News articles (weakest — use sparingly)

4. **Organize findings** in `proposals/<folder>/sources/evidence-<topic>.md`:

   ```markdown
   # Evidence Summary: <Topic>

   ## Key Statistics
   - [Statistic 1 with source and date]
   - [Statistic 2 with source and date]

   ## Research Findings
   - [Finding 1]: [Brief summary]. Source: [citation]
   - [Finding 2]: [Brief summary]. Source: [citation]

   ## Best Practices
   - [Practice 1]: [Evidence of effectiveness]
   - [Practice 2]: [Evidence of effectiveness]

   ## Local / Regional Data
   - [Relevant local statistics]

   ## Citations
   [Full citation list]
   ```

5. **Integration tips for the proposal.**
   - Lead with the most compelling statistic.
   - Use local data when available — beats national averages.
   - Connect each piece of evidence directly to a proposal claim.
   - Don't overload with statistics (readers glaze over).
   - Cite recent sources (within 5 years preferred).

6. **Output** for the writer:
   - Summary document committed to `sources/`.
   - Key statistics formatted for the proposal body (1–2 lines each).
   - Suggested text integrating evidence into narrative.
   - Full citations file for the References section.

## Pitfalls

- **Symptom:** Primary evidence is a news article. **Cause:** Stopped at the first result. **Fix:** News is the weakest tier. Trace back to the underlying study or government stat.
- **Symptom:** Statistic is from 2015. **Cause:** Didn't filter by date. **Fix:** Prefer sources ≤ 5 years old; cite older only when there's no recent equivalent and note why.
- **Symptom:** Claim in the proposal has no citation. **Cause:** Evidence wasn't logged. **Fix:** Every factual claim → row in the evidence summary → citation in References.
- **Symptom:** National stat used when local is available. **Cause:** Searched generically. **Fix:** Start from the project's geography; pull national only if local doesn't exist.

## Verification

- Evidence summary has all 5 sections populated (or `N/A` explicit).
- Every proposal claim traces to a row in the summary.
- Every row in the summary has a citation with source + date.
- Citations ≤ 5 years old unless justified.

## References

- `grants/write-section/SKILL.md` — Statement of Need uses this evidence.
- `grants/write-section/SKILL.md` — impact numbers should be distilled into the relevant narrative section.
- `grants/funder-fit/SKILL.md` — funder-priority evidence often overlaps.
