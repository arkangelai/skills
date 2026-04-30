# Medical Insurance Audit — Flujos y Skills

Esta área contiene **tres flujos de auditoría independientes** para facturas médicas colombianas (EPS–IPS). Cada flujo tiene un `task_type` distinto, un contrato de input/output propio y un conjunto de skills que no se solapan con los de los otros flujos. Un orquestador nunca debe mezclar skills de flujos distintos en una misma ejecución.

Domain terms that remain in Spanish are proper nouns from Colombian healthcare regulation (glosa, RAD, RIPS, EPS, IPS, CUPS, BDUA, RETHUS, MIPRES, DIAN, causal, Anexo 6).

## Flujos

| Flujo | `task_type` | Quién lo usa | Skills involucrados | Output final |
|---|---|---|---|---|
| **1 — EPS audita factura IPS** | `medical_invoice_audit` | EPS / aseguradora | Skills 1–9 | `output.json` |
| **2 — IPS self-audit** | `medical_invoice_audit` + `audit_perspective = "hospital"` | IPS antes de radicar | Skills 2–6 (sin Phase 3) | `output.json` |
| **3 — IPS responde una glosa** | `hospital_devolucion_audit` | IPS al recibir glosa de EPS | `hospital-devolucion-audit` | `devolucion_output.json` |

Los flujos 1 y 2 comparten el mismo conjunto de skills; la diferencia es `audit_perspective` en el contexto de la tarea y si se ejecuta o no Phase 3. El flujo 3 es completamente independiente: skill distinto, input distinto (`context.json` en lugar de `metadata_input.json`), y no produce ni consume ningún archivo de los flujos 1 y 2.

## Pipeline — Flujos 1 y 2

> Aplica exclusivamente a `task_type = medical_invoice_audit`. No aplica al flujo 3.

The pipeline runs in three phases: an isolated intake that enqueues cases, a sequential audit core that produces `output.json`, and optional claim-denial skills triggered on user request.

**Phase 1 — Intake (isolated, enqueues tasks)**

```
                 ┌─────────────────────────────────────────┐
                 │ 1. gmail-intake                         │
                 │    Gmail → metadata_input.json          │
                 │    → enqueues case for audit            │
                 └─────────────────────────────────────────┘
```

**Phase 2 — Audit (sequential, isolated → consolidated output)**

Each audit skill runs **isolated** — it does not see results from the other audit skills. The sequence is fixed: document understanding first (produces the shared evidence layer), then admin → medical → financial in order, then consolidation.

```
              ┌───────────────────────────────┐
              │ 2. document-understanding     │
              │    all docs → case_evidence   │
              │    .json                      │
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ 3. admin-audit                │
              │    case_evidence.json +       │
              │    metadata_input.json        │
              │    → admin_checklist_output   │
              │    .json                      │
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ 4. medical-audit              │
              │    case_evidence.json +       │
              │    metadata_input.json        │
              │    → medical_checklist_output │
              │    .json                      │
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ 5. financial-audit            │
              │    case_evidence.json +       │
              │    metadata_input.json        │
              │    → financial_checklist      │
              │    _output.json               │
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ 6. consolidator-audit         │
              │    3 checklists → output.json │
              │    hallazgos + observaciones  │
              └───────────────┬───────────────┘
                              ▼
                         output.json
```

**Phase 3 — Claim denial (optional, each skill invoked independently)**

```
              ┌───────────────────────────────┐
              │ 7. claim-denial-generator     │  (PDF v1)
              └───────────────────────────────┘

              ┌───────────────────────────────┐
              │ 8. fix-review                 │  (human comments ⇄ revised output.json)
              └───────────────────────────────┘

              ┌───────────────────────────────┐
              │ 9. claim-denial-gmail-sender  │  (delivery to IPS via Gmail)
              └───────────────────────────────┘
```

## Flujo 3 — hospital-devolucion-audit

> `task_type = hospital_devolucion_audit`

Skill standalone que analiza glosas recibidas de la EPS y construye la respuesta argumental ítem por ítem para que la IPS defienda, acepte o reradique cada cargo.

**Input:** `context.json` (schema `hospitals/devolucion/context`) + documentos clínicos en el directorio de trabajo.

**Outputs:**
- `progress-respuesta.json` — análisis detallado por ítem (schema `hospitals/devolucion/progress-respuesta`)
- `devolucion_output.json` — resumen consolidado para el UI de Salmona (schema `hospitals/devolucion/output`)

**Aislamiento:** ningún archivo de este flujo (`context.json`, `progress-respuesta.json`, `devolucion_output.json`) es producido o consumido por los skills 1–9. El directorio de trabajo de un caso `hospital_devolucion_audit` nunca contiene `metadata_input.json`, `case_evidence.json`, `admin_checklist_output.json`, `medical_checklist_output.json`, `financial_checklist_output.json` ni `output.json`.

## Skills — Flujos 1 y 2

| Phase | # | Name | Key inputs / outputs |
|---|---|---|---|
| **Intake** | 1 | [`medical-invoice-gmail-intake`](./medical-invoice-gmail-intake) | → `metadata_input.json` |
| **Audit** | 2 | [`medical-invoice-document-understanding`](./medical-invoice-document-understanding) | `metadata_input.json` + all docs → `case_evidence.json` |
| | 3 | [`medical-invoice-admin-audit`](./medical-invoice-admin-audit) | `case_evidence.json` + `metadata_input.json` + `checklist_base.json` → audit output |
| | 4 | [`medical-invoice-medical-audit`](./medical-invoice-medical-audit) | `case_evidence.json` + `metadata_input.json` + `checklist_base.json` + `$GUIAS_CLINICAS_PATH` → audit output |
| | 5 | [`medical-invoice-financial-audit`](./medical-invoice-financial-audit) | `case_evidence.json` + `metadata_input.json` + `checklist_base.json` + `$TARIFARIOS_PATH` + `$PLANES_PATH` → audit output |
| | 6 | [`medical-invoice-consolidator-audit`](./medical-invoice-consolidator-audit) | audit outputs → `output.json` (hallazgos + observaciones) |
| **Claim denial** *(optional)* | 7 | [`medical-invoice-claim-denial-generator`](./medical-invoice-claim-denial-generator) | `output.json` → PDF |
| | 8 | [`medical-invoice-fix-review`](./medical-invoice-fix-review) | `output.json` → revised `output.json` |
| | 9 | [`medical-invoice-claim-denial-gmail-sender`](./medical-invoice-claim-denial-gmail-sender) | `output.json` + PDF → sent |
| **Flujo 3** | — | [`hospital-devolucion-audit`](./hospital-devolucion-audit) | `context.json` + docs → `progress-respuesta.json` + `devolucion_output.json` |

## Reference data

Each audit skill ships with checklist templates (bundled inside the skill directory). Clinical guidelines, tariff schedules, and plan definitions are **external** — the calling agent must provide their location via environment variables.

**Admin audit** (`medical-invoice-admin-audit/`) — bundled, no env vars required
- `checklist_base.json` — DAMA-UK instrument, 27 rules (A01–A27)
- `checklist_base.md` — rule descriptions, evidence requirements, decision logic
- `checklist_soat_base.json` — SOAT-TEC variant for traffic-accident cases (21 rules S01–S21)

**Medical audit** (`medical-invoice-medical-audit/`) — optionally uses `GUIAS_CLINICAS_PATH`
- `checklist_base.json` — PERT-CLIN instrument, 29 rules (M01–M29)
- `checklist_base.md` — rule descriptions, evidence requirements, decision logic
- External: `$GUIAS_CLINICAS_PATH/INDEX.md` — maps CIE-10 prefixes to GPC files
- External: `$GUIAS_CLINICAS_PATH/GPC_*.md` — clinical practice guidelines per pathology

**Financial audit** (`medical-invoice-financial-audit/`) — requires `TARIFARIOS_PATH` and `PLANES_PATH`
- `checklist_base.json` — FIN-CTR instrument, 42 rules (F01–F42)
- `checklist_base.md` — rule descriptions, evidence requirements, anti-fraud patterns, decision logic
- External: `$TARIFARIOS_PATH/INDEX.md` — defines tariff precedence (contract > ISS 2001 > SOAT)
- External: `$TARIFARIOS_PATH/tarifario_*.csv` — tariff schedule files
- External: `$PLANES_PATH/INDEX.md` — routes plan ID (ORO/PLATA/BASICO) to plan file
- External: `$PLANES_PATH/plan_*.md` — coverages, exclusions, caps, carency periods, copays

## Shared environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `GOGCLI_CREDENTIALS_PATH` | 1, 9 | Path to `gogcli` OAuth credentials |
| `GMAIL_WATCH_LABEL` | 1 | Label to watch (e.g. `INBOX`) |
| `GMAIL_SENDER_ADDRESS` | 9 | Address the glosa is sent from |
| `GUIAS_CLINICAS_PATH` | 4 | **Optional.** Absolute path to directory with `INDEX.md` + `GPC_*.md` clinical guidelines. If not set, GPC-dependent rules (M04, M06, M10, M14, M19, M22) are marked `n/a`. |
| `TARIFARIOS_PATH` | 5 | **Required.** Absolute path to directory with `INDEX.md` + `tarifario_*.csv` tariff files |
| `PLANES_PATH` | 5 | **Required.** Absolute path to directory with `INDEX.md` + `plan_*.md` plan files |

## Audit perspectives

The `medical-audit` skill (skill 4) supports two perspectives set via **task context** (`task.context.audit_perspective`), not an environment variable — the same agent handles both depending on who creates the task:

| `task.context.audit_perspective` | Who creates the task | What it produces |
|---|---|---|
| `aseguradora` *(default)* | Payer queues an audit of an IPS invoice | Glosas — payment denials addressed to the IPS billing team |
| `hospital` | IPS queues a self-audit before billing | Riesgos de glosa — internal warnings to correct documentation before submitting to the payer |

All 29 PERT-CLIN clinical rules apply identically in both perspectives. The only behavioral difference is in **M18** (non-PBS medications): in both cases the same check is performed (is MIPRES present?), but `observaciones` and `resumen_ejecutivo` use internal correction language when perspective is `hospital`.

**How to activate each perspective:**
- `aseguradora`: created automatically by skill 1 (gmail-intake) or manually via `ark tasks create` — this is the default.
- `hospital`: create the task manually via `ark tasks create` with `context.audit_perspective = "hospital"`. Do not use skill 1 for hospital self-audits — email intake always produces `aseguradora` cases.

The consolidator (skill 6) reads `meta.audit_perspective` from the medical checklist and propagates it to `output.json.resumen.audit_perspective`. Skills 7, 8, and 9 (claim-denial generation and delivery) are external systems — they should check `output.json.resumen.audit_perspective` before running and skip Phase 3 for `hospital` cases.

## Workflow states

> Aplica solo a los flujos 1 y 2 (`task_type = medical_invoice_audit`). El flujo 3 (`hospital_devolucion_audit`) no usa este vocabulario de labels ni status.

Each skill reads and writes status from `output.json resumen.label` and `resumen.status`. The table below documents the vocabulary:

| Label / status | Meaning | Set by |
|---|---|---|
| `medical-invoice/intake` | Email classified as a medical invoice (Gmail label) | skill 1 |
| `medical-invoice/not-applicable` | Not a medical invoice (Gmail label) | skill 1 |
| `medical-invoice/error` | Intake error (Gmail label) | skill 1 |
| `auto-approve` | Green zone, automatic approval | skill 6 |
| `needs-human-review` | Yellow zone or low confidence | skill 6 |
| `auto-denial` | Red zone, automatic glosa | skill 6 |
| `needs-fix-review` | Contradictory findings between auditors | skill 6 |
| `claim-denial-ready` | PDF approved by human | skill 8 |
| `claim-denial-sent` | Glosa delivered to the IPS | skill 9 |

## Regulatory references

- **Resolución 3047/2008** — Glosas, causales (Anexo 6, codes 1–7), timelines (30 days to notify, 15 business days to respond).
- **Resolución 1536/2022** — RIPS file structure.
- **Resolución 1995/1999** — Minimum content of the clinical history.
- **Resolución 2481/2020** — Plan de Beneficios en Salud (PBS).
- **Decreto 4747/2007** — Contractual relationships between EPS and IPS.
- **Ley 100/1993** — SGSSS (Social Security Health System) framework.
