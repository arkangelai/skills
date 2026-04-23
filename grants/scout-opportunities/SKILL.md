---
name: scout-opportunities
description: Discover, evaluate, and triage grant opportunities. Reviews `grant-opportunity` Issues, searches for new ones, dedupes, assigns P0/P1/P2/discarded, and creates/enriches GitHub Issues with required labels. Use when invoked to scout grants or triage uncategorized `grant-opportunity` Issues. Cadence is owned by the harness, not this skill.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, scouting, triage, discovery]
    category: grants
    requires_toolsets: [terminal]
---

# Scout Opportunities

Hybrid role: evaluate the GitHub Issues already created by the scouting workflow, actively search for new funding opportunities with domain judgment, and leave every opportunity with an explicit priority (P0/P1/P2/discarded) + labels. Scout does not draft proposals, does not open PRs, and does not touch Writer/Reviewer/Submission labels.

## When to Use

- The harness invokes the skill on a scouting trigger (scheduled job, webhook, or manual run).
- The project owner says "scout grants" / "evaluate today's Issues" / "find me more opportunities".
- A pipeline of `grant-opportunity` Issues exists without `P0|P1|P2|discarded` labels.
- A funder announces a new call and needs triage.

Scheduling (cron, day-of-week, time-of-day) is the harness's responsibility. This skill has no opinion on when it runs.

## Inputs (passed by the caller)

The skill is atomic. The caller passes:

```
ORG              GitHub org owning the grants repo (e.g. arkangelai)
```

All other state (open Issues, labels) is read from GitHub at invocation time.

## Preflight

Before executing, verify:
1. `gh` is available and authenticated for `<ORG>/grants`:
   ```bash
   gh auth status
   gh repo view <ORG>/grants --json name --jq '.name'
   ```
   Expected: `gh auth status` reports "Logged in" and the second command returns `grants`. If either fails, abort and report the missing access. Do not install `gh` — the caller configures the harness.

## Procedure

After every verification command, compare output to the expected pattern and **abort on mismatch** — do not report success from local state alone.

1. **List open Issues without priority.**
   ```bash
   gh issue list --repo <ORG>/grants --state open --json number,title,labels \
     --jq '[.[] | select([.labels[].name] | map(test("^P[0-2]$|discarded"; "x")) | any | not) | {n:.number, t:.title}]'
   ```
   Expected output: a JSON array (possibly empty). If the command errors, abort.

2. **For each unprioritized Issue, read it fully:**
   ```bash
   gh issue view <N> --repo <ORG>/grants
   ```
   Capture: title, funder, grade from action (a/b/c/d), deadline, amount, official URL.

3. **Actively search for new opportunities.** The automated workflow is not exhaustive. Bring your own criteria — search funder portals, newsletters, published calls. Before creating a new Issue, dedupe against existing Issues by:
   - name
   - official URL
   - opportunity ID
   - funder + cohort + year

4. **Apply thematic filter (hard).** Priority topics: healthcare, digital health, clinical innovation, AI in health, NLP, LLMs, conversational agents, clinical workflows, extraction from unstructured text, clinical literature search/education.

   Hard exclusions: papers, journal articles, conferences, academic fellowships, closed/expired calls, non-profit-only or academic-only eligibility, nationality restrictions incompatible with the org.

   Strong preferences: LMIC-friendly, ≥ USD 100k, single phase, < 2 years, direct (no partner) application possible, NLP/LLM angle.

5. **Run the 3 pre-priority checks on each candidate.**
   - **Check A — Real eligibility.** For-profit/startup accepted? LATAM/Colombia geographically included? Academic PI required (which you lack)? Any failure without workaround lowers priority or discards.
   - **Check B — Anti-predatory.** Only if the source is not a well-known funder. 7 signals: real organization, scoped program, peer review, scientific focus, track record of speakers, professional site, "name + predatory scam fake" search. Opaque + commercial + generic = `discarded` with documented reason.
   - **Check C — Strategic fit.** Does it align with the org's products and demonstrated lines (clinical LLMs, specific disease models, deployments)?

6. **Assign priority using the grade × urgency table.** You can override with judgment.

   ```
                       | Urgent (<90d) | Near (<12m) | Perennial
   Grade A (90+)       |      P0       |  P0 or P1   |    P1
   Grade B (75-89)     |   P0 or P1    |      P1     |    P2
   Grade C (60-74)     | P1 if strong  |      P2     |    P2
   Grade D (45-59)     |      P2       |      P2     | discarded
   ```

   Guiding principle: the best grant is not the biggest — it's the most viable, eligible, actionable today.

7. **Leave the Scout evaluation as a comment on the Issue.** Exact format:
   ```markdown
   ## Scout Evaluation
   **Priority:** P0 | P1 | P2 | discarded
   **Reason:** [1-2 lines combining fit + urgency + eligibility]
   **Eligibility:** [Check A result]
   **Anti-predatory:** [N/A if known funder | passed 7 checks | FAIL on N]
   **Fit:** [applicable product/line]
   **Caveats:** [open-source / co-applicant / hidden costs / none]
   **Recommended action:** [what to do this week]
   ```

8. **Apply labels. Always `grant-opportunity` + one of P0/P1/P2/discarded. Add `needs-partner` if applicable.**
   ```bash
   gh issue edit <N> --repo <ORG>/grants --add-label "P0"
   gh issue view <N> --repo <ORG>/grants --json labels --jq '[.labels[].name]'
   ```
   Expected output: a JSON array containing the label you just added (e.g., `["grant-opportunity","P0"]`). Abort if the added label is absent. If `discarded`, close the Issue with `--reason "not planned"`.

9. **Required fields for every new/enriched Issue:** name, funder, what it funds, amount, deadline, eligibility, official link, why it fits (evidence), risks/gaps, recommendation.

10. **End-of-cycle summary.** Emit this block to stdout and post it as a comment on the tracking / cycle log Issue. The skill only produces the artifact; routing it anywhere else is the caller's job.
    ```
    Scout for [date]:
    - Issues evaluated: [N]
    - New Issues created: [N]
    - P0: [short list]
    - P1: [N]
    - P2: [N]
    - discarded: [N]
    ```

## Pitfalls

- **Symptom:** Duplicate Issue for the same call. **Cause:** You relied only on title search. **Fix:** Dedupe by 4 signals (name, URL, ID, funder+cohort+year) before creating.
- **Symptom:** A B-grade opportunity gets auto-bumped to P0 because it's urgent. **Cause:** Blindly applied the grade × urgency table. **Fix:** Override with judgment — urgent + no partner + no eligibility = P2.
- **Symptom:** You report "new opportunity" and the Issue already exists. **Cause:** You searched only open Issues. **Fix:** Also check recently closed Issues (the funder might have closed and reopened).
- **Symptom:** Predatory conference created as Issue. **Cause:** Skipped Check B because "it sounded scientific". **Fix:** If the source is unknown, run all 7 anti-predatory signals explicitly before creating.

## Verification

- `gh issue list --repo <ORG>/grants --state open --search "no:label P0 P1 P2 discarded"` returns empty (or only Issues outside your cycle).
- Every new/enriched Issue has the required labels (verified via `gh issue view <N> --json labels`).
- Scout comment exists on every evaluated Issue (visible with `gh issue view <N> --comments`).
- The end-of-cycle summary block was emitted and posted as a comment on the tracking/cycle Issue.

## References

- `grants/README.md` — full pipeline context.
- `grants/draft-proposal/SKILL.md` — next role (Writer) when owner adds `start-draft`.
- `grants/funder-fit/SKILL.md` — deeper funder profiling for a promoted opportunity.
