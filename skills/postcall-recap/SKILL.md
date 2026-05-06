---
name: postcall-recap
description: Convert a sales meeting transcript into a structured recap (decisions, pains uncovered, stakeholders, blockers, next step), update the deal in Attio, and draft the follow-up email with the next Up-Front Contract. Use after every sales meeting.
---

# Postcall Recap

`postcall-recap` is the closing half of every sales meeting. It takes the transcript, extracts what mattered, updates the deal in Attio, and writes the follow-up email with the next Up-Front Contract — so no information falls through the cracks between calls.

## When to Use

- Right after any sales meeting where a transcript exists (Fireflies, Otter, Granola, Zoom AI, manual notes).
- When the owner says "qué quedó de la reunión", "actualiza el deal", or "mándame el follow-up".
- Before pushing any update to Attio after a meeting — this skill does it for you.

**Do not use** for non-sales meetings, internal team calls, or meetings without a transcript (in that case, ask the user for raw notes first).

## Inputs

- **Required:** transcript (text paste, file path, or URL).
- **Optional:** Attio deal ID, attendee list, name of the meeting tool used.

If transcript is missing, ask once. Do not invent recap from nothing.

## Procedure

1. **Identify the deal.**
   - Try Attio MCP: search by company name in transcript, attendee emails, or explicit deal ID.
   - If multiple matches, ask which one.
   - If no match and Attio is available: offer to create the deal at the end (don't auto-create silently).

2. **Extract the recap from transcript.**
   Pull these elements verbatim or near-verbatim:

   - **Pains uncovered:** quotes of the prospect describing problems. Tag each one as: síntoma / impacto operativo / impacto financiero / impacto personal.
   - **Quantified pain:** any number mentioned (volumen, tiempo perdido, dinero perdido, % de error). If none surfaced, flag it as missing.
   - **Stakeholders:** who attended, who was named but absent (jefe, equipo, otros DMs), with role.
   - **Decisions made:** what got agreed in the meeting (next meeting, who attends, what we send).
   - **Blockers:** explicit blockers mentioned by the prospect (presupuesto, timing, otra prioridad, otro vendor).
   - **Next step:** what was committed by both sides and by when.

3. **Map the recap to a compartment transition.**
   - Did this meeting close the open compartment? Match against the exit criteria in `SALES.md`.
   - If yes: state which compartment opens next.
   - If no: state what's missing to close it. The next meeting must aim at the same compartment.

4. **Update Attio.**
   Via the Attio MCP, update the deal:

   - `pipeline_stage` — only advance if the compartment closed; otherwise leave it.
   - `pain_quantified_cop` — set if a number was extracted.
   - `champion_email` — set/update if a champion emerged.
   - `decision_makers` — append any DM mentioned.
   - `blockers` — overwrite with the current blocker list.
   - `last_meeting_date` — today.
   - `next_meeting_date` — if committed in the call.
   - Add a **note** to the deal with the full recap (sections below).

   If Attio is unavailable, output the same data as a markdown block and tell the user to paste it manually.

5. **Draft the follow-up email.**
   Email to the primary attendee on the prospect side. Structure:

   - Greeting + thanks.
   - 3 bullets: lo que entendí del dolor, lo que acordamos, lo que sigue.
   - **Next Up-Front Contract:** propuesta de próxima reunión con tiempo / agenda / outcomes / asistentes esperados.
   - Sign-off.

   Keep it under 150 words. Do not attach materials in this draft — that's a separate skill.

6. **Output structure.**

   ```markdown
   # Postcall Recap — <Company> · Reunión <N>

   ## Compartimento
   - Abierto al iniciar: <N>
   - Cerrado en esta reunión: <yes/no>
   - Próximo a cerrar: <N+1 or same N>

   ## Dolor encontrado
   <bullets, con quote y categoría>

   ## Cuantificación del dolor
   <número en COP/USD o "missing — pedir en próxima reunión">

   ## Stakeholders
   - Presentes: <list>
   - Mencionados (ausentes): <list>

   ## Decisiones
   <bullets>

   ## Blockers
   <bullets>

   ## Next step
   <quién hace qué para cuándo>

   ## Attio update
   <campos actualizados, o markdown para pegar si Attio no respondió>

   ## Follow-up email (draft)
   <texto del email>
   ```

## Pitfalls

- **Síntoma:** el recap inventa dolor que el prospecto no dijo. **Causa:** el LLM completó "lo que probablemente quería decir". **Fix:** cada bullet de dolor debe tener un quote o referencia explícita al transcript. Si no hay, no se incluye.
- **Síntoma:** se avanza `pipeline_stage` cuando el compartimento no cerró. **Causa:** se confundió "se habló de X" con "X quedó cerrado". **Fix:** el avance solo ocurre si los criterios de cierre del `SALES.md` se cumplen. Cuando hay duda, no avanzar.
- **Síntoma:** la cuantificación del dolor sale en moneda mezclada (USD y COP) o sin moneda. **Causa:** el prospecto dijo el número sin especificar. **Fix:** asume COP por defecto en deals locales; pide confirmación al usuario si hay ambigüedad.
- **Síntoma:** el follow-up email no incluye un UFC. **Causa:** se trató como "thank you note". **Fix:** todo follow-up incluye una propuesta concreta de próxima reunión con outcomes posibles. Sin UFC, el deal pierde momentum.
- **Síntoma:** se duplican notas en Attio (la misma reunión queda dos veces). **Causa:** se corrió la skill dos veces sobre el mismo transcript. **Fix:** la skill verifica si ya hay nota con la misma fecha antes de crear una nueva.

## Verification

- Cada bullet de dolor tiene quote o cita del transcript.
- `pipeline_stage` en Attio refleja la realidad del compartimento (no avanzó si no cerró).
- El email tiene UFC explícito y se lee en menos de 30 segundos.
- Si Attio estaba caído, el output incluye el bloque markdown listo para pegar.

## References

- [`SALES.md`](../../SALES.md) — criterios de cierre por compartimento.
- [`precall-brief`](../precall-brief/) — el paso anterior, antes de la reunión.
- [`deal-health`](../deal-health/) — auditoría periódica del deal.
