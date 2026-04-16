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
  - name: TARIFF_DEVIATION_THRESHOLD_PCT
    prompt: Tariff deviation threshold to trigger critical finding (default 5)
    required_for: optional
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

3. **Extract invoice transactions.** Internal shape: `items[] = {item_index, cups, description, quantity, unit_price, total_price, access_route?, specialty?}`. Always keep both `item_index` (1-based position in the invoice) and `cups` so findings can match downstream regardless of re-ordering.

4. **`valor_objetado` calculation rule (read this first).** Findings emit a `valor_objetado` integer in COP. The formula depends on the causal:

   | Causal | Formula | Worked example |
   |---|---|---|
   | **Tarifas** (FIN.13–16) | `(unit_billed − unit_contract) × cantidad` — **excess only** | H30104 billed 6,000,000, contract 5,430,500, qty 1 → `valor_objetado = 569,500`, **NOT** 6,000,000 |
   | **Facturacion** (FIN.17–19, FIN.31–33, FIN.36, FIN.38–41) | `total_price` of the offending line — **full value** | 890201 phantom-billed → 95,000 |
   | **Autorizacion** | `total_price` of unauthorized item — full value | D08005 without auth → 720,000 |
   | **Cobertura** (exclusion or cap) | Exclusion: `total_price`. Cap: `amount_over_cap` | Plan cap 5M, billed 6.2M → 1,200,000 |
   | **Soportes / Pertinencia** | `total_price` (or partial units with explicit basis) | UCI 5 days billed, 3 justified → 2 × 1,925,000 |

   Invariants (enforced in step 5):
   - Tarifas: `valor_objetado < item.total_price` (strict). If not, you have miscalculated.
   - All causales: `valor_objetado ≤ item.total_price`.
   - Never use the full billed amount for a Tarifas finding. If contract tariff is zero, re-classify as Cobertura.
   - For per-diem CUPS (S10101 estancia general 285,000/dia, S10102 UCI 1,925,000/dia) and per-vial CUPS (M00102 185,000/vial), **normalize unit first**: `expected = unit_contract × cantidad_dias` or `× n_vials` BEFORE computing the delta.

5. **Run the TARIFF-FRAUD checklist.**

   ### Group A — Active contract (Weight 3, critical)
   - **FIN.01** Contract active on `service_date` with verified signatures.
   - **FIN.02** Modality identified (event/PGP/cápita/paquete/global).
   - **FIN.03** Annexes and amendments current and versioned.

   ### Group B — Affiliate plan (Weight 3, critical)
   - **FIN.04** Correct plan ID (Oro/Plata/Básico/Complementario) from BDUA.
   - **FIN.05** Plan-specific tariff sheet applied (not generic).
   - **FIN.06** Plan coverages and exclusions compatible with billed services.

   ### Group C — Applicable tariff manual (Weight 3, critical)
   - **FIN.07** Correct manual per contract (SOAT, ISS 2001, proprietary).
   - **FIN.08** Manual version valid on `service_date`.
   - **FIN.09** Correct UVB/UVR factor by contract and date.

   ### Group D — Coding (Weight 2/3)
   - **FIN.10** CUPS correctly homologated to manual code.
   - **FIN.11** Medications with valid CUM/ATC and current INVIMA.
   - **FIN.12** Supplies/devices homologated to the contract list.

   ### Group E — Liquidation (Weight 2/3)
   - **FIN.13** Base tariff without over/under-charging (delta ≤ `TARIFF_DEVIATION_THRESHOLD_PCT`).
   - **FIN.14** Correct surcharges applied (night/holiday/urgency/specialty).
   - **FIN.15** Surgical liquidation per **access route** (same/different route, simultaneous surgeries).
   - **FIN.16** Professional fees (surgeon, assistant, anesthetist) per specialty and manual.

   ### Group F — Packages vs. events (Weight 2/3)
   - **FIN.17** Package-included services not billed as separate events.
   - **FIN.18** Out-of-package events contractually justified.
   - **FIN.19** PGP/cápita services not billed individually.

   ### Group G — Coverages and limits (Weight 2, major)
   - **FIN.20** Annual caps not exceeded without explicit authorization.
   - **FIN.21** Grace periods respected.
   - **FIN.22** Pre-existing conditions excluded per contract.

   ### Group H — Copays (Weight 2, major)
   - **FIN.23** Copay / moderating fee computed on affiliate IBC and within legal caps.
   - **FIN.24** Amount collected from patient recorded and subtracted from the EPS invoice.
   - **FIN.25** Exemptions applied (pregnant, minors, high-cost disease).

   ### Group I — Financial close (Weight 1/2)
   - **FIN.26** Billed total reconciles with contractual liquidation.
   - **FIN.27** Filing within contractual/legal window.
   - **FIN.28** IPS historical behavior within acceptable thresholds (glosa rate, upcoding).

   ### Group J — Anti-fraud (14 rules) ⚠️
   - **FIN.29** Issue date within contract and legal validity.
   - **FIN.30** Issue date after service date (not pre-emitted) and within a reasonable window.
   - **FIN.31** DIAN consecutive number with no gaps/repetitions against other invoices of the period.
   - **FIN.32** Patient not simultaneously billed by multiple IPS on the same date (cross-check against destination software).
   - **FIN.33** Inpatient stays do not overlap across institutions (physical impossibility).
   - **FIN.34** No post-mortem services (cross `ruaf_snapshot.json`).
   - **FIN.35** No double-billing SOAT+EPS+ARL without contractual justification.
   - **FIN.36** Every service has execution evidence (no phantom billing).
   - **FIN.37** No unjustified upcoding (CUPS more expensive than what is documented).
   - **FIN.38** No unbundling (disaggregation of packaged procedures).
   - **FIN.39** Professional not billed for physically impossible concurrent services (two simultaneous surgeries).
   - **FIN.40** No suspicious diagnosis changes that increase coverage across invoice versions.
   - **FIN.41** Medication/supply quantities proportional to the institutional benchmark.
   - **FIN.42** IPS shows no recurring pattern of deviation (glosas, upcoding, duplication).

6. **Build and publish `financial_audit`.** Findings are **item-keyed** (one entry per audited line item, including conformes), with the rule that detected the issue nested under `rule_ids`:
   ```json
   {
     "audit_type": "financial",
     "score": <int>,
     "zona": "verde|amarilla|roja",
     "opinion": "<financial summary>",
     "findings": [
       {
         "item": 1,
         "codigo_cups": "H30104",
         "hallazgo": "glosa",
         "causal": "Tarifas",
         "valor_facturado": 6000000,
         "valor_objetado": 569500,
         "valor_a_reconocer": 5430500,
         "calculation_basis": "excess_only",
         "rule_ids": ["FIN.13"],
         "severidad": "critica",
         "peso": 3,
         "resultado": "fail",
         "motivo": "Honorarios cirugia grupo 4 facturados por encima de tarifa contractual",
         "evidencia": "H30104: tarifario_contractual.csv precio_base=5430500 × qty 1 = 5430500; invoice charged 6000000 (delta +569500, +10.5% over 5% threshold)",
         "nota": "Base tariff overcharge"
       },
       {
         "item": 2,
         "codigo_cups": "S10102",
         "hallazgo": "conforme",
         "causal": null,
         "valor_facturado": 9625000,
         "valor_objetado": 0,
         "valor_a_reconocer": 9625000,
         "rule_ids": [],
         "resultado": "pass"
       }
     ]
   }
   ```

   **Causal vocabulary** is the strict 6-set: `Facturacion | Tarifas | Soportes | Autorizacion | Cobertura | Pertinencia`. Map your rule findings as follows:
   - FIN.01–FIN.16, FIN.37 (upcoding -- excess between codes) → `Tarifas`
   - FIN.17–FIN.19, FIN.31–FIN.33, FIN.36 (phantom), FIN.38 (unbundling), FIN.39–FIN.41 → `Facturacion`
   - FIN.04–FIN.06, FIN.20–FIN.22 (cap, grace, preexistencia) → `Cobertura`
   - FIN.34 (post-mortem) → `Facturacion` (service did not occur)
   - FIN.35 (double SOAT/EPS/ARL) → `Facturacion`

   **Phantom billing is `Facturacion`, NOT `Soportes`.** Soportes is for services that happened but documents are incomplete. If the service did not occur at all, the causal is `Facturacion`.

   **Always emit a finding for every billed item**, including passes (`hallazgo="conforme"`, `valor_objetado=0`, `causal=null`). Downstream consumers (consolidator, dashboard, Excel) require full item coverage.

7. **Mandatory financial evidence: show the calculation.** Format:
   `{CUPS}: expected={unit}*{qty}={expected} (source); charged={charged}; delta={charged-expected} ({pct}%)`. Numbers in `evidencia` must be internally consistent within 1 COP of `valor_objetado`.

## Pitfalls

- **Symptom:** FIN.13 false positives because of UVB factor. **Cause:** the contract uses UVB 2025 but the skill applied UVB 2026. **Fix:** read `uvb_factor` from `contratos_ips.json` for the contract active on `service_date`, never from global variables.
- **Symptom:** FIN.32 flags "simultaneous" billing that is actually on different dates. **Cause:** the comparison used date-only (00:00 times). **Fix:** compare by hospitalization intervals, not exact `DATE`.
- **Symptom:** FIN.34 denies by post-mortem but the patient is alive. **Cause:** homonym in RUAF with a different document. **Fix:** cross by document + date of birth, never document alone.
- **Symptom:** FIN.15 misapplied for same-access-route surgeries. **Cause:** manuals state 100% first + 75% second, skill applied 100% to both. **Fix:** explicitly implement the rule per manual (SOAT vs. ISS 2001 differ).
- **Symptom:** FIN.17 denies package-included services but the package was contractually excluded via an amendment. **Cause:** `contratos_ips.json` did not load the latest amendment. **Fix:** always use the contract version with the largest `vigente_desde` ≤ `service_date`.
- **Symptom:** FIN.37 upcoding misdetected. **Cause:** the HC describes a complex procedure but the simple one was billed (subcoding, not upcoding) — direction inverted. **Fix:** detect both directions; subcoding is a minor finding (the IPS loses money) but still report it for traceability.
- **Symptom:** many FIN.31 findings (consecutive numbering) for a large batch. **Cause:** the IPS bills in batches and the consecutive jumps across clients. **Fix:** FIN.31 must evaluate consecutive numbering **from this issuer to this EPS**, not globally.
- **Symptom:** score explodes by accumulation in anti-fraud when a single root cause triggers multiple findings (e.g. wrong date → fires FIN.30, FIN.31, FIN.32). **Cause:** no cascade suppression. **Fix:** do NOT suppress here — `consolidator-audit` will dedup. Report all.
- **Symptom:** `valor_objetado` equals the full billed amount on a Tarifas finding. **Cause:** agent used `item.total_price` instead of the excess delta. **Fix:** Tarifas uses `(unit_billed − unit_contract) × cantidad`. If the contract tariff is zero or absent, re-classify as Cobertura.
- **Symptom:** finding references "item 3" only; the consolidator cannot match it. **Cause:** referencing by line number alone. **Fix:** always emit `codigo_cups` as the primary identifier (CUPS + description disambiguates when two lines share a CUPS).
- **Symptom:** phantom-billed service is flagged as `Soportes`. **Cause:** confusion between "missing documents" and "service did not occur". **Fix:** if there is no clinical evidence the service was rendered, causal is `Facturacion` (FIN.36). Soportes is for services that happened with incomplete docs.
- **Symptom:** per-diem S10102 (1,925,000/dia) compared as a single unit against a 5-day stay. **Cause:** unit not normalized. **Fix:** `expected = unit_contract × cantidad_dias` BEFORE computing the delta.
- **Symptom:** multi-error factura produces 3 findings on the same item. **Cause:** worry about double-counting. **Fix:** do NOT suppress here. The consolidator deduplicates by `(item_cups, causal)` and caps per-item objetado at `item.total_price`. Report all.
- **Symptom:** `valor_objetado` is negative (subcoding). **Cause:** IPS billed less than the tariff. **Fix:** keep the sign and report with `severidad=baja`, `nota="subcoding, IPS self-discount"`. Do NOT flip to positive.
- **Symptom:** FIN.13 passes because line total matches the contract, but `cantidad` is inflated (10 vials billed, 3 used). **Cause:** only validated unit price. **Fix:** validate both `unit_price` AND `cantidad` against clinical evidence. Inflated quantity with correct unit → causal `Facturacion`, not `Tarifas`.

## Verification

- `GET /cases/{case_id}/audits?type=financial` returns exactly 1 record with 42 evaluated rules.
- The `findings[]` array has **one entry per invoice item** (conformes included), not just failures.
- Every finding with `hallazgo="glosa"` has both `causal` (from the strict 6-set) and `codigo_cups` matching an item in the invoice.
- Every finding with `resultado="fail"` has an explicit calculation in `evidencia` (expected, charged, delta) consistent with `valor_objetado` within 1 COP.
- For Tarifas findings: `valor_objetado < item.total_price` (strict). If equal, the agent miscalculated.
- Per item: `valor_a_reconocer + valor_objetado == item.total_price` (conservation of money).
- Total `valor_objetado` ≤ `invoice_total`.
- Any failing critical rule → `zona=roja`.
- The skill did NOT read `admin_audit` nor `medical_audit` (independence).
- If any anti-fraud rule (FIN.29-FIN.42) fails, there is at least one finding with `critica` or `mayor` severity.

## References

- SOAT tariff manual (Decreto 780/2016).
- ISS 2001 tariff manual.
- Decreto 4747/2007 — EPS-IPS contracts.
- INVIMA — medication and device registry.
- RUAF — affiliate and mortality registry.
- Issue [arkangelai/audit-workflow#43](https://github.com/arkangelai/audit-workflow/issues/43).
