---
name: medical-invoice-gmail-intake
description: Watches a Gmail inbox with `gogcli`, classifies emails as medical invoices, downloads attachments (DIAN invoice XML, RIPS, clinical history, epicrisis, authorization, supporting documents), extracts invoice metadata, and files the case in the destination software with a RAD number. Use it when the user wants to automatically process medical invoices sent by IPS via email, configure the pipeline's initial watcher, or debug cases that landed on `medical-invoice/error`.
version: 1.1.0
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
  - name: DEST_SOFTWARE_BASE_URL
    prompt: Base URL of the destination software where cases are filed
    help: Placeholder until the final software is chosen
    required_for: full functionality
  - name: DEST_SOFTWARE_API_KEY
    prompt: API key or bearer token for the destination software
    help: Ask infrastructure
    required_for: full functionality
---

# medical-invoice-gmail-intake

First skill in the medical-invoice audit pipeline. It listens on Gmail, decides whether an email is a medical invoice, downloads the full document package, extracts metadata, and opens a case in the destination software with a RAD (filing) number assigned.

The assumption: each IPS sends its invoice as a Gmail thread with a DIAN XML invoice, RIPS, clinical history, epicrisis, authorization, and supporting files. The skill automates reception and case creation so the downstream auditors (admin, medical, financial) work on an already-structured case.

## When to Use

- The user asks to **start/configure the Gmail watcher** for the audit pipeline.
- A new email arrives in Gmail with a medical-invoice pattern (subject containing "factura", "cuenta médica", "radicación", "RIPS"; IPS sender; typical attachments) and must be processed.
- A case ended up with label `medical-invoice/error` and needs to be **reprocessed manually**.
- The user asks "how does a message from IPS get filed?" or "is invoice X coming through?".

**Do not use:** if the email has no attachments (not a medical invoice); if it already has label `medical-invoice/intake` (avoid double processing); if a case with the same invoice number already exists in the destination software.

## Input / Output Contract

**Input (one of):**
```json
{ "mode": "push",      "message_id": "18f...", "thread_id": "18f...", "label_id": "Label_23" }
{ "mode": "poll",      "label": "$GMAIL_WATCH_LABEL", "max": 50 }
{ "mode": "reprocess", "message_id": "18f..." }
```

**Output:**
```json
{
  "status": "filed | not_applicable | error | duplicate",
  "message_id": "18f...",
  "case_id": "c_abc123 | null",
  "rad": "20260414-0007 | null",
  "label_aplicado": "0. Recibida",
  "archivos_radicados": [
    { "name": "factura.xml",
      "doc_type": "invoice_xml | rips | clinical_history | epicrisis | authorization | supporting | other",
      "sha256_hex": "ab12...",
      "size_bytes": 12034 }
  ],
  "metadatos": { "ips_nit": "...", "invoice_number": "...", "invoice_cuv": "...", "total_amount": 0 },
  "errors": [ { "stage": "xml_parse | rips_parse | file_case | attach", "code": "MISSING_CUV", "detail": "..." } ],
  "duplicate_of_case_id": "c_xyz | null"
}
```

`sha256_hex` is the lowercase 64-char hex of SHA-256 over the raw attachment bytes as received from Gmail (pre-extraction for ZIPs; post-extraction for ZIP members).

## Label State Machine

This skill applies **only** the entry-state labels. Downstream stages own their labels. A failed pipeline must NOT advance the label.

```
(none) -> [0. Recibida]      (terminal for this skill, when filed)
       -> [not-applicable]   (terminal)
       -> [error]            (reprocessable)

           |
           v  (downstream)
       [1. Auditando] -> [2. Auditada] -> [3. Glosada] -> [4. Notificada]
```

Invariants:
- This skill applies at most ONE of `{0. Recibida, not-applicable, error}`.
- Never apply a downstream label (`1. Auditando`, etc.) from this skill.
- Never regress state on downstream failure (a failed audit stays at `1. Auditando`, never reverts to `0. Recibida`).

## Procedure

1. **Verify tools and credentials.**
   ```bash
   gogcli --version
   test -f "$GOGCLI_CREDENTIALS_PATH" || { echo "Missing gogcli creds"; exit 1; }
   test -n "$DEST_SOFTWARE_API_KEY" || { echo "Missing API key"; exit 1; }
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
   - Sender domain matches a known IPS (cross-check with `$REF_DATA_PATH/contratos_ips.json`).
   - At least 2 attachments, one of which is:
     - a DIAN XML (namespace `urn:oasis:names:specification:ubl:...`),
     - `rips.json` / `rips.zip` / flat files `US.txt`+`AF.txt`,
     - a PDF whose text mentions "historia clínica" or "epicrisis".

   If it **does not** match → apply label `medical-invoice/not-applicable` and **stop**.
   ```bash
   gogcli messages modify "$MESSAGE_ID" --add-label medical-invoice/not-applicable
   ```

   If it **does** match → continue.

3.5. **Idempotency pre-check (cheap, before any parsing).** Look up `message_id` in `processed_ids.json` (local ledger). If present, skip and return `status="duplicate"` without re-fetching attachments. The CUV-based check in step 7 stays as second line of defense (catches re-sends with new message_id but same factura).

   ```bash
   if jq -e --arg mid "$MESSAGE_ID" '.[] | select(. == $mid)' processed_ids.json > /dev/null; then
     echo "duplicate"; exit 0
   fi
   ```

4. **Download attachments to a working directory and classify.**
   ```bash
   WORK_DIR="/tmp/intake/$MESSAGE_ID"
   mkdir -p "$WORK_DIR"
   gogcli messages attachments download "$MESSAGE_ID" --out "$WORK_DIR"
   ```

   **ZIP handling.** Extract recursively (depth cap 2 for nested zips). Use 7z with optional password from body regex `contraseña:\s*(\S+)`. Skip `.eml` files (treat outer zip as `supporting`). Normalize filenames with Unicode NFD + strip combining chars (handles `factura ñ.xml`).

   **Attachment classification (first-match-wins):**

   | Rule | doc_type |
   |---|---|
   | filename matches `/factura.*\.xml$/i` or contains UBL namespace | `invoice_xml` |
   | filename matches `/rips.*\.(json|zip)$/i` or contains `US.txt|AF.txt|AC.txt|AP.txt` | `rips` |
   | PDF first-page text contains `epicrisis|resumen de atencion|resumen de hospitalizacion` | `epicrisis` |
   | PDF first-page text contains `historia clinica|evolucion medica|nota de ingreso` | `clinical_history` |
   | PDF first-page text contains `autorizacion|MIPRES|pertinencia` | `authorization` |
   | filename matches `/soporte|orden|evidencia/i` | `supporting` |
   | else | `other` |

   Record which rule fired in the audit log.

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

7. **File the case in the destination software.**

   Expected endpoint (document exact contract once the software is chosen):
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases
   Authorization: Bearer {DEST_SOFTWARE_API_KEY}
   Content-Type: application/json

   {
     "ips_nit": "...",
     "ips_razon_social": "...",
     "invoice_number": "...",
     "invoice_cuv": "...",
     "issue_date": "YYYY-MM-DD",
     "service_date": "YYYY-MM-DD",
     "total_amount": 0,
     "patient_document": "...",
     "patient_name": "...",
     "cups_principales": [...],
     "diagnostico_principal": "...",
     "source": { "channel": "gmail", "message_id": "..." }
   }
   ```

   The software returns `case_id` and `rad` (suggested format: `YYYYMMDD-NNNN`).

   Then upload each attachment:
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/attachments
   (multipart/form-data: file, doc_type=invoice_xml|rips|clinical_history|epicrisis|authorization|other)
   ```

8. **Write to ledger BEFORE labeling, then label and reply.**

   The order matters: ledger first prevents reprocess on watcher restart mid-batch. Labeling LAST means partial failures stay re-processable.

   ```bash
   # 1. Append to ledger first
   jq --arg mid "$MESSAGE_ID" '. += [$mid]' processed_ids.json > processed_ids.json.new && mv processed_ids.json.new processed_ids.json

   # 2. Apply state label (only after ALL API calls succeeded above)
   gogcli messages modify "$MESSAGE_ID" \
     --add-label "0. Recibida" \
     --add-label "rad-$RAD"

   # 3. ACK reply (best-effort -- failure here does NOT roll back state)
   gogcli messages reply "$MESSAGE_ID" --body "ACK — Caso filtrado con RAD $RAD. case_id: $CASE_ID." || echo "ACK reply failed; continuing"
   ```

   On startup, reconcile `processed_ids.json` against Gmail labels to catch ledger-without-label or label-without-ledger inconsistencies.

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
- **Symptom:** the same email is processed twice (duplicate case in destination software). **Cause:** the watcher redelivers the event before the label is applied. **Fix:** before filing, query `GET /cases?invoice_cuv={cuv}` — if it exists, just apply the label and exit.
- **Symptom:** XML parsing fails with "invalid encoding". **Cause:** the IPS generated the XML declaring `UTF-8` but with ISO-8859-1 bytes. **Fix:** detect with `file -i` and re-encode before parsing.
- **Symptom:** `total_amount` differs between XML and the RIPS sum. **Cause:** the IPS included copays in the XML but not in RIPS (or vice versa). **Fix:** do NOT fix it here — pass both values to the case and let `financial-auditor` resolve it.
- **Symptom:** `gogcli` fails with `invalid_grant`. **Cause:** the OAuth token expired. **Fix:** `gogcli auth refresh` or regenerate with `gogcli auth init`.
- **Symptom:** the invoice number has leading zeros in the XML but not in RIPS. **Cause:** the IPS pads inconsistently. **Fix:** when filing, store both (`invoice_number_raw`, `invoice_number_normalized` without padding) and use the normalized one for uniqueness.
- **Symptom:** same `message_id` processed twice on watcher restart mid-batch. **Cause:** ledger written after labeling. **Fix:** ledger write BEFORE labeling; reconcile against Gmail labels on startup.
- **Symptom:** email has `0. Recibida` label but no case exists in the destination software. **Cause:** label applied before case creation succeeded. **Fix:** labeling is the LAST step, strictly after all REST API calls succeed.
- **Symptom:** ZIP contains an `.eml` file -- treated as recursable archive. **Fix:** do not recurse into `.eml`; classify outer zip as `supporting`.
- **Symptom:** two emails with same `invoice_number` but different CUV (nota credito + re-emision). **Cause:** uniqueness keyed on invoice_number alone. **Fix:** uniqueness is on CUV, not invoice_number; link via `related_case_id`.
- **Symptom:** non-ASCII filenames (`factura ñ.xml`). **Fix:** Unicode NFD + strip combining chars before saving to disk.
- **Symptom:** reply on prior thread (`In-Reply-To` present) misclassified as new factura. **Fix:** if email references a `processed_ids.json` entry, route to `fix-review`, not intake.
- **Symptom:** watcher fires before Gmail finishes uploading attachments (count < what body claims). **Fix:** if attachment count < count in body "adjunto X archivos", re-fetch after 30s.
- **Symptom:** failed downstream stage (e.g. crashed audit) sets the email to `error`, but a sweeper later interprets `error` as "intake error" and re-files. **Fix:** documented invariant -- intake never sets `error` from a downstream failure; downstream owns its own labels. A separate sweeper re-enqueues stale `1. Auditando` cases > 30min.
- **Symptom:** `gogcli` returns `invalid_grant` mid-poll (token expired). **Fix:** stop watcher, emit `AUTH_EXPIRED`, do NOT mark in-flight messages as `error`. Surface visibly (dashboard banner / Slack / stderr). Silent failure is the worst outcome.
- **Symptom:** `gogcli` returns 5xx intermittently. **Fix:** exponential backoff (1/2/4/8s, 4 attempts), do NOT label during retry.
- **Symptom:** label-name collision (manual label has different id than `gogcli`-created). **Fix:** resolve by name at startup, cache id, assert uniqueness or fail fast with `ambiguous_label`.

## Verification

- After running the skill, the email has exactly **one** of the labels `{0. Recibida, not-applicable, error}`.
- If filed: `GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}` returns the case with all mandatory fields populated and every attachment in `attachments[]`.
- `processed_ids.json` contains `message_id` (no duplicates).
- The Gmail thread has an ACK reply with the RAD (or a logged ACK-failure if the reply API failed).
- `status="error"` -> Gmail thread has a reply listing the missing minimums.
- `status="duplicate"` -> `duplicate_of_case_id` populated, no new case created.
- No other case exists in the software with the same `invoice_cuv` (uniqueness).
- Each attachment's `sha256_hex` in the output matches the file uploaded to the software.
- No email has both `0. Recibida` and `error` simultaneously.

## References

- [Resolución 1536/2022](https://www.minsalud.gov.co/) — RIPS structure.
- [DIAN — Factura electrónica UBL 2.1](https://www.dian.gov.co/impuestos/factura-electronica/) — XML schema.
- `gogcli` — internal Arkangel CLI for Gmail (see `#ai-tooling` on Slack).
- Issue [arkangelai/audit-workflow#73](https://github.com/arkangelai/audit-workflow/issues/73).
