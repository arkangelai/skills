# Medical Insurance Audit — Skills Pipeline

Nine modular skills that implement the end-to-end audit pipeline for Colombian medical invoices (EPS–IPS), from Gmail intake to glosa (claim denial) delivery.

Each skill is **modular and independent** — they can run standalone or be chained together by an orchestrator.

Domain terms that remain in Spanish are proper nouns from Colombian healthcare regulation (glosa, RAD, RIPS, EPS, IPS, CUPS, BDUA, RETHUS, MIPRES, DIAN, causal, Anexo 6).

## Pipeline

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

## Skills

| Phase | # | Name | Key inputs / outputs |
|---|---|---|---|
| **Intake** | 1 | [`medical-invoice-gmail-intake`](./medical-invoice-gmail-intake) | → `metadata_input.json` |
| **Audit** | 2 | [`medical-invoice-document-understanding`](./medical-invoice-document-understanding) | `metadata_input.json` + all docs → `case_evidence.json` |
| | 3 | [`medical-invoice-admin-audit`](./medical-invoice-admin-audit) | `case_evidence.json` + `metadata_input.json` + `checklist_base.json` → audit output |
| | 4 | [`medical-invoice-medical-audit`](./medical-invoice-medical-audit) | `case_evidence.json` + `metadata_input.json` + `checklist_base.json` → audit output |
| | 5 | [`medical-invoice-financial-audit`](./medical-invoice-financial-audit) | `case_evidence.json` + `metadata_input.json` + `checklist_base.json` → audit output |
| | 6 | [`medical-invoice-consolidator-audit`](./medical-invoice-consolidator-audit) | audit outputs → `output.json` (hallazgos + observaciones) |
| **Claim denial** *(optional)* | 7 | [`medical-invoice-claim-denial-generator`](./medical-invoice-claim-denial-generator) | `output.json` → PDF |
| | 8 | [`medical-invoice-fix-review`](./medical-invoice-fix-review) | `output.json` → revised `output.json` |
| | 9 | [`medical-invoice-claim-denial-gmail-sender`](./medical-invoice-claim-denial-gmail-sender) | `output.json` + PDF → sent |

## Reference data

Each audit skill ships with support files that the agent loads at runtime. These are bundled inside each skill directory — no external downloads required.

**Admin audit** (`medical-invoice-admin-audit/`)
- `checklist_base.json` — DAMA-UK instrument, 27 rules (A01–A27)
- `checklist_base.md` — rule descriptions, evidence requirements, decision logic
- `checklist_soat_base.json` — SOAT-TEC variant for traffic-accident cases (21 rules S01–S21)

**Medical audit** (`medical-invoice-medical-audit/`)
- `checklist_base.json` — PERT-CLIN instrument, 29 rules (M01–M29)
- `checklist_base.md` — rule descriptions, evidence requirements, decision logic
- `guias-clinicas/INDEX.md` — maps CIE-10 prefixes to GPC files
- `guias-clinicas/GPC_*.md` — 6 clinical practice guidelines (hypertension, coronary syndrome, arrhythmias, heart failure, respiratory ICU, obstetric)

**Financial audit** (`medical-invoice-financial-audit/`)
- `checklist_base.json` — FIN-CTR instrument, 42 rules (F01–F42)
- `checklist_base.md` — rule descriptions, evidence requirements, anti-fraud patterns, decision logic
- `tarifarios/INDEX.md` — defines tariff precedence (contract > ISS 2001 > SOAT)
- `tarifarios/tarifario_contrato_eps_2026.csv` — contract-specific tariff sheet
- `tarifarios/tarifario_iss_2001.csv` — ISS 2001 fallback tariff
- `tarifarios/tarifario_soat_2026.csv` — SOAT legal floor tariff
- `planes/INDEX.md` — routes plan ID (ORO/PLATA/BASICO) to plan file
- `planes/plan_oro.md`, `plan_plata.md`, `plan_basico.md` — coverages, exclusions, caps, carency periods, copays

## Shared environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `GOGCLI_CREDENTIALS_PATH` | 1, 9 | Path to `gogcli` OAuth credentials |
| `GMAIL_WATCH_LABEL` | 1 | Label to watch (e.g. `INBOX`) |
| `GMAIL_SENDER_ADDRESS` | 9 | Address the glosa is sent from |

## Workflow states

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
