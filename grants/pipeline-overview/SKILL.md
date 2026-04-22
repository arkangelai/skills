---
name: pipeline-overview
description: Router for the 7-phase GRANT ENGINE pipeline. Explains how the 4 role playbooks (Scout, Writer, Reviewer, Submission) connect and points to which sub-skill to load. Use when starting a grant cycle, deciding which role is active, or asking "how does the grants pipeline work".
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, pipeline, router, overview]
    category: grants
    requires_toolsets: [terminal]
---

# Grants Pipeline Overview

Meta-skill that describes the end-to-end grant proposal pipeline: one agent ("Gabo") operates four roles in strict sequence, with a browser agent ("Claude-in-Chrome") handling navigation and form-filling. The project owner is the only human in the loop. This skill is a map — load the role-specific skill for the phase you are actually executing.

## When to Use

- Starting a new grant cycle and deciding which role to activate.
- Someone asks "how does the grants pipeline work" or "what are the phases".
- You forget which label drives the next transition (`start-draft`, `draft-for-review`, `submitted`).
- You need to hand off between roles and want to confirm the contract.
- You are debugging where in the pipeline a given artifact (draft, self-review, learnings) should live.

**Do not use:** to actually execute scouting, drafting, review, or submission — load the specific role skill.

## Procedure

1. **Identify the active role.** Only one role runs at a time. Use this table:

   | Role | Phase(s) | Entry trigger | Skill to load |
   |---|---|---|---|
   | Scout | 1 | Daily cron (~8am) or manual request to evaluate opportunities | `grants/scout-opportunities` |
   | Writer | 2 + 3 | Project owner adds `start-draft` label to a GitHub Issue | `grants/draft-proposal` |
   | Reviewer | 4 + 5 + 6 | Writer opened PR with `draft-for-review` label | `grants/review-proposal` |
   | Submission | 7 | Project owner merged the draft PR | `grants/submit-proposal` |

   Browser work (download sources, fill forms): `grants/chrome-navigate-grant`.
   Owner-facing Slack updates at each phase: `grants/slack-briefings`.

2. **Follow the canonical handoff chain.** Do not skip or reorder.
   ```
   Scout ──[owner adds start-draft]──▶ Writer ──[opens PR + draft-for-review]──▶ Reviewer ──[owner merges PR]──▶ Submission ──▶ cycle closed
   ```

3. **Read the required files before each cycle.** Every role starts with:
   - `shared-resources/50_TIPS_GANAR_GRANTS.md` — non-negotiable best practices.
   - `shared-resources/learnings/INDEX.md` — previous funder learnings.
   - The current project's `CLAUDE.md`.

4. **Respect the load rule.** When you activate a role, load only this overview + the playbook for that role. Do not pre-load the other roles' skills.

5. **Artifacts live in a single folder per opportunity:** `proposals/YYYY-MM_Name/` with subfolders `sources/`, `drafts/`, `attachments/`, `final/`. Organizational memory goes to `shared-resources/learnings/` (append-only).

6. **Transversal rules that apply in every role:**
   - Never invent data. Use `[DATO PENDIENTE - requiere input de owner]`.
   - Block on verification after every commit: paste the output of `gh api repos/<org>/<repo>/contents/<path>?ref=<branch> --jq '.name'`. No "I pushed it" claims without verifier output.
   - Everything lives in git. No Drive, no email.
   - Human approval gates: phase 1 (Go decision), phase 6 (merge PR), phase 7 (hit submit).

## Pitfalls

- **Symptom:** You run Reviewer checks inside Writer's flow. **Cause:** Skipping the handoff gate. **Fix:** Reviewer only starts after Writer opens the PR with `draft-for-review`.
- **Symptom:** Draft gets committed to `main`. **Cause:** Writer forgot to checkout the `draft/<name>` branch. **Fix:** Writer Paso 7 verification (`git branch --show-current` must print `draft/<name>`).
- **Symptom:** Agent reports "I submitted it". **Cause:** Agent exceeded its role. **Fix:** The agent never submits. Only the project owner submits, after reviewing what the browser agent filled in.

## Verification

- For the current opportunity, the label on the Issue should match the role you think is active: `P*` (Scout), `start-draft` (Writer), `draft-for-review` (Reviewer), `submitted` (closed).
- `proposals/YYYY-MM_Name/status.md` contains the current phase and next role.
- `git log --oneline -20` shows commits that correspond to the role sequence (scaffold → v1 → self-review → v2 + learnings → status: SUBMITTED).

## References

- `grants/scout-opportunities/SKILL.md`
- `grants/draft-proposal/SKILL.md`
- `grants/review-proposal/SKILL.md`
- `grants/submit-proposal/SKILL.md`
- `grants/chrome-navigate-grant/SKILL.md`
- `grants/slack-briefings/SKILL.md`
