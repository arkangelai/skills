---
name: icd10-lookup
description: Local CLI tool for querying the CMS ICD-10-CM FY2026 diagnosis code set (bundled XML + order files from CMS/NCHS, public domain). Validates codes, returns full records with coding instructions and inherited parent notes, lists billable children under a prefix, searches by clinical keywords, and checks pairing relationships between two codes (useAdditional, codeFirst, codeAlso, excludes, subsumption). Use it when the user asks to validate an ICD-10-CM code, find a code from a clinical concept, discover mandatory companion codes, or check whether two diagnosis codes can coexist on the same claim.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, icd10, icd10cm, cms, diagnosis, audit, coding]
    category: medical
    requires_toolsets: [terminal]
---

# icd10-lookup

Self-contained CLI that queries the CMS ICD-10-CM FY2026 code set (April 1, 2026 Update) without hitting any external API. Built from the official tabular XML and order TXT files published by CMS/NCHS — public domain.

Replaces the NIH ClinicalTables batch API. Zero external dependencies, Node 18+. On first invocation it parses the XML and builds a `.cache/` with JSON indices — subsequent calls are ~50ms for `validate/search`, ~300ms for `lookup/children/combination`.

**Scope:** ICD-10-CM diagnosis codes only. ICD-10-PCS (procedures) is out of scope.

## When to Use

- The user asks whether an ICD-10-CM code is valid or billable (e.g. "is E1165 valid?", "is E11 billable by itself?").
- The user gives a clinical description and asks for the diagnosis code ("code for type 2 diabetes with hyperglycemia", "search nicotine dependence cigarettes").
- The user asks for all billable children under a category code ("list all G92 codes", "what are the children of E11?").
- The user needs companion-code discovery: "does E1165 require any additional codes?" — the skill surfaces `useAdditional`, `codeFirst`, `codeAlso` notes inherited from parent categories.
- The user wants to check whether two codes can or must coexist ("can we bill E119 with Z794 together?", "is there a subsumption issue between E1165 and E116?").
- An upstream skill (clinical audit, DRG validator, coder QA) needs to verify every code on a claim or find missed companions.

**Do not use:**
- For ICD-10-PCS procedure codes — out of scope.
- For CUPS (Colombian procedure catalog) — use `cups-lookup` instead.
- For ICD-9-CM legacy codes or a crosswalk — not bundled.
- For fiscal years other than FY2026 — rebuild the cache with fresh data.

## Procedure

1. **Locate the CLI.** Entry point is `icd10-lookup.js` inside this skill directory:
   ```bash
   node <skill-path>/icd10-lookup.js <command> [args] [--no-cache]
   ```

2. **Pick the command based on intent.**

   | Intent | Command | Example |
   |---|---|---|
   | Is this code valid/billable? | `validate <code>` | `validate E1165` |
   | Full record + coding rules | `lookup <code>` | `lookup E1165` |
   | All billable children | `children <prefix>` | `children G92` |
   | Search by clinical term | `search <term...>` | `search body mass index` |
   | Pairing check | `combination <a> <b>` | `combination E119 Z794` |

3. **Normalize input.** The CLI uppercases and strips dots, so `e11.65`, `E1165`, `E11.65` all become `E1165`. Pass the user's input as-is.

4. **Interpret `validate` output.** Three statuses:
   - `valid` → billable leaf code. Use `title` as the canonical description.
   - `parent_only` → the code is a category header, not billable on a claim. Replace with `suggestion` (first billable child) after confirming against the clinical text, or pick from `children`.
   - `invalid` → does not exist. Check `parent` (3-char prefix) and `children` for the correct code, or run `search` on the clinical concept.

5. **Use `lookup` to surface mandatory companion codes.** The response includes:
   - `useAdditional` / `codeFirst` / `codeAlso` from the leaf code.
   - `useAdditional_inherited` / `codeFirst_inherited` / `codeAlso_inherited` from parent categories (walked all the way up).
   - `excludes1` — codes that CANNOT coexist on the same claim. Check these against the rest of the diagnosis list.
   - `excludes2` — codes not included here but that MAY coexist.

   **Critical:** `useAdditional_inherited` often carries rules that live on the category (e.g. E11 → `insulin (Z79.4)`), not the leaf. Always review both arrays for companion-code discovery.

6. **Use `children` to drill into a category.** When the coder has a 3- or 4-char prefix and needs to pick the most specific billable code, list all descendants and match against the clinical detail (grade, laterality, encounter type, complication).

7. **Use `search` with clinical keywords.** Results are ranked by keyword density; exact phrase hits get +5. Returns up to 20 billable codes. Prefer the result whose `title` most closely matches the documented clinical concept.

8. **Use `combination` to audit pairs.** Walks the full parent chain for both codes and reports every finding:
   - `useAdditional` / `codeFirst` / `codeAlso` matches (with `inherited: true` when the rule came from a parent).
   - `subsumption` — one code is an ancestor of the other; billing both is redundant, keep only the more specific.

   When `has_relation: false`, the pair is neither required nor forbidden — document it as independent.

9. **Bypass the cache** when you suspect stale data or after updating the bundled XML:
   ```bash
   node icd10-lookup.js validate E1165 --no-cache
   ```
   This forces a rebuild of `order_index.json` and `tabular_index.json` in `.cache/`.

10. **Emit JSON verbatim** to downstream skills. Summarize in natural language only for a human user.

## Pitfalls

- **Symptom:** `validate E11` returns `parent_only` and the auditor treated it as valid. **Cause:** E11 is a category header, not a billable leaf. Medicare/MA plans reject non-billable codes. **Fix:** always replace parent-only codes with a billable child matching the clinical documentation (grade, complication, encounter type).
- **Symptom:** `lookup E1165` returns empty `useAdditional` and the auditor misses `Z79.4`. **Cause:** the `insulin (Z79.4)` rule is inherited from E11, not on E1165 itself. **Fix:** always check `useAdditional_inherited` — inherited rules are equally mandatory.
- **Symptom:** Cold run takes 4–5 seconds. **Cause:** first invocation parses the full 9.7MB tabular XML and writes the cache. **Fix:** expected — subsequent calls are ~50-300ms. Do not assume the tool is hung.
- **Symptom:** `Tabular XML not found` or `Order file not found`. **Cause:** skill was copied without `data/icd10cm/`. **Fix:** redeploy intact. The tool expects `<skill-path>/data/icd10cm/Code Descriptions/` and `<skill-path>/data/icd10cm/Table and Index/` to be present.
- **Symptom:** `.cache/` contains stale JSON after a data refresh. **Cause:** caches are content-blind. **Fix:** delete `.cache/` or pass `--no-cache` on the next run to rebuild.
- **Symptom:** `search` returns a result but the auditor picks the wrong level of specificity (e.g. `Z681` when the chart documents BMI 22.5). **Cause:** top result is the lowest numeric, not the best match. **Fix:** read every returned `title` and match by the documented value — the tool's ranking is lexical, not clinical.
- **Symptom:** `combination E119 Z794` reports `has_relation: false` but you know E11 requires Z79.4. **Cause:** the note text format did not match the substring heuristic. **Fix:** fall back to `lookup E119` and inspect `useAdditional_inherited` manually; open an issue on the tool.
- **Symptom:** a diagnosis code that exists in ICD-10-CM FY2025 is reported `invalid`. **Cause:** FY2026 deletes or remaps codes annually. **Fix:** rebuild the cache with the year's official files; do not modify the tool to accept both years.

## Verification

- `node icd10-lookup.js` (no args) prints usage JSON and exits 0.
- `node icd10-lookup.js validate E1165` returns `{"status": "valid", "title": "Type 2 diabetes mellitus with hyperglycemia"}`.
- `node icd10-lookup.js validate E11` returns `{"status": "parent_only", "suggestion": "E1100"}` (or a similar billable child).
- `node icd10-lookup.js lookup E1165` includes non-empty `useAdditional_inherited` with an entry from `E11` mentioning insulin / oral antidiabetics.
- `node icd10-lookup.js children G92` returns `count ≥ 8` with codes like `G9200`, `G9201`, `G9202`.
- `node icd10-lookup.js search body mass index` returns `total ≥ 20` billable codes whose titles contain `body mass index`.
- `node icd10-lookup.js combination E119 Z794` returns `has_relation: true` with at least one `useAdditional` finding and `inherited: true`.
- Cache is built on first run: `.cache/order_index.json` and `.cache/tabular_index.json` exist after any command that needs them.

## References

- CMS ICD-10-CM FY2026, April 1, 2026 Update — public domain.
- [CMS ICD-10 Codes](https://www.cms.gov/medicare/coding-billing/icd-10-codes).
- NCHS (National Center for Health Statistics) official release notes.
- Original tool: `arkangelai/computer-audit` repo → `tools/icd10-xml/`.
- Downstream consumers: medical-invoice-medical-audit (`MED.01` — valid CIE-10), any US-side clinical coding skill.
