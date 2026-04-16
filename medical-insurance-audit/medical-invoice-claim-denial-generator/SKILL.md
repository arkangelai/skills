---
name: medical-invoice-claim-denial-generator
description: Produces the formal glosa (claim denial) document of a Colombian medical invoice from the consolidated audit output. Default format is XLSX with one row per item (conforme + glosa rows, color-coded), Anexo 6 causal codes, motivo and evidencia per glosa, and a summary block. Optionally also emits a signed PDF (legal archive) when EMIT_SIGNED_PDF=1. Supports incremental versions (v1, v2, ...) when fix-review requests changes. Use it when the case is consolidated (label `auto-denial` or post human-review) and needs the formal document that will be sent to the IPS.
version: 1.1.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, xlsx, pdf, glosa, claim-denial, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: DEST_SOFTWARE_BASE_URL
    prompt: Base URL of the destination software
    required_for: full functionality
  - name: DEST_SOFTWARE_API_KEY
    prompt: API key / bearer token
    required_for: full functionality
  - name: EMIT_SIGNED_PDF
    prompt: Set to 1 to also emit a signed PDF archive alongside the XLSX
    help: XLSX is the IPS-facing format; PDF is the optional signed legal copy
    required_for: optional
  - name: EPS_INSTITUTIONAL_TEMPLATE_PATH
    prompt: Path to the EPS-branded HTML/Typst/LaTeX glosa template (PDF only)
    help: If missing, the skill uses the generic Res. 3047-compliant template
    required_for: optional
  - name: EPS_LEGAL_REPRESENTATIVE
    prompt: Name and title of the signer (lead medical auditor / legal representative)
    required_for: required when EMIT_SIGNED_PDF=1
---

# medical-invoice-claim-denial-generator

Generates the formal glosa (claim denial) PDF, ready to be sent to the IPS. Supports **versioning** — the first run produces `v1`, later edits driven by `fix-review` produce `v2`, `v3`, without overwriting earlier versions.

The question it answers: **how do I turn the consolidated output into a legal, traceable, professional document that the IPS can answer within 15 business days?**

## When to Use

- The case is labeled `auto-denial` and the initial glosa must be produced.
- `fix-review` applied changes and asks to regenerate the PDF (`v2`, `v3`, ...).
- The user asks "draft the glosa for case {RAD}" or "regenerate the glosa with the auditor's edits".

**Do not use:** if the case has no `consolidated_findings` published; if the current label is `auto-approve` (no glosa needed).

## Procedure

1. **Read the consolidated output and case data.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/consolidated
   ```
   Retrieve: `ips_razon_social`, `ips_nit`, `rad`, `invoice_number`, `invoice_cuv`, `patient_name`, `patient_document`, `service_date`, `issue_date`, `invoice_total`, `consolidated_findings[]`, `case_summary`.

2. **Determine the next version.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/documents?tipo=claim_denial
   ```
   List existing versions. New version = `max(version) + 1`, default `v1`.

3. **Render the XLSX (primary output).**

   Filename: `auditoria_{num_factura}.v{N}.xlsx`. Library: `openpyxl` or equivalent.

   ### XLSX structure (3 blocks in one sheet `Auditoria`)

   **Block 1 — Header (rows 1-12).** Two columns: label (col A, bold, gray fill `#F7F8F9`) + value (cols B-K merged). Rows: Factura, Prestador, NIT Prestador, Paciente, Documento, Plan, Diagnostico, Fecha atencion, Fecha factura, RAD, Version (`v2`), Fecha de notificacion (Bogota timezone).

   **Block 2 — Items table (header + one row per billed item, including conformes).**

   Columns (exact order):
   | # | Column | Width | Format |
   |---|---|---|---|
   | 1 | Item | 6 | int |
   | 2 | CUPS | 12 | text |
   | 3 | Descripcion | 38 | text wrap |
   | 4 | V. Facturado | 13 | `"$"#,##0` |
   | 5 | V. Conforme | 13 | `"$"#,##0` |
   | 6 | V. Glosado | 13 | `"$"#,##0` |
   | 7 | Decision | 12 | text uppercase |
   | 8 | Causal | 14 | text |
   | 9 | Codigo Glosa | 12 | text (regex `^[1-6]\.\d{2}$`) |
   | 10 | Motivo / Observacion | 50 | text wrap |
   | 11 | Evidencia requerida | 30 | text wrap |

   Header row: white text on EPS brand fill (configurable; example `#0033A0`), bold, centered.

   Row coloring:
   - Glosa row: light red fill `#FCE5E5`. Decision cell red bold (`#DA1414`).
   - Conforme row: light green fill `#E5F5EA`. Decision cell green bold (`#287D3C`).

   Money cells must stay numeric (`number_format='"$"#,##0'`). Do NOT serialize as `"$1,200,000"` strings -- breaks IPS sort/filter and recompute formulas.

   Conforme rows MUST have `V. Glosado = 0` and `V. Conforme = V. Facturado`. Codigo Glosa, Causal, Motivo, Evidencia requerida are empty.

   **Anexo 6 codigo glosa** (`Codigo Glosa` column) -- use this taxonomy:
   - `1.xx` Facturacion (1.01 errores formales, 1.02 cobro duplicado, ...)
   - `2.xx` Tarifas (2.01 sobrecobro, 2.02 manual incorrecto, ...)
   - `3.xx` Soportes (3.01 falta orden medica, 3.02 falta informe, ...)
   - `4.xx` Autorizacion (4.01 sin autorizacion, 4.02 vencida, ...)
   - `5.xx` Cobertura (5.01 no PBS, 5.02 cap superado, ...)
   - `6.xx` Pertinencia (6.01 alternativa de menor costo, 6.02 estancia injustificada, ...)

   **Block 3 — Resumen (3-4 rows after items).** Total facturado, Valor a reconocer (sum of V. Conforme), Valor glosado (sum of V. Glosado), Items conformes / Items glosados, Tasa de objecion `%`. Last row: italic gray footer "Documento generado por el sistema de auditoria de {EPS}. Plazo respuesta IPS: 15 dias habiles (Res. 3047/2008 Art. 6)."

4. **Optionally render the signed PDF (when `EMIT_SIGNED_PDF=1`).** Filename: `auditoria_{num_factura}.v{N}.pdf`. If `EPS_INSTITUTIONAL_TEMPLATE_PATH` exists, use it. Otherwise use a generic template with the required structure:

   ### PDF structure

   ```
   ┌─────────────────────────────────────────┐
   │ [EPS LOGO]        GLOSA FORMAL          │
   │                   Res. 3047/2008 Art. 5 │
   ├─────────────────────────────────────────┤
   │ Notification date: 2026-04-15           │
   │ RAD: 20260415-0023                      │
   │ Version: v2                             │
   ├─────────────────────────────────────────┤
   │ PROVIDER (IPS)                          │
   │   Legal name: Clínica ABC S.A.S.        │
   │   NIT: 900.123.456-7                    │
   │   Notification email: ...               │
   │                                         │
   │ PAYER (EPS)                             │
   │   EPS XYZ                               │
   │                                         │
   │ DISPUTED INVOICE                        │
   │   Number: FE-A-45678                    │
   │   CUV: abc123...                        │
   │   Issue date: 2026-03-20                │
   │   Service date: 2026-03-10              │
   │   Patient: Juan Pérez, CC 123456        │
   │   Total billed: $8,500,000              │
   ├─────────────────────────────────────────┤
   │ EXECUTIVE SUMMARY                       │
   │   Total billed:    $8,500,000           │
   │   Total disputed:  $3,200,000           │
   │   Total to pay:    $5,300,000           │
   │                                         │
   │   Causales applied:                     │
   │     • 2 No pertinencia clínica: 1 item  │
   │     • 5 Tarifa incorrecta: 3 items      │
   │     • 6 Agotamiento cobertura: 1 item   │
   ├─────────────────────────────────────────┤
   │ DETAILED FINDINGS                       │
   │                                         │
   │ #1 — Causal 6.1 Agotamiento cobertura   │
   │     Item: CUPS 890201 "Specialty cons." │
   │     Disputed amount: $1,200,000         │
   │                                         │
   │     Legal justification:                │
   │       Res. 3047/2008 Anexo 6, causal 6.1│
   │       ...                               │
   │                                         │
   │     Clinical/technical justification:   │
   │       ...                               │
   │                                         │
   │     Evidence:                           │
   │       • autorizacion.pdf p.2:           │
   │         "annual cap $5,000,000 reached" │
   │       • factura XML <cbc:PayableAmount> │
   │         $1,200,000 exceeds available    │
   │                                         │
   │     Evaluated rules: ADMIN.15, FIN.20   │
   │     Confidence: 0.92                    │
   │                                         │
   │ #2 — ...                                │
   ├─────────────────────────────────────────┤
   │ RIGHT OF RESPONSE                       │
   │   The IPS has 15 business days to       │
   │   respond per Art. 6 of Res. 3047/2008. │
   │   After that, the glosa stands.         │
   ├─────────────────────────────────────────┤
   │ SIGNATURE                               │
   │   [Lead auditor name]                   │
   │   [Title]                               │
   │   [Professional registration if any]    │
   └─────────────────────────────────────────┘
   ```

5. **Render the PDF (only when EMIT_SIGNED_PDF=1).**
   Recommended stack (in order of preference):
   - **Typst** — `typst compile template.typ output.pdf` (fast, professional typography).
   - **WeasyPrint** — HTML + CSS → PDF (good CSS control).
   - **wkhtmltopdf** (fallback).

   Inject dynamic data from the consolidated output. Colombian number formatting: thousands with `.`, decimals with `,` (`$8.500.000`) — switch locale accordingly.

6. **Save on the case with versioning.**
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/documents
   Content-Type: multipart/form-data

   file=auditoria_{num_factura}.v2.xlsx
   tipo=claim_denial
   version=v2
   format=xlsx
   metadata={"findings_count": 5, "total_objetado": 3200000, "generated_at": "..."}
   ```
   When PDF was also emitted, post a second document with `format=pdf`. **Do not overwrite earlier versions** — the destination software must keep history.

7. **Update the case status.**
   ```
   PATCH {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
   { "status": "claim_denial_draft", "latest_claim_denial_version": "v2" }
   ```

8. **Return the reference.**
   ```json
   {
     "document_id": "...",
     "version": "v2",
     "xlsx_url": "https://.../cases/{id}/documents/{doc_id}/content",
     "pdf_url": "https://.../... (only when EMIT_SIGNED_PDF=1)",
     "case_id": "...",
     "estado_caso": "claim_denial_draft",
     "findings_count": 5,
     "total_objetado": 3200000
   }
   ```

## Pitfalls

- **Symptom:** PDF does not render accents/ñ. **Cause:** font without Unicode coverage or template encoding. **Fix:** use a Latin-covering font (Inter, Noto Sans) and set `encoding=utf-8` in the template.
- **Symptom:** `v1` overwritten when generating `v2`. **Cause:** hardcoded filename. **Fix:** filename must include version: `auditoria_{num_factura}.{version}.xlsx`, and the software must accept the `version` parameter without replacing the existing record.
- **Symptom:** evidence truncated in the table. **Cause:** cells with long text and no wrap. **Fix:** set `wrap_text=True` (xlsx) / `word-break: break-word` (pdf) for evidence cells.
- **Symptom:** totals mismatch (`total_objetado > invoice_total`). **Cause:** findings with the same invoice_item summed multiple times. **Fix:** this skill does NOT sum — use `case_summary.total_objetado` directly from the consolidator.
- **Symptom:** a glosa was generated even though the zone is green. **Cause:** the skill ran without checking labels. **Fix:** first step: `GET /cases/{id}/labels` — abort if `auto-approve` is present.
- **Symptom:** signer is blank in the PDF. **Cause:** `EPS_LEGAL_REPRESENTATIVE` unset. **Fix:** required variable when `EMIT_SIGNED_PDF=1`; fail loudly if empty.
- **Symptom:** the IPS claims the document is legally invalid. **Cause:** missing explicit citation to Res. 3047. **Fix:** XLSX footer and PDF template must hardcode legal references, not leave them optional.
- **Symptom:** `v2` regeneration does not reflect fix-review changes. **Cause:** skill read a stale consolidated (cached). **Fix:** always re-fetch `GET /cases/{id}/consolidated` at start; never trust in-memory state.
- **Symptom:** XLSX money column sorts as text (1, 100, 12, 2). **Cause:** values written as strings (`"$1,200,000"`). **Fix:** write integer COP value, set cell `number_format='"$"#,##0'`. Never serialize as string.
- **Symptom:** XLSX shows only glosa rows (conformes missing). **Cause:** filtering on `case_summary` instead of full hallazgos list. **Fix:** Items table must contain every billed item -- one row per item. Conforme rows have `V. Glosado=0`.
- **Symptom:** Codigo Glosa cell has free-form text like "tarifa". **Cause:** taxonomy not enforced. **Fix:** validate against regex `^[1-6]\.\d{2}$` before writing the cell. If not mappable, leave empty and log a warning -- do not invent codes.
- **Symptom:** Codigo Glosa prefix `5.xx` (Tarifa) on a Pertinencia row. **Cause:** taxonomy mismatch with causal. **Fix:** validate that the codigo prefix matches the causal -- 1.xx ↔ Facturacion, 2.xx ↔ Tarifas, 3.xx ↔ Soportes, 4.xx ↔ Autorizacion, 5.xx ↔ Cobertura, 6.xx ↔ Pertinencia.
- **Symptom:** filename built from `case_id` instead of `num_factura`, IPS auditors cannot find the file. **Fix:** `auditoria_{num_factura}.v{N}.xlsx`. Include factura number, not the internal case_id.

## Verification

- `GET /cases/{case_id}/documents?tipo=claim_denial` lists the new version (xlsx + optional pdf) without deleting previous ones.
- The XLSX opens and contains 3 blocks: Header, Items table, Resumen.
- Items table has **one row per billed item**, including conformes. Row count = `num_conformes + num_glosas`.
- Every glosa row has non-empty `Causal`, `Codigo Glosa` (regex `^[1-6]\.\d{2}$`), `Motivo`, `Evidencia requerida`.
- Every conforme row has `V. Glosado = 0` and `V. Conforme = V. Facturado`.
- Money cells use `number_format='"$"#,##0'` (numeric, not string).
- Column sums match `case_summary`: `Σ V. Facturado == total_facturado`, `Σ V. Glosado == total_objetado`, `Σ V. Conforme == total_a_pagar`, all within 1 COP.
- Codigo Glosa prefix matches causal mapping.
- Filename pattern: `auditoria_{num_factura}.v{N}.xlsx`.
- When `EMIT_SIGNED_PDF=1`: PDF opens and contains the 6 mandatory sections (header, parties, invoice, summary, findings, right of response + signature).
- Document contains "Res. 3047/2008 Art. 6" and the "15 dias habiles" deadline.
- Case status is `claim_denial_draft` (not `claim_denial_sent` — that is skill 9).

## References

- Resolución 3047/2008 Arts. 5-6 — glosas and right of response.
- Typst docs (https://typst.app/docs).
- Issue [arkangelai/audit-workflow#49](https://github.com/arkangelai/audit-workflow/issues/49).
