---
name: polish-grant
description: Respond to grant review comments on the pull request, apply accepted changes, and ship cleaner follow-up versions. Use after the main review when owner feedback or PR comments still need to be resolved.
---

# Polish Grant

`polish-grant` is the revision loop after the main review. It exists so "respond to comments and clean up the draft" is one explicit top-level step.

## When to Use

- The PR has review comments or owner comments
- `grant-review` already produced v2, but the proposal is not yet ready to merge
- The owner says "address the review comments" or "polish this before merge"

## Outputs

This skill should leave behind:

- an updated proposal version such as `proposal-v3.md` or `field-mapping-responses-v3.md` when needed
- explicit responses to PR threads when GitHub is available
- a short change summary saying what was accepted, rejected, or deferred

## Workflow

1. **Collect all feedback.**
   - PR review threads
   - inline comments
   - owner comments
   - direct instructions in the conversation

2. **Classify each item.**
   - `accept`
   - `reject`
   - `clarify first`

3. **Apply accepted edits in the source-of-truth draft.**
   Keep the proposal internally consistent after each change.

4. **Reply to each thread when GitHub is available.**
   - what changed
   - where it changed
   - what remains open, if anything

5. **Version cleanly when needed.**
   If the change set is substantial, create `v3`, `v4`, and so on. If the change is minor and the repo convention prefers in-place edits, update the latest approved draft consistently.

6. **Emit the polish summary.**
   Include:
   - comments addressed
   - comments rejected with reason
   - open decisions still requiring the owner

## GitHub Fallback

If GitHub is unavailable, treat the conversation as the review log:

- quote or summarize each feedback item
- classify it
- apply the changes locally
- emit the same polish summary in the conversation

## Pitfalls

- Applying comments one by one without rechecking the whole narrative
- Replying "fixed" without naming the actual change
- Allowing PR comments to fork the draft into multiple inconsistent versions
- Turning this skill into another full review instead of a response-and-polish pass

## References

- `grants/grant-review/SKILL.md`
- `grants/submit/SKILL.md`
