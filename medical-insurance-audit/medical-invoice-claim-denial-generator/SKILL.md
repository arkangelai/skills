---
name: medical-invoice-claim-denial-generator
description: Produces the formal PDF of a Colombian medical invoice glosa (claim denial) from the consolidated audit output, with institutional header, executive summary, per-causal (Anexo 6, Res. 3047) findings table, legal and clinical justification, evidence cited by file and page, and a legal footer with the 15 business-day response deadline. Supports incremental versions (v1, v2, ...) when fix-review requests changes. Use it when the case is consolidated (label `auto-denial` or post human-review) and needs the formal document that will be sent to the IPS.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, pdf, glosa, claim-denial, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: DEST_SOFTWARE_BASE_URL
    prompt: Base URL of the destination software
    required_for: full functionality
  - name: DEST_SOFTWARE_API_KEY
    prompt: API key / bearer token
    required_for: full functionality
---

# medical-invoice-claim-denial-generator

Generates the formal glosa (claim denial) PDF, ready to be sent to the IPS. Supports **versioning** — the first run produces `v1`, later edits driven by `fix-review` produce `v2`, `v3`, without overwriting earlier versions.

The question it answers: **how do I turn the consolidated output into a legal, traceable, professional document that the IPS can answer within 15 business days?**

## When to Use

- The case is labeled `auto-denial` and the initial glosa must be produced.
- `fix-review` applied changes and asks to regenerate the PDF (`v2`, `v3`, ...).
- The user asks "draft the glosa for case {RAD}" or "regenerate the glosa with the auditor's edits".

**Do not use:** if the case has no `consolidated_findings` published; if the current label is `auto-approve` (no glosa needed).

## Input Contract

The skill reads the canonical `output.json` produced by `medical-invoice-consolidator-audit`:

```json
{
  "caso_id": "RAD-YYYYMMDD-{num_factura}",
  "factura": {
    "num_factura": "<string>",
    "prestador": "<string>",
    "prestador_nit": "<string>",
    "paciente_nombre": "<string>",
    "paciente_documento": "<tipo> <numero>",
    "fecha_atencion": "YYYY-MM-DD",
    "fecha_factura": "YYYY-MM-DD",
    "diagnostico_principal": "<CIE-10> - <descripcion>",
    "plan_afiliado": "ORO | PLATA | BASICO",
    "total_facturado": 0
  },
  "hallazgos": [ /* items with hallazgo = glosa | devolucion */ ],
  "resumen": {
    "total_facturado": 0,
    "total_aprobado": 0,
    "total_glosado": 0,
    "concepto_final": "NO_APTA | DEVOLUCION",
    "accion_requerida": "...",
    "resumen_ejecutivo": "..."
  }
}
```

Pre-flight check: abort with clear error if `resumen.concepto_final = APTA` (no glosa to generate) or if `hallazgos` contains zero items with `hallazgo = glosa | devolucion`.

## Output Contract

The skill uploads the PDF to the destination software and returns:

```json
{
  "document_id": "<uuid>",
  "version": "v1 | v2 | ...",
  "pdf_url": "https://.../cases/{caso_id}/documents/{doc_id}/content",
  "caso_id": "RAD-YYYYMMDD-{num_factura}",
  "estado_caso": "claim_denial_draft",
  "findings_count": 0,
  "total_objetado": 0
}
```

**PDF mandatory sections** (the rendered document must contain all six):
1. **Header** — EPS logo, "GLOSA FORMAL Res. 3047/2008 Art. 5", notification date, RAD, version.
2. **Parties** — IPS (legal name + NIT + email) and EPS identification.
3. **Disputed invoice** — `num_factura`, CUV, `fecha_atencion`, `fecha_factura`, patient, `total_facturado`.
4. **Executive summary** — table with `total_facturado`, `total_objetado`, `total_aprobado`; causales applied with item counts.
5. **Detailed findings** — one block per `hallazgo` item where `hallazgo ∈ {glosa, devolucion}`, including: `causal_num`, `causal_nombre`, `valor_objetado`, legal justification (Res. 3047 Anexo 6 reference), clinical/technical justification, and `evidencia` verbatim.
6. **Right of response + signature** — "15 días hábiles (Art. 6 Res. 3047/2008)" deadline.

**Versioning invariant:** each call creates a new version (`v{n+1}`). Never overwrite. The destination software must keep all versions in `documents[]`.

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

3. **Load the generic template.** Use the generic Res. 3047-compliant template with the required structure:

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

4. **Render the PDF.**
   Recommended stack (in order of preference):
   - **Typst** — `typst compile template.typ output.pdf` (fast, professional typography).
   - **WeasyPrint** — HTML + CSS → PDF (good CSS control).
   - **wkhtmltopdf** (fallback).

   Inject dynamic data from the consolidated output. Colombian number formatting: thousands with `.`, decimals with `,` (`$8.500.000`) — switch locale accordingly.

5. **Save on the case with versioning.**
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/documents
   Content-Type: multipart/form-data

   file=claim_denial.v2.pdf
   tipo=claim_denial
   version=v2
   metadata={"findings_count": 5, "total_objetado": 3200000, "generated_at": "..."}
   ```
   **Do not overwrite earlier versions** — the destination software must keep history.

6. **Update the case status.**
   ```
   PATCH {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
   { "status": "claim_denial_draft", "latest_claim_denial_version": "v2" }
   ```

7. **Return the reference.**
   ```json
   {
     "document_id": "...",
     "version": "v2",
     "pdf_url": "https://.../cases/{id}/documents/{doc_id}/content",
     "case_id": "...",
     "estado_caso": "claim_denial_draft",
     "findings_count": 5,
     "total_objetado": 3200000
   }
   ```

## Pitfalls

- **Symptom:** PDF does not render accents/ñ. **Cause:** font without Unicode coverage or template encoding. **Fix:** use a Latin-covering font (Inter, Noto Sans) and set `encoding=utf-8` in the template.
- **Symptom:** `v1` overwritten when generating `v2`. **Cause:** hardcoded filename. **Fix:** filename must include version: `claim_denial.{version}.pdf`, and the software must accept the `version` parameter without replacing the existing record.
- **Symptom:** evidence truncated in the table. **Cause:** cells with long text and no wrap. **Fix:** set `word-break: break-word` / `break-anywhere: true` for evidence cells.
- **Symptom:** totals mismatch (`total_objetado > invoice_total`). **Cause:** findings with the same invoice_item summed multiple times. **Fix:** this skill does NOT sum — use `case_summary.total_objetado` directly from the consolidator.
- **Symptom:** a glosa was generated even though the zone is green. **Cause:** the skill ran without checking labels. **Fix:** first step: `GET /cases/{id}/labels` — abort if `auto-approve` is present.
- **Symptom:** the IPS claims the PDF is legally invalid. **Cause:** missing explicit citation to Res. 3047 in the footer and per causal. **Fix:** template must hardcode legal references, not leave them optional.
- **Symptom:** `v2` regeneration does not reflect fix-review changes. **Cause:** skill read a stale consolidated (cached). **Fix:** always re-fetch `GET /cases/{id}/consolidated` at start; never trust in-memory state.

## Verification

- `GET /cases/{case_id}/documents?tipo=claim_denial` lists the new version without deleting previous ones.
- The PDF opens and contains the 6 mandatory sections (header, parties, invoice, summary, findings, right of response + signature).
- Every finding in the PDF shows `causal`, `valor_objetado`, `evidencia`, `rule_ids`, `confianza`.
- PDF totals match `case_summary` exactly (to the cent).
- The PDF contains "Res. 3047/2008 Art. 6" and the "15 business days" deadline.
- Case status is `claim_denial_draft` (not `claim_denial_sent` — that is skill 9).

## References

- Resolución 3047/2008 Arts. 5-6 — glosas and right of response.
- Typst docs (https://typst.app/docs).
- Issue [arkangelai/audit-workflow#49](https://github.com/arkangelai/audit-workflow/issues/49).
