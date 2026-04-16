---
name: medical-invoice-audit-orchestrator
description: Orchestrates the end-to-end Colombian EPS medical-invoice audit pipeline (Res. 3047/2008). Explains what auditoria de cuentas medicas is, dispatches the right sub-skill at each stage (gmail-intake, three parallel audits, consolidator, fix-review, claim-denial-generator, claim-denial-gmail-sender), enforces the case state machine and Gmail label transitions, recovers from partial failures, and answers questions like "audit invoice X", "what state is RAD Y in", "send the glosa for case Z". Start here when a user mentions auditing medical invoices, glosas, IPS-EPS billing, or the audit pipeline as a whole.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, orchestrator, pipeline, colombia, eps, ips, glosa]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
required_environment_variables:
  - name: DEST_SOFTWARE_BASE_URL
    prompt: Base URL of the destination software (case store)
    required_for: full functionality
  - name: DEST_SOFTWARE_API_KEY
    prompt: API key / bearer token
    required_for: full functionality
  - name: REF_DATA_PATH
    prompt: Folder with tarifario_contractual.csv, contratos_ips.json, plan_afiliados.json, bdua.json, ruaf_snapshot.json, gpc_resumidas.json
    required_for: full functionality
---

# medical-invoice-audit-orchestrator

Top-level orchestrator for Colombian EPS medical-invoice auditing. This is the **entry point** when a user (or another agent) mentions auditoria de cuentas medicas, glosas, IPS billing, or the pipeline as a whole. It does not perform the audit itself; it routes to the right sub-skill based on the case's current state and emits a coherent summary of what to do next.

## Domain primer (read this if you do not know the field)

In Colombia, **EPS** (insurance / payer) and **IPS** (hospital / provider) are bound by Decreto 4747/2007 and Resolucion 3047/2008. The IPS provides a service, bills the EPS via DIAN electronic invoice + RIPS + clinical supports. The EPS audits the package and either pays, **emits glosas** (item-level objections), or returns the whole account (devolucion). The IPS has 15 dias habiles to defend or accept each glosa. Unresolved glosas escalate to conciliacion or Supersalud.

**Anexo 6 of Res. 3047** defines 7 glosa causales (1 No cobertura, 2 No pertinencia, 3 Soportes incompletos, 4 Cobro duplicado, 5 Tarifa incorrecta, 6 Agotamiento de cobertura, 7 Generica/devolucion). The skills in this set use a **strict 6-causal vocabulary** internally (`Facturacion | Tarifas | Soportes | Autorizacion | Cobertura | Pertinencia`) that maps to Anexo 6 at the consolidator boundary.

The audit splits into **three independent dimensions** (DAMA-UK + technical instruments):
- **Administrativa** (DAMA-UK, 27 rules) -- formal completeness, identity, RIPS structure, DIAN, authorizations, traceability.
- **Medica** (PERT-CLIN, 29 rules) -- clinical pertinence vs GPC, orders, surgical support, inpatient justification.
- **Financiera** (TARIFF-FRAUD, 42 rules) -- contractual tariff comparison, plan/coverage limits, copays, anti-fraud (phantom billing, upcoding, unbundling, post-mortem, double-payer).

Total: **98 rules** plus 14 anti-fraud cross-cuts. Each rule emits item-level findings.

## Pipeline overview

```
+--------- FLOW 1: INTAKE (~minutes) ----------+
| 1. medical-invoice-gmail-intake               |
|    Gmail -> classify -> parse XML/RIPS        |
|    -> file case -> Label: 0. Recibida         |
+----------------------------------------------+
                    |
                    v
+--------- FLOW 2: AUDIT (~3-6 minutes) -------+
|        +--- 2a. admin-audit       ---+       |
| 2 IN PARALLEL (independent):           |     |
|        +--- 2b. medical-audit     ---+       |
|        +--- 2c. financial-audit   ---+       |
|                    |                          |
|                    v                          |
|    3. consolidator-audit                     |
|       merge -> dedup -> route                |
|       -> Label: 1. Auditando -> 2. Auditada |
+----------------------------------------------+
                    |
                    v
+--------- FLOW 3: RESPONSE (~minutes) --------+
|    Routing decision (consolidator):          |
|      a) Lista para enviar (Facturacion/      |
|         Tarifas/Autorizacion only)           |
|         -> 4. claim-denial-generator         |
|         -> 5. claim-denial-gmail-sender      |
|         -> Label: 4. Notificada              |
|                                              |
|      b) Pendiente revision (any Soportes/    |
|         Cobertura/Pertinencia)               |
|         -> wait for human comments           |
|         -> 4. fix-review (loop)              |
|         -> approve -> denial-generator       |
|         -> sender                            |
+----------------------------------------------+
```

## When to Use

- The user asks to **audit an invoice** ("audit RAD 20260415-0023", "process the factura from Hospital X").
- The user asks **"what state is case Y in"** or **"what is the next step for RAD Z"**.
- A new email arrives in the watched Gmail inbox and the orchestrator is the entry point.
- A failure interrupted the pipeline and someone asks **"resume case W"** or **"why is case W stuck"**.
- The user wants a **batch run** ("audit all invoices radicadas this week").
- The user asks an explanatory question: **"how does the audit pipeline work"**, **"what does an admin audit check"**, **"what causales exist"**.

**Do not use:** for direct edits to a single finding (delegate to `fix-review`); for one-off PDF inspection (open the document directly); for ref_data administration (separate ops skill).

## State machine

The case carries `status` in the destination software AND a Gmail label on the original filing thread. Both must stay in sync; the orchestrator is responsible for the invariant.

| Case status | Gmail label | Owner | Next skill |
|---|---|---|---|
| `received` | `0. Recibida` | intake | dispatch the 3 parallel audits |
| `auditing` | `1. Auditando` | sub-agents | consolidator (when all 3 finished) |
| `audited` | `2. Auditada` | consolidator | route by `case_status` |
| `audited` + `case_status = "Lista para enviar"` | `2. Auditada` | orchestrator | denial-generator -> sender |
| `audited` + `case_status = "Pendiente revision"` | `2. Auditada` + `needs-human-review` | human | fix-review (on each comment) |
| `claim_denial_draft` | `2. Auditada` | denial-generator | sender (or fix-review if rejected) |
| `claim_denial_ready` | `3. Glosada` | sender or human | claim-denial-gmail-sender |
| `claim_denial_sent` | `4. Notificada` | (terminal for this pipeline) | wait for IPS response (out of scope) |
| `error` | `error` | orchestrator | inspect, log, possibly reprocess |

Invariants enforced by this orchestrator:
- Exactly one numbered Gmail label at any time (`{0. Recibida, 1. Auditando, 2. Auditada, 3. Glosada, 4. Notificada}` are mutually exclusive).
- A failed downstream stage NEVER advances the label. If the medical sub-agent crashes, label stays at `1. Auditando` and the case is re-enqueued by a sweeper.
- The `case_status` (`Lista para enviar` | `Pendiente revision`) is set by the consolidator and is the routing source of truth.

## Procedure

1. **Identify the user intent.** If the user gave a specific RAD/case_id, read its current state. If they gave free text ("audit case from Hospital X"), search by IPS NIT or invoice number. If they asked an explanatory question, answer from the Domain primer above without dispatching anything.

2. **Read the current case state.**
   ```
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/labels
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/audits
   GET {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/consolidated   # 404 is fine, means not consolidated yet
   ```
   Report current status, current label, presence of each sub-audit, presence of consolidated, latest document version.

3. **Detect inconsistencies before acting.** Common ones:
   - Label is `2. Auditada` but only 2 of 3 sub-audits exist -> rerun the missing one.
   - `consolidated.case_status = "Pendiente revision"` but no `needs-human-review` label -> apply the label.
   - `claim_denial_sent` status but no entry in `claim-denial-delivery` -> verify the send actually happened or re-dispatch sender in idempotent mode.
   - Document v3 exists but `claim-denial-sent` references v2 -> regenerated after send; flag for human attention.

4. **Dispatch the right sub-skill** based on state.

   | Current state | Next action | Skill |
   |---|---|---|
   | New email, no case yet | parse + file | `medical-invoice-gmail-intake` |
   | `received` (`0. Recibida`) | dispatch 3 in parallel | `medical-invoice-admin-audit`, `medical-invoice-medical-audit`, `medical-invoice-financial-audit` |
   | All 3 audits done, no consolidated | merge | `medical-invoice-consolidator-audit` |
   | `case_status = "Lista para enviar"`, no document | generate | `medical-invoice-claim-denial-generator` |
   | Document exists, label `claim-denial-ready`, not sent | send | `medical-invoice-claim-denial-gmail-sender` |
   | `case_status = "Pendiente revision"`, new comments | apply edits | `medical-invoice-fix-review` |
   | `error` | inspect, then reroute or escalate | (manual) |

5. **Run sub-skill, capture output, update orchestrator log.**
   ```
   POST {DEST_SOFTWARE_BASE_URL}/cases/{case_id}/orchestrator-log
   {
     "ts": "2026-04-15T10:23:00-05:00",
     "skill_dispatched": "medical-invoice-financial-audit",
     "input_state": { "status": "received", "label": "0. Recibida" },
     "output_status": "ok | error",
     "output_payload": {...}
   }
   ```

6. **Verify the state transition.** After the sub-skill returns, re-read the case. Confirm:
   - Label advanced as expected (and only one numbered label is set).
   - Status field updated.
   - Any expected payload (audit, consolidated, document) is now present.
   If not, log the mismatch and DO NOT advance further -- escalate.

7. **Loop or finish.** If state allows another step (e.g. consolidated -> generator -> sender) without human input, continue. Otherwise return a summary to the user with: current state, what was just done, what is next, who is the next actor (machine or human).

## Output format (summary returned to caller)

```json
{
  "case_id": "c_abc123",
  "rad": "20260415-0023",
  "ips": "Hospital Pablo Tobon Uribe",
  "invoice_number": "FV-2026-04172",
  "current_status": "claim_denial_ready",
  "current_label": "3. Glosada",
  "case_status": "Lista para enviar",
  "actions_taken": [
    { "ts": "...", "skill": "medical-invoice-consolidator-audit", "result": "ok" },
    { "ts": "...", "skill": "medical-invoice-claim-denial-generator", "result": "ok", "version": "v1" }
  ],
  "next_action": {
    "skill": "medical-invoice-claim-denial-gmail-sender",
    "actor": "machine",
    "blocking": null
  },
  "summary": "Caso auditado, 3 glosas (Tarifas + Facturacion), $2.4M objetado. Documento v1 generado. Listo para envio al prestador."
}
```

When blocked on a human:
```json
{
  ...
  "next_action": {
    "skill": "medical-invoice-fix-review",
    "actor": "human",
    "blocking": "Esperando comentario de auditor medico (causal Pertinencia en item M00102)"
  }
}
```

## Pitfalls

- **Symptom:** orchestrator dispatches the consolidator but only 2 of 3 audits are present. **Cause:** medical sub-agent failed silently. **Fix:** before dispatching consolidator, verify ALL three `audit_type` values exist in `/audits`. If any missing, re-dispatch the missing audit (idempotent).
- **Symptom:** orchestrator advances label after a sub-skill returned `error`. **Cause:** caller did not check `output_status`. **Fix:** state-transition only on confirmed success; on `error`, leave the label and append to orchestrator log.
- **Symptom:** orchestrator runs the same skill twice on the same case in quick succession. **Cause:** webhook + cron both fired. **Fix:** orchestrator-log lookup before dispatch (`SELECT * WHERE case_id=X AND skill=Y AND ts>now-5min`) -- if found, skip.
- **Symptom:** human review case auto-sent. **Cause:** orchestrator skipped the `case_status = "Pendiente revision"` check after consolidation. **Fix:** routing reads `consolidated.case_status` strictly. Pendiente revision NEVER triggers generator/sender automatically; the next dispatch only happens when fix-review completes with `intent=approve`.
- **Symptom:** RAD Y stuck at `1. Auditando` for 2 days. **Cause:** sub-agent crashed and no sweeper. **Fix:** orchestrator's "what state is" query for any case > 30 min in `1. Auditando` reports it as stuck. A separate sweeper cron re-enqueues these.
- **Symptom:** orchestrator answer mixes Spanish and English. **Cause:** prompt drift. **Fix:** user-facing summaries in Spanish (Colombian field language); internal logs and JSON keys in English.
- **Symptom:** orchestrator answers an explanatory question by dispatching a real audit. **Cause:** intent classification too eager. **Fix:** if the user message has no specific RAD/case_id and is shaped like a question ("how does", "what is", "explain"), reply from the Domain primer; do NOT dispatch.
- **Symptom:** orchestrator picks an outdated document version when sending. **Cause:** sorted by `created_at` instead of numeric version. **Fix:** sort documents by `int(version[1:])` descending.
- **Symptom:** label `0. Recibida` never gets removed when advancing to `1. Auditando`. **Cause:** apply-only modify. **Fix:** every label transition uses `addLabelIds` AND `removeLabelIds` in the same Gmail API call.
- **Symptom:** orchestrator-log writes succeed but state-transition writes fail. **Cause:** API call ordering. **Fix:** state-transition first; orchestrator-log AFTER. If state-transition fails, never log "success".

## Verification

- For every case the orchestrator touched: an entry exists in `/orchestrator-log` with `skill_dispatched` and `output_status`.
- Exactly one numbered Gmail label is present at all times: `{0. Recibida, 1. Auditando, 2. Auditada, 3. Glosada, 4. Notificada}`.
- Cases at `claim_denial_sent` have a matching `/claim-denial-delivery` entry; `notification_datetime` has `-05:00` offset (Bogota).
- For every case at `2. Auditada`: all three sub-audits exist (`/audits` has 3 records, one per `audit_type`).
- Cases with `consolidated.case_status = "Pendiente revision"` have a `needs-human-review` label and no `claim-denial-ready` label.
- No case has both `1. Auditando` and `4. Notificada` simultaneously (state regression check).
- Explanatory questions ("how does X work") return text answers without any dispatched skill (zero entries in orchestrator-log for those interactions).
- For `error` cases: a clear escalation note exists, and the orchestrator-log entry has `output_payload.error` populated.

## References

- Decreto 4747/2007 -- relacion EPS-IPS, glosas bilaterales.
- Resolucion 3047/2008, Anexo 6 -- 7 causales de glosa, plazos.
- Resolucion 1536/2022 -- estructura RIPS.
- Resolucion 1995/1999 -- historia clinica.
- Sub-skills (dispatched by this orchestrator):
  - `medical-invoice-gmail-intake`
  - `medical-invoice-admin-audit`
  - `medical-invoice-medical-audit`
  - `medical-invoice-financial-audit`
  - `medical-invoice-consolidator-audit`
  - `medical-invoice-fix-review`
  - `medical-invoice-claim-denial-generator`
  - `medical-invoice-claim-denial-gmail-sender`
- Sura demo (real implementation reference): https://github.com/arkangelai/audit-workflow/tree/main/demos/sura-demo
