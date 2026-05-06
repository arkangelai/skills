---
name: qualify-dolor
description: Run the qualifying interview for compartment 1 of the Arkangel sales submarine. Validates dolor match, presupuesto, and tomadores de decisión, and returns a GO / NO-GO with explicit reasoning. Use during or right after the first meeting with a new prospect.
---

# Qualify Dolor

Compartment 1 of the Arkangel sales submarine. The job: confirm this prospect is a real opportunity before investing more time. Three checks: ¿hay match en dolor?, ¿hay presupuesto?, ¿hay tomadores de decisión identificables?

If the three pass → GO, advance to `diagnose-dolor`.
If any fails → NO-GO, archive with reason. No half-decisions.

## When to Use

- During or right after meeting #1 with a new prospect.
- When picking up a stalled deal whose qualification was never properly closed.
- When triaging an inbound that needs a real GO/NO-GO before allocating sales time.
- The owner says "califica este lead", "vale la pena perseguirlo", or "está calificado <empresa>".

**Do not use** for prospects that already passed compartment 1 (use `diagnose-dolor` instead), for cold prospects without a meeting yet (do outbound first), or for non-sales contexts.

## Inputs

- **Required:** prospecto / cuenta + meeting transcript or notes.
- **Optional:** Attio deal ID, the brief from `precall-brief`.

If transcript is missing, ask the user to dictate the key answers verbally — you need at least the dolor declarado, budget signal, and named decision makers.

## Procedure

1. **Run the dolor match check.**
   - Extract the dolor declarado por el prospecto, in their words.
   - Map it to one of Arkangel's products: medsearch (búsqueda médica con fuentes verificadas) or pandora (extracción de records clínicos).
   - The match has to be real, not aspirational — quote the prospect.
   - **Pass criteria:** dolor declarado se resuelve directamente con un producto Arkangel actual (no roadmap, no "podríamos construir").
   - **If no match:** the deal is dead. Don't try to bend the dolor to fit. Mark NO-GO with reason "no-match".

2. **Run the presupuesto check.**
   Ask (or extract from transcript) three questions:
   - ¿Cuánto invierten hoy en resolver esto? (CAPEX o OPEX, en COP/USD/horas-persona)
   - ¿Tienen presupuesto asignado para resolverlo este año?
   - ¿De qué orden de magnitud están pensando? (10M COP, 100M, 1.000M…)
   - **Pass criteria:** al menos uno de los tres devuelve un número o un rango concreto, *no* "no sé" o "depende".
   - **If all three are vague:** mark NO-GO with reason "sin-presupuesto" *unless* el prospecto pertenece a un sector con compra obvia (ej. EPS top 3 con problema de glosas) y el champion es senior. En ese caso, marca como `pending-budget` y se aclara en compartimento 2.

3. **Run the DM check.**
   - Pregunta o extrae: ¿quién aprueba la decisión final? ¿quiénes más participan en la decisión?
   - Espera 2–4 nombres con rol explícito (no "el comité", no "la gerencia").
   - **Pass criteria:** lista nominal de DM con cargo. El champion ya identificado cuenta como uno.
   - **If no names:** mark NO-GO with reason "sin-DM" *unless* el prospecto se compromete a traer la lista a la siguiente reunión. En ese caso, `pending-dm`.

4. **Compute the verdict.**
   - **GO** — los tres checks pasan.
   - **NO-GO** — cualquiera falla con razón definitiva.
   - **PENDING** — uno o dos quedaron en `pending-*`; deal no avanza pero no se cierra.

5. **Output structure.**

   ```markdown
   # Qualify Dolor — <Empresa> · <Date>

   ## Verdict: <GO / NO-GO / PENDING>

   ## 1. Match en dolor
   - Dolor declarado (quote): "<...>"
   - Producto Arkangel que resuelve: medsearch | pandora | n/a
   - Match real: ✅ / ❌
   - Razón si ❌: <...>

   ## 2. Presupuesto
   - Inversión actual en el problema: <número o "no declarado">
   - Presupuesto asignado: <sí/no/parcial>
   - Orden de magnitud esperado: <rango>
   - Match real: ✅ / ❌ / pending
   - Razón si ❌: <...>

   ## 3. Tomadores de decisión
   - Champion identificado: <nombre + cargo o "missing">
   - DMs nombrados: <lista con cargo>
   - Match real: ✅ / ❌ / pending
   - Razón si ❌: <...>

   ## Razón del verdict
   <1–3 frases>

   ## Próxima acción
   - Si GO: agendar reunión de Dx con el champion + invitar al menos a 1 DM. `precall-brief` para esa reunión.
   - Si NO-GO: archivar deal en Attio con razón. Email cordial cerrando.
   - Si PENDING: definir qué se necesita resolver (`pending-budget` o `pending-dm`) y para cuándo. Sin compromiso de fecha → NO-GO.

   ## Attio update
   - Si Attio MCP disponible: `pipeline_stage = 2.diagnose` (GO), `lost` (NO-GO), o sin cambio (PENDING).
   - Notas: añadir el output completo a la deal note.
   ```

## Pitfalls

- **Síntoma:** se marca GO con dolor "interesante" pero sin uso real para Arkangel. **Causa:** el comercial quiere conservar el deal. **Fix:** la skill solo marca GO si el dolor declarado se resuelve con producto vigente. Pipeline futuro ≠ match.
- **Síntoma:** se acepta "no sé el presupuesto pero sí hay interés" como GO. **Causa:** confundir interés con compra. **Fix:** sin señal de presupuesto (al menos un número) → PENDING máximo, no GO.
- **Síntoma:** se marca un solo nombre como "el DM" cuando claramente hay comité. **Causa:** champion entusiasta dijo "yo decido". **Fix:** en enterprise healthtech siempre hay >1 DM cercano (CFO, CMO, CIO/CISO mínimo). Si sale solo 1, vuelve a preguntar.
- **Síntoma:** PENDING permanente — el deal queda atrapado en compartimento 1 por meses. **Causa:** falta de fecha límite en el pending. **Fix:** todo PENDING tiene fecha de resolución. Pasada la fecha sin acción, NO-GO automático.
- **Síntoma:** NO-GO genera fricción con el champion porque no se le explicó. **Causa:** no se redactó email de cierre. **Fix:** el output de NO-GO siempre incluye email cordial; nunca dejar al champion sin respuesta.

## Verification

- El verdict es uno de GO / NO-GO / PENDING — sin ambigüedad ni "casi GO".
- Cada uno de los 3 checks tiene quote o referencia explícita (no inferencia).
- Si PENDING, hay fecha de resolución concreta.
- Si Attio estaba disponible y verdict es definitivo (GO o NO-GO), el `pipeline_stage` se actualizó.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo, criterios de cierre por compartimento.
- [`precall-brief`](../precall-brief/) — preparación de la reunión #1.
- [`postcall-recap`](../postcall-recap/) — recap de la reunión que alimenta esta skill.
- [`diagnose-dolor`](../diagnose-dolor/) — siguiente compartimento si el verdict es GO.
