---
name: diagnose-dolor
description: Run the deep pain diagnosis for compartment 2 of the Arkangel sales submarine. Walks the prospect through a 5-level pain funnel, quantifies the pain in money, maps the buying line, estimates ROI, and identifies the champion. Outputs a Dx document the prospect can share internally. Use during the diagnosis meeting, after qualification has passed.
---

# Diagnose Dolor

Compartment 2 of the Arkangel sales submarine. The job: turn "tenemos un problema" into a number, a buying line, and a champion who will fight internally for the solution.

This is the most expensive compartment to skip. A deal that advances without quantified pain dies in procurement or legal because no one knows what the budget is anchored against.

## When to Use

- During or right after the second meeting (the diagnosis meeting), with the champion + ideally one decision maker present.
- The owner says "cuantifica el dolor de <empresa>", "corre el pain funnel", "qué tan grande es el problema".
- After `qualify-dolor` returned GO and a Dx meeting has happened.

**Do not use** before compartment 1 closed (`qualify-dolor` first), or as a substitute for `qualify-dolor` (it assumes match en dolor + presupuesto + DMs ya está validado).

## Inputs

- **Required:** prospecto + transcript or detailed notes from the Dx meeting.
- **Optional:** Attio deal ID, output of previous `qualify-dolor`, sector benchmarks.
- **Internal pricing data lives in `pain-quantifier` (private repo).** This skill only quantifies based on prospect-provided numbers; it does not compute the Arkangel side of the ROI ratio.

## Procedure

1. **Run the 5-level pain funnel.**
   The funnel forces the prospect from symptom to existential cost. Each level deeper produces a stronger commitment to solve.

   | Level | Question | Type of answer expected |
   |---|---|---|
   | 1. Síntoma | ¿Qué exactamente está pasando? | Hecho operativo concreto ("80 % de las facturas tienen glosas") |
   | 2. Impacto operativo | ¿Cómo eso te afecta el día a día? | Operación, tiempo, retrabajo, calidad |
   | 3. Impacto financiero | ¿Cuánto dinero les cuesta esto al mes/año? | Número en COP/USD |
   | 4. Impacto personal | ¿Y a ti, qué te significa esto en tu rol? | KPI personal, evaluación, presión del jefe |
   | 5. Costo de no hacer nada | Si esto sigue 12 meses igual, ¿qué pasa? | Escenario de pérdida, presión externa |

   For each level, capture a quote from the transcript. If a level has no answer, flag it explicitly — that's a gap to close in a follow-up.

2. **Quantify the pain in money.**
   - Use only numbers the prospect mentioned.
   - Build the simplest formula that holds: `volumen × ticket × % afectado × frecuencia`.
   - Express as a range (low / mid / high) when there's ambiguity.
   - State the assumption behind every number.
   - **If the prospect could not produce a number at any level:** flag it as "número faltante — pedir antes de pasar a champion-kit". Do not invent.
   - For Arkangel-side ROI calculations (cost of the solution, expected savings multiplier, payback period), call `pain-quantifier` (private repo). This skill does not include Arkangel pricing.

3. **Map the buying line.**
   Three questions to the prospect:
   - ¿Hasta cuánto firmas tú directamente?
   - ¿De qué monto en adelante necesitas otra firma? ¿De quién?
   - ¿Hay un comité de compras o un proceso formal? ¿Cuándo sesiona?

   Output: a chain like "Champion firma hasta 50M COP → CFO firma hasta 200M → comité de compras > 200M, sesiona último viernes del mes".

4. **Estimate the ROI ratio.**
   - Pain cuantificado anual / costo estimado de la solución (price-bracket alto). Use price-bracket genérico si no hay propuesta aún (ej. enterprise = 100–300M COP/año).
   - Si el ratio < 3x → riesgo de rechazo en procurement. Plan B: reducir alcance.
   - Si el ratio > 10x → cuidado, puede sonar "demasiado bueno"; valida supuestos.

5. **Identify y comprometer al champion.**
   - ¿Quién en la sala está más motivado a resolver esto?
   - Test del compromiso: ¿agenda la próxima reunión con un DM cercano antes de cerrar la llamada?
   - Si no agenda, no hay champion — el deal vuelve a `pending-champion` y compartimento 2 no cierra.

6. **Output: el Dx document.**
   Este es el artefacto que el champion va a compartir internamente. Tiene que poder leerse en 5 minutos.

   ```markdown
   # Diagnóstico — <Empresa>
   _Sesión <fecha>. Asistentes: <lista>._

   ## El problema en una frase
   <una sola línea>

   ## Cuánto le cuesta
   - Volumen: <número con fuente>
   - Ticket promedio: <número con fuente>
   - % afectado: <número con fuente>
   - **Costo anual estimado: <rango low–high>**
   - Supuestos: <bullets>

   ## Pain funnel
   - Síntoma: "<quote>"
   - Impacto operativo: "<quote>"
   - Impacto financiero: "<quote>" — <número>
   - Impacto personal (champion): "<quote>"
   - Costo de no hacer nada (12 meses): <escenario>

   ## Línea de compra
   <champion firma hasta X → CFO hasta Y → comité > Y>

   ## ROI esperado
   - Costo solución (rango enterprise): <COP>
   - Ratio dolor/costo: <Nx>
   - Payback estimado: <meses>

   ## Champion
   - <nombre, cargo>
   - Compromiso explícito: <"agendó reunión con CFO el día X" o "pendiente">

   ## Próximo paso
   <quién hace qué para cuándo, hacia compartimento 3>

   ## Datos faltantes (a pedir antes de avanzar)
   <bullets, si los hay>
   ```

7. **Update Attio.**
   - `pain_quantified_cop` — número del cálculo (mid del rango).
   - `champion_email` — contacto del champion.
   - `pipeline_stage` — `3.champion` *solo si* hay champion comprometido y número validado. Si falta cualquiera, queda en `2.diagnose`.
   - Adjuntar Dx document como nota.

## Pitfalls

- **Síntoma:** el costo anual sale como "millones de pesos" sin número. **Causa:** prospecto evasivo y la skill no insistió. **Fix:** la skill no avanza sin número. Mejor flag "número faltante" que un rango inventado. El champion va a pedir el número adentro de la organización; mejor que sea suyo.
- **Síntoma:** se llena el pain funnel con respuestas hipotéticas. **Causa:** el prospecto no contestó ese nivel. **Fix:** cada nivel tiene quote o queda como gap. Sin gaps ocultos.
- **Síntoma:** ratio dolor/costo > 20x. **Causa:** sobreestimación del dolor. **Fix:** revisa supuestos del cálculo; rara vez los ratios reales superan 10x. Si es > 15x, marca como "validar supuestos en próxima reunión".
- **Síntoma:** se identifica champion sin que agende próxima reunión. **Causa:** entusiasmo en la llamada ≠ compromiso. **Fix:** test del calendario — si no agenda mientras estás en la llamada, no es champion. Compartimento 2 no cierra.
- **Síntoma:** la línea de compra se asume pero no se preguntó. **Causa:** el comercial proyectó una jerarquía estándar. **Fix:** la línea de compra siempre se pregunta explícitamente; cada empresa la tiene distinta.
- **Síntoma:** se incluyen tarifas Arkangel en el Dx document. **Causa:** la skill leyó datos de `pain-quantifier`. **Fix:** este skill **no** incluye pricing — solo costo del dolor + rango genérico de la solución. El número exacto se trabaja en `decision-maker-kit` con `proposal-pricer`.

## Verification

- El Dx document tiene los 6 bloques completos sin "TBD".
- El pain funnel tiene quote en cada nivel o gap explícito.
- El número de costo anual viene de inputs del prospecto, no de inferencia.
- El champion tiene compromiso explícito (fecha + DM invitado).
- Si Attio disponible y compartimento cerró, `pipeline_stage = 3.champion`.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo, criterios de cierre por compartimento.
- [`qualify-dolor`](../qualify-dolor/) — compartimento previo (debe haber cerrado).
- [`precall-brief`](../precall-brief/) — preparación de la reunión de Dx.
- [`postcall-recap`](../postcall-recap/) — recap que alimenta esta skill.
- `pain-quantifier` (repo privado) — cuantificación con tarifas Arkangel y modelos de payback.
- `champion-kit` *(PR #3)* — siguiente compartimento si compartimento 2 cerró.
