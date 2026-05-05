---
name: scout-grants
description: Find grant opportunities, evaluate eligibility and fit, and create a clean opportunity brief. Use when starting from zero, triaging new calls, or deciding whether an opportunity is worth drafting.
---

# Scout Grants

`scout-grants` is the front door of the pipeline. It combines opportunity discovery, eligibility screening, funder-fit profiling, and proposal kickoff prep into one top-level skill.

## When to Use

- You are starting from zero and need a shortlist of grants.
- The owner says "find me grants", "evaluate this call", or "should we go after this?"
- A promising call exists and needs a go / no-go recommendation.
- The owner wants the opportunity captured in GitHub when possible, or in the conversation if not.

## Outputs

This skill should leave behind:

- an opportunity brief with: funder, amount, deadline, eligibility, official URL, fit rationale, risks, and recommendation
- a priority decision: `go`, `watch`, or `discard`
- if GitHub is available: a `grant-opportunity` Issue with the brief and labels
- if GitHub is not available: the same artifact in the conversation
- if the owner says `go`: the proposal folder path and kickoff notes for `chrome-navigate`

## Workflow

1. **Search and shortlist.**
   - Search live funding opportunities.
   - Dedupe by funder, URL, opportunity ID, and cycle/year.
   - Favor real opportunities over broad "funder directory" pages.

2. **Screen hard before falling in love.**
   - Eligibility: org type, geography, sector, partner requirements, application format.
   - Disqualifiers: expired calls, academic-only when you are not eligible, nonprofit-only if inapplicable, impossible compliance requirements.

3. **Run the fit pass.**
   - What does the funder actually want?
   - Which of your products, services, or evidence lines fit?
   - What budget range and duration look realistic?
   - What would the winning narrative angle likely be?

4. **Write the opportunity brief.**
   Use this shape:

   ```markdown
   # Opportunity Brief — <Opportunity Name>

   - Funder:
   - Official URL:
   - Deadline:
   - Typical amount:
   - Eligibility:
   - Submission type:
   - Why it fits:
   - Risks / gaps:
   - Recommendation: go | watch | discard
   - Recommended next move:
   ```

5. **Persist the result.**
   - If GitHub is available, create or update a `grant-opportunity` Issue.
   - If GitHub is unavailable, emit the same brief in the conversation and write locally if a workspace exists.

6. **If the owner says `go`, prepare the handoff.**
   - Propose `CARPETA` and `NOMBRE_KEBAB`.
   - Create the proposal folder if the grants repo or local workspace is available.
   - Leave kickoff notes for `chrome-navigate`, including the official URL and what to extract first.

## GitHub Fallback

If `gh` or the grants repo is unavailable:

- do not block the skill
- emit the opportunity brief in the conversation
- say explicitly that no Issue was created
- continue with local folder preparation if the user still wants to proceed

## Pitfalls

- Treating a well-branded opportunity as eligible without reading the actual eligibility section.
- Recommending `go` before checking partner requirements and geography.
- Creating a weak brief that says "good fit" without naming the product line or value proposition.
- Starting proposal drafting before there is an official URL and a clear recommendation.

## References

- `skills/chrome-navigate/SKILL.md` — next step for source extraction and form mapping
- `skills/develop-proposal/SKILL.md` — first drafting pass after the source pack exists
