---
name: submit
description: Verify the approved source of truth, reuse the browser workflow to fill the final application, and close the cycle after the owner submits. Use after the proposal is approved for submission.
---

# Submit

`submit` is the last top-level skill. It reuses `chrome-navigate` for browser fill and owns the closeout after the owner submits.

## When to Use

- The owner approved the final draft
- The PR is merged or the source-of-truth file is explicitly approved
- The owner says "prepare submission" or "close this grant cycle"

## Outputs

This skill should leave behind:

- a verified source-of-truth path
- a browser handoff for `chrome-navigate mode=submit`
- a status update after owner submission
- a final closeout summary

## Workflow

1. **Verify the proposal is actually approved.**
   - merged PR, or
   - explicit owner confirmation that a local draft is the source of truth

2. **Verify the final files and attachments exist.**
   Do not begin submission with gaps.

3. **Invoke `chrome-navigate` in `mode=submit`.**
   The browser agent fills the form from the approved source file and stops before submit.

4. **Owner review and submit.**
   The owner, not the agent, clicks submit.

5. **Close the loop.**
   - update status
   - swap labels if GitHub exists
   - emit the closing summary

## Closeout Summary

Include:

- opportunity name
- funder
- submission date
- final source-of-truth file
- attachments used
- Issue / PR link if available
- next follow-up date or expected decision window if known

## GitHub Fallback

If GitHub is unavailable:

- verify the local approved files instead
- still run browser fill if possible
- emit the closeout summary in the conversation
- note explicitly that no label or PR state was updated

## Pitfalls

- Starting submission from a non-final draft
- Allowing a browser agent to improvise answers
- Treating "form filled" as equivalent to "submitted"
- Forgetting to record what was actually submitted and when

## References

- `grants/chrome-navigate/SKILL.md`
- `grants/grant-review/SKILL.md`
- `grants/polish-grant/SKILL.md`
