---
name: grant-review
description: Run the full critical review of a grant proposal, score it against funder and feasibility criteria, rewrite blockers into a cleaner version, and capture learnings. Use after the first draft, timeline, and budget exist.
---

# Grant Review

`grant-review` is the quality gate before owner approval. It combines the old deep review rubric with the lighter funder-fit scoring pass so there is one top-level review skill, not two.

## When to Use

- `develop-proposal`, `develop-timeline`, and `develop-budget` have produced a coherent package
- A draft PR exists and needs a real review
- The owner says "review this grant" or "is this ready?"

## Outputs

This skill should leave behind:

- `self-review-v1.md`
- an improved source-of-truth draft such as `proposal-v2.md` or `field-mapping-responses-v2.md`
- `learnings-v1.md`
- if GitHub is available: updated branch/PR state and a summary comment
- if GitHub is unavailable: the same artifacts locally and a review summary in the conversation

## Review Scope

Review the proposal across:

1. funder alignment
2. problem and impact
3. scientific or implementation design
4. feasibility and execution
5. budget and format compliance
6. writing quality and clarity

Also run an explicit disqualifier pass:

- eligibility mismatch
- missing required sections
- unsupported claims
- outdated evidence as the primary support
- impossible staffing, timeline, or budget logic

## Workflow

1. **Read the complete package.**
   - draft
   - rules and evaluation criteria
   - timeline
   - budget
   - key source evidence
2. **Write `self-review-v1.md`.**
   - score each review dimension
   - identify blockers
   - identify improvements
   - name any auto-fail concerns
3. **Enforce skepticism.**
   If the first pass finds fewer than 3 meaningful blockers, re-read with a stricter mindset unless the proposal is genuinely unusually strong.
4. **Rewrite into v2.**
   Apply all blockers into the draft.
5. **Capture learnings.**
   Record repeatable lessons for the funder and for future proposals.
6. **Persist the result.**
   Update branch/PR if GitHub exists; otherwise save locally and summarize in the conversation.

## Internal Responsibilities

Inside this skill, do not split out a separate top-level "funder fit" step. The alignment scoring and wording recommendations happen here as part of the review.

## GitHub Fallback

If GitHub is unavailable:

- review the local draft anyway
- write `self-review-v1.md`, `proposal-v2.md`, and `learnings-v1.md` locally
- emit a concise review summary in the conversation

## Pitfalls

- Calling the proposal "good enough" without forcing a blocker hunt
- Reviewing writing only and not checking eligibility or feasibility
- Producing feedback without rewriting the actual source-of-truth draft
- Leaving timeline and budget contradictions unresolved

## References

- `grants/develop-proposal/SKILL.md`
- `grants/develop-timeline/SKILL.md`
- `grants/develop-budget/SKILL.md`
- `grants/polish-grant/SKILL.md`
- `grants/submit/SKILL.md`
