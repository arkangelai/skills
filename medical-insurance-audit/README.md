# Medical Insurance Audit — Skills Pipeline

Eight modular skills that implement the end-to-end audit pipeline for Colombian medical invoices (EPS–IPS), from Gmail intake to glosa (claim denial) delivery.

Each skill is **modular and independent** — they can run standalone or be chained together by an orchestrator.

Domain terms that remain in Spanish are proper nouns from Colombian healthcare regulation (glosa, RAD, RIPS, EPS, IPS, CUPS, BDUA, RETHUS, MIPRES, DIAN, causal, Anexo 6).

## Pipeline

```
                 ┌─────────────────────────────┐
                 │ 1. gmail-intake             │  (Gmail → generates metadata_input.json)
                 └─────────────┬───────────────┘
                               │ case_id
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
 ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
 │ 3. admin     │      │ 4. medical   │     │ 5. financial │  (run in parallel, independent)
 │    audit     │      │    audit     │     │    audit     │
 └──────┬───────┘      └──────┬───────┘     └──────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                               ▼
                 ┌─────────────────────────────┐
                 │ 6. consolidator-audit       │  (dedup + Anexo 6 causales + labels)
                 └─────────────┬───────────────┘
                               ▼
                 ┌─────────────────────────────┐
                 │ 7. claim-denial-generator   │  (PDF v1)
                 └─────────────┬───────────────┘
                               ▼
                 ┌─────────────────────────────┐
                 │ 8. fix-review               │  (reads human comments ⇄ loops with 7)
                 └─────────────┬───────────────┘
                               ▼
                 ┌─────────────────────────────┐
                 │ 9. claim-denial-gmail-sender│  (delivery to IPS via Gmail)
                 └─────────────────────────────┘
```

## Skills

| # | Name | Dependencies |
|---|---|---|
| 1 | [`medical-invoice-gmail-intake`](./medical-invoice-gmail-intake) | gogcli |
| 3 | [`medical-invoice-admin-audit`](./medical-invoice-admin-audit) | `metadata_input.json`, `bdua.json`, `contratos_ips.json` |
| 4 | [`medical-invoice-medical-audit`](./medical-invoice-medical-audit) | `metadata_input.json`, `guias-clinicas/` |
| 5 | [`medical-invoice-financial-audit`](./medical-invoice-financial-audit) | `metadata_input.json`, `tarifario_contractual.csv`, `contratos_ips.json`, `plan_afiliados.json`, `bdua.json` |
| 6 | [`medical-invoice-consolidator-audit`](./medical-invoice-consolidator-audit) | outputs from skills 3-4-5 |
| 7 | [`medical-invoice-claim-denial-generator`](./medical-invoice-claim-denial-generator) | `metadata_input.json`, `output.json`, PDF rendering engine |
| 8 | [`medical-invoice-fix-review`](./medical-invoice-fix-review) | `output.json`, `comments.json`, skill 7 |
| 9 | [`medical-invoice-claim-denial-gmail-sender`](./medical-invoice-claim-denial-gmail-sender) | gogcli, `output.json`, `claim_denial.v*.pdf` |

## Shared environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `GOGCLI_CREDENTIALS_PATH` | 1, 9 | Path to `gogcli` OAuth credentials |
| `GMAIL_WATCH_LABEL` | 1 | Label to watch (e.g. `INBOX`) |
| `GMAIL_SENDER_ADDRESS` | 9 | Address the glosa is sent from |
| `REF_DATA_PATH` | 3, 4, 5 | Folder with reference JSON/CSV files (`bdua.json`, `contratos_ips.json`, etc.) |

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
