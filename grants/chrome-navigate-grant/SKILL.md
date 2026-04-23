---
name: chrome-navigate-grant
description: Browser-agent playbook for the grants pipeline. Two roles — Navigator (open the call, extract rules/eligibility/evaluation, map form fields, download templates, upload sources to GitHub) and Submitter (read approved responses and fill form fields without submitting). Works with any browser-capable agent; the skill's preflight resolves which one to use.
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, browser, navigation, submission]
    category: grants
    requires_toolsets: [terminal, browser]
---

# Browser-Agent Playbook — Navigate & Submit a Grant

Operates **two roles** via whichever browser agent is available in the caller's environment:

- **Role A — Navigator:** open the call, download documents, map forms, upload everything to GitHub in `proposals/YYYY-MM_Name/sources/`.
- **Role B — Submitter:** read approved responses from GitHub and fill form fields (without clicking submit — the owner does that).

The agent executing this skill does NOT draft proposals and does NOT review them.

## When to Use

- Writer role's Phase-2 handoff (gather sources for a new opportunity).
- Caller says "navigate grant portal for issue #NNN", "download grant docs", or "map form fields".
- v2 draft is merged and caller says "fill form for grant #NNN without submitting".

## Preflight — Resolve the Browser Agent

Before executing Role A or Role B, resolve which browser capability will run the navigation:

1. **Detect built-in browser capability in the current harness.** Check whether any of these are exposed as tools: a Playwright/Puppeteer/CDP integration, an MCP browser server, a hosted browser-agent tool, or a dedicated browser skill (e.g., `/browse`).
2. **If one is available, propose it to the user first.** Example: *"I see your harness has `<browser-tool>`. Use that for this grant's navigation? (Y / pick another)"*
3. **If none is available — or the user prefers a different one — ask which browser agent to use.** Common options: Playwright MCP, Vercel agent-browser, `/browse` (gstack), a named companion agent, or another browser-capable tool the user configured.
4. **Wait for the user's explicit choice before proceeding.** Do not guess. The rest of this skill assumes a browser agent is available.
5. **Verify credentials are the user's, not the agent's.** For any login-gated portal, the owner logs in. The browser agent never enters credentials.

## Procedure

### ROLE A — Navigation (Phase 2)

1. **Receive the opportunities.** Each one needs: name, main call URL, deadline, Issue number.

2. **Identify the submission type.**
   - **A — Online form:** fields in a web platform (login-gated or not).
   - **B — Downloadable document:** template to download, fill, upload.
   - **C — Mixed:** form + downloaded docs.

3. **Extract call rules.** Read and capture:
   - Rules / Guidelines / Call for proposals
   - Eligibility criteria
   - Evaluation criteria / scoring rubric
   - FAQ
   - Timeline

   For each document: download if possible (PDF, Word); otherwise copy content into `.md` or `.txt`.

4. **Map form fields (type A or C).** Navigate every page/section **without filling anything**. For each field capture 7 sub-fields:
   - Exact name
   - Type (short text, long text, dropdown, checkbox, radio, upload, date, number)
   - Character/word limit
   - Mandatory/optional
   - Available options (dropdowns/radio)
   - Visible placeholder
   - Page/step in the form
   - `FLAG: UNCLEAR` if ambiguous (with explanation)

   If login is needed, ask the owner — never enter credentials yourself.

5. **Identify required attachments** (B or C). List docs + format + page/size limits. Download funder templates.

6. **Upload everything to GitHub.** Target: `proposals/YYYY-MM_Name-kebab-case/sources/` on branch `main`. The Writer role already created this folder — never improvise the path.

   Preferred path, in order:
   - **If the browser agent has terminal/git access:** commit directly via `git add`/`git commit`/`git push`.
   - **If terminal access is absent but the agent can drive the GitHub web UI:** use the web uploader endpoints:
     - Drag-and-drop uploads: `https://github.com/<org>/grants/upload/main/proposals/<folder>/sources`
     - New files you are typing: `https://github.com/<org>/grants/new/main/proposals/<folder>/sources`
     - Commit message: `chore: add <file/files> for <opportunity> refs #<ISSUE_NUMBER>`, commit directly to `main`.
   - Subfolders: when uploading, write `downloaded/filename.pdf` in the filename field to create the subfolder.

7. **Verify upload.** After each commit, assert all expected files exist in the target directory. Preferred check (if `gh` is available to the caller; see Preflight for `gh` in sibling skills):
   ```bash
   gh api "repos/<org>/grants/contents/proposals/<folder>/sources" --jq '[.[].name]'
   ```
   Otherwise, visit:
   ```
   https://github.com/<org>/grants/tree/main/proposals/<folder>/sources
   ```
   If any expected file is missing, re-upload only the missing ones. Do not report completion on a partial set.

8. **Files to produce for every opportunity:**

   | File | Source | Content |
   |---|---|---|
   | `sources/rules.md` | you write | Call rules |
   | `sources/eligibility.md` | you write | Eligibility criteria |
   | `sources/evaluation-criteria.md` | you write | How the funder evaluates |
   | `sources/form-fields.md` | you write | Field mapping (type A or C) |
   | `sources/faq.md` | you write | FAQ (if exists) |
   | `sources/navigation-notes.md` | you write | Navigation observations |
   | `sources/downloaded/*.pdf` or `.docx` | downloaded | Funder templates and docs |

9. **`form-fields.md` format** — use the repo's official template. Do not omit sub-fields; if not applicable write `N/A`.

   ```markdown
   # Form Fields — <opportunity>

   **Mapped by:** <browser agent used>
   **Date:** YYYY-MM-DD
   **Form URL:** <URL>
   **Requires login:** Yes/No
   **Total pages/sections:** N

   ## Section 1: <section name>
   ### Field 1.1 — <exact field name>
   - Type: <type>
   - Limit: <chars/words/N/A>
   - Mandatory: Yes/No
   - Options (dropdown/radio): [...]
   - Placeholder: <literal>
   - Page/step: N/M
   - FLAG: [UNCLEAR — why]
   ```

10. **`navigation-notes.md` format:**
    ```markdown
    # Navigation Notes — <opportunity>
    **Navigation date:** YYYY-MM-DD
    **Navigated by:** <browser agent used>
    **Supervised by:** <owner>
    ## Relevant URLs
    ## Submission type: A | B | C
    ## Login required: Yes/No — platform
    ## Observations
    ## Problems encountered
    ## Notes for the Writer role
    ```

11. **Emit one line per opportunity on completion:**
    > "Folder `proposals/YYYY-MM_<name>/sources/` ready on GitHub for <name>. Submission type: A/B/C. <notes>. Writer can start Phase 3."

### ROLE B — Submission (Phase 7)

1. **Read approved responses from GitHub.** Open `proposals/<folder>/drafts/field-mapping-responses-v2.md` (or `proposal-v2.md` for narrative). Read the full file.

2. **Open the call portal in another tab.** The owner logs in if needed. Always open fresh — do not rely on stale tabs.

3. **Fill fields one by one.** For each: read the mapping, paste into the form, verify no truncation (character limits), move to the next. Never paste from clipboard memory — always from the source-of-truth file.

4. **Visual review before submit.** Navigate every section, confirm every field has content, confirm attachments are uploaded. Emit: "Form complete. <X> fields filled. Ready for owner review."

5. **The owner submits.** You do NOT click submit. If possible, capture a screenshot of the confirmation page after submission.

## Pitfalls

- **Symptom:** You filled form fields during navigation. **Cause:** Confused roles. **Fix:** Role A is read-only. Never type anything into fields while mapping.
- **Symptom:** An upload silently failed. **Cause:** Rate limit, file size, or web-UI quirk. **Fix:** Run the Step 7 assertion after every commit. Retry missing files only.
- **Symptom:** You created the folder yourself. **Cause:** Folder wasn't there yet. **Fix:** The Writer role creates the folder. If it's missing, alert the caller — never improvise.
- **Symptom:** Entered credentials yourself. **Cause:** Tried to help. **Fix:** Never enter credentials. Always ask the owner to log in.
- **Symptom:** Submitted the form. **Cause:** Role violation. **Fix:** Only the owner submits. Stop immediately; document what was submitted.
- **Symptom:** Field response in the form got truncated. **Cause:** Character limit lower than the source. **Fix:** Notify the caller with the field name and limit; do not silently shorten.
- **Symptom:** Mapping says `[DATO PENDIENTE]` in a required field. **Cause:** v2 was not fully depurated. **Fix:** Stop, notify the caller. Go back to Reviewer for v3.
- **Symptom:** Skipped the Preflight and assumed a browser tool. **Cause:** Lazy start. **Fix:** Always resolve the browser agent first; abort if none is available.

## Verification

- Preflight resolved: the user explicitly named the browser agent to use.
- All expected files appear at `proposals/<folder>/sources/` on `main` (assert with `gh api` when available, otherwise with the tree URL).
- `form-fields.md` contains the 7 sub-fields for every mapped field.
- Role B: every form field visible in the portal has content from the mapping — no blanks, no `[DATO PENDIENTE]`.

## References

- `grants/pipeline-overview/SKILL.md`
- `grants/draft-proposal/SKILL.md` — the Writer role that prepares the navigation prompt in Phase 2.
- `grants/submit-proposal/SKILL.md` — the Phase-7 handoff for Role B.
