---
name: cups-lookup
description: Local CLI tool for querying the Colombian CUPS 2026 catalog (Clasificación Única de Procedimientos en Salud — Resolución 2706 del 23 dic 2025, MinSalud). Validates procedure codes, looks up descriptions, searches by keyword, and lists codes under a section prefix. Use it when the user asks to validate a CUPS code, find the correct CUPS for a procedure, explore a clinical section (imagenología, laboratorio, quirúrgicos), or normalize a code from a medical invoice or clinical note.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, cups, colombia, minsalud, billing, audit, procedures]
    category: medical
    requires_toolsets: [terminal]
---

# cups-lookup

Self-contained CLI that queries the official CUPS 2026 catalog published by the Colombian Ministerio de Salud y Protección Social (Resolución 2706 del 23 dic 2025, vigente desde el 1 de enero de 2026). Covers 9,459 procedure codes across secciones 00 (quirúrgicos) and 01 (no quirúrgicos).

Zero external dependencies. Requires Node 18+. Reads the bundled CSV catalog. All output is JSON to stdout.

## When to Use

- The user asks to validate a CUPS code (e.g. "is 90.1.0.01 valid?", "does CUPS 471001 exist?").
- The user asks what a CUPS code means (description, grupo, categoría).
- The user describes a procedure and needs the matching CUPS code ("find the CUPS for hemograma", "search biopsia cerebro").
- The user needs to list all codes under a section or chapter (capítulo 90 laboratorio, 87 imagenología, etc.).
- An upstream skill (medical-invoice audit pipeline, RIPS validator) needs to confirm a code is in the current catalog or suggest alternatives.
- The user pastes a code in a non-canonical format (`010101`, `01.0.1.1 `) and needs it normalized.

**Do not use:**
- For ICD-10 diagnosis codes — use `icd10-lookup` instead.
- For CUPS catalogs from previous years (2023, 2024, 2025) — this skill only ships the 2026 catalog.
- For CUM (medications) or IUM (insumos) — out of scope.

## Procedure

1. **Locate the CLI.** The entry point is `cups-lookup.js` inside this skill directory. Run it with Node:
   ```bash
   node <skill-path>/cups-lookup.js <command> [args]
   ```
   Where `<skill-path>` is the folder where the skill lives (e.g. `~/.claude/skills/cups-lookup`).

2. **Pick the command based on intent.**

   | Intent | Command | Example |
   |---|---|---|
   | "Does this code exist?" | `validate <codigo>` | `node cups-lookup.js validate 90.1.0.01` |
   | "What is this code?" | `lookup <codigo>` | `node cups-lookup.js lookup 90.1.0.01` |
   | "Find a code for X" | `search <términos...>` | `node cups-lookup.js search hemograma` |
   | "List all codes under Y" | `seccion <prefijo>` | `node cups-lookup.js seccion 90.1` |

3. **Normalize input if needed.** The CLI accepts these formats and normalizes to `XX.X.X.XX`:
   - `90.1.0.01` → `90.1.0.01`
   - `010101` (6 dígitos compactos) → `01.0.1.01`
   - `  87.0.0.01  ` → `87.0.0.01`

   If the user provides anything else (letters, separators other than `.`, wrong length), surface the raw input to `validate` and let the CLI respond with suggestions.

4. **Interpret `validate` output.**
   - `status: "valid"` → the code exists. Use `descripcion` as the canonical name.
   - `status: "invalid"` → the code does NOT exist in CUPS 2026. The `sugerencias` field lists up to 10 nearby codes by progressive prefix. Pick the most clinically appropriate one.

5. **Use `search` when the user describes the procedure in natural language.**
   - Combine keywords (Spanish, uppercase or lowercase — the tool uppercases both sides).
   - The top 20 results are returned, ordered by keyword density. Exact-phrase hits get +5 score.
   - Prefer the most specific match that matches the documented procedure.

6. **Use `seccion` to explore an area.** Useful to confirm a code belongs to the right capítulo (e.g. a laboratorio code should start with `90`, imagenología with `87`, etc.). See the chapter map in the CUPS catalog (see References).

7. **Emit results as JSON** — the CLI already formats output as indented JSON. Return it verbatim when the caller is another skill; summarize in natural language only when responding directly to a human.

## Pitfalls

- **Symptom:** `validate` returns `invalid` for a code the user believes is correct. **Cause:** either typo, wrong format, or the code is from an older resolution (e.g. 5701 Res. pre-2026). **Fix:** run `search` on the clinical description to find the 2026 equivalent; do not auto-correct without confirming with the user.
- **Symptom:** `search` returns thousands of hits for generic terms like "biopsia" or "radiografía". **Cause:** too broad. **Fix:** add an anatomical qualifier ("biopsia cerebro", "radiografía columna lumbar") and rely on the top ranked results.
- **Symptom:** `lookup` returns `grupo: "01"` but the invoice claims it is from grupo 02. **Cause:** the auditor used the wrong code. **Fix:** flag the mismatch — the CLI's `grupo` and `categoria` are authoritative per the catalog.
- **Symptom:** `seccion 90` seems slow or hangs. **Cause:** it's listing ~1,337 códigos and writing to stdout. **Fix:** pipe to a file if the caller is a human; otherwise consume the JSON stream directly.
- **Symptom:** `CSV file not found: .../data/CUPS_2026.csv`. **Cause:** the skill was copied without `data/`. **Fix:** re-deploy the skill folder intact — the CSV is part of the skill and must live at `<skill-path>/data/CUPS_2026.csv`.

## Verification

- `node cups-lookup.js` (no args) prints the usage JSON and exits 0.
- `node cups-lookup.js validate 90.1.0.01` returns `{"status": "valid", "descripcion": "ANTIBIOGRAMA (DISCO)"}`.
- `node cups-lookup.js validate 01.0.1.99` returns `{"status": "invalid", "sugerencias": [...]}`.
- `node cups-lookup.js lookup 90.1.0.01` returns `grupo: "90"` and `categoria: "90.1.0"`.
- `node cups-lookup.js search biopsia cerebro` returns ≥1 result whose description contains `BIOPSIA` and `CEREBRO`.
- Full test suite: `node test_cups.js` → all 41 tests pass.

## References

- Resolución 2706 del 23 dic 2025 — official source, bundled as `data/Resolucion_2706_2025_CUPS.pdf`.
- [Ministerio de Salud y Protección Social — CUPS](https://www.minsalud.gov.co).
- Original tool: `arkangelai/computer-audit` repo → `tools/cups/`.
- Used by the medical-insurance-audit pipeline (financial audit, admin audit) to validate procedure codes against the current catalog.
