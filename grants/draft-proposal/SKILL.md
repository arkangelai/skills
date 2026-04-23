---
name: draft-proposal
description: Scaffold `proposals/YYYY-MM_Name/`, coordinate a browser agent to gather official sources, and draft v1 in a git branch that opens a PR with `draft-for-review`. Use when the project owner adds `start-draft` to a grant Issue, asks to "draft this grant", or activates the Writer role (Phases 2+3).
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, writing, drafting, scaffold]
    category: grants
    requires_toolsets: [terminal]
---

# Draft Proposal (Writer)

Writer activates when the project owner adds `start-draft` to a grant Issue. It creates the opportunity folder, prepares a prompt for the browser agent to extract official sources, reads the sources + repo-wide guidelines, drafts v1 in a branch, and opens a PR tagged `draft-for-review`. Writer can start with partial metadata as long as the opportunity is identifiable.

## When to Use

- The project owner adds the `start-draft` label to an Issue and says "activate Writer for issue #NNN" / "draft this grant".
- An Issue has a Go decision and needs a folder + v1 draft.
- You need to re-enter Writer after a pause (owner says "continue Writer at Step X").

**Do not use:** to review a v1 draft (that's `grants/review-grant`), to evaluate opportunities (that's `grants/scout-opportunities`), or to fill a submission form (that's `grants/submit-proposal`).

## Inputs (passed by the caller)

The skill is atomic. The caller passes:

```
ISSUE_NUMBER     e.g. 260
ORG              GitHub org owning the grants repo
NOMBRE_KEBAB     e.g. horizon-edctp3-digit-02
CARPETA          e.g. 2026-09_HORIZON-EDCTP3-DIGIT-02
FUNDER           e.g. EU Horizon Europe / EDCTP3
```

Branch is always `draft/<NOMBRE_KEBAB>`. Metadata that can start as "Por confirmar" and be validated by the browser agent: `OFICIAL_URL`, `DEADLINE`, `MONTO`, `ELEGIBILIDAD`, `TIPO_ENVIO`. Missing these does not block Phase 2.

## Preflight

1. **`gh` access.** Verify `gh` is available and authenticated for `<ORG>/grants`:
   ```bash
   gh auth status
   gh repo view <ORG>/grants --json name --jq '.name'
   ```
   Expected: "Logged in" + `grants`. Abort and report if either fails.
2. **Browser agent.** Phase 2 needs a browser agent to gather official sources. Before starting, invoke the preflight in `grants/chrome-navigate-grant/SKILL.md` — it resolves whether the harness has a built-in browser capability and, if not, asks the user which browser agent to use. Do not proceed with Phase 2 until a browser agent is resolved.

## Procedure

Execute **one step at a time**. After every verification command, compare output to the expected pattern and **abort on mismatch** — do not report success from local state alone.

### Phase 2 — Prep for the browser agent

1. **Scaffold folder and commit to main.**
   ```bash
   git checkout main && git pull
   mkdir -p "proposals/<CARPETA>"/{sources,drafts,attachments,final}
   cp templates/_example-grant/README.md "proposals/<CARPETA>/README.md"
   cp templates/_example-grant/status.md "proposals/<CARPETA>/status.md"
   # Edit both files, substituting [Grant Name], [Funder Name], [YYYY-MM-DD], [NNN]
   git add "proposals/<CARPETA>/"
   git commit -m "chore(proposal): scaffold <CARPETA> — refs #<ISSUE_NUMBER>"
   git push origin main
   ```

2. **Assert the scaffold reached GitHub (blocking).**
   ```bash
   gh api repos/<ORG>/grants/contents/proposals/<CARPETA>/README.md --jq '.name'
   ```
   Expected output: `README.md`. On 404 or any other response, the push failed — diagnose with `git status` / `git log`, retry, and abort if it still fails.

3. **Prepare the browser-agent prompt** from `templates/browser-agent-prompt-base.md` (or `chrome-prompt-base.md` if that's what the repo has), substituting `[NOMBRE_OPORTUNIDAD]`, `[OFFICIAL_LINK]`, `[CARPETA_OBJETIVO] = proposals/<CARPETA>`, `[NOTAS_EXTRA]`. If the official URL is unconfirmed, instruct the browser agent to validate URL, deadline, amount, eligibility, and submission type from the official source. The actual execution is handed off to the browser agent resolved in the Preflight; see `grants/chrome-navigate-grant/SKILL.md` for that playbook.

4. **Leave constancy on the Issue.**
   ```bash
   gh issue comment <ISSUE_NUMBER> --repo <ORG>/grants --body "Phase 2 ready. Folder proposals/<CARPETA>/ created on main. Browser-agent prompt handed off. Waiting for sources."
   gh issue view <ISSUE_NUMBER> --repo <ORG>/grants --comments | tail -5
   ```
   Expected: your most recent comment appears at the tail. Abort on mismatch. Then **exit the skill**. Phase 3 resumes on a separate invocation, triggered by the harness when `proposals/<CARPETA>/sources/` is populated (or when the owner manually re-runs the skill). Do not poll, sleep, or send reminders from inside the skill.

### Phase 3 — Draft v1

5. **Required reading before writing a line.** Read in order: Issue, `sources/rules.md`, `sources/eligibility.md`, `sources/evaluation-criteria.md`, `sources/form-fields.md` (if exists), `sources/navigation-notes.md`, `shared-resources/50_TIPS_GANAR_GRANTS.md`, `shared-resources/learnings/INDEX.md`, `shared-resources/learnings/by-funder/<funder-kebab>.md` (if exists), `shared-resources/arkangel-descriptions/` (choose applicable product), `shared-resources/biosketches/`. Report: applicable core product, winning angle in one line, top 3 dominant evaluation criteria, deliverable type (online form / long narrative / mixed), bootstrap brief in 4–8 bullets.

6. **FLAG check.** Are there stoppers requiring human decision? Eligibility doubt, missing partner, IP/open-source undecided, two equally-valid angles, unconfirmed budget/duration with partner? If yes, leave FLAG as Issue comment:
   ```markdown
   ### FLAG N — [short title]
   **Type:** eligibility | partner | IP | angle | budget | other
   **Context:** [what the call says + what the org has]
   **Options:** [A] / [B] / [C] with pros/cons
   **Provisional recommendation:** [if any]
   **Affected sections in draft:** [list]
   ```
   For partner FLAGs, include 3–5 plausible partners/profiles marked as hypotheses. Do NOT stop — continue to Step 7 and put `[SECCION PENDIENTE - FLAG N: descripción]` in affected sections.

7. **Create the branch and assert.**
   ```bash
   git checkout main && git pull
   git checkout -b draft/<NOMBRE_KEBAB>
   git branch --show-current
   ```
   Expected output of the last command: `draft/<NOMBRE_KEBAB>`. Abort on mismatch — do not commit from the wrong branch.

8. **Choose the output filename. One name per type:**
   - Online form → `drafts/field-mapping-responses.md`
   - Long narrative → `drafts/proposal-v1.md` + `drafts/budget-v1.md`
   - Mixed → both with cross-references

9. **Draft v1. Non-negotiable rules:**
   - Never exceed word/character limits. Keep 5% margin.
   - Never invent data. Use `[DATO PENDIENTE - requiere input de owner]` and list them in a final `## Gaps pendientes` section.
   - Coherent narrative, no internal contradictions.
   - Budget coherent with activities and timeline.
   - **Speed rule:** first commit in `drafts/` in < 20 min, even with several `[DATO PENDIENTE]` markers.

10. **Commit v1 + double assertion.**
    ```bash
    git add "proposals/<CARPETA>/drafts/"
    git commit -m "feat(proposal): v1 draft for <NOMBRE_KEBAB> — refs #<ISSUE_NUMBER>"
    git push -u origin draft/<NOMBRE_KEBAB>

    gh api repos/<ORG>/grants/branches/draft/<NOMBRE_KEBAB> --jq '.name'
    gh api "repos/<ORG>/grants/contents/proposals/<CARPETA>/drafts/<ARCHIVO>?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
    ```
    Expected outputs: branch name, then filename. Any 404 or empty response → abort; the push did not land. Then leave an Issue summary comment with: branch, exact path, deliverable type, draft state, pending gaps, open FLAGs.

11. **Open the PR.**
    ```bash
    gh pr create --repo <ORG>/grants --base main --head draft/<NOMBRE_KEBAB> \
      --title "Proposal: [grant title]" \
      --body "Refs #<ISSUE_NUMBER>

    ## Summary
    - Funder: <FUNDER>
    - Deadline: <DEADLINE>
    - Type: [online form | narrative | mixed]

    ## PR contents
    - drafts/<ARCHIVO>

    Next: Reviewer in Phase 4, depurador in Phase 5."

    gh pr list --repo <ORG>/grants --head draft/<NOMBRE_KEBAB> --json number,url
    ```
    Save the PR number.

12. **Swap Issue labels to signal handoff to Reviewer.**
    ```bash
    gh issue edit <ISSUE_NUMBER> --repo <ORG>/grants --remove-label "start-draft" --add-label "draft-for-review"
    gh issue view <ISSUE_NUMBER> --repo <ORG>/grants --json labels --jq '[.labels[].name]'
    ```
    Expected output: a JSON array that includes `draft-for-review` and excludes `start-draft`. Abort on mismatch. Writer role ends here — exit cleanly. The harness re-invokes `review-grant` on the `draft-for-review` label event.

### When to use `agent:blocked` (narrow)

Only use it if: (a) no official source exists to draft without inventing; (b) eligibility is materially disqualifying; (c) a human decision is indispensable and no provisional draft is possible; (d) duplicate/inconsistent Issue with active conflicting PR.

Do **not** block for: missing folder, incomplete source pack, no formal scout brief, unconfirmed partner, incomplete metadata. In those cases, advance with explicit assumptions and mark gaps in Issue + PR.

## Pitfalls

- **Symptom:** `git push` rejected on main. **Cause:** main advanced while you were editing. **Fix:** `git pull --rebase origin main` and retry.
- **Symptom:** `gh api` returns 404 at Step 10 but you "committed". **Cause:** Push actually failed. **Fix:** `git log -1`, `git status`, re-push. Never report success on 404.
- **Symptom:** You report a SHA that doesn't exist. **Cause:** Hallucinated SHA. **Fix:** Always paste the literal `gh api` output; if empty, re-execute.
- **Symptom:** Draft has invented partner names or metrics. **Cause:** Filled gaps instead of flagging. **Fix:** Delete the invented line, replace with `[DATO PENDIENTE - requiere input de owner]`, list at the end.
- **Symptom:** Mixed filenames (a `proposal-v1.md` for an online form). **Cause:** Ignored Step 8. **Fix:** One name per type, always.

## Verification

- Output of `git branch --show-current` is `draft/<NOMBRE_KEBAB>`.
- `gh api repos/<ORG>/grants/branches/draft/<NOMBRE_KEBAB> --jq '.name'` returns the branch name.
- `gh api "repos/<ORG>/grants/contents/proposals/<CARPETA>/drafts/<ARCHIVO>?ref=draft/<NOMBRE_KEBAB>" --jq '.name'` returns the filename.
- `gh pr list --head draft/<NOMBRE_KEBAB>` returns a PR with a number and URL.
- Issue labels include `draft-for-review`, exclude `start-draft`.

## References

- `grants/README.md`
- `grants/chrome-navigate-grant/SKILL.md` — browser-agent playbook, including preflight for resolving which browser tool to use.
- `grants/review-grant/SKILL.md` — next role (Reviewer) after you open the PR; contains the 6-dimension rubric your draft will face.
- `shared-resources/50_TIPS_GANAR_GRANTS.md`
