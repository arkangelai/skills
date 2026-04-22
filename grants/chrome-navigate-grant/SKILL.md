---
name: chrome-navigate-grant
description: Browser agent playbook (Claude in Chrome) to navigate a grant call, extract rules/eligibility/evaluation, map form fields, download templates, and upload sources to GitHub via web UI. Also covers filling a form without submitting. Use for "navigate grant portal" or "download grant docs".
version: 1.0.0
author: jose@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [grants, browser, navigation, chrome, submission]
    category: grants
    requires_toolsets: [terminal]
---

# Chrome — Navigate Grant Portal

A browser-based agent that operates **two roles**:

- **Role A — Navigator:** open the call, download documents, map forms, upload everything to GitHub in `proposals/YYYY-MM_Name/sources/`.
- **Role B — Submitter:** read approved responses from GitHub and fill the form fields (without clicking submit — the owner does that).

Chrome does NOT draft proposals and does NOT review them.

## When to Use

- The Writer role's Phase-2 prompt is handed off to the browser ("navigate this call and gather sources").
- You are told to "navigate grant portal for issue #NNN", "download grant docs", "map form fields".
- A v2 draft is merged and you are told to "fill form for grant #NNN without submitting".

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

6. **Upload everything to GitHub via the web UI.** Target: `proposals/YYYY-MM_Name-kebab-case/sources/` on branch `main`. The Writer role already created this folder — never improvise the path.

   **For downloaded files (PDFs, templates):** open the uploader URL directly:
   ```
   https://github.com/<org>/grants/upload/main/proposals/<folder>/sources
   ```
   Drag-and-drop or use "choose your files". Commit message:
   - Title: `chore: Chrome uploads sources for <opportunity> refs #<ISSUE_NUMBER>`
   - Description: list of files.
   - Select "Commit directly to the main branch".

   **For files you generate (form-fields.md, navigation-notes.md, rules.md, etc.):** open the new-file editor:
   ```
   https://github.com/<org>/grants/new/main/proposals/<folder>/sources
   ```
   Filename: `form-fields.md` (or other). Commit message: `chore: add <filename> for <opportunity> refs #<ISSUE_NUMBER>`.

   **Subfolders:** when uploading a PDF, you can write `downloaded/filename.pdf` in the filename field to create the subfolder.

7. **Verify upload visually.** After each commit, visit:
   ```
   https://github.com/<org>/grants/tree/main/proposals/<folder>/sources
   ```
   Confirm all files appear. If any are missing, re-upload only the missing ones.

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

   **Mapped by:** Chrome
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
    **Navigated by:** Chrome
    **Supervised by:** <owner>
    ## Relevant URLs
    ## Submission type: A | B | C
    ## Login required: Yes/No — platform
    ## Observations
    ## Problems encountered
    ## Notes for the Writer role
    ```

11. **Confirm completion.** One line per opportunity:
    > "Folder `proposals/YYYY-MM_<name>/sources/` ready on GitHub for <name>. Submission type: A/B/C. <notes>. Writer can start Phase 3."

### ROLE B — Submission (Phase 7)

1. **Read approved responses from GitHub.** Open `proposals/<folder>/drafts/field-mapping-responses-v2.md` (or `proposal-v2.md` for narrative). Read the full file.

2. **Open the call portal in another tab.** The owner logs in if needed. Always open fresh — do not rely on stale tabs.

3. **Fill fields one by one.** For each: read the mapping, paste into the form, verify no truncation (character limits), move to the next. Never paste from clipboard memory — always from GitHub.

4. **Visual review before submit.** Navigate every section, confirm every field has content, confirm attachments are uploaded. Report: "Form complete. <X> fields filled. Ready for owner review."

5. **The owner submits.** You do NOT click submit. If possible, capture a screenshot of the confirmation page after submission.

## Pitfalls

- **Symptom:** You filled form fields during navigation. **Cause:** Confused roles. **Fix:** Role A is read-only. Never type anything into fields while mapping.
- **Symptom:** An upload silently failed. **Cause:** GitHub web UI rate limit or file size. **Fix:** Run the visual verification in Step 7 after every commit. Retry missing files only.
- **Symptom:** You created the folder yourself. **Cause:** Folder wasn't there yet. **Fix:** The Writer role creates the folder. If it's missing, alert the owner — never improvise.
- **Symptom:** Entered credentials yourself. **Cause:** Tried to help. **Fix:** Never enter credentials. Always ask the owner to log in.
- **Symptom:** Submitted the form. **Cause:** Role violation. **Fix:** Only the owner submits. Stop immediately; document what was submitted.
- **Symptom:** Field response in the form got truncated. **Cause:** Character limit lower than the source. **Fix:** Notify the owner with the field name and limit; do not silently shorten.
- **Symptom:** Mapping says `[DATO PENDIENTE]` in a required field. **Cause:** v2 was not fully depurated. **Fix:** Stop, notify the owner. Go back to Reviewer for v3.

## Verification

- Visual check: all expected files appear at `https://github.com/<org>/grants/tree/main/proposals/<folder>/sources`.
- `gh api` from the terminal also confirms:
  ```bash
  gh api "repos/<org>/grants/contents/proposals/<folder>/sources" --jq '[.[].name]'
  ```
- `form-fields.md` contains the 7 sub-fields for every mapped field.
- Role B: every form field visible in the portal has content from the mapping — no blanks, no `[DATO PENDIENTE]`.

## References

- `grants/pipeline-overview/SKILL.md`
- `grants/draft-proposal/SKILL.md` — the Writer role that prepares the Chrome prompt in Phase 2.
- `grants/submit-proposal/SKILL.md` — the Phase-7 handoff for Role B.
