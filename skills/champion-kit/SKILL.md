---
name: champion-kit
description: Build the materials a champion needs to sell Arkangel internally without us in the room — slim deck, one-pager proposal, "vende-por-ti" email, and FAQ for anticipated internal objections. Compartment 3 of the Arkangel sales submarine. Use after diagnose-dolor closed, when the champion is about to pitch their boss or a peer DM.
---

# Champion Kit

Compartment 3 of the Arkangel sales submarine. The champion is the person inside the prospect's organization who wants this to happen. The job here: arm them so they can win the internal sale — even when we're not in the room.

If the champion can't defend the case alone with these materials, the deal stalls.

## When to Use

- Compartment 2 (`diagnose-dolor`) closed — Dx document exists, champion identified and committed.
- The champion asks "qué le mando a mi jefe" or "qué necesito para presentar esto al comité".
- A meeting between the champion and a senior DM is on the calendar.

**Do not use** if there is no Dx document with quantified pain (run `diagnose-dolor` first), or if the champion has not committed (sin compromiso, no kit — vuelve a compartimento 2).

## Inputs

- **Required:** Dx document from `diagnose-dolor`, champion name + role, internal audience the champion will face.
- **Optional:** company brand colors / preferred deck format, existing case studies relevant to the sector.

## Procedure

1. **Read the Dx document.** All numbers, quotes, and stakeholders come from there. Do not re-quantify.

2. **Build the slim deck (5–7 slides).**
   - Slide 1: el problema en una frase + el costo anual cuantificado.
   - Slide 2: pain funnel resumido — los 3 niveles más fuertes que aparecieron en la reunión.
   - Slide 3: cómo Arkangel resuelve esto (medsearch o pandora, según producto).
   - Slide 4: 1–2 casos similares en el sector (con permiso del cliente referente).
   - Slide 5: ROI rango (Nx, payback en meses).
   - Slide 6: próximo paso concreto — qué se decide en la siguiente reunión.
   - Slide 7 (opcional): FAQ rápido.
   - **Tono:** lenguaje del champion, no de Arkangel. Si el champion habla en español formal, todo formal. Sin marketing.

3. **Build the one-pager propuesta.**
   - Una página, formato carta. Imprimible.
   - Estructura: problema · solución · alcance · entregables · cronograma · inversión rango (Good/Better/Best genérico, sin tarifas exactas) · próximo paso.
   - Sin precio cerrado — el rango va en `proposal-pricer` (repo privado) en compartimento 4.

4. **Write the "vende-por-ti" email.**
   - Email que el champion puede forwardear a su jefe sin editar.
   - 100–150 palabras. Un solo párrafo + bullets.
   - Estructura: contexto del problema (con número del Dx) · qué propone el champion · por qué es el momento · qué pide al jefe (típicamente: 30 minutos para ver propuesta).

5. **Build the FAQ — anticipa objeciones internas.**
   Mínimo 6 preguntas:
   - ¿Por qué ahora?
   - ¿Por qué Arkangel y no [competidor obvio en el sector]?
   - ¿Cuál es el riesgo si esto falla?
   - ¿Qué pasa si no hacemos nada?
   - ¿Cuánto tiempo toma ver resultados?
   - ¿Qué necesitamos del lado nuestro?
   Cada respuesta en 2–3 frases. Lenguaje del audience.

6. **Confirm next step with champion.**
   - Antes de cerrar este kit, agenda con el champion: ¿cuándo presenta? ¿a quiénes? ¿qué outcome espera?
   - Si no hay fecha de presentación interna en 14 días, el compartimento 3 no cierra — kit no es suficiente, falta tracción.

7. **Update Attio.**
   - Adjuntar el kit (deck + one-pager + email + FAQ).
   - Notar fecha de presentación interna.
   - `pipeline_stage = 4.dm` solo cuando el champion confirme que ya presentó y agendó con DMs cercanos.

## Output structure

```markdown
# Champion Kit — <Empresa> · Champion: <nombre>

## 1. Deck (5–7 slides)
<outline slide por slide, con bullets de contenido>

## 2. One-pager
<página completa, formato propuesta>

## 3. Email vende-por-ti
<texto listo para forwardear>

## 4. FAQ
<6+ preguntas con respuesta en 2–3 frases>

## 5. Next step con champion
- Presenta a: <quién>
- Cuándo: <fecha>
- Outcome esperado: <qué se decide>
```

## Pitfalls

- **Síntoma:** el deck dice "transformación digital" o "data-driven". **Causa:** lenguaje genérico de marketing. **Fix:** todas las palabras del deck deben sonar al champion. Si el champion no usaría esa palabra, fuera.
- **Síntoma:** el one-pager incluye precio cerrado. **Causa:** se filtró pricing del repo privado. **Fix:** rango Good/Better/Best genérico. El precio exacto entra en `decision-maker-kit` con `proposal-pricer`.
- **Síntoma:** el champion recibe el kit y no presenta. **Causa:** kit demasiado largo o el champion no se siente dueño. **Fix:** después de entregar, agenda 15 minutos con el champion para revisar el deck juntos. Si no agenda esa revisión, no presentará.
- **Síntoma:** el FAQ tiene la pregunta "¿es seguro?" sin respuesta concreta. **Causa:** se respondió genérico. **Fix:** referencia evidencia real (pentest Hackmetrix, ISO27001 status, RLS Supabase). Si no hay evidencia, el FAQ no debe inflar.

## Verification

- El deck tiene exactamente 5–7 slides — no más, no menos.
- El one-pager cabe en una sola página carta.
- El email se lee en 60 segundos.
- El FAQ tiene mínimo 6 preguntas con respuesta concreta.
- El champion confirmó fecha de presentación interna.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`diagnose-dolor`](../diagnose-dolor/) — produce el Dx que alimenta este kit.
- [`precall-brief`](../precall-brief/) — antes de cualquier reunión derivada de este kit.
- [`decision-maker-kit`](../decision-maker-kit/) — siguiente compartimento.
- `proposal-pricer` (repo privado) — pricing exacto cuando entremos a compartimento 4.
