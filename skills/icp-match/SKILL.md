---
name: icp-match
description: Score any prospect 0-10 against the Arkangel Ideal Customer Profile across 5 dimensions (sector fit, size fit, dolor fit, regulatory fit, accessibility) and recommend pursue / nurture / pass. Use when triaging inbound, before running qualify-dolor, or sizing a list of accounts.
---

# ICP Match

Sandler-style "qualify hard before falling in love" — but applied earlier than `qualify-dolor`. The job: avoid burning calendar on prospects that look interesting but don't actually match Arkangel's Ideal Customer Profile.

A 5/10 prospect that pulls hard might still warrant time. A 9/10 that won't reply doesn't. The score gives a defensible reason to allocate (or not).

## When to Use

- Triaging an inbound lead before booking the first meeting.
- Sizing a list of target accounts before outbound (rank by score, hit the top 20 %).
- Sanity-checking a deal that "feels off" — a low ICP score explains why.
- Before invoking `qualify-dolor` on a fresh prospect.

**Do not use** as a substitute for qualifying (`qualify-dolor` is the real check), or to argue *for* a deal that has already been qualified — by then ICP is irrelevant, the data is in.

## Inputs

- **Required:** prospect name + sector + country + best guess at organization size and dolor declarado (or context of how they reached us).
- **Optional:** website, LinkedIn of the contact, prior interactions, sector benchmark data.

The skill works with whatever is available; missing data → the corresponding dimension scores 0 and is flagged "needs research".

## Procedure

1. **Score 5 dimensions, 0–2 each. Total: 0–10.**

   | Dimension | 0 | 1 | 2 |
   |---|---|---|---|
   | **Sector fit** | Sector ajeno (retail, energía, fintech sin healthcare) | Sector adyacente (insurtech, pharma marketing) | Sector core: EPS / IPS / aseguradora salud / pharma / hospital / clínica / red de salud |
   | **Size fit** | < 50 empleados o > 5.000 (out of band) | 50–200 o 2.000–5.000 | 200–2.000 — sweet spot enterprise mid-market |
   | **Dolor fit** | Dolor genérico ("queremos IA") | Dolor adyacente (analítica, BI, automatización general) | Dolor exacto: glosas, búsqueda médica, extracción de records, RIPS, autorizaciones, calidad clínica |
   | **Regulatory fit** | Geografía/sector con regulación que no podemos cumplir hoy (ej. Brasil sin LGPD setup) | Regulación cumplible con setup específico (US healthcare con BAA, EU con DPA) | Geografía core: Colombia + países LATAM con stack legal listo |
   | **Accessibility** | No hay forma de llegar al DM, todo es vía portal | Acceso indirecto (champion sin red interna) | Champion identificable + red existente / referenciable / introducible |

2. **Compute the total.** Sum the 5 dimensions.

3. **Map score to recommendation.**
   - **8–10 — Pursue:** ICP fuerte, agendar reunión 1 inmediatamente. Pasa a `qualify-dolor` después de la primera reunión.
   - **5–7 — Nurture:** ICP parcial. No quemar calendar comercial; va a marketing/SDR para nurturing. Reevaluar en 3–6 meses.
   - **0–4 — Pass:** No es ICP. Cerrar cordialmente, recomendar otra solución si aplica.

4. **Document the gaps.**
   - Si una dimensión scored 0 por falta de información, flag explícito ("dolor no declarado — pedir antes de scoring final").
   - Si scored 0 por no-fit real, ése es el motivo del Pass.

5. **Output structure.**

   ```markdown
   # ICP Match — <Empresa>

   ## Score: <N>/10  ·  Recomendación: <Pursue / Nurture / Pass>

   ## Dimensiones
   - Sector fit (0–2): <score> · <razón con dato>
   - Size fit (0–2): <score> · <razón con dato>
   - Dolor fit (0–2): <score> · <razón con dato>
   - Regulatory fit (0–2): <score> · <razón con dato>
   - Accessibility (0–2): <score> · <razón con dato>

   ## Razón principal
   <1–2 frases explicando el verdict>

   ## Datos faltantes
   <bullets — qué necesitamos para refinar el score>

   ## Próxima acción
   - Pursue: agenda reunión 1, prepara con `precall-brief`.
   - Nurture: enviar a la lista de nurturing, reevaluar en <fecha>.
   - Pass: email cordial cerrando + recomendación si la hay.
   ```

6. **Update Attio.**
   - Crear/actualizar deal con `icp_score` y `icp_recommendation`.
   - Si Pass: marcar `pipeline_stage = lost` con razón "icp-match-fail".
   - Si Nurture: dejar fuera del pipeline activo.
   - Si Pursue: dejar en `pipeline_stage = 1.qualify` listo para reunión 1.

## Pitfalls

- **Síntoma:** se sube el score para justificar un deal que el comercial quiere. **Causa:** sesgo de confirmación. **Fix:** la rúbrica es objetiva — cada dimensión necesita un dato observable, no una opinión.
- **Síntoma:** se marca 0 en una dimensión por no investigar lo suficiente. **Causa:** apuro. **Fix:** "0 por falta de info" se flagea explícitamente como gap, no se suma como Pass automático. Investigar primero.
- **Síntoma:** un Pass se cierra sin email. **Causa:** se asumió que "sin respuesta" es suficiente. **Fix:** todo Pass cierra con email cordial — protege la relación para reaperturas futuras.
- **Síntoma:** un Nurture queda en limbo eterno sin re-evaluación. **Causa:** no se puso fecha. **Fix:** todo Nurture tiene fecha de reevaluación; pasada la fecha sin acción, va a Pass.
- **Síntoma:** el dolor declarado se interpreta optimista ("le va a interesar pandora aunque no lo dijo"). **Causa:** matching aspiracional. **Fix:** Dolor fit puntúa solo lo que el prospecto ya declaró o lo que su rol/sector implica obviamente. Inferencias creativas no.

## Verification

- Cada dimensión tiene score 0/1/2 con dato observable detrás.
- El verdict es uno de Pursue / Nurture / Pass, sin "casi".
- Los datos faltantes están explícitos.
- Si Nurture, hay fecha de reevaluación.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`qualify-dolor`](../qualify-dolor/) — el siguiente paso si el verdict es Pursue.
- [`precall-brief`](../precall-brief/) — preparación de la reunión 1.
- [`competitive-intel`](../competitive-intel/) — útil cuando el sector fit es bajo y queremos entender por qué nos contactaron.
