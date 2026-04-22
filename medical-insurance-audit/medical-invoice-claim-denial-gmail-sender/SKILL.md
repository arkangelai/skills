---
name: medical-invoice-claim-denial-gmail-sender
description: Sends the final glosa (claim denial) of a medical invoice to the IPS via Gmail using `gogcli`, with the formal PDF attached, an executive summary in the body, a reference to the 15 business-day response deadline (Res. 3047/2008 Art. 6), recipient resolved from the original filing email, and delivery confirmation recorded in delivery-log.json. Sets the case status to `claim-denial-sent` in output.json. Use it once the case is `claim-denial-ready` and the final PDF is approved.
version: 1.0.0
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
    prompt: Address the glosa is sent from (e.g. glosas@eps.com)
    required_for: full functionality
---

# medical-invoice-claim-denial-gmail-sender

Last skill of the pipeline. Takes the human-approved glosa (label `claim-denial-ready`) and sends it to the IPS via Gmail, preserving the original filing thread when possible, attaching the PDF, and recording delivery in `delivery-log.json`.

The question it answers: **how do I formally deliver the glosa to the IPS with traceability and thread continuity?**

## When to Use

- The case has label `claim-denial-ready` and has not been sent.
- The user asks "send the glosa for case {RAD} to the IPS".
- Manual retry after a send failure (label `medical-invoice/send-failed`).

**Do not use:** if the case still has `needs-human-review` or `needs-fix-review` (not yet approved); if it already has `claim-denial-sent` (avoid duplicates, confirm with the user).

## Input Contract

The skill reads the approved `output.json` and the latest PDF version:

```json
{
  "output": {
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
    "hallazgos": [ /* approved state */ ],
    "resumen": {
      "total_facturado": 0,
      "total_aprobado": 0,
      "total_glosado": 0,
      "concepto_final": "NO_APTA | DEVOLUCION",
      "accion_requerida": "...",
      "resumen_ejecutivo": "..."
    }
  },
  "pdf": {
    "document_id": "<uuid>",
    "version": "v1 | v2 | ...",
    "pdf_url": "https://.../cases/{caso_id}/documents/{doc_id}/content",
    "sha256": "<hex>"
  },
  "source_message_id": "<gmail-message-id | null>"
}
```

Pre-flight: abort if case label `claim-denial-sent` is already present. Verify `claim-denial-ready` label exists.

## Output Contract

```json
{
  "caso_id": "RAD-YYYYMMDD-{num_factura}",
  "rad": "<string>",
  "version_enviada": "v1 | v2 | ...",
  "sent_at": "YYYY-MM-DDTHH:MM:SS-05:00",
  "sent_message_id": "<gmail-message-id>",
  "thread_id": "<gmail-thread-id>",
  "recipient_to": "<email>",
  "recipient_cc": ["<email>"],
  "status": "claim_denial_sent"
}
```

**`notification_date`** (written to `output.json resumen.notification_date`) is the legal base date for the 15 business-day IPS response deadline per Res. 3047/2008 Art. 6. It must match `sent_at` date exactly.

**Email body invariants:**
- Subject format: `[GLOSA] RAD {rad} — Factura {num_factura} — IPS {prestador}`
- Body must include: `total_facturado`, `total_objetado`, `total_aprobado` (formatted as `$X.XXX.XXX` with Colombian locale), list of causales with item counts, and the "15 días hábiles" deadline reference.
- PDF attached as `application/pdf` with filename `glosa_{rad}_{version}.pdf`.
- Headers: `In-Reply-To: {source_message_id}` (if available), `X-Case-Id: {caso_id}`, `X-RAD: {rad}`.

## Procedure

1. **Pre-flight checks.**
   ```bash
   gogcli --version
   test -n "$GMAIL_SENDER_ADDRESS" || exit 1
   ```

   Validate the case state by reading `output.json` from the working directory:
   - `resumen.label` must be `claim-denial-ready`.
   - `resumen.status` must NOT be `claim_denial_sent` (abort with a clear message if already sent).

2. **Locate the latest PDF.**
   List `claim_denial.v*.pdf` files in the working directory. Pick the highest version (sort by numeric version suffix descending). Copy to `/tmp/glosa/{rad}-{version}.pdf` for sending.

3. **Resolve the IPS recipient.**

   Preferred order:
   1. **Sender of the original filing email** (if `source.message_id` exists in the case):
      ```bash
      gogcli messages get "$SOURCE_MESSAGE_ID" --fields from,reply-to
      ```
      Prefer `Reply-To` if present; otherwise `From`.
   2. Abort if not available → label `medical-invoice/send-failed`, note requesting manual contact.

   Add in **CC** (if configured):
   - EPS internal archive mailbox.

4. **Compose the email.**

   **Subject:**
   ```
   [GLOSA] RAD {rad} — Factura {invoice_number} — IPS {razon_social}
   ```

   **Body (multipart HTML + plain text):**
   ```
   Estimados,

   Se notifica formalmente la glosa correspondiente a la factura {invoice_number}
   (RAD {rad}) conforme a la Resolución 3047 de 2008.

   Resumen:
   • Total facturado: ${invoice_total_formateado}
   • Total objetado:  ${total_objetado_formateado}
   • Total a pagar:   ${total_a_pagar_formateado}
   • Causales aplicadas: {list of causales with counts}

   Se adjunta el documento formal de glosa con el detalle por hallazgo,
   justificación legal/clínica y evidencia.

   Plazo de respuesta: 15 días hábiles (Art. 6 Res. 3047/2008).

   Canal de respuesta: responder este correo con los soportes adicionales
   y/o aceptaciones por cada hallazgo.

   Atentamente,
   Equipo Auditoría Médica
   ```

   > The user-facing email body stays in Spanish because the IPS is a Colombian provider — legal language and habit require it. Internal prose and comments stay in English.

   Include headers:
   - `In-Reply-To: {source.message_id}` (if it exists — keeps the original thread).
   - `References: {source.message_id}`.
   - `X-Case-Id: {case_id}`, `X-RAD: {rad}`, `X-Claim-Denial-Version: {version}` (internal correlation).

5. **Send via `gogcli`.**
   ```bash
   gogcli messages send \
     --from "$GMAIL_SENDER_ADDRESS" \
     --to "$IPS_EMAIL" \
     --cc "$IPS_CC" \
     --subject "[GLOSA] RAD ${RAD} — Factura ${INV}" \
     --body-html body.html \
     --body-text body.txt \
     --attach "/tmp/glosa/${RAD}-${VERSION}.pdf" \
     --in-reply-to "$SOURCE_MESSAGE_ID" \
     --thread-id "$SOURCE_THREAD_ID" \
     --header "X-Case-Id: $CASE_ID" \
     --header "X-RAD: $RAD"
   ```

   Capture the response: `sent_message_id`, `thread_id`, `delivery_status`.

6. **Verify delivery.**
   - The Gmail API confirms `labelIds: ["SENT"]` on the message.
   - If the IPS provider returns a bounce (DSN), `gogcli` will detect it within minutes → apply error label + alert.

7. **Record delivery.**
   Append the delivery record to `delivery-log.json` in the working directory:
   ```json
   {
     "sent_at": "2026-04-15T17:45:00Z",
     "sent_message_id": "...",
     "thread_id": "...",
     "recipient_to": "glosas@ipsabc.com",
     "recipient_cc": [],
     "claim_denial_version": "v3",
     "channel": "gmail"
   }
   ```

   Then update `output.json`: set `resumen.label = "claim-denial-sent"`, `resumen.status = "claim_denial_sent"`, and `resumen.notification_date = "{sent_at date}"` (this is the legal base for the 15 business-day IPS response deadline).

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
- **Symptom:** bounce when sending. **Cause:** the original sender was accounting, not glosas. **Fix:** check `Reply-To` before using `From`; if bounce persists, escalate to human for manual contact resolution.
- **Symptom:** PDF attachment arrives corrupted at the IPS. **Cause:** `gogcli` applied the wrong content-type. **Fix:** specify `--attach-mime application/pdf`.
- **Symptom:** subject with special characters renders as `=?UTF-8?Q?...`. **Cause:** missing RFC 2047 encoding. **Fix:** `gogcli` handles it; if not, escape before passing the argument.
- **Symptom:** older PDF version sent (`v2` when `v3` existed). **Cause:** step 2 ordered by `created_at` instead of numeric version. **Fix:** sort by `CAST(version LIKE 'v%' → INT(substr))` descending, not by timestamp.
- **Symptom:** Gmail thread loses its thread-id because the first email was to a different account. **Cause:** `thread_id` is account-scoped. **Fix:** if the filing email came to another address, drop `thread_id` and keep only `In-Reply-To`; Gmail will still try to group by subject + message-id chain.
- **Symptom:** inconsistent state after partial failure (PDF sent, label not updated). **Cause:** error between step 5 and 7. **Fix:** if send succeeded but the software API failed, retry the update with backoff; do NOT resend the email.

## Verification

- The case has label `claim-denial-sent` and not `claim-denial-ready`.
- `delivery-log.json` contains the entry with a non-empty `sent_message_id`.
- In Gmail, the message exists in `SENT` with correct `X-Case-Id` and `X-RAD` headers.
- The `thread_id` of the sent message matches the original filing email's (when applicable).
- The attachment in the sent message has the same `sha256` as the local `claim_denial.{version}.pdf`.
- `output.json resumen.notification_date` is set — this is the legal base for the 15 business-day deadline.

## References

- Resolución 3047/2008 Art. 6 — formal glosa notification, 15 business days.
- RFC 5322 — In-Reply-To / References headers (threading).
- `gogcli` — internal Arkangel CLI for Gmail.
- Issue [arkangelai/audit-workflow#74](https://github.com/arkangelai/audit-workflow/issues/74).
