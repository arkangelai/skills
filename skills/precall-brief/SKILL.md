---
name: precall-brief
description: Prepare for any sales meeting by reading the deal state, identifying which submarine compartment is open, and producing a brief plus an Up-Front Contract calibrated to the meeting's objective. Use before every sales call, demo, or stakeholder meeting.
---

# Precall Brief

`precall-brief` is the universal "preparación de reunión" skill for the Arkangel sales submarine. It reads where the deal is, decides what this meeting must close, and hands you a brief plus a verbal Up-Front Contract ready to deliver.

## When to Use

- Before any sales meeting, demo, or stakeholder call.
- When picking up an old deal after weeks without contact.
- Before sending materials (deck, proposal, security pack) to a champion or decision maker — to confirm what they need.
- When the owner says "tengo reunión con X mañana, prepárame" or "qué tengo que lograr en esta call".

**Do not use** for cold outbound (no deal exists yet), internal team meetings, or post-meeting recap (use `postcall-recap`).

## Inputs

- **Required:** prospecto / cuenta name.
- **Optional:** Attio deal ID or URL, meeting number, attendees confirmed, agenda hints.

The skill operates in **hybrid mode**:
1. If Attio MCP is available and the deal exists, it reads `pipeline_stage`, stakeholders, last recap, blockers automatically.
2. If Attio is unavailable or the deal is not found, it asks the user the minimum needed: which compartment (1–7) and who attends.

## Procedure

1. **Resolve deal context.**
   - Try Attio MCP first: search the deal by company name or open the deal by ID.
   - If found: extract `pipeline_stage`, last meeting recap, stakeholders, quantified pain, blockers.
   - If not found or Attio unavailable: ask the user for compartment number, attendees, and last known state. Do not assume.

2. **Identify the open compartment.**
   - Map the deal state to one of the 7 compartments defined in `sales-pipeline`.
   - State explicitly which compartment is open and which one we want to open after this meeting.

3. **Build the prospect brief.**
   - Company: name, sector (EPS / IPS / aseguradora / pharma), country, size.
   - Attendees: name, role, LinkedIn link if available, likely concerns by role (CFO → costo/ROI, CMO → calidad clínica, CIO → integración, CISO → seguridad).
   - Recent context: last news, regulatory pressure, what they care about right now.
   - Likely pain hypothesis based on segment.

4. **Define the meeting objective in one sentence.**
   - Format: "Cerrar el compartimento N validando X, Y, Z, para abrir el compartimento N+1."
   - One sentence. If you can't write it in one sentence, the deal context is unclear — go back to step 1.

5. **Draft the Up-Front Contract.**
   - Verbal text, not formal. 3–5 lines.
   - Cover: tiempo de la reunión / agenda / outcomes posibles ("avanzamos a X / no avanzamos / lo pensamos no es opción") / next step propuesto.
   - The outcomes have to match the compartment exit criteria from `sales-pipeline`.

6. **Generate compartment-specific questions.**
   - Compartment 1 (qualify): match dolor, presupuesto, DM.
   - Compartment 2 (diagnose): pain funnel — síntoma, impacto operativo, impacto financiero, impacto personal, costo de no hacer nada.
   - Compartment 3 (champion): qué necesita el champion para vender internamente.
   - Compartment 4 (DMs): qué necesita ver cada DM por rol.
   - Compartment 5–7: respectivos checklists de procurement / legal / security.

7. **Anticipate risks and blockers.**
   - Stakeholder ausente que debería estar.
   - Información faltante que bloquea avance.
   - Objeciones probables por rol.
   - Competidores en el deal.

8. **Output the 6-block brief.**
   Use this exact structure:

   ```markdown
   # Precall Brief — <Company> · Reunión <N>

   ## 1. Prospecto
   <empresa, sector, contexto reciente>

   ## 2. Asistentes
   <lista con rol y concern probable>

   ## 3. Estado del deal
   - Compartimento abierto: <N>
   - Compartimentos cerrados: <list>
   - Última reunión: <fecha + resumen 1 línea>
   - Blockers conocidos: <list>

   ## 4. Objetivo de esta reunión
   <una sola frase>

   ## 5. Up-Front Contract (verbal)
   <3–5 líneas listas para decir>

   ## 6. Preguntas clave
   <3–8 preguntas calibradas al compartimento>

   ## 7. Riesgos y blockers anticipados
   <list>
   ```

## Pitfalls

- **Síntoma:** el UFC es genérico ("vamos a conocernos"). **Causa:** no se identificó el compartimento abierto. **Fix:** vuelve al paso 2; sin compartimento, no hay objetivo, no hay UFC.
- **Síntoma:** la skill produce brief sin Attio data y luego el deal sí estaba en Attio. **Causa:** búsqueda en Attio por nombre exacto cuando el deal estaba con razón social distinta. **Fix:** intenta variaciones (nombre comercial, NIT, dominio del email del champion) antes de caer al modo preguntar.
- **Síntoma:** el objetivo de la reunión incluye dos compartimentos a la vez ("cerrar dolor y validar precio"). **Causa:** se está saltando el submarino. **Fix:** una reunión = un compartimento. Si el flujo se solapa, separa en dos reuniones.
- **Síntoma:** se incluye en el brief pricing o ICP detallado. **Causa:** la skill leyó datos del repo privado. **Fix:** este skill no debe acceder a `proposal-pricer` ni `icp-match` directamente; solo a Attio. Dejar pricing fuera del brief.

## Verification

- El brief tiene los 7 bloques completos y ninguno dice "TBD" o "por confirmar".
- El UFC se lee en voz alta en menos de 30 segundos.
- El objetivo de la reunión es una sola frase y nombra explícitamente el compartimento que se quiere cerrar.
- Si Attio estaba disponible, el `pipeline_stage` del brief coincide con el de Attio.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo, criterios de cierre por compartimento.
- [`postcall-recap`](../postcall-recap/) — el siguiente paso después de la reunión.
- [`deal-health`](../deal-health/) — cuando el deal lleva tiempo sin moverse.
