---
name: medical-invoice-gmail-intake
description: Watches a Gmail inbox with `gogcli`, classifies emails as medical invoices, downloads attachments, extracts as much metadata as possible from available sources (DIAN XML, RIPS, PDFs, email envelope), and creates a case task with the metadata as context and attachments as input files. Use it when the user wants to automatically process medical invoices sent by IPS via email, configure the pipeline's initial watcher, or debug cases that landed on `medical-invoice/error`.
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

First skill in the medical-invoice audit pipeline. It listens on Gmail, decides whether an email is a medical invoice, downloads all attachments, and extracts as much metadata as possible from whatever sources are present — DIAN XML, RIPS files, PDF text, and the email envelope — in that priority order. Fields that cannot be extracted from any source are left null and do not block intake.

Once metadata is assembled, the skill creates a case task via the task assignment tool, setting the extracted metadata as task context and uploading the downloaded attachment files as task input files. This enqueues the case for the parallel audit phase without requiring any specific document combination.

## When to Use

- The user asks to **start/configure the Gmail watcher** for the audit pipeline.
- A new email arrives in Gmail with a medical-invoice pattern (subject containing "factura", "cuenta médica", "radicación", "RIPS"; IPS sender; typical attachments) and must be processed.
- A case ended up with label `medical-invoice/error` and needs to be **reprocessed manually**.
- The user asks "how does a message from IPS get filed?" or "is invoice X coming through?".

**Do not use:** if the email has no attachments (not a medical invoice); if it already has label `medical-invoice/intake` (avoid double processing); if a task already exists in the task assignment tool for the same `invoice_cuv`.

## Templates / Examples

See `references/` for example schemas:
- `references/input_template.md` — markdown describing the task input shape.
- `references/metadata_input_template.json` — example of the metadata payload produced for the next pipeline step.

## Input Contract

The trigger is a Gmail message event (push notification or polling result). No structured JSON input is required by the caller. The skill reads directly from Gmail using `gogcli`.

```
Trigger: Gmail message arrival on label $GMAIL_WATCH_LABEL
         OR explicit call with a specific message_id for reprocessing
```

## Output Contract

On success, the skill creates a case task via the task assignment tool. The task carries:

- **Context** — the extracted metadata object (8-field schema below). Fields that could not be extracted from any source are `null`; this is acceptable and does not block intake.
- **Input files** — every attachment downloaded from the Gmail thread, uploaded to the task so downstream audit skills can read them directly.

**Metadata schema** — extracted from whatever sources are available:

| Field | Type | Source (in priority order) | Nullable? |
|---|---|---|---|
| `caso_id` | string | `RAD-YYYYMMDD-{num_factura_normalizado}` | no |
| `fecha_radicacion` | ISO datetime | Filing timestamp in `America/Bogota` | no |
| `num_factura` | string | DIAN XML → PDF extraction → email envelope | yes |
| `prestador_nit` | string | DIAN XML → PDF extraction → sender domain | yes |
| `prestador_nombre` | string | DIAN XML → PDF extraction → sender domain | yes |
| `pagador_nit` | string | DIAN XML → PDF extraction → body text | yes |
| `pagador_nombre` | string | DIAN XML → PDF extraction → body text | yes |
| `documentos` | string[] | Names of all downloaded attachments | yes |
| `audit_perspective` | string | Always `"aseguradora"` — email intake is always triggered by the payer. For `"hospital"` (IPS self-audit before billing), create the task manually without using this skill. | no |

The skill returns the envelope:

```json
{
  "caso_id": "RAD-YYYYMMDD-{num_factura}",
  "rad": "YYYYMMDD-NNNN",
  "task_id": "<returned by task assignment tool>",
  "message_id": "<gmail-message-id>",
  "label_aplicado": "medical-invoice/intake",
  "archivos_radicados": [
    { "name": "factura.pdf", "doc_type": "invoice_xml | rips | clinical_history | epicrisis | authorization | other", "sha256": "<hex>" }
  ],
  "metadatos": { /* filled metadata object — null fields for unavailable sources */ }
}
```

No specific document combination is required. Files not present are simply absent from `documentos`.

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
   - At least 2 attachments, one of which is a PDF whose text mentions "historia clínica" or "epicrisis".

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

5. **Extract metadata from all available sources (best-effort, in priority order).**

   **Priority 1 — DIAN XML** (if a `.xml` file is present):
   - `ips_nit` — `<cbc:AccountingSupplierParty/cac:PartyTaxScheme/cbc:CompanyID>`
   - `ips_razon_social` — `<cbc:RegistrationName>`
   - `invoice_number` — `<cbc:ID>`
   - `invoice_cuv` — CUV/CUFE in `<ext:UBLExtension>`
   - `issue_date` — `<cbc:IssueDate>`
   - `total_amount` — `<cac:LegalMonetaryTotal/cbc:PayableAmount>`

   **Priority 2 — RIPS files** (if `US.txt` / `rips.json` present):
   - `patient_document`, `patient_name` — from `US.txt`
   - `service_date`, `cups_principales[]`, `diagnostico_principal` — from `AC.txt`/`AP.txt`
   - Pitfall: RIPS files use ISO-8859-1, not UTF-8. Convert before parsing with `iconv -f ISO-8859-1 -t UTF-8`.

   **Priority 3 — PDF text extraction** (for any PDF attachment):
   - Use `pdftotext` or equivalent to extract raw text.
   - Search for NIT patterns → `prestador_nit`, `num_factura`.
   - Search for patient name / document → `patient_*`.
   - Search for date patterns → `issue_date`, `service_date`.
   - Search for CUPS codes → `cups_principales[]`.

   **Priority 4 — Email envelope** (always available):
   - Sender address/domain → hint for `prestador_nombre`.
   - Subject line → keyword hints, possible invoice number.
   - Body text → NIT, amounts, dates via regex.
   - Attachment filenames → classify doc types for `documentos`.

   Fields not found in any source remain `null` — this is not an error.

6. **Validate minimums before filing.**
   Only block if:
   - The email has zero attachments **and** the body has no medical-invoice signals → apply `medical-invoice/not-applicable` and stop.
   - `caso_id` cannot be constructed because no invoice number was found from any source → apply `medical-invoice/error`, reply with explanation, and stop.

   Do **not** block on the absence of DIAN XML, RIPS, or any specific document type. File with whatever metadata is available.

7. **Create a task via the task assignment tool.**

   Assemble the metadata object and submit it to the task assignment tool available in the agent's environment (e.g. `ark tasks`). The submission must:
   - **Set the extracted metadata as task context** — the full metadata object is passed as structured context on the created task.
   - **Upload the downloaded Gmail attachment files as task input files** — every file in the temp working directory is attached to the task so downstream audit skills can access them directly.
   - Assign `caso_id = "RAD-YYYYMMDD-{num_factura_normalizado}"`.
   - Assign `rad` in format `YYYYMMDD-NNNN` (sequential counter per day).
   - Always set `audit_perspective = "aseguradora"` in the task context. Email-originated cases are always payer-initiated. To run a hospital self-audit (`audit_perspective = "hospital"`), create the task manually — do not use this intake skill.
   - Capture the `task_id` returned by the tool.
   - Clean up the temp folder after upload (or retain for debugging).

8. **Label the email and reply with an ACK.**
   ```bash
   gogcli messages modify "$MESSAGE_ID" \
     --add-label medical-invoice/intake \
     --add-label "medical-invoice/rad-$RAD"

   gogcli messages reply "$MESSAGE_ID" --body "ACK — Case filed with RAD $RAD. case_id: $CASE_ID. task_id: $TASK_ID."
   ```

9. **Return the output payload.**
   ```json
   {
     "case_id": "...",
     "rad": "YYYYMMDD-NNNN",
     "task_id": "<returned by task assignment tool>",
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
- **Symptom:** the same email is processed twice. **Cause:** the watcher redelivers the event before the label is applied. **Fix:** before creating a task, query the task assignment tool for an existing task with the same `invoice_cuv` — if found, just apply the Gmail label and exit.
- **Symptom:** XML parsing fails with "invalid encoding". **Cause:** the IPS generated the XML declaring `UTF-8` but with ISO-8859-1 bytes. **Fix:** detect with `file -i` and re-encode before parsing.
- **Symptom:** `total_amount` differs between XML and the RIPS sum. **Cause:** the IPS included copays in the XML but not in RIPS (or vice versa). **Fix:** do NOT fix it here — pass both values to the case and let `financial-auditor` resolve it.
- **Symptom:** `gogcli` fails with `invalid_grant`. **Cause:** the OAuth token expired. **Fix:** `gogcli auth refresh` or regenerate with `gogcli auth init`.
- **Symptom:** the invoice number has leading zeros in the XML but not in RIPS. **Cause:** the IPS pads inconsistently. **Fix:** when filing, store both (`invoice_number_raw`, `invoice_number_normalized` without padding) and use the normalized one for uniqueness.

## Verification

- After running the skill, the email has exactly **one** of the labels `medical-invoice/{intake|not-applicable|error}`.
- A task exists in the task assignment tool with the `caso_id` as identifier, the extracted metadata set as task context, and all downloaded attachments uploaded as task input files.
- Null metadata fields appear only for sources that were genuinely absent from the email.
- The Gmail thread has an ACK reply containing the RAD and the `task_id`.
- No duplicate task exists for the same `invoice_cuv` (uniqueness check via task tool).
- Each attachment's `sha256` in the output matches the uploaded file.

## References

- [Resolución 1536/2022](https://www.minsalud.gov.co/) — RIPS structure.
- [DIAN — Factura electrónica UBL 2.1](https://www.dian.gov.co/impuestos/factura-electronica/) — XML schema.
- `gogcli` — internal Arkangel CLI for Gmail (see `#ai-tooling` on Slack).
- Issue [arkangelai/audit-workflow#73](https://github.com/arkangelai/audit-workflow/issues/73).
