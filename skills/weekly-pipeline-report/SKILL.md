---
name: weekly-pipeline-report
description: Genera reporte semanal del pipeline de grants de Arkangel AI. Consulta arkangelai/grants por PRs mergeados con label `submitted` desde 2026-03-01, deduplica grants por carpeta proposals/, clasifica cash vs non-cash, genera Excel con 9 hojas (Resumen Ejecutivo, Grants Únicos, Marzo, Abril, Mayo, NIH portfolio, Solo Cash, No-Cash y Aceleradoras, BD/Outreach), commitea como `Reporte-Grants-Sometidos_YYYY-MM-DD.xlsx` y abre PR con label `auto-report`. Diseñada para correr cada lunes 8am Bogotá (cron `0 8 * * 1` America/Bogota). Triggers comunes: "actualiza el reporte semanal", "weekly pipeline report", "/weekly-pipeline-report".
---

# Weekly Pipeline Report

`weekly-pipeline-report` es la skill que mantiene actualizado el cuadro semanal de grants sometidos por Arkangel. Owner del output: Natalia Castaño Villegas (NCV), Evidence Lead.

## When to Use

- Cron semanal cada lunes 8am Bogotá (`0 8 * * 1` America/Bogota → `0 13 * * 1` UTC)
- "Refresh del pipeline", "actualiza el reporte", "weekly report"
- Manual on-demand cuando se necesite snapshot rápido (al cerrar mes, al preparar board update, etc.)

## Outputs

Esta skill deja:

- **Archivo dated en repo:** `Reporte-Grants-Sometidos_YYYY-MM-DD.xlsx` en raíz de `arkangelai/grants` (commiteado al PR como historial)
- **PR a main:** branch `auto/grants-report-YYYY-MM-DD`, label `auto-report`, assignee `natalia498`, NO auto-merge
- **Archivo LATEST local (opcional):** `Reporte-Grants-Pipeline-LATEST.xlsx` en working directory — sobreescrito cada corrida, NUNCA commiteado
- **Reporte final stdout:** URL del PR + # grants únicos + # nuevos esta semana + total cash USD + nombres de los nuevos

## Pre-requisitos del agente que corre la skill

| Tool | Para qué | Cómo verificar |
|---|---|---|
| `gh` CLI | Consultar PRs y crear PR | `gh auth status` |
| `git` | Branch, commit, push | `git --version` |
| `python3` + `openpyxl` | Generar Excel | `python3 -c "import openpyxl"` |
| `jq` | Parsear JSON de gh | `jq --version` |
| Permisos al repo | Push + crear PR | escribir a `arkangelai/grants` |
| Working directory | Clon local de `arkangelai/grants` | en branch `main` antes de empezar |

## Workflow

### 1. Pull el repo a main

```bash
git fetch origin main --quiet
git checkout main 2>/dev/null || true
git pull origin main --quiet
```

### 2. Encontrar el reporte anterior y su fecha de corte

```bash
ls -t Reporte-Grants-Sometidos_2026-*.xlsx 2>/dev/null | head -1
```

Si existe, leer con openpyxl para extraer la última fecha de PR mergeado de ese reporte → usarla como ventana mínima para detectar "qué hay de nuevo". Si no existe, usar `Reporte-Grants-Sometidos_Marzo-Mayo-2026_FINAL.xlsx` como base.

### 3. Query GitHub por PRs mergeados con label `submitted`

```bash
gh pr list --repo arkangelai/grants --state merged \
  --search "label:submitted merged:>=2026-03-01" \
  --json number,title,mergedAt,labels,closingIssuesReferences --limit 300 > /tmp/submitted_prs.json
```

### 4. Para cada PR, obtener los proposal folders tocados

```bash
gh pr view <N> --repo arkangelai/grants --json files --jq '.files[].path' | grep -oE '^proposals/[^/]+' | sort -u
```

Lanzar en paralelo cuando sea posible (múltiples Bash en un solo turno si el runtime lo soporta).

### 5. Construir lista de grants únicos

- **Dedupe por `proposals/YYYY-MM_*/`**
- Multi-folder archive PRs se expanden a múltiples filas:
  - PR #579 `archive(pitch-n-deck)` → 4 grants (Nebius, Halcyon, UMass Memorial, Mayo Platform)
  - PR #583 `archive(gates)` → 2 grants (SAM Treatment + Diarrheal Burden)
  - PR #589 `archive(diligenciamiento-automatico)` → 4 grants (Wellcome Discovery, Cost-Disruptive Tools, Horizon EDCTP3, Grand Challenges Canada)
  - PR #590 `archive(eit-health)` → 2 grants (INNONMDH + INNOVAL)
- **Exclude:**
  - PR #553 (Grants Inbox, herramienta interna)
  - PR #580 (archive shared-resources collateral, sin folder propio)
- **Casos especiales:**
  - Hospital Sant Pau (#726) → `bd-pilot` (outreach, no es grant formal)
  - Eretz.bio (#727) → `cash` $100K (co-development funding)
  - Sheba ARC Boston (#754) → `non-cash` (soft-landing)

### 6. Reglas de clasificación cash vs non-cash (ESTRICTAS)

**CASH** (cash directo a Arkangel/lead institution):
- Todas las NIH grants (R01, R21, R03, R34)
- Wellcome Discovery, Schmidt Sciences, Gates Grand Challenges (todos los seeds)
- USAID, HORIZON-EDCTP3, EIT Health (INNONMDH + INNOVAL), Grand Challenges Canada
- MinCiencias ColombIA, Google.org Impact Challenge, CareQuest ACCELERATE
- Fogarty Innovation Prize, Cartier Women's Initiative, Bayer LEGADO, WHX Tech Xcelerate
- Eretz.bio (co-development funding)

**NON-CASH** (créditos / mentorship / accelerator / soft-landing):
- Nebius (GPU compute credits $100K/$50K/$30K)
- Halcyon (accelerator + $6K stipend + $10K AWS credits)
- Mayo Clinic Platform Accelerate, UMass Memorial, HRC Open Innovation
- MIT Solve (FII Pitch / Future Health / 10th Anniversary)
- Sheba ARC Boston, Fogarty Resident Entrepreneur Program

**BD-pilot** (services revenue, no es grant formal):
- Hospital Sant Pau (vendor-paid validation)

**Importante:** Para cash grants que TAMBIÉN ofrecen beneficios en especie, llenar la columna `non_cash_offering` con el detalle (ejemplo: Cartier $100K + INSEAD Executive Education; Google.org $3M + 6-month accelerator; Bayer $20K + Endeavor mentorship). Para non-cash con créditos computacionales, especificar montos exactos.

### 7. Generar Excel con openpyxl

**Workflow del archivo:**
1. Generar el Excel temporal en `/tmp/grants_report_YYYY-MM-DD.xlsx`
2. Copiarlo a la raíz del repo como `Reporte-Grants-Sometidos_YYYY-MM-DD.xlsx` (dated — va al PR como historial)
3. Si el runtime tiene acceso a sistema de archivos persistente (laptop local): copiarlo también como `Reporte-Grants-Pipeline-LATEST.xlsx` en raíz (NO commiteado)
4. Después del commit + push, regresar a `main` y borrar el archivo dated local (queda solo en GitHub vía el PR)

```bash
DATE=$(date +%Y-%m-%d)
python3 /tmp/build_report.py /tmp/grants_report_$DATE.xlsx
cp "/tmp/grants_report_$DATE.xlsx" "Reporte-Grants-Sometidos_$DATE.xlsx"
# Si runtime tiene FS local persistente:
cp "/tmp/grants_report_$DATE.xlsx" "Reporte-Grants-Pipeline-LATEST.xlsx"
```

**Regla clave:** `Reporte-Grants-Pipeline-LATEST.xlsx` NUNCA va al commit. Solo el dated va al PR. Asegurarse de hacer `git add Reporte-Grants-Sometidos_$DATE.xlsx` específicamente (NO usar `git add .`).

**Estructura del Excel (9 hojas):**
- Resumen Ejecutivo (con grants NUEVOS desde el reporte anterior HIGHLIGHTED en amarillo)
- Grants Únicos
- Marzo / Abril / Mayo / [mes actual si aplica]
- NIH portfolio
- Solo Cash
- No-Cash y Aceleradoras
- BD/Outreach

**Estilo:**
- Font: Arial
- Headers: azul Arkangel `#1F4E78` con texto blanco
- Totales: fondo amarillo `#FFE699` bold
- Freeze panes en cada hoja
- Montos como currency USD: `"$"#,##0`

### 8. Commit y PR

```bash
DATE=$(date +%Y-%m-%d)
BRANCH="auto/grants-report-$DATE"

git checkout -b "$BRANCH"
git add "Reporte-Grants-Sometidos_$DATE.xlsx"
git commit -m "$(cat <<EOF
chore(reports): weekly grants pipeline report $DATE — N new grants

Auto-generated weekly grants pipeline snapshot.

- Total unique grants: X
- New since last week: N
- Cash grants: Y (\$ total)
- Non-cash: Z
- BD/outreach: W

Generated by weekly-pipeline-report skill.
EOF
)"
git push -u origin "$BRANCH"

gh pr create --repo arkangelai/grants --base main --head "$BRANCH" \
  --title "chore(reports): weekly grants pipeline report $DATE — N new grants" \
  --body "$(cat <<EOF
## Weekly grants pipeline snapshot — $DATE

### New submissions this week (N)
- [list nuevos PRs/grants con número, nombre, funder, cash amount]

### Pipeline totals
- Grants únicos: X
- Cash grants: Y (\$ total)
- Non-cash: Z
- BD/outreach: W
- Total cash en pipeline: \$XX,XXX,XXX

### Files updated
- \`Reporte-Grants-Sometidos_$DATE.xlsx\` (committed to repo)

Generated by weekly-pipeline-report skill.
EOF
)" \
  --label "auto-report" \
  --assignee natalia498
```

**Si NO hay grants nuevos desde el reporte anterior**, igualmente abrir el PR con título `weekly grants pipeline report $DATE — refresh only` y cuerpo "No new submissions this week — refreshing data only."

### 9. Limpieza post-PR (solo si runtime local)

```bash
git checkout main
rm -f "Reporte-Grants-Sometidos_$DATE.xlsx"  # quitar dated local — vive en GitHub vía PR
```

El LATEST queda intacto en raíz del repo (untracked).

### 10. Reporte final stdout

Al terminar, imprimir:
- URL del PR creado
- # grants únicos en el reporte
- # grants nuevos detectados esta semana
- Total cash USD
- Nombres de los grants nuevos
- Confirmación de archivos generados

## Restricciones

- **NO usar label `auto-scouted`** — Natalia la deprecó 2026-05-26. Solo usar `auto-report`.
- **NO auto-merge** — Natalia revisa y mergea.
- **NO amend ni force-push.**
- Si el branch o el archivo dated ya existen para hoy, usar sufijo `-r2`, `-r3`, etc.
- **NO commitear `Reporte-Grants-Pipeline-LATEST.xlsx`** — solo el dated.

## Schedule recomendado

Cron: `0 8 * * 1` en timezone `America/Bogota` (= `0 13 * * 1` UTC).

Cualquier runtime que soporte cron puede invocar esta skill:
- Claude Code scheduled tasks (local)
- Gabo (Slack-based agent de Arkangel — server-side cron)
- GitHub Actions (`schedule.cron: '0 13 * * 1'`)
- Cualquier cron de Linux/macOS

## Cross-references

- **Reporte canónico** que debe leerse al inicio si existe: `Reporte-Grants-Pipeline-LATEST.xlsx` (o el dated más reciente)
- **Tracker de submissions sister skill:** `track-submitted-grants` (actualiza `shared-resources/grant-application-history.md`)
- **Scouting sister skill:** `scout-grants` / `grants-scouting-daily`
- **Sister skill que abre el outreach:** `outreach-emails`
