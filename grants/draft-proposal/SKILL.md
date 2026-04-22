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

**Do not use:** to review a v1 draft (that's `grants/review-proposal`), to evaluate opportunities (that's `grants/scout-opportunities`), or to fill a submission form (that's `grants/submit-proposal`).

## Procedure

Execute **one step at a time**. Paste the verifier output after each commit — no "I pushed it" without `gh api` output.

### Minimum variables before starting

```
ISSUE_NUMBER  = e.g. 260
NOMBRE_KEBAB  = e.g. horizon-edctp3-digit-02
CARPETA       = e.g. 2026-09_HORIZON-EDCTP3-DIGIT-02
BRANCH        = draft/<NOMBRE_KEBAB>
FUNDER        = e.g. EU Horizon Europe / EDCTP3
```

Metadata that can start as "Por confirmar" and be validated by the browser agent: `OFICIAL_URL`, `DEADLINE`, `MONTO`, `ELEGIBILIDAD`, `TIPO_ENVIO`. Missing these does not block Phase 2.

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

2. **Verify the scaffold reached GitHub (blocking).**
   ```bash
   gh api repos/<org>/grants/contents/proposals/<CARPETA>/README.md --jq '.name'
   ```
   Must return `README.md`. On 404, the push failed — diagnose with `git status`, `git log`, retry.

3. **Prepare the Chrome prompt** from `templates/chrome-prompt-base.md`, substituting `[NOMBRE_OPORTUNIDAD]`, `[OFFICIAL_LINK]`, `[CARPETA_OBJETIVO] = proposals/<CARPETA>`, `[NOTAS_EXTRA]`. If official URL is unconfirmed, tell Chrome to validate URL, deadline, amount, eligibility, submission type from the official source.

4. **Leave constancy on the Issue.**
   ```bash
   gh issue comment <ISSUE_NUMBER> --repo <org>/grants --body "Phase 2 ready. Folder proposals/<CARPETA>/ created on main. Chrome prompt handed off. Waiting for sources."
   gh issue view <ISSUE_NUMBER> --repo <org>/grants --comments | tail -10
   ```
   Then **stop**. Wait for owner confirmation or verifiable evidence in `proposals/<CARPETA>/sources/`. If 30 min pass without signal, send one Slack reminder; max 2 reminders.

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

7. **Create the branch.**
   ```bash
   git checkout main && git pull
   git checkout -b draft/<NOMBRE_KEBAB>
   git branch --show-current   # must print draft/<NOMBRE_KEBAB>
   ```

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

10. **Commit v1 + double verification.**
    ```bash
    git add "proposals/<CARPETA>/drafts/"
    git commit -m "feat(proposal): v1 draft for <NOMBRE_KEBAB> — refs #<ISSUE_NUMBER>"
    git push -u origin draft/<NOMBRE_KEBAB>

    gh api repos/<org>/grants/branches/draft/<NOMBRE_KEBAB> --jq '.name'
    gh api "repos/<org>/grants/contents/proposals/<CARPETA>/drafts/<ARCHIVO>?ref=draft/<NOMBRE_KEBAB>" --jq '.name'
    ```
    Paste both outputs. Leave an Issue summary comment with: branch, exact path, deliverable type, draft state, pending gaps, open FLAGs.

11. **Open the PR.**
    ```bash
    gh pr create --repo <org>/grants --base main --head draft/<NOMBRE_KEBAB> \
      --title "Proposal: [grant title]" \
      --body "Refs #<ISSUE_NUMBER>

    ## Summary
    - Funder: <FUNDER>
    - Deadline: <DEADLINE>
    - Type: [online form | narrative | mixed]

    ## PR contents
    - drafts/<ARCHIVO>

    Next: Reviewer in Phase 4, depurador in Phase 5."

    gh pr list --repo <org>/grants --head draft/<NOMBRE_KEBAB> --json number,url
    ```
    Save the PR number.

12. **Swap Issue labels to signal handoff to Reviewer.**
    ```bash
    gh issue edit <ISSUE_NUMBER> --repo <org>/grants --remove-label "start-draft" --add-label "draft-for-review"
    gh issue view <ISSUE_NUMBER> --repo <org>/grants --json labels --jq '[.labels[].name]'
    ```
    Output must include `draft-for-review` and exclude `start-draft`. Writer role ends here.

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
- `gh api repos/<org>/grants/branches/draft/<NOMBRE_KEBAB> --jq '.name'` returns the branch name.
- `gh api "repos/<org>/grants/contents/proposals/<CARPETA>/drafts/<ARCHIVO>?ref=draft/<NOMBRE_KEBAB>" --jq '.name'` returns the filename.
- `gh pr list --head draft/<NOMBRE_KEBAB>` returns a PR with a number and URL.
- Issue labels include `draft-for-review`, exclude `start-draft`.

## References

- `grants/pipeline-overview/SKILL.md`
- `grants/chrome-navigate-grant/SKILL.md` — what the browser agent does during Phase 2.
- `grants/review-proposal/SKILL.md` — next role (Reviewer) after you open the PR.
- `grants/grant-review-6d/SKILL.md` — the 6-dimension review criteria your draft will face.
- `shared-resources/50_TIPS_GANAR_GRANTS.md`
