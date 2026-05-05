---
name: medical-invoice-financial-audit
description: Runs the financial and anti-fraud audit of a Colombian medical invoice (active IPS contract with modality, affiliate plan and applicable tariff sheet, SOAT/ISS/proprietary manual with correct UVB/UVR, CUPS/CUM/INVIMA homologation, liquidation with surcharges and surgical access rules, packages vs. events, coverage limits and grace periods, copays, and 14 anti-fraud rules covering DIAN consecutive numbering, double-billing SOAT+EPS+ARL, overlapping stays, post-mortem services, upcoding, and unbundling). Generates financial_checklist_output.json. Use it when the user asks to audit tariffs/contracts/fraud or run the financial sub-agent of the pipeline.
version: 2.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, financial, tariff, fraud, cups, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
---

# medical-invoice-financial-audit

Financial sub-agent of the pipeline. Evaluates **~42 TARIFF-FRAUD rules** covering contract, plan, tariff manual, liquidation, coverage, copays, and **14 anti-fraud rules**. Runs independently of the admin and medical auditors.

The question it answers: **does the billed amount match the contract and the applicable tariff manual, and are there fraud indicators?** It does not evaluate documentary formality or clinical pertinence — that belongs to the other two.

## When to Use

- The orchestrator dispatches the **financial** leg of a case.
- The user asks "audit the tariffs/contract of invoice {RAD}" or "run the financial-auditor on case X".
- Review a case with fraud suspicion (e.g. patient with simultaneous IPS).
- Pre-filing tariff validation from the IPS side (preventive use).

**Do not use:** if the case does not have an XML invoice or RIPS attached; if `financial_audit` is already published and a re-audit was not requested.

## Input Contract

**Template:** same `metadata_input.json` shape — see `../medical-invoice-gmail-intake/metadata_input.json`.

**Required environment variables:**
- `TARIFARIOS_PATH` — absolute path to the directory containing `INDEX.md` and the `tarifario_*.csv` tariff files.
- `PLANES_PATH` — absolute path to the directory containing `INDEX.md` and the `plan_*.md` plan files.

If either variable is not defined or is empty, the skill MUST abort immediately with an error message: `"ERROR: {VARIABLE_NAME} is not set. Cannot run financial audit without reference data."`.

Additionally the skill resolves two reference hierarchies before running any rules:

**Plan resolution** (determines coverage rules, exclusions, caps, and carency):
1. Extract `plan_afiliado` (ORO / PLATA / BASICO) from `plan_afiliados.json` using `paciente_documento`.
2. Load `$PLANES_PATH/INDEX.md` → identify plan file.
3. Load `$PLANES_PATH/plan_{id}.md` for the applicable coverage rules.

**Tariff resolution** (ordered by precedence):
1. Load `$TARIFARIOS_PATH/INDEX.md` — defines the precedence order.
2. Contract-specific tariff (e.g. `$TARIFARIOS_PATH/tarifario_contrato_eps_2026.csv`) — highest priority.
3. ISS 2001 tariff (`$TARIFARIOS_PATH/tarifario_iss_2001.csv`) — fallback if the contract references it.
4. SOAT 2026 tariff (`$TARIFARIOS_PATH/tarifario_soat_2026.csv`) — legal floor for SOAT cases only.

The resolved `plan_afiliado` and `tarifario_aplicado` are written to `meta` before any rules run.

## Output Contract

**Template:** `references/checklist_base.json` in this directory — FIN-CTR instrument, 42 rules (F01–F42). See `references/checklist_base.md` for rule descriptions and evidence requirements.

Load the template and fill every rule's nullable fields:
- `resultado`: `"pass" | "fail" | "n/a"`
- `evidencia`: explicit calculation — `"{CUPS}: esperado={X} ({fuente}); cobrado={Y}; delta={Y-X} ({pct}%)"` — never generic descriptions
- `observaciones`: mandatory per-rule explanation stating explicitly why the rule passed, failed, or does not apply — must cite the specific evidence found (or its absence). Generic phrases such as "se verificó", "cumple", or "no aplica" without justification are invalid.
- `confianza`: float 0.0–1.0
- `glosa_sugerida`: object (only when `resultado = "fail"`), else `null`

Then fill `meta` and append `cierre`:

```json
{
  "meta": {
    "caso_id": "...", "fecha_auditoria": "...", "agente": "agente-financiero-v1",
    "plan_afiliado": "ORO | PLATA | BASICO",
    "tarifario_aplicado": "<nombre completo del tarifario resuelto>"
  },
  "cierre": {
    "score_total": null,
    "concepto_final": "APTA | NO_APTA",
    "en_devolucion": false,
    "clasificacion": "Financiero",
    "accion_requerida": "Correccion | Rechazo | null",
    "resumen_ejecutivo": "<1-2 oraciones con tarifario y plan referenciados>",
    "valor_facturado": 0,
    "valor_aprobado": 0,
    "valor_glosado": 0
  }
}
```

Generate `financial_checklist_output.json` from scratch using `references/checklist_base.json` as the schema template. Fill every rule. Return the complete filled checklist.

**Evidence format for tariff rules (mandatory):** `"{CUPS}: esperado={X} ({fuente}); cobrado={Y}; delta={Y-X} ({pct}%)"`. Never use generic descriptions like "tariff mismatch".

**`resultado`, `confianza`** follow the same rules as admin-audit.

**`concepto_final` and `en_devolucion` decision logic:**
- `NO_APTA`: any rule with `resultado = "fail"` (positive evidence of violation) that is not subsanable.
- `DEVOLUCION`: any rule with `resultado = "fail"` that is subsanable by the IPS submitting corrections.
- `APTA`: all applicable rules have `resultado = "pass"` or `"n/a"`. Rules with `"n/a"` due to missing information or inaccessible external databases are observations — they do NOT prevent an APTA verdict.
- `en_devolucion = true`: any `critica` fail (positive evidence) subsanable by document resubmission — takes priority even when glosas also exist. When `en_devolucion = true`, still fill all item glosas for expected recovery amount.
- `accion_requerida = "Rechazo"`: when `en_devolucion = true`.
- `accion_requerida = "Correccion"`: when `en_devolucion = false` and glosas exist.
- `accion_requerida = null`: when `concepto_final = APTA`.
- Note: `ESCALAR_HUMANO` is no longer a valid concepto_final value. Rules with low confidence should still render a verdict and add an observation noting the low confidence.

**`glosa_sugerida` shape (only when `resultado = fail`):**
```json
{
  "causal_num": "1 | 2 | 3 | 4 | 5 | 6 | 7",
  "causal_nombre": "<nombre causal Res. 3047 Anexo 6>",
  "texto": "<1-2 oraciones con calculo y referencia contractual>",
  "valor_glosado": 0,
  "moneda": "COP"
}
```

**`cierre` financial fields:**
- `valor_facturado`: sum of all invoice line items (integer COP).
- `valor_aprobado`: `valor_facturado − valor_glosado`.
- `valor_glosado`: sum of `glosa_sugerida.valor_glosado` across all failing rules. Must be `≤ valor_facturado`.

## Procedure

0. **Validate environment.**
   Check that `TARIFARIOS_PATH` and `PLANES_PATH` are defined and non-empty. Verify both directories exist and each contains `INDEX.md`. If any check fails, abort immediately with a clear error message naming the missing variable or file.

1. **Load inputs.**
   Read `metadata_input.json` from the working directory. Read `case_evidence.json` (produced by Step 0 document-understanding skill) for pre-classified documents, extracted invoice items, and authorization data.
   
   Load ALL files listed in `documentos[]` regardless of filename or extension. Use `case_evidence.json.clasificacion_documentos` to identify the invoice document (may be PDF, XML, or text), RIPS data (may be in any format), and authorization. Do NOT search for `*.xml` or `*rips*` file patterns.
   
   Use `case_evidence.json.factura_items` and `case_evidence.json.totales_factura` as the primary source for invoice line items. Cross-reference with the raw invoice document for verification.
   
   If `case_evidence.json` is not present, fall back to reading all files directly and extracting invoice items from whatever invoice document is available (PDF, XML, or text).

2. **Load financial ref_data.**
   - Load `$TARIFARIOS_PATH/INDEX.md` to resolve the applicable tariff file per the precedence order defined there. Load the resolved CSV file(s) (`$TARIFARIOS_PATH/tarifario_contrato_eps_2026.csv` → `$TARIFARIOS_PATH/tarifario_iss_2001.csv` → `$TARIFARIOS_PATH/tarifario_soat_2026.csv`). BOTH `$TARIFARIOS_PATH/INDEX.md` AND the resolved CSV MUST be loaded before any tariff rule runs.
   - Load `$PLANES_PATH/INDEX.md` to identify the plan file for `plan_afiliado`. Load `$PLANES_PATH/plan_{ORO|PLATA|BASICO}.md` for coverage rules, exclusions, caps, and carency periods. BOTH files MUST be loaded before any coverage rule runs.
   - If the tariff file is absent, mark all tariff-dependent rules (F07–F16) `n/a` and declare the gap.

3. **Extract invoice transactions.** Internal shape: `items[] = {cups, description, quantity, unit_price, total_price, access_route?, specialty?}`.

4. **Run the FIN-CTR rule checklist.**

   Load `references/checklist_base.json` (42 rules F01–F42) and follow `references/checklist_base.md` for each rule, using the resolved `plan_afiliado` and `tarifario_aplicado` from the Input Contract step. Fill the four nullable fields per `references/checklist_base.md` §2.2`:

   - **`resultado`**: `"pass"` · `"fail"` · `"n/a"` — use `"n/a"` when the rule doesn't apply to the billing modality (e.g. F19 PGP/cápita for an event-based contract).
   - **`evidencia`**: unified format — `{file} [p.{page}] ["{quoted_text}"] [calc: {formula}]`. For tariff rules the calc is mandatory: `tarifario_contrato_eps_2026.csv p.47 [calc: CUPS 890201: esperado=85000; cobrado=120000; delta=35000 (41.2%)]`. For anti-fraud rules follow templates in `references/checklist_base.md` §5`.
   - **`observaciones`**: mandatory for every rule — state explicitly why the rule is `pass`, `fail`, or `n/a` using the actual financial evidence found. `pass`: cite the tariff source and the matching calculation (e.g. `"CUPS 890201: tarifario_contrato_eps_2026.csv línea 47, precio_base=$85.000; cobrado=$85.000 — coincide exactamente"`). `fail`: cite the discrepancy with the full calculation (e.g. `"CUPS 893150: esperado=$42.000 (ISS 2001 ×1.4 UVB 2026); cobrado=$65.000; delta=+$23.000 (54.8%) — F13 supera umbral"`). `n/a`: explain structurally why the rule cannot apply (e.g. `"Contrato por eventos — F19 cápita no aplica"`). Vague phrases ("cumple", "no aplica", "se verifica") with no citation are invalid.
   - **`confianza`**: `0.95+` for exact numeric comparisons, `0.80–0.95` for plan coverage interpretation, `<0.80` for any anti-fraud rule forces escalation.
   - **`glosa_sugerida`**: fill only when `resultado = "fail"`. `valor_glosado` is **mandatory** in the financial auditor (not nullable). Use causal map in `references/checklist_base.md` §8`.

   Anti-fraud thresholds (F29–F42):
   - F32–F36 `fail` (with positive evidence) and `confianza ≥ 0.9` → `concepto_final = "NO_APTA"` + payment block.
   - Any F29–F42 `fail` (with positive evidence) and `confianza < 0.9` → `concepto_final = "NO_APTA"` with observation noting low confidence for human verification.
   - Anti-fraud rules that cannot be evaluated due to missing external database access → `resultado = "n/a"` with observation.
   - Anti-fraud finding with `valor_glosado > $10.000.000 COP` → `concepto_final = "NO_APTA"` regardless of confidence.

   **Rule-specific guidance for contract and external-system rules:**
   - **F01 (Contrato activo):** The existence of a contract-specific tariff file (`tarifario_contrato_eps_2026.csv`) in the reference data at `$TARIFARIOS_PATH` is evidence of a contractual relationship. If the tariff file references the prestador NIT found in the invoice, F01 should `"pass"` with an observation noting that the signed contract document was not in the case files. Only `"fail"` if there is positive evidence that no contract exists (e.g., prestador NIT not found in any tariff reference).
   - **F03 (Anexos y otrosíes):** If no contract annexes are in the case files, mark `"n/a"` with observation. Absence of annexes is not evidence that unauthorized modifications were applied.
   - **F32-F42 (Anti-fraud rules requiring external databases):** When the rule requires cross-referencing external databases (patient history across IPS, hospitalization overlaps, mortality records, provider patterns) and those databases are not accessible, mark `"n/a"` with an observation explaining what cross-check would be needed. Only mark `"fail"` when the agent has positive evidence of fraud from the available documents (e.g., two identical procedures billed on the same date found within the case files).

   See `references/checklist_base.md` §7` for filled pass/fail examples including tariff overcharge (F13) and upcoding (F37).

5. **Compute `cierre` y publicar el checklist.**

   Once all rules are filled, compute and append `cierre` per `references/checklist_base.md` §2.3` and §4:
   - `concepto_final` and `en_devolucion` — follow decision logic defined in the Output Contract above. Key tariff thresholds: deviation >10% → rule `fail`; 2–10% → rule `fail` with partial glosa; <2% → rule `pass`.
   - `clasificacion`: `"Financiero"`.
   - `valor_facturado`, `valor_aprobado`, `valor_glosado`: compute from the invoice items and all failing rule `valor_glosado` values. `valor_glosado ≤ valor_facturado` always; if not, there is a calculation error — escalate.
   - `resumen_ejecutivo`: 1–2 sentences mentioning the tariff applied, the plan, and total disputed amount.

6. **Generate the output.**

   Generate `financial_checklist_output.json` from scratch and write to the working directory. Mandatory financial evidence shows the explicit calculation — `references/checklist_base.md` §2.2` details the required format per rule type.

## Pitfalls

- **Symptom:** Skill aborts immediately without evaluating any rule. **Cause:** `TARIFARIOS_PATH` or `PLANES_PATH` environment variable is not set or points to a non-existent directory. **Fix:** Set both variables to the absolute paths of the directories containing `INDEX.md` and their respective reference files.
- **Symptom:** F13 false positives because of UVB factor. **Cause:** the contract uses UVB 2025 but the skill applied UVB 2026. **Fix:** read `uvb_factor` from `tarifario_contractual.csv` for the contract active on `service_date`, never from global variables.
- **Symptom:** F32 flags "simultaneous" billing that is actually on different dates. **Cause:** the comparison used date-only (00:00 times). **Fix:** compare by hospitalization intervals, not exact `DATE`.
- **Symptom:** F34 denies by post-mortem but the patient is alive. **Cause:** homonym in RUAF with a different document. **Fix:** cross by document + date of birth, never document alone.
- **Symptom:** F15 misapplied for same-access-route surgeries. **Cause:** manuals state 100% first + 75% second, skill applied 100% to both. **Fix:** explicitly implement the rule per manual (SOAT vs. ISS 2001 differ).
- **Symptom:** F37 upcoding misdetected. **Cause:** the HC describes a complex procedure but the simple one was billed (subcoding, not upcoding) — direction inverted. **Fix:** detect both directions; subcoding is a minor finding (the IPS loses money) but still report it for traceability.
- **Symptom:** many F31 findings (consecutive numbering) for a large batch. **Cause:** the IPS bills in batches and the consecutive jumps across clients. **Fix:** F31 must evaluate consecutive numbering **from this issuer to this EPS**, not globally.
- **Symptom:** score explodes by accumulation in anti-fraud when a single root cause triggers multiple findings (e.g. wrong date → fires F30, F31, F32). **Cause:** no cascade suppression. **Fix:** do NOT suppress here — `consolidator-audit` will dedup. Report all.

## Verification

- `financial_checklist_output.json` exists in the working directory and contains exactly 1 record with 42 evaluated rules.
- Every finding with `resultado=fail` has an explicit calculation in `evidencia` (expected, charged, delta).
- Total `valor_glosado` ≤ `invoice_total`.
- Any failing critical rule → `concepto_final = NO_APTA`.
- `concepto_final` is `APTA` or `NO_APTA` — never any other value.
- `en_devolucion` is a boolean (never null) in the final output.
- When `en_devolucion = true`, `accion_requerida = "Rechazo"` and `resumen_ejecutivo` identifies the missing document(s).
- `total_aprobado + total_glosado = total_facturado` always.
- The skill did NOT read `admin_audit` nor `medical_audit` (independence).
- If any anti-fraud rule (F29–F42) fails, there is at least one finding with `critica` or `mayor` severity.

## References

- SOAT tariff manual (Decreto 780/2016).
- ISS 2001 tariff manual.
- Decreto 4747/2007 — EPS-IPS contracts.
- INVIMA — medication and device registry.
- RUAF — affiliate and mortality registry.
- Issue [arkangelai/audit-workflow#43](https://github.com/arkangelai/audit-workflow/issues/43).
