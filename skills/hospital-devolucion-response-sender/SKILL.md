---
name: hospital-devolucion-response-sender
description: Sends the IPS's finished glosa responses back to an EPS via Gmail using `gogcli`, as a single consolidated Excel attachment with one row per glosa showing both the EPS objection and the IPS response side by side. Recipient resolved from the sender task context, formal Spanish body referencing the Res. 3047/2008 / Res. 416/2009 response window, delivery recorded on the sender task and on each glosa task. Use it once a human auditor triggers "Enviar" on a group of finished glosa responses for one pagador.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, gmail, glosa, devolucion, hospital, ips, eps, sender, colombia]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: GOGCLI_CREDENTIALS_PATH
    prompt: Path to gogcli OAuth credentials
    help: The account needs gmail.send scope. Same credentials as hospital-devolucion-gmail-intake if sharing a single inbox.
    required_for: full functionality
  - name: GMAIL_SENDER_ADDRESS
    prompt: Address the glosa response is sent from (e.g. glosas@ipsabc.com)
    required_for: full functionality
---

# hospital-devolucion-response-sender

Last skill in the hospital devolucion pipeline. It takes the finished glosa responses (each `hospital-devolucion-audit` produced a `glosa-response.json`), consolidates them into **one Excel file** with one row per glosa, and sends it back to the EPS via Gmail. The Excel presents the EPS objection and the IPS response side by side so the payer can reconcile the response against its original glosa file.

The question it answers: **how do I formally deliver the IPS's consolidated response to a pagador's glosas with traceability across every glosa task?**

**Flow position:** `hospital-devolucion-audit` × N → human auditor clicks "Enviar" in Salmona → `hospital_devolucion_response_mail` (Salmona) → this skill → EPS inbox

**Distinction from `medical-invoice-claim-denial-gmail-sender`:** that skill is the EPS-side sender — it delivers a single glosa as a formal PDF to an IPS. This skill is the IPS-side sender — it delivers many glosa *responses* as a single Excel to an EPS. The direction, attachment format, and task model are different.

## When to Use

- The orchestrator dispatches a task of type `hospital_devolucion_response_mail`.
- A human auditor in Salmona triggered "Enviar" on a group of finished glosa responses belonging to one pagador (EPS).
- Manual retry after a send failure, **only if** `context.reply_sent` is still `false` on the sender task.

**Do not use:**
- If `task_type != hospital_devolucion_response_mail`.
- If `context.reply_sent` is already `true` on the sender task (avoid double-send — confirm with the user).
- If `context.caso_ids` is empty or `context.email_destino` is missing.

## Input Contract

### Required environment variables

In addition to the frontmatter env vars (`GOGCLI_CREDENTIALS_PATH`, `GMAIL_SENDER_ADDRESS`), the skill talks to Salmona and needs:

- `SALMONA_API_URL` — Base URL of the Salmona API (e.g. `https://salmona.arkangel.ai`).
- `SALMONA_API_KEY` — Salmona API key with agent role. Must be able to read tasks, read task outputs, PATCH task context, and upload task outputs.

### Task context shape

Task of type `hospital_devolucion_response_mail`. Its `context` is the sender envelope — metadata about which glosa responses to bundle, not glosa data itself. The Salmona route (`arkangelai/salmona-api#210`) groups by pagador, so one sender task = one EPS:

```json
{
  "caso_ids": ["HOSP-GL-1052", "HOSP-GL-1055"],
  "pagador_nombre": "EPS Sura",
  "pagador_nit": "800.088.702-2",
  "email_destino": "glosas@epssura.com",
  "solicitado_por": "<user-id>",
  "reply_sent": false,
  "sent_at": null,
  "excel_filename": null,
  "total_glosas_respondidas": null
}
```

The `caso_ids` are the `caso_id` values of the `hospital_devolucion` glosa tasks whose responses must be sent. The orchestrator may instead hand the glosa task ids directly; in that case match by `caso_id` anyway (see Procedure step 2) so the lookup path is uniform.

`reply_sent`, `sent_at`, `excel_filename` and `total_glosas_respondidas` start null/false and are written back by this skill.

## Output Contract

On success, the skill:

1. Sends one email with one `.xlsx` attachment to `context.email_destino`.
2. Sets `context.reply_sent = true` on each `hospital_devolucion` glosa task.
3. Updates the sender task `context` with `reply_sent`, `sent_at`, `excel_filename`, `total_glosas_respondidas`.
4. Uploads the generated `.xlsx` as the sender task's output with label `report`.

The skill returns a JSON summary block:

```json
{
  "pagador_nombre": "EPS Sura",
  "pagador_nit": "800.088.702-2",
  "email_destino": "glosas@epssura.com",
  "excel_filename": "Respuestas_Glosas_8000887022_20260514.xlsx",
  "total_glosas_respondidas": 12,
  "sent_message_id": "<gmail-message-id>",
  "thread_id": "<gmail-thread-id>",
  "sent_at": "2026-05-14T16:20:00-05:00"
}
```

## Procedure

1. **Pre-flight checks.**
   ```bash
   gogcli --version
   test -n "$GMAIL_SENDER_ADDRESS" || { echo "Missing GMAIL_SENDER_ADDRESS"; exit 1; }
   test -f "$GOGCLI_CREDENTIALS_PATH" || { echo "Missing gogcli creds"; exit 1; }
   ```
   Read the sender task `context`. Abort with a clear message if:
   - `context.reply_sent` is already `true` (already sent — do not resend).
   - `context.caso_ids` is empty or absent.
   - `context.email_destino` is missing.

2. **Resolve each glosa task and its response.**

   For each `caso_id` in `context.caso_ids`, locate the `hospital_devolucion` task and read its data:
   ```bash
   curl -s -H "Authorization: Bearer $SALMONA_API_KEY" \
     "$SALMONA_API_URL/api/tasks?task_type=hospital_devolucion&limit=200" \
     | jq --arg cid "$CASO_ID" '.data[] | select(.context.caso_id == $cid)'
   ```
   From the matched task read:
   - `context` — the `GlosaContext` (see `../hospital-devolucion-audit/references/glosa-context-template.json`). Source of the EPS-side columns.
   - The `report` output — the `GlosaResponse` (`glosa-response.json`, see `../hospital-devolucion-audit/references/glosa-response-template.json`):
     ```bash
     curl -s -H "Authorization: Bearer $SALMONA_API_KEY" \
       "$SALMONA_API_URL/api/tasks/$CASO_TASK_ID/outputs?label=report"
     ```
   If a caso has **no `report` output**, skip it: log the `caso_id` and the reason, and continue with the rest of the batch. Do not abort the whole send.

   Validate `pagador_nit` consistency: every matched `GlosaContext` should carry the same `pagador_nit` as `context.pagador_nit`. If any caso differs, warn (the route groups by pagador, so this should not happen) and exclude the mismatched caso.

3. **Generate the consolidated Excel.**

   Genere un archivo `.xlsx` con una sola hoja llamada `Respuestas`, una fila por glosa, en este orden EXACTO de columnas. **No usar librerías de parsing para leer** — esto es generación de salida; produzca el `.xlsx` con las capacidades disponibles en el host (p. ej. `openpyxl`), de forma tool-agnóstica como el resto del pipeline.

   | # | Columna | Origen |
   |---|---|---|
   | 1 | `CASO_ID` | `GlosaContext.caso_id` |
   | 2 | `NUM_FACTURA` | `GlosaContext.num_factura_original` |
   | 3 | `PACIENTE` | `GlosaContext.paciente_alias` |
   | 4 | `CODIGO` | `GlosaContext.codigo` |
   | 5 | `DESCRIPCION` | `GlosaContext.descripcion` |
   | 6 | `CANTIDAD` | `GlosaContext.cantidad` |
   | 7 | `CAUSAL` | `GlosaContext.causal_num` + `" — "` + nombre de la causal (Res. 3047/2008 Anexo 6) |
   | 8 | `MOTIVO_GLOSA_EPS` | `GlosaContext.motivo_glosa` (texto literal de la objeción de la EPS) |
   | 9 | `VALOR_FACTURADO` | `GlosaContext.valor_facturado` (número, sin símbolo de moneda) |
   | 10 | `VALOR_GLOSADO` | `GlosaContext.valor_glosado` (número) |
   | 11 | `RESPUESTA_IPS` | `GlosaResponse.decision` mapeado (ver abajo) |
   | 12 | `VALOR_A_DEFENDER` | `GlosaResponse.valor_a_defender` (número) |
   | 13 | `VALOR_A_ACEPTAR` | `GlosaResponse.valor_a_aceptar` (número) |
   | 14 | `ARGUMENTACION` | `GlosaResponse.argumentacion` (texto apto para carta; vacío si pending) |
   | 15 | `ESTADO_EVIDENCIA` | `GlosaResponse.evidence_status` mapeado (ver abajo) |
   | 16 | `EVIDENCIA_REQUERIDA` | `GlosaResponse.evidencia_requerida` unida con `"; "` (vacío si ausente) |

   **Nombres de causal** (columna `CAUSAL`, por `causal_num`):

   | `causal_num` | Nombre |
   |---|---|
   | `1` | Facturación |
   | `2` | Tarifas |
   | `3` | Soportes |
   | `4` | Autorización |
   | `5` | Cobertura |
   | `6` | Pertinencia |
   | `7` | Anulaciones |

   **Mapeo de `RESPUESTA_IPS`** (columna 11):
   - `GlosaResponse.decision == "disputar"` → `"Disputar"`
   - `GlosaResponse.decision == "aceptar"` → `"Aceptar"`
   - `GlosaResponse.decision == null` o `evidence_status == "pending"` → `"Pendiente de soportes"`

   **Mapeo de `ESTADO_EVIDENCIA`** (columna 15):
   - `"sufficient"` → `"Suficiente"`
   - `"pending"` → `"Pendiente"`

   Glosas con `decision: null` / `evidence_status: pending` **igual van en el Excel**, con la fila "Pendiente de soportes" y `EVIDENCIA_REQUERIDA` poblada. No omitirlas.

   **Filename:** `Respuestas_Glosas_{pagador_nit sanitizado}_{YYYYMMDD}.xlsx`, donde el NIT se sanitiza quitando puntos y guiones (`800.088.702-2` → `8000887022`) y la fecha se calcula en `America/Bogota`:
   ```bash
   DATE=$(TZ=America/Bogota date +%Y%m%d)
   NIT_SANITIZED=$(echo "$PAGADOR_NIT" | tr -dc '0-9')
   EXCEL_NAME="Respuestas_Glosas_${NIT_SANITIZED}_${DATE}.xlsx"
   ```

   Record the final row count — it becomes `total_glosas_respondidas`.

4. **Compose and send the email via `gogcli`.**

   **Subject:**
   ```
   Respuesta a glosas — {pagador_nombre} — {N} glosas
   ```
   where `N` is the row count.

   **Body (formal Spanish — the recipient is a Colombian EPS):**
   ```
   Estimados,

   En el marco de la Resolución 3047 de 2008 y la Resolución 416 de 2009,
   {prestador_nombre} remite la respuesta consolidada a las glosas notificadas
   por {pagador_nombre}, dentro del plazo de respuesta establecido.

   Se adjunta un archivo Excel con {N} glosas. Cada fila presenta la objeción
   original de la EPS junto con la respuesta de la IPS: la decisión (disputar,
   aceptar o pendiente de soportes), el valor a defender, el valor a aceptar
   y la argumentación correspondiente.

   Quedamos atentos a la conciliación de las glosas disputadas y a cualquier
   requerimiento adicional de soportes.

   Atentamente,
   Equipo de Cuentas Médicas — {prestador_nombre}
   ```

   > The user-facing email body and the Excel headers stay in Spanish because the recipient is a Colombian EPS — legal language and habit require it. Internal prose and comments stay in English.

   **Send:**
   ```bash
   gogcli messages send \
     --from "$GMAIL_SENDER_ADDRESS" \
     --to "$EMAIL_DESTINO" \
     --subject "Respuesta a glosas — ${PAGADOR_NOMBRE} — ${N} glosas" \
     --body-text body.txt \
     --attach "$WORK_DIR/$EXCEL_NAME" \
     --attach-mime "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
   ```
   Capture from the response: `sent_message_id`, `thread_id`.

5. **Record delivery on every glosa task.**

   For each `hospital_devolucion` task that was included in the Excel, set `context.reply_sent = true`, **preserving the rest of the existing context**:
   ```bash
   UPDATED_CTX=$(echo "$EXISTING_CONTEXT" | jq '.reply_sent = true')
   curl -s -X PATCH \
     -H "Authorization: Bearer $SALMONA_API_KEY" \
     -H "Content-Type: application/json" \
     -d "$(jq -n --argjson context "$UPDATED_CTX" '{context: $context}')" \
     "$SALMONA_API_URL/api/tasks/$CASO_TASK_ID"
   ```

6. **Update the sender task context.**

   PATCH the `hospital_devolucion_response_mail` task — merge into its existing context:
   ```bash
   SENDER_CTX=$(echo "$SENDER_CONTEXT" | jq \
     --arg sent_at "$SENT_AT" \
     --arg fn "$EXCEL_NAME" \
     --argjson n "$N" \
     '.reply_sent = true | .sent_at = $sent_at | .excel_filename = $fn | .total_glosas_respondidas = $n')
   curl -s -X PATCH \
     -H "Authorization: Bearer $SALMONA_API_KEY" \
     -H "Content-Type: application/json" \
     -d "$(jq -n --argjson context "$SENDER_CTX" '{context: $context}')" \
     "$SALMONA_API_URL/api/tasks/$SENDER_TASK_ID"
   ```
   `sent_at` is an ISO-8601 timestamp in `America/Bogota` (`-05:00`).

7. **Upload the Excel as the sender task's output.**
   ```bash
   curl -s -X POST \
     -H "Authorization: Bearer $SALMONA_API_KEY" \
     -F "file=@$WORK_DIR/$EXCEL_NAME" \
     -F "label=report" \
     -F "description=$EXCEL_NAME" \
     "$SALMONA_API_URL/api/tasks/$SENDER_TASK_ID/outputs/upload"
   ```

8. **Return the summary** (see Output Contract).

## Pitfalls

- **Symptom:** the whole batch aborts because one caso has no response. **Cause:** a `hospital_devolucion` task still in `review`/`pending` has no `report` output. **Fix:** skip that caso, log it, keep going — never let one missing response block the send for the others.
- **Symptom:** a pending glosa is left out of the Excel. **Cause:** filtering out `decision: null`. **Fix:** pending glosas still go in the Excel with `RESPUESTA_IPS = "Pendiente de soportes"` and `EVIDENCIA_REQUERIDA` populated — the EPS needs to see them.
- **Symptom:** the EPS receives two emails for the same group. **Cause:** retry without checking `context.reply_sent` on the sender task. **Fix:** the first pre-flight step aborts if `reply_sent` is already `true`.
- **Symptom:** the Excel mixes glosas from two different EPSs. **Cause:** the sender task context was built wrong. **Fix:** the route groups by pagador so this should not happen, but validate `pagador_nit` consistency across all matched `GlosaContext`s (step 2) and exclude + warn on any mismatch.
- **Symptom:** `gogcli` fails with `invalid_grant`. **Cause:** OAuth token expired. **Fix:** run `gogcli auth refresh` or regenerate with `gogcli auth init`.
- **Symptom:** the EPS opens the attachment and it is unreadable. **Cause:** wrong content-type on the attachment. **Fix:** always pass `--attach-mime application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- **Symptom:** inconsistent state after partial failure (email sent, task context not updated). **Cause:** error between step 4 and step 6. **Fix:** if the send succeeded but a Salmona PATCH failed, retry the PATCH with backoff — do NOT resend the email.
- **Symptom:** `América/Bogota` filename uses UTC date and is off by a day near midnight. **Cause:** `date` without `TZ`. **Fix:** always `TZ=America/Bogota date +%Y%m%d`.

## Verification

- [ ] The sender task `context` has `reply_sent: true`, a non-null `sent_at`, and a non-null `excel_filename`.
- [ ] `context.total_glosas_respondidas` equals the number of rows in the Excel.
- [ ] Every `hospital_devolucion` glosa task included in the Excel has `context.reply_sent: true`.
- [ ] The generated `.xlsx` exists as the sender task's output with label `report`.
- [ ] In Gmail, the message exists in `SENT` with the Excel attached and the subject `Respuesta a glosas — {pagador} — {N} glosas`.
- [ ] Any caso skipped for missing a `report` output is logged and absent from both the Excel and the row count.

## References

- [`../medical-invoice-claim-denial-gmail-sender/SKILL.md`](../medical-invoice-claim-denial-gmail-sender/SKILL.md) — EPS-side analog: delivers a single glosa as a PDF to an IPS.
- [`../hospital-devolucion-audit/SKILL.md`](../hospital-devolucion-audit/SKILL.md) — upstream: produces the `glosa-response.json` per glosa that this skill bundles.
- [`../hospital-devolucion-batch-parse/SKILL.md`](../hospital-devolucion-batch-parse/SKILL.md) — upstream: splits the EPS Excel into the `hospital_devolucion` tasks.
- [`../hospital-devolucion-gmail-intake/SKILL.md`](../hospital-devolucion-gmail-intake/SKILL.md) — pipeline entry point.
- Resolución 3047/2008 + Resolución 416/2009 — Manual Único de Glosas, Devoluciones y Respuestas. Causales 1–7 (Anexo 6) y plazos de respuesta.
- `gogcli` — internal Arkangel CLI for Gmail (see `#ai-tooling` on Slack).
- Issue [`arkangelai/salmona-api#210`](https://github.com/arkangelai/salmona-api/issues/210) — single-glosa data model; skills repo is the canonical home for agent prompts.
</content>
</invoke>
