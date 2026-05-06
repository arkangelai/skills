---
name: competitive-intel
description: Build a competitor brief whenever a competitor surfaces in a deal — their typical wedge, real differentiators, where they win, where they lose, and a counter-positioning playbook with objection responses. Use when prospect mentions a competitor, when deal-health detects competitive risk, or before a final-round meeting against a known competitor.
---

# Competitive Intel

The MEDDIC "Decision Criteria" piece, applied to the competitive landscape. Sandler taught us not to badmouth the competition — but you also can't ignore them. This skill turns "están viendo otra opción" into a structured response that holds in front of a CFO without sounding like a trash-talk pitch.

Win against competitors by **explaining your real differences**, not by dismissing theirs.

## When to Use

- A prospect mentions a competitor by name ("estamos viendo X también").
- `deal-health` flagged "competitive risk" because the deal stalled at compartment 3 or 4.
- Before a final-round meeting where the prospect is comparing options.
- The owner says "qué les digo del competidor X" or "necesito un counter-positioning vs Y".

**Do not use** when no competitor has surfaced (don't manufacture competition), to badmouth a competitor (es contraproducente), or for non-competitive comparison ("X de open source" usually requires a different framing — TCO, soporte, integración).

## Inputs

- **Required:** competitor mencionado, sector del prospecto, geografía, contexto en que apareció el competidor (lo trajo el prospecto / lo vimos en LinkedIn / lo nombró un DM).
- **Optional:** propuesta competidora si el prospecto la compartió, casos de éxito públicos del competidor, gaps conocidos del competidor por experiencia previa.

## Procedure

1. **Build the competitor brief — facts only.**
   - Quién son (empresa, sede, founders si es relevante).
   - Producto principal (no su pitch; lo que realmente venden).
   - Wedge típico (por qué ganan típicamente — precio? funcionalidad específica? red de distribución? marca?).
   - Geografía / segmento donde son fuertes.
   - Geografía / segmento donde son débiles.
   - Pricing aproximado (rango público, no inventado).
   - Casos públicos relevantes.

   Si no hay datos suficientes, marca como "research needed" — no inventes capacidades del competidor.

2. **Map real differentiators — Arkangel vs el competidor.**
   - **Donde Arkangel gana:** capacidades concretas, regulación local, equipo, integración, soporte. Citar evidencia.
   - **Donde el competidor gana:** sé honesto. Si tienen mejor X, dilo. Pretender lo contrario quema credibilidad.
   - **Donde es empate:** áreas comparables que no mueven la decisión.
   - **Donde no aplica la comparación:** features que uno tiene y el otro no, pero que no son relevantes para este prospecto.

   Output: tabla de 4 columnas, mínimo 8 filas.

3. **Identify por qué el prospecto los está mirando.**
   - ¿Es por brand recognition?
   - ¿Por una capacidad específica que vieron en una demo?
   - ¿Por precio?
   - ¿Por una recomendación de pares?
   - ¿Por inercia (siempre los han usado)?

   La respuesta cambia el counter-positioning. "Es la marca conocida" se contrarresta distinto que "tienen mejor precio".

4. **Build the counter-positioning playbook.**
   - **Re-frame the criteria.** Si la decisión se está tomando solo por precio, re-encuadra a TCO o a riesgo de no resolver el dolor. Si solo por features, re-encuadra a outcome (¿esa feature te resuelve el dolor X?).
   - **Concede honestamente lo que el competidor hace mejor.** Esto compra credibilidad para los puntos donde Arkangel sí gana.
   - **Apunta a 2 diferenciadores reales** — no más. Más diferenciadores diluyen.
   - **Provee evidencia concreta** por cada diferenciador (caso, dato, regulación, integración).

5. **Anticipate the objections that come from comparing.**
   Mínimo 5:
   - "Pero X es más barato."
   - "X tiene caso en Y empresa más grande."
   - "X tiene esta feature específica."
   - "X tiene más años en el mercado."
   - "X tiene equipo local más grande."

   Cada uno con respuesta corta (2–3 frases) que **no menosprecia** al competidor.

6. **Define the "ditch" decision.**
   - Si Arkangel pierde claramente en 4+ dimensiones, el deal no se debe forzar. Marca como "competitor wins this one" y archiva con nota.
   - Si Arkangel gana en 2+ dimensiones críticas para este sector, vale la pena pelearlo.
   - Esa decisión va en el output, explícita. No se deja al comercial decidirla por instinto.

7. **Output structure.**

   ```markdown
   # Competitive Intel — <Competidor> · vs Arkangel · Para <Empresa>

   ## Brief del competidor
   <empresa, producto, wedge, geografía, pricing aproximado, casos>

   ## Por qué el prospecto los está mirando
   <razón principal — 1 frase>

   ## Mapa diferenciadores
   | Dimensión | Arkangel | <Competidor> | Veredicto |
   |---|---|---|---|
   | <ej. regulación local> | ... | ... | gana Arkangel |
   | <ej. brand recognition> | ... | ... | gana competidor (honestamente) |
   | ... | | | |

   ## Counter-positioning playbook
   - **Re-frame de criterios:** <cómo cambiar la conversación>
   - **Concesiones honestas:** <qué reconoces del competidor>
   - **2 diferenciadores a empujar:** <con evidencia>

   ## Objeciones anticipadas
   - "<objeción>" → "<respuesta corta sin trash-talk>"
   - mínimo 5

   ## Recomendación
   - Pelear el deal: ✅ / ❌
   - Razón: <1 frase>
   - Si ❌: archivar con nota "competitor wins this one por <razón>".
   ```

8. **Update Attio.**
   - Adjuntar el brief como nota.
   - Si la recomendación es no pelear, marcar `pipeline_stage = lost` con razón "competitive-loss".

## Pitfalls

- **Síntoma:** el output trata al competidor como inferior en todo. **Causa:** instinto de defensa. **Fix:** los CFOs detectan trash-talk inmediatamente. Una concesión honesta vale más que cinco ataques.
- **Síntoma:** se inventan capacidades del competidor que no tienen. **Causa:** falta de datos. **Fix:** "research needed" es respuesta válida; inventar es la peor opción.
- **Síntoma:** se proponen 7 diferenciadores. **Causa:** querer cubrir todo. **Fix:** 2 diferenciadores recordables ganan a 7 diluidos. Si tienes 7, prioriza los 2 más relevantes a este prospecto.
- **Síntoma:** se pelea un deal donde Arkangel claramente pierde. **Causa:** orgullo comercial. **Fix:** la recomendación "no pelear" es válida y libera calendar para deals ganables. No es derrota, es disciplina.
- **Síntoma:** la respuesta a "X es más barato" es "pero nosotros somos mejores". **Causa:** respuesta floja. **Fix:** la respuesta a precio siempre es TCO o costo de no resolver el dolor — nunca "pero somos mejores".
- **Síntoma:** el playbook genérico se reusa para 3 deals distintos. **Causa:** ahorro de tiempo. **Fix:** cada prospecto tiene contexto distinto; el "por qué te están mirando" cambia por deal aunque el competidor sea el mismo.

## Verification

- El brief tiene datos verificables (con fuente o "research needed"), no inventados.
- El mapa diferenciadores incluye al menos una concesión honesta donde Arkangel pierde.
- Los 2 diferenciadores a empujar tienen evidencia concreta.
- Las objeciones anticipadas no menosprecian al competidor.
- La recomendación pelear / no-pelear está explícita con razón.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`decision-maker-kit`](../decision-maker-kit/) — donde el counter-positioning se inserta en talking points por rol.
- [`postcall-recap`](../postcall-recap/) — captura cuándo apareció el competidor en transcript.
- [`deal-health`](../deal-health/) — detecta competitive risk y gatilla esta skill.
