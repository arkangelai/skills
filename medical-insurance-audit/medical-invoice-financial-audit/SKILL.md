---
name: medical-invoice-financial-audit
description: Runs the financial and anti-fraud audit of a Colombian medical invoice (active IPS contract with modality, affiliate plan and applicable tariff sheet, SOAT/ISS/proprietary manual with correct UVB/UVR, CUPS/CUM/INVIMA homologation, liquidation with surcharges and surgical access rules, packages vs. events, coverage limits and grace periods, copays, and 14 anti-fraud rules covering DIAN consecutive numbering, double-billing SOAT+EPS+ARL, overlapping stays, post-mortem services, upcoding, and unbundling). Publishes findings to the destination software. Use it when the user asks to audit tariffs/contracts/fraud or run the financial sub-agent of the pipeline.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, financial, tariff, fraud, cups, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: DEST_SOFTWARE_BASE_URL
    prompt: Base URL of the destination software
    required_for: full functionality
  - name: DEST_SOFTWARE_API_KEY
    prompt: API key / bearer token
    required_for: full functionality
  - name: REF_DATA_PATH
    prompt: Folder with tarifario_contractual.csv, contratos_ips.json, plan_afiliados.json, bdua.json, ruaf_snapshot.json
    required_for: full functionality
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

Additionally the skill resolves two reference hierarchies from this skill's directory before running any rules:

**Plan resolution** (determines coverage rules, exclusions, caps, and carency):
1. Extract `plan_afiliado` (ORO / PLATA / BASICO) from BDUA using `paciente_documento`.
2. Load `planes/INDEX.md` → identify plan file.
3. Load `planes/plan_{id}.md` for the applicable coverage rules.

**Tariff resolution** (ordered by precedence):
1. Load `tarifarios/INDEX.md` — defines the precedence order.
2. Contract-specific tariff (e.g. `tarifarios/tarifario_contrato_eps_2026.csv`) — highest priority.
3. ISS 2001 tariff (`tarifarios/tarifario_iss_2001.csv`) — fallback if the contract references it.
4. SOAT 2026 tariff (`tarifarios/tarifario_soat_2026.csv`) — legal floor for SOAT cases only.

The resolved `plan_afiliado` and `tarifario_aplicado` are written to `meta` before any rules run.

## Output Contract

**Template:** `checklist_base.json` in this directory — FIN-CTR instrument, 42 rules (F01–F42). See `checklist_base.md` for rule descriptions and evidence requirements.

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
    "concepto_final": "APTA | NO_APTA | DEVOLUCION | ESCALAR_HUMANO",
    "clasificacion": "Financiero",
    "accion_requerida": "Ninguna | Correccion | Complemento | Rechazo | Escalar",
    "resumen_ejecutivo": "<2-3 oraciones con tarifario y plan referenciados>",
    "valor_facturado": 0,
    "valor_aprobado": 0,
    "valor_glosado": 0
  }
}
```

Publish to `POST /cases/{caso_id}/audits` and return the complete filled checklist.

**Evidence format for tariff rules (mandatory):** `"{CUPS}: esperado={X} ({fuente}); cobrado={Y}; delta={Y-X} ({pct}%)"`. Never use generic descriptions like "tariff mismatch".

**`resultado`, `confianza`** follow the same rules as admin-audit. `confianza < 0.75` on any `critica` rule → `ESCALAR_HUMANO`.

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

1. **Read the case and attachments.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
   ```
   Download: `invoice_xml`, `rips`, `clinical_history` (to validate services actually delivered), `authorization`.

2. **Load financial ref_data.**
   - `$REF_DATA_PATH/tarifario_contractual.csv` — columns: `ips_nit,cups,manual,version,uvb_factor,precio_base,precio_noche,precio_festivo,vigente_desde,vigente_hasta,plan`.
   - `$REF_DATA_PATH/contratos_ips.json` — contracts with modality, validity, amendments.
   - `$REF_DATA_PATH/plan_afiliados.json` — coverages, limits, grace periods, exclusions per plan.
   - `$REF_DATA_PATH/bdua.json` — affiliate plan, IBC (for copays).
   - `$REF_DATA_PATH/ruaf_snapshot.json` — mortality (for post-mortem checks).

3. **Extract invoice transactions.** Internal shape: `items[] = {cups, description, quantity, unit_price, total_price, access_route?, specialty?}`.

4. **Run the FIN-CTR rule checklist.**

   Load `checklist_base.json` (42 rules F01–F42) and follow `checklist_base.md` for each rule, using the resolved `plan_afiliado` and `tarifario_aplicado` from the Input Contract step. Fill the four nullable fields per `checklist_base.md §2.2`:

   - **`resultado`**: `"pass"` · `"fail"` · `"n/a"` — use `"n/a"` when the rule doesn't apply to the billing modality (e.g. F19 PGP/cápita for an event-based contract).
   - **`evidencia`**: unified format — `{file} [p.{page}] ["{quoted_text}"] [calc: {formula}]`. For tariff rules the calc is mandatory: `tarifario_contrato_eps_2026.csv p.47 [calc: CUPS 890201: esperado=85000; cobrado=120000; delta=35000 (41.2%)]`. For anti-fraud rules follow templates in `checklist_base.md §5`.
   - **`observaciones`**: mandatory for every rule — state explicitly why the rule is `pass`, `fail`, or `n/a` using the actual financial evidence found. `pass`: cite the tariff source and the matching calculation (e.g. `"CUPS 890201: tarifario_contrato_eps_2026.csv línea 47, precio_base=$85.000; cobrado=$85.000 — coincide exactamente"`). `fail`: cite the discrepancy with the full calculation (e.g. `"CUPS 893150: esperado=$42.000 (ISS 2001 ×1.4 UVB 2026); cobrado=$65.000; delta=+$23.000 (54.8%) — F13 supera umbral"`). `n/a`: explain structurally why the rule cannot apply (e.g. `"Contrato por eventos — F19 cápita no aplica"`). Vague phrases ("cumple", "no aplica", "se verifica") with no citation are invalid.
   - **`confianza`**: `0.95+` for exact numeric comparisons, `0.80–0.95` for plan coverage interpretation, `<0.80` for any anti-fraud rule forces escalation.
   - **`glosa_sugerida`**: fill only when `resultado = "fail"`. `valor_glosado` is **mandatory** in the financial auditor (not nullable). Use causal map in `checklist_base.md §8`.

   Anti-fraud thresholds (F29–F42) per `checklist_base.md §4` and §6:
   - F32–F36 `fail` with `confianza ≥ 0.9` → `concepto_final = "NO_APTA"` + payment block.
   - Any F29–F42 `fail` with `confianza < 0.9` → `concepto_final = "ESCALAR_HUMANO"`.
   - Anti-fraud finding with `valor_glosado > $10.000.000 COP` → always escalate regardless of confidence.

   See `checklist_base.md §7` for filled pass/fail examples including tariff overcharge (F13) and upcoding (F37).

5. **Compute `cierre` y publicar el checklist.**

   Once all rules are filled, compute and append `cierre` per `checklist_base.md §2.3` and §4:
   - `concepto_final` — follow rule-based decision logic in `checklist_base.md §4`. Key thresholds: tariff deviation >10% → `NO_APTA`; 2–10% → `APTA` with partial glosa; <2% → `APTA`.
   - `clasificacion`: `"Financiero"`.
   - `valor_facturado`, `valor_aprobado`, `valor_glosado`: compute from the invoice items and all failing rule `valor_glosado` values. `valor_glosado ≤ valor_facturado` always; if not, there is a calculation error — escalate.
   - `resumen_ejecutivo`: 1–2 sentences mentioning the tariff applied, the plan, and total disputed amount.

6. **Publish the checklist.**

   `POST /cases/{case_id}/audits` with the full filled checklist, plus each individual finding. Mandatory financial evidence shows the explicit calculation — `checklist_base.md §2.2` details the required format per rule type.

## Pitfalls

- **Symptom:** FIN.13 false positives because of UVB factor. **Cause:** the contract uses UVB 2025 but the skill applied UVB 2026. **Fix:** read `uvb_factor` from `contratos_ips.json` for the contract active on `service_date`, never from global variables.
- **Symptom:** FIN.32 flags "simultaneous" billing that is actually on different dates. **Cause:** the comparison used date-only (00:00 times). **Fix:** compare by hospitalization intervals, not exact `DATE`.
- **Symptom:** FIN.34 denies by post-mortem but the patient is alive. **Cause:** homonym in RUAF with a different document. **Fix:** cross by document + date of birth, never document alone.
- **Symptom:** FIN.15 misapplied for same-access-route surgeries. **Cause:** manuals state 100% first + 75% second, skill applied 100% to both. **Fix:** explicitly implement the rule per manual (SOAT vs. ISS 2001 differ).
- **Symptom:** FIN.17 denies package-included services but the package was contractually excluded via an amendment. **Cause:** `contratos_ips.json` did not load the latest amendment. **Fix:** always use the contract version with the largest `vigente_desde` ≤ `service_date`.
- **Symptom:** FIN.37 upcoding misdetected. **Cause:** the HC describes a complex procedure but the simple one was billed (subcoding, not upcoding) — direction inverted. **Fix:** detect both directions; subcoding is a minor finding (the IPS loses money) but still report it for traceability.
- **Symptom:** many FIN.31 findings (consecutive numbering) for a large batch. **Cause:** the IPS bills in batches and the consecutive jumps across clients. **Fix:** FIN.31 must evaluate consecutive numbering **from this issuer to this EPS**, not globally.
- **Symptom:** score explodes by accumulation in anti-fraud when a single root cause triggers multiple findings (e.g. wrong date → fires FIN.30, FIN.31, FIN.32). **Cause:** no cascade suppression. **Fix:** do NOT suppress here — `consolidator-audit` will dedup. Report all.

## Verification

- `GET /cases/{case_id}/audits?type=financial` returns exactly 1 record with 42 evaluated rules.
- Every finding with `resultado=fail` has an explicit calculation in `evidencia` (expected, charged, delta).
- Total `valor_glosado` ≤ `invoice_total`.
- Any failing critical rule → `concepto_final ≠ APTA`.
- The skill did NOT read `admin_audit` nor `medical_audit` (independence).
- If any anti-fraud rule (FIN.29-FIN.42) fails, there is at least one finding with `critica` or `mayor` severity.

## References

- SOAT tariff manual (Decreto 780/2016).
- ISS 2001 tariff manual.
- Decreto 4747/2007 — EPS-IPS contracts.
- INVIMA — medication and device registry.
- RUAF — affiliate and mortality registry.
- Issue [arkangelai/audit-workflow#43](https://github.com/arkangelai/audit-workflow/issues/43).
