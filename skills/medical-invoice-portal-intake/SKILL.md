---
name: medical-invoice-portal-intake
description: Uses Playwright to log into the mock-portals medical invoice portal (portal-facturas-ark.vercel.app) as Salmona, reads pending submissions from the submissions table, downloads each file through the browser, and creates a case task per submission via `ark tasks create`. Use it when processing medical invoice submissions that arrived through the web portal, or when testing the audit pipeline end-to-end without a real email inbox.
version: 1.1.0
author: fiorella.ramirez@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, portal, intake, playwright, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal, browser]
required_environment_variables:
  - name: PORTAL_URL
    prompt: Base URL of the mock portal
    help: "Default: https://portal-facturas-ark.vercel.app"
    required_for: full functionality
  - name: PORTAL_EMAIL
    prompt: Arkangel email to log into the portal (salmona@arkangel.ai)
    help: OTP will be sent here — gogcli must be authenticated with this account
    required_for: login
  - name: ARK_API_URL
    prompt: Salmona API URL
    help: Used by ark CLI to create tasks
    required_for: task creation
---

# medical-invoice-portal-intake

Alternative intake skill for the medical-invoice audit pipeline. Instead of watching a Gmail inbox, this skill uses **Playwright** to interact with the web portal at `$PORTAL_URL` exactly as a human would — no direct API or database access. This mirrors what a real external portal integration would look like.

Full flow:
1. Open the portal login page in a headless browser
2. Enter Salmona's email and request an OTP
3. Read the OTP from Gmail using `gogcli`
4. Enter the OTP in the browser to complete login
5. Navigate to `/submissions`, find pending rows
6. For each pending submission: click to expand files, download each file
7. Create an `ark` task with the case metadata as context and files as inputs
8. Mark the submission as processed (update status via portal API)

## When to Use

- The user asks to "check the portal for new facturas" or "process pending portal submissions".
- You want to run the audit pipeline end-to-end using the mock portal as intake.
- Testing the full Playwright-based intake flow.

**Do not use:** for Gmail-originated invoices (use `medical-invoice-gmail-intake`). Do not process submissions that already have a `task_id`.

## Prerequisites

```bash
# Playwright
npx playwright install chromium

# gogcli authenticated with salmona@arkangel.ai
gog auth list --check | grep "$PORTAL_EMAIL"

# ark authenticated
ark auth status | jq -e '.data.authenticated == true'
```

## Procedure

### 1. Verify prerequisites

```bash
npx playwright --version || { echo "Playwright not found. Run: npm install -g playwright && npx playwright install chromium"; exit 1; }
gog --version || { echo "gogcli not found"; exit 1; }
ark auth status | jq -e '.data.authenticated == true' || { echo "ark not authenticated. Run: ark config set api-key <key>"; exit 1; }
```

### 2. Write the Playwright script

Write the following to `/tmp/portal-intake.js`:

```javascript
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal-facturas-ark.vercel.app';
const PORTAL_EMAIL = process.env.PORTAL_EMAIL || 'salmona@arkangel.ai';

async function getOtpFromGmail() {
  // Wait up to 60s for the OTP email
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const result = execSync(
        `gog --account "${PORTAL_EMAIL}" gmail search ` +
        `'from:noreply@mail.app.supabase.io newer_than:3m' --json --max 1`,
        { encoding: 'utf8' }
      );
      const data = JSON.parse(result);
      const snippet = data?.messages?.[0]?.snippet || '';
      const match = snippet.match(/\b(\d{6})\b/);
      if (match) return match[1];
    } catch {}
    console.log(`Waiting for OTP... attempt ${i + 1}`);
  }
  throw new Error('OTP not received within 60s');
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // --- LOGIN ---
  console.log('Navigating to login page...');
  await page.goto(`${PORTAL_URL}/login`);
  await page.fill('input[type="email"]', PORTAL_EMAIL);
  await page.click('button[type="submit"]');
  console.log('OTP requested. Reading from Gmail...');

  const otp = await getOtpFromGmail();
  console.log(`OTP received: ${otp}`);

  await page.fill('input[placeholder="123456"]', otp);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${PORTAL_URL}/submissions`, { timeout: 10000 });
  console.log('Logged in. On submissions page.');

  // --- READ SUBMISSIONS ---
  await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

  // Get all rows with status "pending" and no task_id
  const rows = await page.$$eval('table tbody tr[data-submission-id]', rows =>
    rows
      .filter(r => r.querySelector('.status')?.textContent?.trim() === 'pending')
      .map(r => ({
        id: r.dataset.submissionId,
        numFactura: r.querySelector('.num-factura')?.textContent?.trim(),
        prestadorNombre: r.querySelector('.prestador-nombre')?.textContent?.trim(),
        prestadorNit: r.querySelector('.prestador-nit')?.textContent?.trim() || '',
      }))
  );

  console.log(`Found ${rows.length} pending submission(s)`);
  if (!rows.length) { await browser.close(); return; }

  const results = [];

  for (const row of rows) {
    console.log(`\nProcessing submission ${row.id} — ${row.numFactura} (${row.prestadorNombre})`);

    const workDir = `/tmp/portal-intake/${row.id}`;
    fs.mkdirSync(workDir, { recursive: true });

    // Expand file dropdown
    await page.click(`tr[data-submission-id="${row.id}"]`);
    await page.waitForTimeout(300);

    // Download each file
    const fileNames = await page.$$eval(
      `tr[data-submission-id="${row.id}"] + tr li .font-mono`,
      els => els.map(e => e.textContent.trim())
    );

    const downloadedFiles = [];
    for (const fileName of fileNames) {
      const downloadPath = path.join(workDir, fileName);
      const downloadPromise = context.waitForEvent('download');

      // Click the file link
      await page.click(
        `tr[data-submission-id="${row.id}"] + tr li:has-text("${fileName}") a`
      );

      const download = await downloadPromise;
      await download.saveAs(downloadPath);
      downloadedFiles.push(downloadPath);
      console.log(`  Downloaded: ${fileName}`);
    }

    results.push({ ...row, downloadedFiles });
  }

  await browser.close();

  // Write results for next step
  fs.writeFileSync('/tmp/portal-intake-results.json', JSON.stringify(results, null, 2));
  console.log('\nBrowser session complete. Results written to /tmp/portal-intake-results.json');
}

run().catch(e => { console.error(e); process.exit(1); });
```

### 3. Run the Playwright script

```bash
PORTAL_URL="$PORTAL_URL" PORTAL_EMAIL="$PORTAL_EMAIL" node /tmp/portal-intake.js
```

### 4. Create ark tasks from downloaded files

```bash
RESULTS=$(cat /tmp/portal-intake-results.json)
echo "$RESULTS" | jq -c '.[]' | while read -r item; do
  SUBMISSION_ID=$(echo "$item" | jq -r '.id')
  NUM_FACTURA=$(echo "$item" | jq -r '.numFactura')
  PRESTADOR_NOMBRE=$(echo "$item" | jq -r '.prestadorNombre')
  PRESTADOR_NIT=$(echo "$item" | jq -r '.prestadorNit')
  WORK_DIR="/tmp/portal-intake/$SUBMISSION_ID"

  CASO_ID="RAD-$(date +%Y%m%d)-$(echo "$NUM_FACTURA" | grep -oP '\d+$')"
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

  TASK_RUN_ID=$(ark gen-uuid)

  TASK_RESPONSE=$(ark tasks create \
    --title "Auditoría $NUM_FACTURA — $PRESTADOR_NOMBRE" \
    --status queued \
    --context "$CONTEXT")

  TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.data.id')
  [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ] && {
    echo "Failed to create task for $SUBMISSION_ID: $TASK_RESPONSE"
    continue
  }
  echo "Task created: $TASK_ID"

  # Upload each downloaded file as a task input
  for FILE_PATH in "$WORK_DIR"/*; do
    FILE_NAME=$(basename "$FILE_PATH")
    export ARK_IDEMPOTENCY_KEY="${TASK_RUN_ID}:input:${FILE_NAME}"
    ark tasks outputs upload "$TASK_ID" "$FILE_PATH" --type file --label input
    echo "  Uploaded: $FILE_NAME"
  done

  # Mark submission as processing via portal API
  curl -s -X PATCH "$PORTAL_URL/api/submissions/$SUBMISSION_ID" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"processing\", \"task_id\": \"$TASK_ID\"}" > /dev/null

  echo "  Submission $SUBMISSION_ID → processing (task: $TASK_ID)"
  rm -rf "$WORK_DIR"
done
```

### 5. Done

```bash
echo "Portal intake complete."
ark tasks list --status queued
```

## Pitfalls

- **OTP email subject varies** -- if `gog gmail search` finds nothing, broaden the query: `from:noreply@mail.app.supabase.io newer_than:5m`. The subject line from Supabase can vary.
- **File links not rendered as `<a>` tags** -- the portal file dropdown shows filenames as text, not links. If downloads fail, the portal may need a signed download URL route. Check `portal-facturas-ark.vercel.app` for a `/api/submissions/:id/files/:name` endpoint, or add one.
- **Playwright selector drift** -- if the portal UI changes, selectors like `tr[data-submission-id]` may break. Verify selectors against the live portal before running at scale.
- **`data-submission-id` attribute missing** -- the submissions table rows must have this attribute for selection to work. Verify the portal renders it correctly.
- **Double-processing** -- always filter by `status = pending` in the Playwright script. If a submission has already been processed (task_id not null), skip it.

## Verification

- `ark tasks list --status queued` shows one new task per processed submission.
- Each task has the correct `context` (caso_id, num_factura, prestador_nombre).
- Portal `/submissions` shows `processing` status + task_id for each processed row.
- No submission with an existing `task_id` was processed again.

## References

- Portal: https://portal-facturas-ark.vercel.app
- Portal repo: https://github.com/arkangelai/mock-portals
- Related skill: `medical-invoice-gmail-intake` (same pipeline, Gmail intake)
- `ark` CLI: `ark --help`
- Playwright docs: https://playwright.dev/docs/api/class-page
