---
name: develop-proposal
description: Write the first strong pass of a grant proposal from the source pack. Use after scouting and browser enrichment to gather evidence, shape the narrative, and produce the initial draft.
---

# Develop Proposal

`develop-proposal` is the main writing skill. It absorbs the old funder-fit, literature-review, and section-writing work into one top-level workflow.

## When to Use

- `chrome-navigate` has produced the source pack
- The owner says "write the first draft"
- A proposal exists but needs a structured first full pass

## Outputs

This skill should leave behind:

- `proposal-v1.md` for narrative applications, or
- `field-mapping-responses-v1.md` for form-driven applications, or
- both for mixed submissions

If GitHub is available, the draft should live in the proposal folder and, preferably, on a draft branch or PR. If GitHub is unavailable, write locally and emit the summary artifact in the conversation.

## Internal Responsibilities

This skill performs four kinds of work internally:

1. **Source reading**
   - rules
   - eligibility
   - evaluation criteria
   - form fields
   - navigation notes

2. **Funder-fit pass**
   - what the funder values
   - which language and positioning to mirror
   - which product line or angle should lead

3. **Evidence gathering**
   - need evidence
   - approach evidence
   - population data
   - best practices

4. **Section writing**
   - executive summary
   - statement of need
   - goals and objectives
   - methods
   - evaluation
   - impact
   - organizational capacity
   - sustainability
   - budget-justification placeholders where appropriate

## Workflow

1. **Read the entire source pack before writing.**
2. **Write a brief bootstrap note for yourself:**
   - what this grant funds
   - what angle is most likely to win
   - top 3 evaluation criteria
   - biggest risks or unknowns
3. **Gather or confirm evidence** for need, method, and impact claims.
4. **Draft the proposal in a clean structure** matched to the actual application type.
5. **Do not invent missing facts.**
   Use `[DATO PENDIENTE - requiere input de owner]`.
6. **Keep the first pass coherent rather than perfect.**
   The goal is a real v1 that can survive `grant-review`, not a final polished submission.
7. **If GitHub is available, persist it properly.**
   - preferred: branch + commit + PR
   - fallback: branch + commit without PR
8. **If GitHub is unavailable, persist locally and summarize in the conversation.**

## Drafting Standards

- Write to the evaluation criteria, not to generic grant best practices
- Use recent and credible evidence
- Keep one idea per paragraph
- Prefer clear outcomes over technical flourish
- Keep budget, timeline, and methods mutually consistent
- If a partner, metric, or compliance detail is unknown, mark it explicitly

## Deliverable Naming

- narrative: `drafts/proposal-v1.md`
- form-driven: `drafts/field-mapping-responses-v1.md`
- mixed: both files, with cross-references

## GitHub Fallback

If `gh` or the target grants repo is unavailable:

- write the draft locally in the same folder structure
- emit the draft path and summary in the conversation
- explicitly note that no PR or Issue update was created

## Pitfalls

- Starting from memory instead of reading the source pack
- Letting evidence gathering drift into an endless research phase
- Writing generic nonprofit prose that does not mirror the funder's priorities
- Treating section writing as separate top-level work instead of one proposal pass
- Claiming the draft is final before timeline and budget have been integrated

## References

- `grants/scout-grants/SKILL.md`
- `grants/chrome-navigate/SKILL.md`
- `grants/develop-timeline/SKILL.md`
- `grants/develop-budget/SKILL.md`
- `grants/grant-review/SKILL.md`
