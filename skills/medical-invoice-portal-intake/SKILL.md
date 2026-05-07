---
name: medical-invoice-portal-intake
description: Logs into the mock-portals medical invoice portal (portal-facturas-ark.vercel.app), finds pending submissions, downloads their files from Supabase Storage, and creates a case task per submission via `ark tasks create`. Use it when you want to process medical invoice submissions that arrived through the web portal instead of Gmail, or when testing the audit pipeline without a real email inbox.
version: 1.0.0
author: fiorella.ramirez@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, portal, intake, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: PORTAL_URL
    prompt: Base URL of the mock portal
    help: "Default: https://portal-facturas-ark.vercel.app"
    required_for: full functionality
  - name: PORTAL_EMAIL
    prompt: Arkangel email used to log into the portal (must be salmona@arkangel.ai)
    help: OTP will be sent to this address — gogcli must be authenticated with this account
    required_for: full functionality
  - name: SUPABASE_URL
    prompt: Supabase project URL
    help: Found in Supabase dashboard > Project Settings > API
    required_for: file download
  - name: SUPABASE_SERVICE_ROLE_KEY
    prompt: Supabase service role key
    help: Found in Supabase dashboard > Project Settings > API
    required_for: file download
---

# medical-invoice-portal-intake

Alternative intake skill for the medical-invoice audit pipeline. Instead of watching a Gmail inbox, it reads pending submissions from the web portal at `$PORTAL_URL`, downloads the attached files from Supabase Storage, and creates one case task per submission via `ark tasks create`.

The portal uses OTP login. This skill reads the OTP from Salmona's Gmail inbox using `gogcli`, completes the login, then scrapes the `/submissions` page for pending rows.

## When to Use

- You want to process submissions that arrived via the web portal (not email).
- You are running the audit pipeline in a test/mock environment.
- The user says "check the portal for new facturas" or "process pending portal submissions".

**Do not use:** if submissions are arriving via Gmail — use `medical-invoice-gmail-intake` instead. Do not process a submission that already has a `task_id` (already processed).

## Environment Setup

```bash
export PORTAL_URL=https://portal-facturas-ark.vercel.app
export PORTAL_EMAIL=salmona@arkangel.ai
export SUPABASE_URL=https://mbbqbbxjcmlxzyqxtzbs.supabase.co
# SUPABASE_SERVICE_ROLE_KEY must be set in the environment
```

Verify `gogcli` is authenticated with `$PORTAL_EMAIL`:
```bash
gog auth list --check
```

## Input Contract

No structured input required. The skill polls the portal's `/submissions` page directly.

## Output Contract

For each processed submission, the skill creates a case task via `ark tasks create` and updates the submission status to `processing`. The output per submission:

```json
{
  "submission_id": "<uuid>",
  "task_id": "<ark-task-id>",
  "num_factura": "FV-2026-XXXXX",
  "prestador_nombre": "...",
  "files_uploaded": ["factura.pdf", "epicrisis.pdf"]
}
```

## Procedure

### 1. Verify prerequisites

```bash
gog --version || { echo "gogcli not found"; exit 1; }
ark version || { echo "ark not found"; exit 1; }
ark auth status | jq -e '.data.authenticated == true' || { echo "ark not authenticated"; exit 1; }
```

### 2. Request OTP

Call the portal's send-otp endpoint:

```bash
OTP_RESPONSE=$(curl -s -X POST "$PORTAL_URL/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$PORTAL_EMAIL\"}")

echo "$OTP_RESPONSE" | jq -e '.ok == true' || {
  echo "Failed to send OTP: $OTP_RESPONSE"
  exit 1
}
echo "OTP sent to $PORTAL_EMAIL"
```

### 3. Read OTP from Gmail

Wait up to 60 seconds for the OTP email, then extract the 6-digit code:

```bash
OTP_CODE=""
for i in $(seq 1 12); do
  sleep 5
  OTP_EMAIL=$(gog --account "$PORTAL_EMAIL" gmail search \
    'from:noreply@mail.app.supabase.io newer_than:2m subject:"Your OTP"' \
    --json --max 1)

  OTP_CODE=$(echo "$OTP_EMAIL" | jq -r '
    .messages[0].snippet // ""
  ' | grep -oP '\b\d{6}\b' | head -1)

  [ -n "$OTP_CODE" ] && break
  echo "Waiting for OTP... attempt $i"
done

[ -z "$OTP_CODE" ] && { echo "OTP not received within 60s"; exit 1; }
echo "OTP received: $OTP_CODE"
```

### 4. Verify OTP and get session token

```bash
SESSION=$(curl -s -X POST "$SUPABASE_URL/auth/v1/verify" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"type\": \"email\", \"email\": \"$PORTAL_EMAIL\", \"token\": \"$OTP_CODE\"}")

ACCESS_TOKEN=$(echo "$SESSION" | jq -r '.access_token')
[ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ] && {
  echo "OTP verification failed: $SESSION"
  exit 1
}
echo "Authenticated as $PORTAL_EMAIL"
```

### 5. Fetch pending submissions

```bash
SUBMISSIONS=$(curl -s "$SUPABASE_URL/rest/v1/submissions?status=eq.pending&select=*" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

COUNT=$(echo "$SUBMISSIONS" | jq 'length')
echo "Found $COUNT pending submission(s)"
[ "$COUNT" -eq 0 ] && { echo "Nothing to process"; exit 0; }
```

### 6. Process each submission

For each pending submission:

```bash
echo "$SUBMISSIONS" | jq -c '.[]' | while read -r submission; do
  SUBMISSION_ID=$(echo "$submission" | jq -r '.id')
  NUM_FACTURA=$(echo "$submission" | jq -r '.num_factura')
  PRESTADOR_NOMBRE=$(echo "$submission" | jq -r '.prestador_nombre')
  PRESTADOR_NIT=$(echo "$submission" | jq -r '.prestador_nit // ""')
  FILE_PATHS=$(echo "$submission" | jq -r '.file_paths[]')

  echo "Processing submission $SUBMISSION_ID — $NUM_FACTURA ($PRESTADOR_NOMBRE)"

  WORK_DIR="/tmp/portal-intake/$SUBMISSION_ID"
  mkdir -p "$WORK_DIR"

  # Download each file from Supabase Storage
  DOWNLOADED_FILES=()
  while IFS= read -r file_path; do
    FILE_NAME=$(basename "$file_path")
    LOCAL_PATH="$WORK_DIR/$FILE_NAME"

    SIGNED_URL=$(curl -s -X POST \
      "$SUPABASE_URL/storage/v1/object/sign/submissions/$file_path" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"expiresIn": 300}' | jq -r '.signedURL')

    curl -s -L "$SUPABASE_URL$SIGNED_URL" -o "$LOCAL_PATH"
    DOWNLOADED_FILES+=("$LOCAL_PATH")
    echo "  Downloaded: $FILE_NAME"
  done <<< "$FILE_PATHS"

  # Build caso_id
  CASO_ID="RAD-$(date +%Y%m%d)-$(echo "$NUM_FACTURA" | tr -d '-' | tail -c 6)"
  FECHA_RADICACION=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  CONTEXT=$(jq -n \
    --arg caso_id "$CASO_ID" \
    --arg num_factura "$NUM_FACTURA" \
    --arg prestador_nit "$PRESTADOR_NIT" \
    --arg prestador_nombre "$PRESTADOR_NOMBRE" \
    --arg fecha_radicacion "$FECHA_RADICACION" \
    --arg audit_perspective "aseguradora" \
    --arg submission_id "$SUBMISSION_ID" \
    '{
      caso_id: $caso_id,
      num_factura: $num_factura,
      prestador_nit: $prestador_nit,
      prestador_nombre: $prestador_nombre,
      fecha_radicacion: $fecha_radicacion,
      audit_perspective: $audit_perspective,
      portal_submission_id: $submission_id
    }')

  # Create ark task
  TASK_RUN_ID=$(ark gen-uuid)

  TASK_RESPONSE=$(ark tasks create \
    --title "Auditoría $NUM_FACTURA — $PRESTADOR_NOMBRE" \
    --status queued \
    --context "$CONTEXT")

  TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.data.id')
  [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ] && {
    echo "  Failed to create task: $TASK_RESPONSE"
    continue
  }
  echo "  Task created: $TASK_ID"

  # Upload files as task inputs
  for local_file in "${DOWNLOADED_FILES[@]}"; do
    FILE_NAME=$(basename "$local_file")
    STORAGE_PATH="tasks/$TASK_ID/inputs/$FILE_NAME"

    curl -s -X POST \
      "$SUPABASE_URL/storage/v1/object/task-documents/$STORAGE_PATH" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/pdf" \
      --data-binary "@$local_file" > /dev/null

    export ARK_IDEMPOTENCY_KEY="${TASK_RUN_ID}:input:$FILE_NAME"
    ark tasks inputs add "$TASK_ID" \
      --path "storage://task-documents/$STORAGE_PATH" \
      --type storage \
      --description "$FILE_NAME"

    echo "  Uploaded input: $FILE_NAME"
  done

  # Mark submission as processing + store task_id
  curl -s -X PATCH "$PORTAL_URL/api/submissions/$SUBMISSION_ID" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"processing\", \"task_id\": \"$TASK_ID\"}" > /dev/null

  echo "  Submission $SUBMISSION_ID → processing (task: $TASK_ID)"

  # Cleanup
  rm -rf "$WORK_DIR"
done
```

### 7. Done

```bash
echo "Portal intake complete."
```

## Pitfalls

- **OTP email subject varies** -- Supabase OTP emails may say "Your OTP" or "Confirm your signup". If `gog gmail search` returns nothing, try a broader query: `from:noreply@mail.app.supabase.io newer_than:5m`.
- **Submission already has a task_id** -- always filter `status=eq.pending` to avoid double-processing. If a submission shows `processing` or `done`, skip it.
- **File download fails** -- signed URLs expire in 5 minutes. Generate and use them immediately. If a download fails, log it as a blocker and continue with other files.
- **`ark tasks create` context too large** -- if the context JSON exceeds shell limits, write it to a temp file and pipe it: `ark tasks create --context "$(cat /tmp/context.json)"`.

## Verification

- Each processed submission has `status = processing` and a non-null `task_id` in the portal.
- `ark tasks list --status queued` shows the new tasks.
- Each task has inputs registered matching the submission's file list.
- No submission with an existing `task_id` was processed twice.

## References

- Portal: https://portal-facturas-ark.vercel.app
- Supabase project: Ark staging (`mbbqbbxjcmlxzyqxtzbs`)
- Related skill: `medical-invoice-gmail-intake` (same pipeline, different intake source)
- `ark` CLI docs: `ark --help`
