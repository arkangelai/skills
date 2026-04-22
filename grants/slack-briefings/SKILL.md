---
name: slack-briefings
description: Canonical Slack briefings for the 4 owner-facing moments in the grants pipeline: (1) Scout daily report, (2) STOP check for FLAGs, (3) Reviewer v2 handoff (3-block), (4) Submission closing. Use when preparing any of these or when asked for "the Slack template for phase X".
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, communication, slack, handoff]
    category: grants
    requires_toolsets: [terminal]
---

# Slack Briefings for the Pipeline

Fixed Slack DM formats the agent uses at four moments during a grant cycle. Outside those moments, the agent operates silently (commits to git, comments on Issues). The briefing formats must not change arbitrarily — they're what lets the owner decide fast.

## When to Use

- Sending the daily Scout report (~8am).
- A FLAG appears during Writer and you need a STOP check.
- Reviewer is done and you're handing v2 to the owner (Phase 6).
- Submission is done and you're closing the cycle (Phase 7).
- The owner asks "send me the Slack template for phase X".

**Do not use:** for ad-hoc status pings or casual coordination. The four templates are the only scheduled communications.

## Procedure

The pipeline has **4 Slack moments**. Every Slack message ALSO goes as a comment on the corresponding Issue (double-channel rule). The DM is the notification; the Issue comment is the permanent record.

### 1. Scout daily report (Phase 1, ~8am)

```
Scout for [YYYY-MM-DD]:
- Issues evaluated: [N]
- New Issues created: [N]
- P0: [short list with Issue numbers and titles]
- P1: [N]
- P2: [N]
- discarded: [N]
```

If opportunities were enriched without creating new Issues, mention briefly at the end.

### 2. STOP check during Writer (only if FLAGs arise)

Only send if a FLAG affects eligibility, priority, strategic direction, or blocks a central section. Otherwise continue drafting with `[SECCION PENDIENTE - FLAG N]` markers.

```
STOP check on issue #<NNN> — <grant title>

Link: <Issue URL>

Summary (3 lines max):
- What came up
- What it blocks
- What I need from you

Do not advance until you respond in the Issue. I paused drafting section(s): <list>.
```

### 3. Handoff v2 to the owner (Phase 6 — Reviewer)

This is the big one. Must have 3 blocks in this exact order.

**Block 1 — Links (what each file is):**
- For review (Word): `proposal-v2.docx` (narrative only)
- Source of truth: `proposal-v2.md` (or `field-mapping-responses-v2.md`)
- Reviewer comments: `self-review-v1.md`
- Learnings captured: `learnings-v1.md`

Use absolute GitHub URLs, not relative paths.

**Block 2 — Executive review summary (≤ 6 lines):**
- BLOCKERs found by Reviewer + BLOCKERs applied
- Improvements suggested + improvements applied
- 3–5 principal v1 → v2 changes (one line each)

**Block 3 — Open FLAGs (decisions only the owner can make):**
- Short list of FLAGs (detail in Issue comment)
- Or "None" if none are open

**Closing line:** what you expect from the owner — approve (merge the PR), return the `.docx` with edits, or resolve FLAGs in the Issue.

### 4. Submission closing message (Phase 7)

```
Submitted — <FUNDER> <grant name>

- Folder: proposals/<CARPETA>
- Date: <YYYY-MM-DD>
- Type: <online form | narrative | mixed>
- Issue: #<NNN> (label: submitted)
- PR: https://github.com/<org>/grants/pull/<PR_NUMBER>
- Learnings captured in shared-resources/learnings/by-funder/<funder-kebab>.md

Cycle closed.
```

## Pitfalls

- **Symptom:** Owner can't find the file you referenced. **Cause:** Used a relative path in the DM. **Fix:** Always paste absolute GitHub URLs (`https://github.com/<org>/grants/blob/...`).
- **Symptom:** Owner asks "where are the Reviewer comments?". **Cause:** You didn't link `self-review-v1.md` in Block 1. **Fix:** Block 1 must always have all 4 links (docx, md, self-review, learnings) even if some are "N/A".
- **Symptom:** You send a status ping every few hours. **Cause:** Over-communication. **Fix:** Only the 4 moments above. Silent work between them. Reminders allowed only if > 30 min (Phase 2) or > 24h (Phase 6) without owner response; max 2 reminders.
- **Symptom:** DM said "submitted" but no Issue comment. **Cause:** Broke double-channel rule. **Fix:** Every DM also goes as an Issue comment. Slack is notification; Issue is permanent record.
- **Symptom:** Handoff DM has 8 blocks because "there was a lot to say". **Cause:** Ignored the fixed format. **Fix:** 3 blocks only. Additional context goes in the Issue comment, not in the DM.

## Verification

- Each phase-critical DM also appears as a comment on the Issue:
  ```bash
  gh issue view <N> --repo <org>/grants --comments | tail -20
  ```
- Block 1 of the handoff DM has 4 links (or explicit "N/A" for docx if it's an online form).
- Closing DM includes the 6 lines: folder, date, type, issue + label, PR URL, learnings path.

## References

- `grants/pipeline-overview/SKILL.md`
- `grants/scout-opportunities/SKILL.md` — daily report content.
- `grants/draft-proposal/SKILL.md` — when to send STOP check.
- `grants/review-proposal/SKILL.md` — Phase 6 handoff producer.
- `grants/submit-proposal/SKILL.md` — Phase 7 closing producer.
