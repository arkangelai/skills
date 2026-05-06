---
name: sales-roleplay
description: Simulate a prospect persona (skeptical CFO, busy CMO, paranoid CISO, hostile committee) so a rep can practice the next meeting without burning the real prospect. Coaches against the Arkangel sales submarine — UFC, qualify, pain funnel, quantification, next-step — and scores Sandler + MEDDIC adherence at the end.
---

# Sales Roleplay

Transversal skill of the Arkangel sales submarine. The job: let a rep practice a hard meeting before doing it live, and get coaching feedback on what to fix.

Use it before high-stakes meetings (CFO, CISO, comité) and during onboarding of new sales reps. It's also useful when a rep keeps making the same mistake — running the same scenario twice with feedback fixes the muscle.

## When to Use

- Antes de una reunión difícil (CFO escéptico, CISO paranoico, comité hostil).
- Onboarding de nuevo SDR / AE — practicar antes de tocar prospectos reales.
- Cuando un rep falla repetidamente en una etapa específica del submarino (típicamente compartimentos 2 o 4).
- The owner says "practiquemos la reunión", "simulemos al CFO de X", "necesito ensayar".

**Do not use** as a substitute for a real meeting (sirve para entrenar, no para qualifying), or sin objetivo claro (sin compartimento ni rol, no hay roleplay útil).

## Inputs

- **Required:** rol del prospecto a simular (CFO, CMO, CIO, CISO, COO, comité), actitud (escéptico, ocupado, paranoico, hostil, entusiasta-pero-bloqueador, técnico-detallista), compartimento del submarino que se está practicando.
- **Optional:** contexto del deal real, transcripts previos, objeciones específicas que el prospecto ha levantado antes.

## Procedure

1. **Setup the persona.**
   - Construye un personaje realista: nombre ficticio, empresa ficticia (o real anonimizada), rol, edad aproximada, estilo de comunicación.
   - Define la actitud del personaje y por qué (no solo "escéptico" — "escéptico porque ya lo intentaron con otro vendor que falló hace 2 años").
   - Define el dolor que el personaje vive desde su rol — distinto al dolor general del deal.
   - Define **2 objeciones core** que el personaje va a empujar fuerte.
   - Define el "trigger de cierre": qué necesita oír para considerar avanzar.

2. **Define the practice goal.**
   - ¿Qué compartimento se practica? (ej. compartimento 2 — diagnose dolor con CFO).
   - ¿Qué outcome busca el rep? (ej. "salir con número de dolor cuantificado y compromiso de próxima reunión").
   - ¿Cuánto dura el roleplay? Default: 15 minutos. Más largo se vuelve inerte.

3. **Run the simulation.**
   - El skill habla **como el personaje**, no como Arkangel. Usa el lenguaje del rol.
   - Lanza objeciones cuando corresponda — no facilita.
   - Si el rep hace algo bien (UFC bien dicho, pain funnel profundo, próximo paso concreto), el personaje responde realistamente — sin elogiar fuera de personaje.
   - Si el rep se salta un paso (ej. no hace UFC), el personaje refleja la consecuencia natural (confusión, deriva, pérdida de control de la conversación).

4. **End the simulation cleanly.**
   - Cuando el rep diga "termina la reunión" o agendar próxima, cierra como personaje.
   - O cuando se cumpla el tiempo definido en el setup.

5. **Coaching feedback (out of character).**
   Sale del personaje y entrega un coaching report estructurado:

   ```markdown
   # Coaching Report — <persona> / Compartimento <N>

   ## Score Sandler + MEDDIC: <0-10>

   ## Lo que hiciste bien
   - <bullets concretos con quote del rep>

   ## Lo que faltó
   - **UFC:** ✅ / ❌ / parcial — <comentario>
   - **Qualify (si compartimento 1):** dolor / presupuesto / DM — <cuáles cubriste>
   - **Pain funnel (si compartimento 2):** llegaste a nivel <N>/5 — <qué nivel quedó por explorar>
   - **Cuantificación:** ✅ / ❌ — <si hubo número>
   - **Próximo paso:** ✅ / ❌ — <concreto o vago>

   ## Errores específicos
   - <bullet con quote del rep + cómo se debió decir>

   ## Una cosa para arreglar antes de la reunión real
   <una sola recomendación priorizada>

   ## Re-run sugerido
   <ej. "vuelve a correr el roleplay arrancando desde la objeción de presupuesto">
   ```

6. **Optional re-run.**
   - Ofrece volver a correr la simulación arrancando justo en el punto donde el rep falló.
   - El personaje retoma con la misma actitud y misma objeción para forzar la práctica del fix.

## Persona library (referencia rápida)

| Persona | Comportamiento típico | Objeción core 1 | Objeción core 2 | Trigger de cierre |
|---|---|---|---|---|
| CFO escéptico | Mira el reloj, pide ROI temprano, interrumpe | "El payback es muy largo" | "Y si baja el uso, ¿qué pasa con el contrato?" | Caso comparable con números |
| CMO ocupado | Saluda, mira el celular, responde corto | "Mis médicos no van a adoptar" | "No hay evidencia local" | Caso concreto en hospital par |
| CISO paranoico | Pregunta detalles técnicos, no acepta "sí" sin evidencia | "¿Dónde están los datos?" | "Pentest reciente?" | Resumen pentest + diagrama |
| COO ejecutor | Pragmático, pregunta por adopción | "El equipo está saturado" | "Cuánto training requiere" | Plan de change management |
| Comité hostil | 4–6 personas, agendas distintas, uno bloqueador | Cada DM lanza la suya | Pregunta de rol cruzado ("y desde finanzas?") | Próximo paso bilateral con champion |
| Champion entusiasta-pero-bloqueador | Quiere comprar pero "el jefe no aprueba" | "Mi jefe no va a soltar el presupuesto" | "Dame algo para presentarle" | Champion-kit listo para forwardear |

## Pitfalls

- **Síntoma:** el personaje cede demasiado rápido y el rep "gana" sin esforzarse. **Causa:** el skill quiere ser amable. **Fix:** el personaje sostiene la objeción hasta que el rep la responde con evidencia. Sin evidencia, sin avance.
- **Síntoma:** el coaching suena a "todo bien!". **Causa:** miedo a desmotivar. **Fix:** la práctica solo sirve si el feedback es honesto. El score < 7/10 es lo más común — está bien decirlo.
- **Síntoma:** el personaje rompe character y "ayuda" al rep a salir del paso. **Causa:** el skill empieza a coachear durante la simulación. **Fix:** coaching va al final, fuera de character. Durante la simulación, el personaje vive su realidad.
- **Síntoma:** el rep practica el mismo escenario sin variación. **Causa:** rutina. **Fix:** rota la persona y el compartimento. Escenarios variados desarrollan flexibilidad.
- **Síntoma:** el roleplay dura 45 minutos. **Causa:** se estiró sin objetivo. **Fix:** 15 minutos es el default. Más largo es inerte; los reps se aburren y dejan de tomarlo en serio.

## Verification

- El personaje mantiene su actitud durante toda la simulación, sin romper character.
- El coaching sale **después** de la simulación, no durante.
- El score numérico (0-10) está justificado con evidencia del transcript.
- "Una cosa para arreglar" es una sola, no una lista — para que sea accionable.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo + criterios de cierre por compartimento.
- [`precall-brief`](../precall-brief/) — el rep llega al roleplay con un brief armado.
- [`qualify-dolor`](../qualify-dolor/), [`diagnose-dolor`](../diagnose-dolor/), [`decision-maker-kit`](../decision-maker-kit/) — los compartimentos más útiles para practicar.
