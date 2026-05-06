---
name: decision-maker-kit
description: Adapt the champion-kit materials per role (CFO, CMO, CIO/CTO, CISO, COO) so each decision maker sees the case in their language, with their concerns answered and a price-bracket Good/Better/Best they can validate. Compartment 4 of the Arkangel sales submarine.
---

# Decision Maker Kit

Compartment 4 of the Arkangel sales submarine. By now the champion has done internal selling and there's a meeting with the inner circle of decision makers. Each DM cares about something different — the same deck won't work for all of them. This skill adapts the kit per role and produces the price-bracket each DM has to validate.

## When to Use

- Compartment 3 (`champion-kit`) closed — champion presented internally and brought DMs to the table.
- A meeting with one or more DMs (CFO, CMO, CIO/CTO, CISO, COO) is on the calendar.
- The owner says "adapta esto para el CFO de X" or "qué le digo al CMO en la reunión".

**Do not use** before champion-kit closed (no sense adapting if no internal traction yet), or for a peer-level conversation (use `champion-kit` directly).

## Inputs

- **Required:** champion-kit (deck + one-pager + email + FAQ), list of DMs with role.
- **Optional:** previous interactions with each DM, sector benchmarks, competitor in the deal.
- **Pricing data** comes from `proposal-pricer` (repo privado). This skill produces the **bracket** with anchored ranges, not the exact tariff.

## Procedure

1. **For each DM, identify the primary concern by role.**

   | Rol | Primary concern | Lenguaje |
   |---|---|---|
   | CFO | ROI, payback, OPEX vs CAPEX, riesgo financiero, term | Pesos, ratios, plazos |
   | CMO / Director Médico | Calidad clínica, evidencia, casos en hospitales pares, GPC compliance | Casos, papers, outcomes |
   | CIO / CTO | Integración, API, despliegue, TCO, soporte 24/7, on-prem vs cloud | Arquitectura, SLAs |
   | CISO / AppSec | Datos, residencia, encriptación, compliance, pentest, IR | Frameworks, evidencia |
   | COO | Operación, change management, training, adopción, KPIs operativos | Procesos, equipo, transición |

   Si el rol no está en la lista, pregúntalo al champion antes de continuar.

2. **Adapt the deck per DM.**
   - Mantén la estructura del champion-kit deck.
   - Reemplaza el slide de "cómo Arkangel resuelve" con un slide específico por rol — el mismo problema visto desde su lente.
   - Agrega un slide al final con "qué te pido a ti" — la decisión específica que ese DM debe tomar.

3. **Build the price-bracket Good/Better/Best.**
   - Tres niveles: scope acotado / scope estándar / scope completo.
   - Cada nivel: incluye / no incluye / inversión anual rango / payback estimado.
   - El rango se construye con `proposal-pricer` (repo privado). En este skill solo va el **shape**: cuánto entrega cada nivel, no el número exacto si pricing-data no está disponible.
   - Recomendación implícita: el "Better" es el que el champion debería defender; "Good" como descuento defensivo, "Best" como upsell si el dolor es mayor de lo esperado.

4. **Talking points por rol.**
   - 5–8 frases listas para usar en la reunión, en lenguaje del DM.
   - Apuntan a aterrizar el ROI / la calidad / la seguridad / la operación según rol.
   - Cada talking point tiene un "número o referencia" que lo respalda — no claims sin soporte.

5. **Anticipated objections + handlers.**
   Mínimo 4 objeciones por rol con respuesta:

   - CFO: "es muy caro" / "el payback es largo" / "y si baja el uso" / "term de un año vs 3"
   - CMO: "no hay evidencia local" / "los médicos no van a adoptar" / "qué pasa con casos atípicos" / "y la calidad clínica"
   - CIO: "qué tan difícil es la integración" / "qué pasa si el vendor desaparece" / "soporte" / "datos en la nube"
   - CISO: "datos sensibles" / "compliance" / "incidentes" / "pentest"
   - COO: "el equipo está saturado" / "training" / "qué cambia operativamente" / "rollback"

6. **Output the per-DM kit.**

   ```markdown
   # DM Kit — <Empresa> · <DM nombre, rol>

   ## Concern primario
   <una frase>

   ## Adapted deck (slide outline)
   <bullets, ajustado por rol>

   ## Price-bracket Good / Better / Best
   - Good: scope <X> · inversión anual <rango> · payback <meses>
   - Better: scope <Y> · inversión anual <rango> · payback <meses>  ← **recomendado**
   - Best: scope <Z> · inversión anual <rango> · payback <meses>

   ## Talking points (5–8 frases)
   <bullets en lenguaje del DM>

   ## Objection handlers
   <objeción → respuesta, mínimo 4>

   ## Lo que pedimos al DM en esta reunión
   <decisión concreta — no "feedback general">
   ```

   Si hay varios DMs, repite el bloque por cada uno.

7. **Update Attio.**
   - Append cada DM a `decision_makers`.
   - Adjuntar el kit por DM como nota.
   - `pipeline_stage = 5.procurement` solo cuando todos los DMs validaron precio + dirección.

## Pitfalls

- **Síntoma:** se reusa el deck del champion sin adaptar. **Causa:** ahorro de tiempo. **Fix:** un deck idéntico para CFO y CMO falla con ambos. La adaptación por rol no es opcional.
- **Síntoma:** el price-bracket es Good = -30 %, Best = +50 %. **Causa:** anclaje psicológico forzado. **Fix:** Good/Better/Best deben representar **scope distinto**, no el mismo scope con descuento. Si solo hay un scope, no hay bracket.
- **Síntoma:** los talking points repiten lo del deck. **Causa:** se trataron como resumen. **Fix:** los talking points son frases para **decir en voz alta**, calibradas a cómo habla ese DM. Léelos en voz alta antes de entregarlos al comercial.
- **Síntoma:** se incluyen tarifas exactas pero `proposal-pricer` no está disponible. **Causa:** se inventaron números. **Fix:** si `proposal-pricer` no responde, deja el bracket con `<rango por confirmar — bloquea con proposal-pricer antes de la reunión>`.
- **Síntoma:** el "qué pedimos al DM" es vago ("feedback general"). **Causa:** no hay objetivo concreto. **Fix:** la pregunta es "¿avanzamos a procurement con scope Better?" — sí o no, no consulta abierta.

## Verification

- Hay un kit por DM, no un kit genérico.
- Cada DM tiene 4+ objection handlers en su lenguaje.
- El bracket tiene scopes distintos, no el mismo scope con tres precios.
- "Lo que pedimos al DM" es una pregunta cerrada, no consulta abierta.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`champion-kit`](../champion-kit/) — el kit base que se adapta aquí.
- [`precall-brief`](../precall-brief/) — antes de la reunión con DMs.
- [`postcall-recap`](../postcall-recap/) — después de la reunión.
- `proposal-pricer` (repo privado) — pricing data para construir el bracket.
- `stakeholder-map` (repo privado) — mapa de DMs y su nivel de influencia.
