# Medical Insurance Audit — Skills Pipeline

Eight modular skills that implement the end-to-end audit pipeline for Colombian medical invoices (EPS–IPS), from Gmail intake to glosa (claim denial) delivery.

Each skill is **modular and independent** — they can run standalone or be chained together by an orchestrator.

Domain terms that remain in Spanish are proper nouns from Colombian healthcare regulation (glosa, RAD, RIPS, EPS, IPS, CUPS, BDUA, RETHUS, MIPRES, DIAN, causal, Anexo 6).

## Pipeline

```
                 ┌─────────────────────────────┐
                 │ 1. gmail-intake             │  (Gmail → destination software)
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
| 1 | [`medical-invoice-gmail-intake`](./medical-invoice-gmail-intake) | gogcli, destination software |
| 3 | [`medical-invoice-admin-audit`](./medical-invoice-admin-audit) | destination software, `bdua.json`, `contratos_ips.json` |
| 4 | [`medical-invoice-medical-audit`](./medical-invoice-medical-audit) | destination software, `gpc_resumidas.json` |
| 5 | [`medical-invoice-financial-audit`](./medical-invoice-financial-audit) | destination software, `tarifario_contractual.csv`, `contratos_ips.json`, `plan_afiliados.json`, `bdua.json` |
| 6 | [`medical-invoice-consolidator-audit`](./medical-invoice-consolidator-audit) | destination software, outputs from 3-4-5 |
| 7 | [`medical-invoice-claim-denial-generator`](./medical-invoice-claim-denial-generator) | destination software, PDF rendering engine |
| 8 | [`medical-invoice-fix-review`](./medical-invoice-fix-review) | destination software, skill 7 |
| 9 | [`medical-invoice-claim-denial-gmail-sender`](./medical-invoice-claim-denial-gmail-sender) | gogcli, destination software |

## Shared environment variables

Every skill except the Gmail ones assumes the **destination software** exposes a REST API or CLI. Until the final software is chosen, each skill documents the expected endpoints and uses placeholders.

| Variable | Used by | Purpose |
|---|---|---|
| `DEST_SOFTWARE_BASE_URL` | 1, 3-9 | Base URL of the destination software API |
| `DEST_SOFTWARE_API_KEY` | 1, 3-9 | API key or bearer token |
| `GOGCLI_CREDENTIALS_PATH` | 1, 9 | Path to `gogcli` OAuth credentials |
| `GMAIL_WATCH_LABEL` | 1 | Label to watch (e.g. `INBOX`) |
| `GMAIL_SENDER_ADDRESS` | 9 | Address the glosa is sent from |
| `REF_DATA_PATH` | 3, 4, 5 | Folder with reference JSON/CSV mocks |

## Standard labels (destination software)

| Label | Meaning | Applied by |
|---|---|---|
| `medical-invoice/intake` | Email classified as a medical invoice | skill 1 |
| `medical-invoice/not-applicable` | Not a medical invoice | skill 1 |
| `medical-invoice/error` | Intake error | skill 1 |
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
