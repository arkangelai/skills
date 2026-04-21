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

## Input Contract

**Template:** `metadata_input.json` produced by `medical-invoice-gmail-intake` — 8 flat fields (`caso_id`, `fecha_radicacion`, `num_factura`, `prestador_nit`, `prestador_nombre`, `pagador_nit`, `pagador_nombre`, `documentos`). See `../medical-invoice-gmail-intake/metadata_input.json` for the canonical shape.

Additionally loads from `$REF_DATA_PATH`: `bdua.json` (affiliation) and `contratos_ips.json` (IPS contracts). Fetches each document listed in `documentos` from the destination software.

## Output Contract

**Template:** `checklist_base.json` in this directory — DAMA-UK instrument, 27 rules (A01–A27). For SOAT cases use `checklist_soat_base.json` instead. See `checklist_base.md` for rule descriptions and evidence requirements.

Load the template and fill every rule's nullable fields:
- `resultado`: `"pass" | "fail" | "n/a"`
- `evidencia`: citable string — file + page/section + literal quote
- `confianza`: float 0.0–1.0
- `glosa_sugerida`: object (only when `resultado = "fail"`), else `null`

Then fill `meta` and append `cierre`:

```json
{
  "meta": { "caso_id": "...", "fecha_auditoria": "...", "agente": "agente-admin-v1" },
  "cierre": {
    "score_total": 100.0,
    "concepto_final": "APTA | NO_APTA | DEVOLUCION | ESCALAR_HUMANO",
    "clasificacion": "Administrativo",
    "accion_requerida": "Ninguna | Correccion | Complemento | Rechazo | Escalar",
    "resumen_ejecutivo": "<2-3 oraciones>"
  }
}
```

Publish to `POST /cases/{caso_id}/audits` and return the complete filled checklist.

**Rules for `resultado`:**
- `pass` — rule satisfied with evidence.
- `fail` — rule violated; `glosa_sugerida` must be populated.
- `n/a` — rule does not apply to this service type (e.g. SOAT rule on a non-SOAT invoice).

**Rules for `confianza`:**
- `≥ 0.95`: direct document quote or verified system query (DIAN, BDUA).
- `0.80–0.94`: specific document reference without literal quote.
- `0.75–0.79`: strong inference with partial evidence.
- `< 0.75` on any `critica` rule → `concepto_final` forced to `ESCALAR_HUMANO`.

**`glosa_sugerida` shape (only when `resultado = fail`):**
```json
{
  "causal_num": "1 | 2 | 3 | 4 | 5 | 6 | 7",
  "causal_nombre": "<nombre causal Res. 3047 Anexo 6>",
  "texto": "<1-2 oraciones trazables con cita>",
  "valor_glosado": 0,
  "moneda": "COP"
}
```

**`concepto_final` decision logic:**
- `NO_APTA`: any `critica` rule with `fail` that is not subsanable (e.g. missing HC entirely).
- `DEVOLUCION`: any `critica` rule with `fail` that is subsanable by submitting documents.
- `ESCALAR_HUMANO`: any `critica` rule with `confianza < 0.75`, or ambiguous evidence.
- `APTA`: all applicable rules `pass` and no escalation trigger.

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
   ```json
   {
     "audit_type": "admin",
     "score": <total weight lost>,
     "zona": "verde|amarilla|roja",
     "opinion": "<2-3 line summary>",
     "findings": [
       {
         "rule_id": "ADMIN.07",
         "severidad": "critica|mayor|media|baja",
         "peso": 3,
         "resultado": "pass|fail|conditional",
         "evidencia": "contratos_ips.json: NIT 900... is not active as of 2026-03-15",
         "valor_objetado": 0,
         "nota": "IPS billed without an active contract"
       }
     ]
   }
   ```

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

## Verification

- `GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audits?type=admin` returns exactly one record with all 27 rules evaluated (each with a `resultado`).
- Every finding has a non-empty, citable `evidencia`.
- The sum `Σ peso × (1 if fail else 0)` matches `score`.
- No critical rule with `resultado=fail` coexists with `zona=verde|amarilla` (invariant).
- The skill did NOT read `medical_audit` nor `financial_audit` (independence is verifiable in logs).

## References

- Resolución 1536/2022 — RIPS structure.
- Resolución 1995/1999 — clinical history.
- Decreto 4747/2007 — EPS-IPS contracts.
- DAMA-UK data quality framework — data-quality dimensions.
- Issue [arkangelai/audit-workflow#42](https://github.com/arkangelai/audit-workflow/issues/42).
