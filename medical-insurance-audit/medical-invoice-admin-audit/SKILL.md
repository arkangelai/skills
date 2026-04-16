---
name: medical-invoice-admin-audit
description: Runs the administrative audit of a filed Colombian medical invoice (patient identity, BDUA affiliation, IPS contract, RIPS structure, DIAN invoice, prior authorization, signed clinical history, cross-document consistency, and filing timeliness). Emits findings with traceable evidence and publishes them to the destination software. Use it when the user asks to audit the administrative side of a case, resume a failed audit, or run the admin sub-agent of the pipeline.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, administrative, rips, bdua, colombia, eps]
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
    prompt: Folder with bdua.json, contratos_ips.json
    help: Usually /ref_data/ synced from Drive (see issue #38)
    required_for: full functionality
---

# medical-invoice-admin-audit

Administrative sub-agent of the pipeline. Evaluates **~27 rules** (DAMA-UK + DOE-FT-01x) on identity, documentary completeness, RIPS structure, authorizations, and timeliness. Runs independently of the medical and financial auditors — it does not see their results.

The question it answers: **is the expediente formally complete and consistent enough to be paid?** It does not evaluate clinical pertinence or tariff — that belongs to the other two.

## When to Use

- The orchestrator dispatches the **administrative** leg of a case (state `received` → parallel audits).
- The user asks "audit the admin side of invoice {RAD}" or "run the admin-auditor on case X".
- Reprocessing a case whose `admin_audit` ended up in error or incomplete.
- Validating an invoice before filing it to another EPS (preventive audit from the IPS side).

**Do not use:** if the case is not yet filed (skill 1 missing); if the case already has `admin_audit` published and a re-audit was not requested.

## Procedure

1. **Read the case from the destination software.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
   Authorization: Bearer {DEST_SOFTWARE_API_KEY}
   ```
   Retrieve: `ips_nit`, `invoice_number`, `service_date`, `patient_document`, `attachments[]`, `cups_principales[]`.

2. **Download the necessary attachments.**
   - `invoice_xml` (DIAN invoice)
   - `rips` (flat file or JSON)
   - `clinical_history` (PDF)
   - `authorization` (if any)
   - `epicrisis`, `operative_note` (if applicable given the CUPS)

   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/attachments/{name}
   ```

3. **Load ref_data.**
   - `$REF_DATA_PATH/bdua.json` — affiliation state.
   - `$REF_DATA_PATH/contratos_ips.json` — active IPS contracts.

4. **Run the rule checklist (each rule emits a `finding`).**

   ### Group A — Patient identity (Weight 3, critical)
   - **ADMIN.01** Document (type + number) matches across XML invoice, RIPS (`US.txt`), clinical history, and BDUA.
   - **ADMIN.02** First and last name match (exact match on RIPS and BDUA; accent-insensitive).
   - **ADMIN.03** Date of birth / age consistent with document type (CC adult, TI minor, RC infant).

   ### Group B — Affiliation (Weight 3, critical)
   - **ADMIN.04** Patient active in BDUA on the **service date** (not the filing date).
   - **ADMIN.05** BDUA plan compatible with the billed service (e.g. Básico plan does not cover high complexity).

   ### Group C — IPS contract (Weight 3, critical)
   - **ADMIN.06** The IPS (by NIT) has an active contract with the EPS on the service date (`contratos_ips.json`).
   - **ADMIN.07** Contractual modality (event/PGP/cápita/paquete) compatible with the billing type.

   ### Group D — RIPS structure (Weight 3, critical — Res. 1536/2022)
   - **ADMIN.08** Minimum files present based on service type (`US`+`AF` always; `AC` for consultations, `AP` for procedures, `AH` for hospitalization, `AM` for medications, `AN` for newborns, `AT` for other services, `AU` for ER).
   - **ADMIN.09** Column count per file is unique and consistent (no malformed rows).
   - **ADMIN.10** Every `numFactura` in `AF.txt` exists in the detail files.
   - **ADMIN.11** Every user in detail files exists in `US.txt`.

   ### Group E — DIAN invoice (Weight 3, critical)
   - **ADMIN.12** CUV/CUFE present and well-formed.
   - **ADMIN.13** DIAN consecutive number with no gaps or collisions against other invoices from the same period.
   - **ADMIN.14** Issue date on or after service date.

   ### Group F — Prior authorization (Weight 2, major)
   - **ADMIN.15** If the service requires authorization (high complexity, non-PBS, limits), the authorization PDF exists and covers the billed CUPS.
   - **ADMIN.16** The authorization is valid on the service date.

   ### Group G — Clinical history (Weight 3, critical — Res. 1995/1999)
   - **ADMIN.17** HC signed by a professional with a legible RETHUS ID.
   - **ADMIN.18** Epicrisis present if the case was inpatient.
   - **ADMIN.19** Operative note present if there is a surgical CUPS.

   ### Group H — Cross-document consistency (Weight 2, major)
   - **ADMIN.20** XML invoice total = RIPS detail sum (tolerance ±$1).
   - **ADMIN.21** Service date consistent across XML, RIPS, and HC.
   - **ADMIN.22** CUPS in RIPS match the XML billing lines.
   - **ADMIN.23** Quantities in RIPS consistent with HC (not more procedures than documented).

   ### Group I — Timeliness (Weight 1, low)
   - **ADMIN.24** Filing within the contractual window (typically 30 days post-discharge).
   - **ADMIN.25** RIPS generated within 15 days post-care.

   ### Group J — Traceability (Weight 1, low)
   - **ADMIN.26** Every supporting document has a documentable origin (filename + modified date).
   - **ADMIN.27** No documents with suspicious metadata (creation date after filing).

5. **Assemble the `admin_audit` object.**

   Findings are **item-keyed** (one entry per audited line item, including conformes), with the rule that detected the issue nested under `rule_ids`. Invoice-wide rules (e.g. ADMIN.12 CUV missing, ADMIN.24 timeliness) emit `case_level: true` instead of `item`/`codigo_cups`.
   ```json
   {
     "audit_type": "admin",
     "score": <total weight lost>,
     "zona": "verde|amarilla|roja",
     "opinion": "<2-3 line summary>",
     "findings": [
       {
         "item": 1,
         "codigo_cups": "H30104",
         "hallazgo": "glosa",
         "causal": "Soportes",
         "valor_facturado": 5430500,
         "valor_objetado": 5430500,
         "valor_a_reconocer": 0,
         "rule_ids": ["ADMIN.19"],
         "severidad": "critica",
         "peso": 3,
         "resultado": "fail",
         "motivo": "Procedimiento quirurgico sin nota operatoria adjunta",
         "evidencia": "epicrisis.pdf p.3: cita CUPS H30104; carpeta soportes/ no contiene operative_note_*.pdf",
         "nota": "Surgical CUPS missing operative note"
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
       },
       {
         "case_level": true,
         "hallazgo": "glosa",
         "causal": "Facturacion",
         "valor_objetado": 0,
         "rule_ids": ["ADMIN.12"],
         "severidad": "critica",
         "peso": 3,
         "resultado": "fail",
         "motivo": "Factura sin CUV/CUFE valido",
         "evidencia": "factura.xml: tag /Invoice/cbc:UUID@schemeID is missing"
       }
     ]
   }
   ```

   **Causal vocabulary** (Sura strict 6-set): `Facturacion | Tarifas | Soportes | Autorizacion | Cobertura | Pertinencia`. Map ADMIN.* rules to causales as follows:
   - ADMIN.01–ADMIN.03 (identity), ADMIN.20–ADMIN.23 (cross-doc consistency) → `Facturacion`
   - ADMIN.04–ADMIN.05 (BDUA, plan compatibility) → `Cobertura`
   - ADMIN.06–ADMIN.07 (contract, modality) → `Facturacion`
   - ADMIN.08–ADMIN.11 (RIPS structure) → `Soportes`
   - ADMIN.12–ADMIN.14 (DIAN invoice) → `Facturacion`
   - ADMIN.15–ADMIN.16 (authorization) → `Autorizacion`
   - ADMIN.17–ADMIN.19 (HC, epicrisis, operative note) → `Soportes`
   - ADMIN.24–ADMIN.27 (timeliness, traceability) → `Facturacion`

   **Always emit a finding for every billed item**, including passes (`hallazgo="conforme"`, `valor_objetado=0`, `causal=null`). Downstream consumers (consolidator, dashboard, Excel) require full item coverage.

   **Match items by `codigo_cups` first**, item index as tiebreaker. The extract step and the audit step are separate Claude calls -- item indexes can drift.

   **Missing-attachment handling.** If a rule requires an attachment that is not present (e.g. ADMIN.15 needs the authorization PDF), emit `resultado="conditional"` rather than `fail`. Add `motivo: "Soporte requerido no adjunto"` and let consolidator/human-review request it.

   **Multi-causal per item.** A single item can carry multiple findings under different causales (e.g. missing nota operatoria under Soportes AND wrong CUPS code under Facturacion). Emit one finding per (item, causal) pair.

   **Zone calculation:**
   - Green: 0-5 weight points lost.
   - Yellow: 6-15.
   - Red: 16+.
   - Any critical rule (Weight 3) failing → zone forced to at least red.

6. **Publish the result to the destination software.**
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audits
   { ...admin_audit }
   ```

   Publish each finding individually as well, so humans can comment on each:
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audits/{audit_id}/findings
   ```

7. **Emit detailed evidence.**
   Each `finding.evidencia` must be **citable**: file + section/line/page.
   Valid example: `"US.txt line 1, field 3: document=CC12345678; BDUA: document=CC87654321"`.
   Invalid example: `"identity mismatch"` (no citation).

## Pitfalls

- **Symptom:** ADMIN.01 fails because of accents (`JOSE` vs `JOSÉ`). **Cause:** RIPS handles accents inconsistently. **Fix:** normalize with `unicodedata.normalize('NFKD', s).encode('ascii','ignore')` before comparing.
- **Symptom:** ADMIN.06 flags an expired contract that is actually active. **Cause:** `contratos_ips.json` has dates in DD/MM/YYYY while the service uses ISO. **Fix:** explicitly parse with `datetime.strptime` — never trust implicit parsing.
- **Symptom:** ADMIN.10 fails because `numFactura` has leading zeros in `AF` but not in `AC`. **Cause:** inconsistent padding by the IPS. **Fix:** normalize (`lstrip('0')`) before comparing.
- **Symptom:** false positives in ADMIN.17 (HC without signature). **Cause:** the PDF carries a digital signature in metadata, not visible in the OCR text. **Fix:** inspect the PDF's `/Sig` dictionary in addition to text OCR.
- **Symptom:** the admin audit was published but the consolidator does not see it. **Cause:** the aggregate object was published but not the individual findings (only one of the two endpoints). **Fix:** always publish both (step 6).
- **Symptom:** BDUA says affiliate is inactive but they are actually active. **Cause:** local BDUA snapshot is stale (annual sync). **Fix:** if the critical BDUA rule fails, set `resultado=conditional` and let human-review query BDUA online.
- **Symptom:** score fine, green zone, yet a critical rule failed. **Cause:** incorrect calculation — a failed critical forces the red zone. **Fix:** zone logic must first check if any Weight 3 rule has `resultado=fail`.
- **Symptom:** consolidator drops items because there is no entry for them. **Cause:** skill emitted findings only for failures. **Fix:** emit one finding per invoice item (conforme entries included). Use `hallazgo="conforme"`, `valor_objetado=0`, `causal=null` for passes.
- **Symptom:** finding references "item 3" but no CUPS, consolidator cannot match it. **Cause:** referencing by line number alone. **Fix:** always emit `codigo_cups` as the primary identifier; item index as tiebreaker only.
- **Symptom:** required attachment is missing (e.g. authorization PDF), skill marks it `fail` and the case is wrongly auto-denied. **Fix:** missing soporte → `resultado="conditional"` so human review can request it.
- **Symptom:** GPC catalog or BDUA reference data is absent, agent hallucinates rule outcomes. **Fix:** pre-check ref_data availability; if missing, emit `resultado="conditional"` with `motivo: "Catalog X not available, requires online lookup"`.
- **Symptom:** multi-causal item (missing nota operatoria + wrong CUPS) produces only one finding. **Fix:** emit one finding per (item, causal) pair. Consolidator handles per-item caps.

## Verification

- `GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audits?type=admin` returns exactly one record.
- The `findings[]` array has **one entry per invoice item** (conformes included), plus any `case_level=true` findings for invoice-wide rules.
- Every finding with `hallazgo="glosa"` has both `causal` (from the strict 6-set) and `codigo_cups` (or `case_level=true`).
- Every finding has a non-empty, citable `evidencia` (file + section/line/page).
- Per item: `valor_a_reconocer + valor_objetado == item.total_price` (conservation of money).
- For every `item_cups`: `Σ valor_objetado ≤ item.total_price`.
- No two findings share the same `(item_cups, causal)` (multi-causal per item allowed; same-causal duplicates not).
- All 27 rules are evaluated (recorded in `rule_ids` of relevant findings; rules that pass for all items are reflected in the conforme entries).
- The sum `Σ peso × (1 if fail else 0)` matches `score`.
- No critical rule with `resultado=fail` coexists with `zona=verde|amarilla` (invariant).
- The skill did NOT read `medical_audit` nor `financial_audit` (independence is verifiable in logs).

## References

- Resolución 1536/2022 — RIPS structure.
- Resolución 1995/1999 — clinical history.
- Decreto 4747/2007 — EPS-IPS contracts.
- DAMA-UK data quality framework — data-quality dimensions.
- Issue [arkangelai/audit-workflow#42](https://github.com/arkangelai/audit-workflow/issues/42).
