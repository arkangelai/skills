---
name: pain-quantifier
description: Convert prospect-described pain into a defensible monetary range (low / mid / high) using sector-appropriate formulas — glosas, búsqueda médica, extracción de records, autorizaciones, eficiencia clínica. Outputs the quantification with explicit assumptions and sensitivity analysis. Use during diagnose-dolor or when building the business case for champion-kit.
---

# Pain Quantifier

The MEDDIC "Metrics" piece, executed honestly. Sandler taught us a deal without quantified pain dies in procurement. This skill turns "tenemos un problema" into a number the champion can defend internally and the CFO can validate.

The skill **only quantifies the dolor** — it does not compute Arkangel pricing or ROI ratios (those are in `proposal-pricer`).

## When to Use

- During or right after `diagnose-dolor` when the prospect gave numbers (volumen, % afectado, frecuencia).
- Before `champion-kit` to build the business case the champion will pitch.
- When `deal-health` flagged "número faltante — bloquea avance".
- The owner says "cuantifica el dolor de X", "cuánto le cuesta esto al cliente", "qué tan grande es el problema en plata".

**Do not use** with invented numbers (frena y pide datos al prospecto), for non-healthcare deals (la librería de fórmulas es healthcare-specific), or to compute ROI Arkangel-side (eso es `proposal-pricer`).

## Inputs

- **Required:** sector del prospecto (EPS / IPS / aseguradora / pharma / hospital), tipo de dolor (glosas, búsqueda, extracción, autorizaciones, eficiencia), y los números base que el prospecto entregó.
- **Optional:** benchmarks de sector públicos, datos históricos del prospecto, comparación con clientes similares.

## Procedure

1. **Identify the pain category and pick the formula.**

   Library de fórmulas por categoría:

   | Categoría | Fórmula base | Variables que el prospecto debe dar |
   |---|---|---|
   | **Glosas (devoluciones de facturas)** | `valor_facturado × % glosado × % no_recuperable` | valor mensual facturado, % típico de glosas, % no recuperado |
   | **Tiempo perdido en búsqueda médica** | `# médicos × horas/semana_buscando × $hora × 52` | personal afectado, frecuencia, costo cargado |
   | **Extracción manual de records** | `# pacientes/mes × min_por_record × $minuto + costo_de_error` | volumen, tiempo medio, costo error reproceso |
   | **Autorizaciones rechazadas** | `# servicios/mes × % rechazo × valor_servicio + costo_apelación` | volumen, % rechazo, ticket, costo apelación |
   | **Errores de codificación CUPS / ICD** | `# eventos/mes × % error × valor_facturado_error + tiempo_corrección` | volumen, % error, ticket, FTE corrigiendo |
   | **Eficiencia clínica (consultas)** | `# consultas/mes × min_perdidos_por_fricción × $minuto_médico` | volumen, fricción medida, costo médico cargado |

   Si la categoría no está en la lista, construye la fórmula explícita con el formato `volumen × ticket × % afectado × frecuencia` y deja claro qué variable es cuál.

2. **Capture the base numbers.**
   - Solo usa números que el prospecto declaró (con quote del transcript de `diagnose-dolor`).
   - Si una variable falta, **no la inventes**. Marca como gap y propone qué pedir en la próxima reunión.
   - Datos públicos de sector (Hackmetrix, Supersalud, MinSalud, RIPS agregados) son aceptables si están citados con fuente.

3. **Compute three scenarios — low / mid / high.**
   - **Low:** asume el lado conservador de cada variable (% más bajo, volumen más bajo, etc.). Es el número defensible bajo escrutinio.
   - **Mid:** los números centrales del prospecto. Es el caso esperado.
   - **High:** asume el lado optimista. Es el techo si el problema es peor de lo que parece.

   Cada escenario es **anual** salvo que el prospecto pida mensual.

4. **Sensitivity analysis.**
   - Identifica las 2 variables a las que el resultado es más sensible.
   - Para cada una, muestra el % de cambio en el resultado si la variable cambia ±20 %.
   - Esto le da al champion munición real ante "y si cambian los volúmenes".

5. **State assumptions explicitly.**
   - Cada número tiene fuente: quote del prospecto, benchmark de sector, dato histórico.
   - Cada supuesto está nombrado: "asumimos que el % glosado se mantiene estable", "asumimos costo cargado del médico = 1.5× su salario base".
   - El número sin supuesto detrás no se incluye.

6. **Output structure.**

   ```markdown
   # Pain Quantifier — <Empresa> · <Categoría>

   ## Costo anual estimado del dolor
   - Low:  <COP/USD>
   - Mid:  <COP/USD>  ← número defensible
   - High: <COP/USD>

   ## Fórmula aplicada
   <fórmula explícita con variables>

   ## Inputs
   - <variable> = <valor> · fuente: <quote / benchmark / histórico>
   - ...

   ## Supuestos
   - <bullets nombrados>

   ## Sensibilidad
   - Variable más sensible: <nombre>. ±20 % → ±<X> % en el resultado.
   - Segunda más sensible: <nombre>. ±20 % → ±<X> % en el resultado.

   ## Datos faltantes (si aplica)
   - <variable> — pedir al prospecto en próxima reunión.

   ## Para usar en champion-kit
   - Frase one-liner: "Este dolor le cuesta a <empresa> entre <low> y <high> al año, con un escenario esperado de <mid>."
   ```

7. **Update Attio.**
   - `pain_quantified_cop` — el número **mid** del rango.
   - Adjuntar el quantifier doc completo como nota.

## Pitfalls

- **Síntoma:** el rango sale tan amplio (low/high difieren 10×) que pierde credibilidad. **Causa:** muchas variables faltantes. **Fix:** si el rango es > 5× del low al high, el quantifier no está listo — frena, pide datos.
- **Síntoma:** se infla el high para empujar el deal. **Causa:** querer que la solución suene barata. **Fix:** el high es realista, no aspiracional. Un cliente que descubre que el high era inflado pierde confianza.
- **Síntoma:** se omiten los supuestos para que el doc se lea más limpio. **Causa:** estética. **Fix:** los supuestos son el escudo del champion. Sin ellos, cualquier CFO puede tirar el caso.
- **Síntoma:** el resultado se da en mensual cuando el prospecto piensa anual (o viceversa). **Causa:** inconsistencia. **Fix:** unidad explícita en cada número. Default anual.
- **Síntoma:** se mezcla el dolor del cliente con el costo de la solución Arkangel. **Causa:** confusión con `proposal-pricer`. **Fix:** este skill solo cuantifica el lado del cliente. La comparación con la solución va en `proposal-pricer` y `decision-maker-kit`.

## Verification

- Cada input tiene fuente citada.
- Los 3 escenarios (low/mid/high) están dentro de un rango defendible (high < 5× low).
- Los supuestos están enumerados explícitamente.
- La sensibilidad muestra las 2 variables que más mueven el resultado.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`diagnose-dolor`](../diagnose-dolor/) — produce los inputs que esta skill cuantifica.
- [`champion-kit`](../champion-kit/) — usa el output para el deck del champion.
- [`decision-maker-kit`](../decision-maker-kit/) — usa el output para el price-bracket vs ROI.
- [`proposal-pricer`](../proposal-pricer/) — el lado opuesto: cuánto cuesta la solución, no el dolor.
