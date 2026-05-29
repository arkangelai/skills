---
name: iss2001-lookup
description: Local CLI tool for querying the Manual Tarifario ISS 2001 (Instituto de Seguros Sociales, Colombia). Validates procedure codes, looks up tariff UVR values and peso amounts, searches by keyword, lists codes under a section, and calculates monetary tariffs given a UVR base value. Use when auditing medical bills referenced against the ISS 2001 tariff, comparing contracted rates, or validating procedure codes from Colombian healthcare invoices.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, iss2001, colombia, tariff, billing, audit, procedures, uvr]
    category: medical
    requires_toolsets: [terminal]
---

# iss2001-lookup

Self-contained CLI that queries the Manual Tarifario ISS 2001, published by the Instituto de Seguros Sociales de Colombia (Acuerdo 256 de 2001). The manual has two tariff sections: UVR (procedimientos quirurgicos, 3,372 rows) and VALOR (laboratorio clinico, imagenologia diagnostica, consultas y procedimientos clinicos, 2,450 rows) plus an appendix (142 rows). Total: 5,964 rows, 5,643 unique codes, 51 chapters.

Zero external dependencies. Requires Node 18+. Reads the bundled CSV catalog. All output is JSON to stdout.

## When to Use

- Validate an ISS 2001 code (e.g. "is 020101 in ISS 2001?", "does code 903841 exist?").
- Look up the description and UVR/valor for a given code.
- Search by procedure description ("find ISS code for apendicectomia", "search biopsia cerebro").
- List all codes under a section or chapter prefix (e.g. prefijo 02 neurocirugía, 90 laboratorio).
- Calculate a tariff in pesos given a contractual UVR value (e.g. "tarifa for 020101 at UVR $29,000").
- An upstream skill needs to confirm an ISS 2001 code or suggest alternatives.
- The user pastes a code in a non-canonical format ("19.02.01", "19-02-01", " 190201 ").

**Do not use:**
- For CUPS 2026 codes — use `cups-lookup` instead.
- For ICD-10 diagnosis codes — use `icd10-lookup` instead.
- For SOAT tariff (Decreto 2423) — different tariff manual, not covered here.

## Procedure

1. **Locate the CLI.** The entry point is `iss2001-lookup.js` inside this skill directory. Run it with Node:
   ```bash
   node <skill-path>/iss2001-lookup.js <command> [args]
   ```
   Where `<skill-path>` is the folder where the skill lives (e.g. `~/.claude/skills/iss2001-lookup`).

2. **Pick the command based on intent.**

   | Intent | Command | Example |
   |---|---|---|
   | "Does this code exist?" | `validate <codigo>` | `node iss2001-lookup.js validate 020101` |
   | "What is this code?" | `lookup <codigo>` | `node iss2001-lookup.js lookup 903841` |
   | "Find a code for X" | `search <terminos...>` | `node iss2001-lookup.js search biopsia cerebro` |
   | "List all codes under Y" | `seccion <prefijo>` | `node iss2001-lookup.js seccion 02` |
   | "How much does it cost?" | `tarifa <codigo> <valor_uvr>` | `node iss2001-lookup.js tarifa 020101 29000` |

3. **Normalize input if needed.** The CLI accepts these formats and normalizes to 6-character uppercase:
   - `190201` → `190201`
   - `19.02.01` → `190201`
   - `19-02-01` → `190201`
   - `  190201  ` → `190201`
   - Letter-prefixed codes: `C40403`, `M01620`, `E02626`, `S41101`

   If the user provides anything else (wrong length, unknown separators), surface the raw input to `validate` and let the CLI respond with suggestions.

4. **Interpret `validate` output.**
   - `status: "valid"` → the code exists. The response includes `descripcion` (canonical name) and `tipo` (UVR, VALOR, or APENDICE).
   - `status: "invalid"` → the code does NOT exist in the ISS 2001 manual. The `sugerencias` field lists up to 10 nearby codes by progressive prefix (4, 3, 2 chars). Pick the most clinically appropriate one.

5. **Use `search` when the user describes the procedure in natural language.**
   - Combine keywords (Spanish, uppercase or lowercase — the tool uppercases both sides).
   - The top 20 results are returned, ordered by keyword density. Exact-phrase hits get a +5 score bonus.
   - Prefer the most specific match that matches the documented procedure.

6. **Use `tarifa` to compute monetary amounts.**
   - For UVR codes: returns `tarifa_pesos = uvr x valor_uvr`.
   - For VALOR codes: returns the fixed `valor` amount directly with a note — no multiplication needed.
   - For APENDICE codes: returns an error — no tariff data available.
   - Common contractual UVR values: $12,000 (base 2001), $29,000+ (contratos ajustados).

7. **Emit results as JSON** — the CLI already formats output as indented JSON. Return it verbatim when the caller is another skill; summarize in natural language only when responding directly to a human.

## Pitfalls

- **Symptom:** `validate` returns `invalid` for a code the user believes is correct. **Cause:** either typo, wrong format, or the code is from CUPS 2026 or SOAT (different catalogs). **Fix:** run `search` on the clinical description to find the ISS 2001 equivalent; do not auto-correct without confirming with the user.
- **Symptom:** `search` returns too many hits for generic terms like "biopsia" or "radiografia". **Cause:** too broad. **Fix:** add an anatomical qualifier ("biopsia cerebro", "radiografia columna lumbar") and rely on the top ranked results.
- **Symptom:** `tarifa` says the code already has a fixed amount in pesos. **Cause:** the code is from the VALOR section (lab/imaging/clinical) which uses fixed peso amounts, not UVR. **Fix:** the response already includes the fixed amount — no multiplication needed.
- **Symptom:** `CSV file not found: .../data/ISS_2001.csv`. **Cause:** the skill was copied without the `data/` directory. **Fix:** re-deploy the skill folder intact — the CSV is part of the skill and must live at `<skill-path>/data/ISS_2001.csv`.
- **Symptom:** confusion between UVR and VALOR types. **Cause:** UVR codes (articulos 1-18, procedimientos quirurgicos) require a contractual base value to calculate pesos; VALOR codes (articulos 19+, laboratorio/imagenologia/consultas) are already in pesos fijos. **Fix:** check the `tipo` field in `validate` or `lookup` output before attempting `tarifa`.

## Verification

- `node iss2001-lookup.js` (no args) prints the usage JSON and exits 0.
- `node iss2001-lookup.js validate 020101` → `status: "valid"`, neurosurgery (ARTICULO 1).
- `node iss2001-lookup.js validate 999999` → `status: "invalid"` with `sugerencias` array.
- `node iss2001-lookup.js lookup 903841` → GLUCOSA, VALOR type, pesos fijos.
- `node iss2001-lookup.js search biopsia cerebro` → results containing BIOPSIA and CEREBRO.
- `node iss2001-lookup.js tarifa 020101 29000` → `tarifa_pesos: 11020000`.
- Full test suite: `node test_iss2001.js` → all tests pass.

## References

- Acuerdo 256 de 2001 — Instituto de Seguros Sociales.
- Manual Tarifario ISS 2001 (bundled as `data/MANUAL-ISS-2001.pdf`).
- Used by the medical-insurance-audit pipeline to validate procedure codes and compute tariffs against the ISS 2001 base.
