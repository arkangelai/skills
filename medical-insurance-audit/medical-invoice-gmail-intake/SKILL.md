---
name: medical-invoice-gmail-intake
description: Watches a Gmail inbox with `gogcli`, classifies emails as medical invoices, downloads attachments (DIAN invoice XML, RIPS, clinical history, epicrisis, authorization, supporting documents), extracts invoice metadata, and generates metadata_input.json with a RAD number. Use it when the user wants to automatically process medical invoices sent by IPS via email, configure the pipeline's initial watcher, or debug cases that landed on `medical-invoice/error`.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, gmail, intake, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: GOGCLI_CREDENTIALS_PATH
    prompt: Path to the gogcli OAuth credentials
    help: Generate with `gogcli auth init` using a Google account with access to the receiving inbox
    required_for: full functionality
  - name: GMAIL_WATCH_LABEL
    prompt: Gmail label to watch (e.g. INBOX or a specific one like "radicacion")
    help: For shared inboxes, prefer a dedicated label over INBOX
    required_for: full functionality
---

# medical-invoice-gmail-intake

First skill in the medical-invoice audit pipeline. It listens on Gmail, decides whether an email is a medical invoice, downloads the full document package, extracts metadata, and generates `metadata_input.json` with a RAD (filing) number assigned.

The assumption: each IPS sends its invoice as a Gmail thread with a DIAN XML invoice, RIPS, clinical history, epicrisis, authorization, and supporting files. The skill automates reception and case creation so the downstream auditors (admin, medical, financial) work on an already-structured case.

## When to Use

- The user asks to **start/configure the Gmail watcher** for the audit pipeline.
- A new email arrives in Gmail with a medical-invoice pattern (subject containing "factura", "cuenta médica", "radicación", "RIPS"; IPS sender; typical attachments) and must be processed.
- A case ended up with label `medical-invoice/error` and needs to be **reprocessed manually**.
- The user asks "how does a message from IPS get filed?" or "is invoice X coming through?".

**Do not use:** if the email has no attachments (not a medical invoice); if it already has label `medical-invoice/intake` (avoid double processing); if a `metadata_input.json` already exists in the working directory for the same `invoice_cuv`.

## Input Contract

The trigger is a Gmail message event (push notification or polling result). No structured JSON input is required by the caller. The skill reads directly from Gmail using `gogcli`.

```
Trigger: Gmail message arrival on label $GMAIL_WATCH_LABEL
         OR explicit call with a specific message_id for reprocessing
```

## Output Contract

On success, the skill generates `metadata_input.json` for downstream audit skills. The `metadata_input.json` template in this skill's directory defines the schema — this skill always creates the file from scratch:

**Schema:** `metadata_input.json` in this skill's directory — 8 fields, all initially `null`, filled by this skill.

| Field | Type | Description |
|---|---|---|
| `caso_id` | string | `RAD-YYYYMMDD-{num_factura_normalizado}` |
| `fecha_radicacion` | ISO datetime | Filing timestamp in `America/Bogota` |
| `num_factura` | string | Invoice number from DIAN XML |
| `prestador_nit` | string | IPS tax ID |
| `prestador_nombre` | string | IPS legal name |
| `pagador_nit` | string | EPS tax ID |
| `pagador_nombre` | string | EPS legal name |
| `documentos` | string[] | Relative paths of received files (only files actually present) |

The skill also returns the envelope:

```json
{
  "caso_id": "RAD-YYYYMMDD-{num_factura}",
  "rad": "YYYYMMDD-NNNN",
  "message_id": "<gmail-message-id>",
  "label_aplicado": "medical-invoice/intake",
  "archivos_radicados": [
    { "name": "factura.pdf", "doc_type": "invoice_xml | rips | clinical_history | epicrisis | authorization | other", "sha256": "<hex>" }
  ],
  "metadatos": { /* filled metadata_input.json */ }
}
```

`factura.pdf` is always required. `rips.csv` and `epicrisis.pdf` are required based on service type (see `input.md` in this directory for the full document requirements by service type). Optional files not present are simply omitted from `documentos`.

On non-invoice emails: returns `{ "label_aplicado": "medical-invoice/not-applicable" }` and stops.
On validation failure: returns `{ "label_aplicado": "medical-invoice/error", "motivo": "<string>" }` and stops.

## Procedure

1. **Verify tools and credentials.**
   ```bash
   gogcli --version
   test -f "$GOGCLI_CREDENTIALS_PATH" || { echo "Missing gogcli creds"; exit 1; }
   ```

2. **Start the watcher (or process a specific message).**
   - Real-time push watcher:
     ```bash
     gogcli watch start --label "$GMAIL_WATCH_LABEL" --topic medical-invoice-intake
     ```
   - Polling (fallback): list unprocessed messages.
     ```bash
     gogcli messages list \
       --label "$GMAIL_WATCH_LABEL" \
       --query "-label:medical-invoice/intake -label:medical-invoice/not-applicable -label:medical-invoice/error has:attachment"
     ```
   - Process a specific `message_id` (reprocessing):
     ```bash
     gogcli messages get "$MESSAGE_ID" --format full
     ```

3. **Classify the email (is it a medical invoice?).**

   Positive signals (at least 2 must match):
   - Subject contains: `factura`, `cuenta médica`, `radicación`, `glosa respuesta`, `RIPS`, an invoice number, or a RAD.
   - Sender domain matches a known IPS.
   - At least 2 attachments, one of which is:
     - a DIAN XML (namespace `urn:oasis:names:specification:ubl:...`),
     - `rips.json` / `rips.zip` / flat files `US.txt`+`AF.txt`,
     - a PDF whose text mentions "historia clínica" or "epicrisis".

   If it **does not** match → apply label `medical-invoice/not-applicable` and **stop**.
   ```bash
   gogcli messages modify "$MESSAGE_ID" --add-label medical-invoice/not-applicable
   ```

   If it **does** match → continue.

4. **Download attachments to a working directory.**
   ```bash
   WORK_DIR="/tmp/intake/$MESSAGE_ID"
   mkdir -p "$WORK_DIR"
   gogcli messages attachments download "$MESSAGE_ID" --out "$WORK_DIR"
   ```
   Inventory the downloaded files and normalize names (no spaces, lowercase).

5. **Extract invoice metadata from the DIAN XML.**
   Required fields:
   - `ips_nit` — from `<cbc:AccountingSupplierParty/cac:PartyTaxScheme/cbc:CompanyID>`
   - `ips_razon_social` — from `<cbc:RegistrationName>`
   - `invoice_number` — `<cbc:ID>`
   - `invoice_cuv` — CUV/CUFE in `<ext:UBLExtension>` (validate against DIAN)
   - `issue_date` — `<cbc:IssueDate>`
   - `service_date` — from the RIPS (date of service)
   - `total_amount` — `<cac:LegalMonetaryTotal/cbc:PayableAmount>`
   - `patient_document` — from RIPS file `US.txt` (document type + number)
   - `patient_name` — `US.txt`
   - `cups_principales[]` — first CUPS codes from `AC.txt`/`AP.txt`
   - `diagnostico_principal` — main CIE-10 from `AC.txt`

   Pitfall: plain RIPS files use ISO-8859-1, **not UTF-8**. Convert before parsing:
   ```bash
   iconv -f ISO-8859-1 -t UTF-8 US.txt > US.utf8.txt
   ```

6. **Validate minimums before filing.**
   Block if any of these are missing:
   - XML invoice with CUV.
   - At least one RIPS file (`US.txt` + `AF.txt`, or `rips.json`).
   - At least one PDF containing a clinical history or epicrisis.

   If invalid → apply label `medical-invoice/error`, reply on the thread listing the missing documents, **do not file**.

7. **Generate metadata_input.json.**

   Using the `metadata_input.json` schema template in this skill's directory, generate the file from scratch:
   - Fill all 8 fields from the extracted metadata.
   - Set `documentos[]` to the relative paths of the downloaded attachments in the working directory.
   - Assign `caso_id = "RAD-YYYYMMDD-{num_factura_normalizado}"`.
   - Assign `rad` in format `YYYYMMDD-NNNN` (sequential counter per day).
   - Write to `metadata_input.json` in the working directory.

8. **Label the email and reply with an ACK.**
   ```bash
   gogcli messages modify "$MESSAGE_ID" \
     --add-label medical-invoice/intake \
     --add-label "medical-invoice/rad-$RAD"

   gogcli messages reply "$MESSAGE_ID" --body "ACK — Case filed with RAD $RAD. case_id: $CASE_ID."
   ```

9. **Return the output payload.**
   ```json
   {
     "case_id": "...",
     "rad": "YYYYMMDD-NNNN",
     "message_id": "...",
     "label_aplicado": "medical-invoice/intake",
     "archivos_radicados": [
       { "name": "factura.xml", "doc_type": "invoice_xml", "sha256": "..." },
       { "name": "rips.json", "doc_type": "rips", "sha256": "..." }
     ],
     "metadatos": { "ips_nit": "...", "invoice_number": "...", "total_amount": 0 }
   }
   ```

## Pitfalls

- **Symptom:** attachments arrive as password-protected `.zip`. **Cause:** the IPS protects the package with a password shared in the email body. **Fix:** extract the password from the body with regex (`contraseña:\s*(\S+)`) and unzip with `7z x -p"$PWD_FROM_BODY"`.
- **Symptom:** the same email is processed twice. **Cause:** the watcher redelivers the event before the label is applied. **Fix:** before generating, check whether a `metadata_input.json` already exists in the working directory with the same `invoice_cuv` — if so, just apply the Gmail label and exit.
- **Symptom:** XML parsing fails with "invalid encoding". **Cause:** the IPS generated the XML declaring `UTF-8` but with ISO-8859-1 bytes. **Fix:** detect with `file -i` and re-encode before parsing.
- **Symptom:** `total_amount` differs between XML and the RIPS sum. **Cause:** the IPS included copays in the XML but not in RIPS (or vice versa). **Fix:** do NOT fix it here — pass both values to the case and let `financial-auditor` resolve it.
- **Symptom:** `gogcli` fails with `invalid_grant`. **Cause:** the OAuth token expired. **Fix:** `gogcli auth refresh` or regenerate with `gogcli auth init`.
- **Symptom:** the invoice number has leading zeros in the XML but not in RIPS. **Cause:** the IPS pads inconsistently. **Fix:** when filing, store both (`invoice_number_raw`, `invoice_number_normalized` without padding) and use the normalized one for uniqueness.

## Verification

- After running the skill, the email has exactly **one** of the labels `medical-invoice/{intake|not-applicable|error}`.
- `metadata_input.json` exists in the working directory with all 8 fields populated.
- The Gmail thread has an ACK reply with the RAD.
- No `metadata_input.json` exists already for the same `invoice_cuv` in the working directory (uniqueness).
- Each attachment's `sha256` in the output matches the locally saved file.

## References

- [Resolución 1536/2022](https://www.minsalud.gov.co/) — RIPS structure.
- [DIAN — Factura electrónica UBL 2.1](https://www.dian.gov.co/impuestos/factura-electronica/) — XML schema.
- `gogcli` — internal Arkangel CLI for Gmail (see `#ai-tooling` on Slack).
- Issue [arkangelai/audit-workflow#73](https://github.com/arkangelai/audit-workflow/issues/73).
