---
name: deal-health
description: Audit any open deal against the Arkangel sales submarine — which compartments are closed, which are open, what's missing to advance, who hasn't been touched, and the risk of stalling. Use to triage pipeline, unblock stuck deals, or prep a sales review.
---

# Deal Health

`deal-health` is the diagnostic skill for the pipeline. It tells you which deals are alive, which are stuck, and exactly what's missing to advance — measured against the submarine compartments in `SALES.md`.

## When to Use

- Weekly pipeline review or before a 1:1 con el lead comercial.
- A deal hasn't moved in 2+ weeks and you want to know why.
- The owner says "cómo va el deal con X", "qué le falta a Y", "qué deals están en riesgo".
- Before forecast — to flag deals that are actually stalled vs the ones that look open in Attio but are dead.

**Do not use** for closed-won/lost deals (run a postmortem instead) or for prospects without a deal in Attio.

## Inputs

- **One deal mode:** deal ID or company name.
- **Pipeline mode:** no input → audita todos los deals abiertos en Attio.
- **Filtered mode:** filter (stage, owner, last activity date).

If Attio MCP is unavailable, ask the user for the deal data inline (compartment, stakeholders, last meeting, blockers).

## Procedure

1. **Fetch deal state.**
   - Single deal: pull from Attio with all fields (`pipeline_stage`, stakeholders, `pain_quantified_cop`, `last_meeting_date`, `next_meeting_date`, `blockers`, notes history).
   - Pipeline mode: pull all deals where `pipeline_stage` not in (`won`, `lost`).

2. **For each deal, run the audit checklist** — one row per compartment, mark closed / open / not-yet:

   | Compartment | Criterion | Evidence required |
   |---|---|---|
   | 1. Qualify dolor | Match dolor + presupuesto + DMs | Notes mention dolor concreto, presupuesto reconocido, lista de DMs |
   | 2. Diagnose dolor | Dolor cuantificado + ROI + champion identificado | `pain_quantified_cop` populated, champion contact set |
   | 3. Champion kit | Champion vendió internamente y agendó próxima | `next_meeting_date` set with DMs in attendees |
   | 4. DMs cercanos | DMs vieron propuesta + validaron precio | DM emails appended, price-bracket sent |
   | 5. Procurement | Vendor form + condiciones aceptadas | Note "procurement done" |
   | 6. Legal | Contrato + DPA / BAA / Hab. Datos | Note "legal signed" |
   | 7. Security | Cuestionario + arquitectura validada | Note "security cleared" |

3. **Compute deal health score (0–10).**
   - +1 per compartment closed (max 7).
   - +1 if `last_meeting_date` < 14 days.
   - +1 if `next_meeting_date` set in the future.
   - +1 if `pain_quantified_cop` > 0.
   - −2 if `last_meeting_date` > 30 days and no `next_meeting_date`.
   - −1 per blocker without owner.

4. **Identify the gap.**
   - Which compartment is open? What specific evidence is missing to close it?
   - Is the gap **information** (we don't know yet) or **action** (we know what's needed but haven't done it)?

5. **Stakeholder coverage check.**
   - Champion identificado? Sí / No.
   - DMs identificados? Lista vs lo que esperarías por sector (CFO, CMO, CIO, CISO típicamente en healthtech enterprise).
   - Algún detractor conocido?
   - Quién no hemos tocado y deberíamos?

6. **Stall risk assessment.**
   Flag the deal as one of:
   - 🟢 **Healthy** — moving, score ≥ 7, last meeting < 14 days, next meeting set.
   - 🟡 **Slowing** — score 4–6, or last meeting 14–30 days, no next meeting.
   - 🔴 **Stalled** — score < 4, last meeting > 30 days, or critical blocker without owner.
   - ⚫ **Dead — close as lost** — > 60 days no contact + no response to 3 follow-ups.

7. **Recommended next action.**
   One concrete action, owned by someone, with a deadline. Not "follow up" — say what to do, with whom, by when.

8. **Output structure.**

   ```markdown
   # Deal Health — <Company> · <Date>

   ## Status: <🟢 / 🟡 / 🔴 / ⚫>  Score: <N>/10

   ## Submarino
   - 1. Qualify dolor       [✅ closed / 🟡 open / ⬜ not yet]
   - 2. Diagnose dolor      [..]
   - 3. Champion kit        [..]
   - 4. DMs cercanos        [..]
   - 5. Procurement         [..]
   - 6. Legal               [..]
   - 7. Security            [..]

   ## Open compartment
   <N — what specifically is missing>

   ## Stakeholder coverage
   - Champion: <name or "missing">
   - DMs identificados: <list vs expected for sector>
   - Detractores conocidos: <list>
   - Sin tocar (deberías): <list>

   ## Blockers activos
   <bullets, con owner si lo hay>

   ## Riesgo
   <1–2 frases sobre por qué puede stallear>

   ## Próxima acción recomendada
   <quién hace qué con quién, para cuándo>
   ```

   En **modo pipeline**, agrega una tabla resumen al inicio con todos los deals ordenados por score ascendente (los peores primero).

## Pitfalls

- **Síntoma:** un deal aparece como 🟢 healthy pero el prospecto no responde hace 3 semanas. **Causa:** la skill confió en `pipeline_stage` sin mirar `last_meeting_date`. **Fix:** el score debe penalizar fuertemente el gap de actividad reciente.
- **Síntoma:** la skill recomienda "hacer follow-up" como next action. **Causa:** prompt débil. **Fix:** la next action debe nombrar persona, canal y outcome esperado ("Llamar a María, CFO, para validar el price bracket Better antes del viernes").
- **Síntoma:** la skill marca compartimento 4 como abierto cuando en realidad nunca cerró el 2. **Causa:** confió en lo que dijo el `pipeline_stage` sin validar evidencia. **Fix:** la auditoría no se basa en el campo `pipeline_stage`, se basa en la evidencia (notas + campos).
- **Síntoma:** en pipeline mode, los deals 🔴 stalled siguen apareciendo semana tras semana sin acción. **Causa:** falta cerrar como lost los muertos. **Fix:** después de 60 días sin contacto + 3 follow-ups sin respuesta, el output recomienda explícitamente "close as lost" con razón.

## Verification

- Cada compartimento marcado como `closed` tiene evidencia concreta citada.
- El score numérico coincide con la fórmula del paso 3.
- La next action incluye persona + canal + outcome + fecha.
- Si el deal está 🔴 o ⚫, el output dice qué hacer hoy (no "monitorear").

## References

- [`SALES.md`](../../SALES.md) — criterios de cierre por compartimento.
- [`precall-brief`](../precall-brief/) — para preparar la próxima reunión que destrabe el deal.
- [`postcall-recap`](../postcall-recap/) — para que el estado del deal en Attio refleje la realidad.
