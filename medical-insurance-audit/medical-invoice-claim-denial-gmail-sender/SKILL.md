---
name: medical-invoice-claim-denial-gmail-sender
description: Sends the final glosa (claim denial) of a medical invoice to the IPS via Gmail using `gogcli`, with the formal PDF attached, an executive summary in the body, a reference to the 15 business-day response deadline (Res. 3047/2008 Art. 6), recipient resolved from the original filing email or from `contratos_ips.json`, and delivery confirmation (message_id) recorded in the destination software. Labels the case as `claim-denial-sent`. Use it once the case is `claim-denial-ready` and the final PDF is approved.
version: 1.1.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, gmail, glosa, claim-denial, sender, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: GOGCLI_CREDENTIALS_PATH
    prompt: Path to gogcli OAuth credentials
    help: The account needs gmail.send scope and, optionally, directory access
    required_for: full functionality
  - name: GMAIL_SENDER_ADDRESS
    prompt: Address the glosa is sent from (e.g. auditoria@{eps-domain}.com.co)
    required_for: full functionality
  - name: GMAIL_SENDER_DISPLAY_NAME
    prompt: RFC 5322 display name (e.g. "Auditoria Medica {EPS}")
    required_for: full functionality
  - name: EPS_NAME
    prompt: EPS short name to use in body and subject
    required_for: full functionality
  - name: DEST_SOFTWARE_BASE_URL
    prompt: Base URL of the destination software
    required_for: full functionality
  - name: DEST_SOFTWARE_API_KEY
    prompt: API key / bearer token
    required_for: full functionality
  - name: REF_DATA_PATH
    prompt: Folder with contratos_ips.json (fallback recipient resolution)
    required_for: full functionality
  - name: DRAFT_MODE
    prompt: Set to 1 to create a Gmail draft instead of sending immediately
    help: Useful for human-in-the-loop review before delivery
    required_for: optional
---

# medical-invoice-claim-denial-gmail-sender

Last skill of the pipeline. Takes the human-approved glosa (label `claim-denial-ready`) and sends it to the IPS via Gmail, preserving the original filing thread when possible, attaching the PDF, and recording delivery in the destination software.

The question it answers: **how do I formally deliver the glosa to the IPS with traceability and thread continuity?**

## When to Use

- The case has label `claim-denial-ready` and has not been sent.
- The user asks "send the glosa for case {RAD} to the IPS".
- Manual retry after a send failure (label `medical-invoice/send-failed`).

**Do not use:** if the case still has `needs-human-review` or `needs-fix-review` (not yet approved); if it already has `claim-denial-sent` (avoid duplicates, confirm with the user).

## Procedure

1. **Pre-flight checks.**
   ```bash
   gogcli --version
   test -n "$DEST_SOFTWARE_API_KEY" && test -n "$GMAIL_SENDER_ADDRESS" || exit 1
   ```

   Validate the case state:
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/labels
   ```
   - Must contain `claim-denial-ready`.
   - Must NOT contain `claim-denial-sent` (abort with a clear message if already sent).

2. **Fetch the latest audit document.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/documents?tipo=claim_denial
   ```
   Pick the highest version (e.g. `v3`). The XLSX is the **primary attachment** sent to the IPS; the signed PDF (if present) goes alongside as legal archive.
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/documents/{doc_id}/content
   ```
   Save as `/tmp/glosa/auditoria_{num_factura}.v{N}.xlsx` (and `.pdf` if `EMIT_SIGNED_PDF=1` was used by the generator).

3. **Resolve the IPS recipient.**

   `contratos_ips.json` schema (one record per IPS):
   ```json
   {
     "nit": "899999017-4",
     "razon_social": "Hospital San Jose",
     "aliases": ["HSJ", "San Jose Bogota"],
     "email_glosas": "facturacion@hospitalsanjose.com.co",
     "email_legal_cc": "juridica@hospitalsanjose.com.co",
     "city": "Bogota"
   }
   ```

   Resolution order:
   1. `email_glosas` from `contratos_ips.json` matched by `nit` (preferred -- this is the address that handles glosa notifications).
   2. `Reply-To` of the original filing email.
   3. `From` of the original filing email.
   4. Abort if none → label `medical-invoice/send-failed`, note requesting manual contact.

   Normalize razon_social before matching: lowercase, strip suffixes (`S.A.S.`, `S.A.`, `LTDA`), check `aliases` array.

   Add in **CC** (if configured):
   - `email_legal_cc` from `contratos_ips.json`.
   - EPS internal archive mailbox.

   Common Colombian IPS contacts (starter list -- override with your own `contratos_ips.json`):
   - Hospital San Jose → `facturacion@hospitalsanjose.com.co`
   - Clinica Las Americas → `cuentas@lasamericas.com.co`
   - Hospital Pablo Tobon Uribe → `facturacion@hptu.org.co`
   - Clinica Imbanaco → `cuentas@imbanaco.com.co`
   - Fundacion Santa Fe → `facturacion@fsfb.org.co`
   - Clinica Medellin → `facturacion@clinicamedellin.com`
   - Hospital Militar Central → `cuentas@hospitalmilitar.gov.co`
   - Hospital Universitario San Ignacio → `facturacion@husi.org.co`

4. **Compose the email.**

   **Subject (exact format):**
   ```
   Resultado de auditoria - Factura {num_factura}
   ```
   No bracket prefixes (`[GLOSA]`, `[AUDIT]`) -- they trigger spam filters at IPS providers. The factura number alone is enough for the IPS to route internally.

   **From header (RFC 5322):**
   ```
   From: {GMAIL_SENDER_DISPLAY_NAME} <{GMAIL_SENDER_ADDRESS}>
   ```
   Example: `Auditoria Medica EPS XYZ <auditoria@epsxyz.com.co>`. Plain `auditoria@epsxyz.com.co` reads as cold/automated; the display-name form is more institutional.

   **Body (plain text, brief, no specific amounts):**
   ```
   Estimados senores
   {ips_razon_social}

   Cordial saludo.

   Adjuntamos el resultado de la auditoria correspondiente a la factura {num_factura},
   donde se detalla el analisis por item realizado por nuestro equipo medico.

   En el documento encontraran:
   - Items conformes (procede el pago)
   - Items glosados con causal y observacion ({num_glosas} items)
   - Resumen financiero de la cuenta

   Quedamos atentos a su respuesta dentro de los plazos contractuales establecidos
   (15 dias habiles, Res. 3047/2008 Art. 6).

   Cordialmente,
   Direccion de Auditoria Medica
   {EPS_NAME}
   ```

   **No money amounts in the body.** All figures live in the XLSX. If the body says `$3,200,000` and the XLSX says `$3,150,000` (e.g. due to a regen between approve and send), the IPS can challenge legally on the inconsistency. Keep all numeric facts in one place.

   > The body stays in Spanish because the IPS is a Colombian provider -- legal language and habit require it. Internal prose stays in English.

   Include headers:
   - `In-Reply-To: {source.message_id}` (if it exists — keeps the original filing thread).
   - `References: {source.message_id}`.
   - `X-Case-Id: {case_id}`, `X-RAD: {rad}`, `X-Claim-Denial-Version: {version}` (internal correlation).

5. **Send (or draft) via `gogcli`.**

   **Send mode (default):**
   ```bash
   gogcli messages send \
     --from "$GMAIL_SENDER_DISPLAY_NAME <$GMAIL_SENDER_ADDRESS>" \
     --to "$IPS_EMAIL" \
     --cc "$IPS_CC" \
     --subject "Resultado de auditoria - Factura ${INV}" \
     --body-text body.txt \
     --attach "/tmp/glosa/auditoria_${INV}.${VERSION}.xlsx" \
     --attach-mime "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \
     --in-reply-to "$SOURCE_MESSAGE_ID" \
     --thread-id "$SOURCE_THREAD_ID" \
     --header "X-Case-Id: $CASE_ID" \
     --header "X-RAD: $RAD" \
     --header "X-Claim-Denial-Version: $VERSION"
   ```

   When the optional signed PDF exists, attach both: add `--attach "/tmp/glosa/auditoria_${INV}.${VERSION}.pdf"` with `--attach-mime "application/pdf"`.

   **Draft mode (`DRAFT_MODE=1`):** call `users.drafts.create` instead. Returns the draft URL. Do NOT label as `claim-denial-sent` -- a human still needs to send. Output: `{ "draft_id": "...", "draft_url": "https://mail.google.com/mail/u/0/#drafts/...", "status": "drafted" }`.

   **Fallback when `gogcli` is missing:** use `googleapiclient.discovery.build("gmail","v1")` directly with the same OAuth token. `messages.insert` is demo-only (puts a fake message into the inbox); production must use `messages.send`.

   Capture the response: `sent_message_id`, `thread_id`, `delivery_status`.

6. **Verify delivery.**
   - The Gmail API confirms `labelIds: ["SENT"]` on the message.
   - If the IPS provider returns a bounce (DSN), `gogcli` will detect it within minutes → apply error label + alert.

7. **Record in the destination software.**

   `notification_datetime` must be in `America/Bogota` timezone. UTC silently shifts a business day if sent late afternoon (`2026-04-15T22:00:00Z` = `2026-04-15T17:00:00-05:00` Bogota; in UTC it would log as 16-Apr and eat one of the IPS's 15 dias habiles).

   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/claim-denial-delivery
   {
     "sent_at": "2026-04-15T17:45:00-05:00",
     "sent_message_id": "...",
     "thread_id": "...",
     "recipient_to": "facturacion@hptu.org.co",
     "recipient_cc": [...],
     "claim_denial_version": "v3",
     "xlsx_document_id": "...",
     "pdf_document_id": "... (when present)",
     "channel": "gmail"
   }
   ```

   Apply labels (Spanish numbered scheme, on the **original filing thread**, not the sent copy):
   ```
   POST /cases/{id}/labels   { "name": "4. Notificada" }
   DELETE /cases/{id}/labels/3. Auditada
   DELETE /cases/{id}/labels/claim-denial-ready
   PATCH /cases/{id}         { "status": "claim_denial_sent", "notification_date": "2026-04-15", "notification_datetime": "2026-04-15T17:45:00-05:00" }
   ```

8. **Return the summary.**
   ```json
   {
     "case_id": "...",
     "rad": "...",
     "version_enviada": "v3",
     "sent_at": "2026-04-15T17:45:00Z",
     "sent_message_id": "...",
     "thread_id": "...",
     "recipient_to": "glosas@ipsabc.com",
     "status": "claim_denial_sent"
   }
   ```

## Pitfalls

- **Symptom:** the same glosa sent twice. **Cause:** retry without checking the `claim-denial-sent` label. **Fix:** first step is to verify that label and abort if present.
- **Symptom:** the IPS receives the glosa but does not tie it to the original filing. **Cause:** `In-Reply-To` / `thread-id` from the original thread not used. **Fix:** always read `source.message_id` from the case and pass it to `gogcli`.
- **Symptom:** bounce when sending. **Cause:** the original sender was accounting, not glosas. **Fix:** prefer `email_glosas` from `contratos_ips.json` over the original `From` when both exist.
- **Symptom:** PDF attachment arrives corrupted at the IPS. **Cause:** `gogcli` applied the wrong content-type. **Fix:** specify `--attach-mime application/pdf`.
- **Symptom:** subject with special characters renders as `=?UTF-8?Q?...`. **Cause:** missing RFC 2047 encoding. **Fix:** `gogcli` handles it; if not, escape before passing the argument.
- **Symptom:** older PDF version sent (`v2` when `v3` existed). **Cause:** step 2 ordered by `created_at` instead of numeric version. **Fix:** sort by `CAST(version LIKE 'v%' → INT(substr))` descending, not by timestamp.
- **Symptom:** Gmail thread loses its thread-id because the first email was to a different account. **Cause:** `thread_id` is account-scoped. **Fix:** if the filing email came to another address, drop `thread_id` and keep only `In-Reply-To`; Gmail will still try to group by subject + message-id chain.
- **Symptom:** inconsistent state after partial failure (XLSX sent, label not updated). **Cause:** error between step 5 and 7. **Fix:** if send succeeded but the software API failed, retry the update with backoff; do NOT resend the email.
- **Symptom:** body says total objetado $3.2M, attachment says $3.15M -- IPS challenges legally. **Cause:** body included specific amounts that diverged from the regenerated XLSX. **Fix:** body never quotes amounts. All figures live only in the attachment.
- **Symptom:** subject `[GLOSA] RAD ...` lands in IPS spam. **Cause:** bracket prefixes triggered Bayesian filters. **Fix:** subject is exactly `Resultado de auditoria - Factura {num_factura}` -- no brackets.
- **Symptom:** sender shows as the bare email only (no name), reads as automated. **Fix:** RFC 5322 display-name form: `Auditoria Medica {EPS_NAME} <{GMAIL_SENDER_ADDRESS}>`.
- **Symptom:** XLSX arrives with content-type `application/octet-stream`. **Cause:** missing `--attach-mime`. **Fix:** explicit `--attach-mime "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"`.
- **Symptom:** `notification_date` is one day earlier than the actual send. **Cause:** UTC time on a late-afternoon send. **Fix:** always store with `-05:00` offset (Bogota); compute the 15-dias-habiles deadline from local date.
- **Symptom:** v2 resend blocked because case has `claim-denial-sent` from v1. **Cause:** label-only check, ignored that document version advanced. **Fix:** abort only if `highest_sent_version >= highest_document_version`. v2 must be allowed to send when v1 is the only sent version and v2 was just generated.
- **Symptom:** label `4. Notificada` applied to the sent message instead of the original filing thread. **Cause:** label target wrong. **Fix:** labels go on the original filing message thread (so the IPS-side record is annotated). The sent message stays in `SENT` only.
- **Symptom:** bounce DSN -> retry sent to the same bad address. **Cause:** no bounce-aware fallback. **Fix:** on bounce, mark `email_glosas` invalid in `contratos_ips.json`, escalate to ops, do not auto-retry to the same address.
- **Symptom:** razon_social mismatch ("Hospital Pablo Tobon Uribe S.A." vs "Hospital Pablo Tobon Uribe"). **Fix:** normalize before lookup: lowercase, strip `S.A.S./S.A./LTDA`, check `aliases` array.

## Verification

- The case has label `4. Notificada` and not `claim-denial-ready` / `3. Auditada`.
- `GET /cases/{id}/claim-denial-delivery` returns the delivery with a non-empty `sent_message_id`.
- In Gmail, the message exists in `SENT` with correct `X-Case-Id`, `X-RAD`, `X-Claim-Denial-Version` headers.
- The `From` header is RFC 5322 display-name form (`Auditoria Medica {EPS_NAME} <{GMAIL_SENDER_ADDRESS}>`).
- Subject is exactly `Resultado de auditoria - Factura {num_factura}` (no bracket prefixes).
- Body contains no money amounts (numbers only in attachment).
- Primary attachment is XLSX with mime `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. PDF (when present) is secondary.
- The `thread_id` of the sent message matches the original filing email's (when applicable).
- The attachment in the sent message has the same `sha256` as the document in the destination software.
- `notification_datetime` is set on the case with `America/Bogota` offset (`-05:00`). This is the legal base for the 15 dias habiles deadline.
- In `DRAFT_MODE=1`: a draft exists in `users.drafts.list`, label is NOT `4. Notificada`, status is `drafted`.

## References

- Resolución 3047/2008 Art. 6 — formal glosa notification, 15 business days.
- RFC 5322 — In-Reply-To / References headers (threading).
- `gogcli` — internal Arkangel CLI for Gmail.
- Issue [arkangelai/audit-workflow#74](https://github.com/arkangelai/audit-workflow/issues/74).
