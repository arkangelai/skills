# Grants Skills

A set of atomic, agent-invocable skills for running a grant-proposal pipeline. Each skill can be invoked on its own; the harness (or the caller) is responsible for triggers, scheduling, and notification delivery. No skill in this folder sends messages, runs cron jobs, polls, or sleeps.

## Pipeline map

The pipeline has 7 phases in 4 owner-facing roles. One agent plays the roles in sequence; a browser agent handles navigation and form-fill. The project owner is the only human in the loop and holds the three approval gates.

```
Scout ──[owner adds start-draft]──▶ Writer ──[opens PR + draft-for-review]──▶ Reviewer ──[owner merges PR]──▶ Submission ──▶ cycle closed
```

| Role | Phase(s) | Entry trigger (harness-owned) | Skill to load |
|---|---|---|---|
| Scout | 1 | Invocation to evaluate opportunities | `scout-opportunities/` |
| Writer | 2 + 3 | `start-draft` label added to a `grant-opportunity` Issue | `draft-proposal/` |
| Reviewer | 4 + 5 + 6 | PR opened with `draft-for-review` label | `review-grant/` |
| Submission | 7 | Draft PR merged | `submit-proposal/` |

Browser work (download sources, fill forms): `chrome-navigate-grant/`.

## Supporting skills

| Skill | What it does |
|---|---|
| `funder-fit/` | Research a funder's priorities, then score a draft's alignment across 7 dimensions. |
| `literature-review/` | Find and summarize research evidence for a grant. |
| `write-section/` | Draft any grant section (Exec Summary, Needs, Goals/Objectives with SMART, Methods, Evaluation, Impact, Budget Justification, Capacity, Sustainability). |
| `develop-budget/` | Build a budget table + per-line justification. |
| `develop-timeline/` | Build a realistic project timeline (table / milestone / narrative). |

## How invocations connect

Each skill is atomic: the caller passes the identifier (Issue #, PR #, folder path, or opportunity name) as an input. Skills read state from GitHub Issues/PRs and from files on disk — they do **not** assume session memory from a previous invocation.

Handoff signals live in GitHub (Issue labels, PR status) and in git (branches, commits). Example: the Writer opens a PR with label `draft-for-review`; the harness watches for that event and invokes `review-grant` with the PR number.

## Transversal rules

- **Never invent data.** Use `[DATO PENDIENTE - requiere input de owner]`.
- **Verify on-chain state before advancing.** After every commit or label change, assert the expected output matches (e.g., `gh api … --jq '.name'` returns the expected file); abort on mismatch. Do not report success from local state alone.
- **Everything lives in git.** No cloud drive, no email attachments.
- **Human approval gates:** Phase 1 Go decision, Phase 6 merge PR, Phase 7 hit submit. Agents never submit.
- **Artifacts live in a single folder per opportunity:** `proposals/YYYY-MM_Name/` with subfolders `sources/`, `drafts/`, `attachments/`, `final/`. Organizational memory goes to `shared-resources/learnings/` (append-only).

## Before executing any skill

- Confirm the harness has terminal access and `gh` is authenticated for the target `<org>/grants` repo.
- For browser work, resolve the browser agent via the preflight in `chrome-navigate-grant/`.

## Pitfalls (cross-cutting)

- Running Reviewer checks inside the Writer phase. Fix: handoff only happens when the PR has `draft-for-review`.
- Committing to `main` when a draft branch was expected. Fix: every Writer/Reviewer step asserts `git branch --show-current` before committing.
- Agent reports "I submitted it." Fix: the agent never submits. Only the project owner submits.

## References

- `shared-resources/50_TIPS_GANAR_GRANTS.md`
- `shared-resources/learnings/INDEX.md`
- The current project's `CLAUDE.md`.
