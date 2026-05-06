---
name: stakeholder-map
description: Map every known person on the prospect side into a 2x2 grid (influence × support) and assign a tactical plan per quadrant — champion, supporter, blocker, detractor, unknown. Use after compartment 2, refresh on every postcall-recap, before any meeting with multiple stakeholders.
---

# Stakeholder Map

The MEDDIC "Champion" piece, expanded. Sandler tells you to find the pain; MEDDIC tells you to find the people who decide. This skill makes the people graph explicit so no DM is forgotten and no detractor stays unmanaged.

A deal with one identified champion and four "I think they're aligned" is a deal that loses to a single unmanaged detractor.

## When to Use

- After `diagnose-dolor` (compartment 2) cierra y empezamos a tocar más stakeholders.
- Refresh automático al final de cada `postcall-recap` cuando aparecen nombres nuevos.
- Antes de cualquier reunión con > 1 stakeholder del cliente.
- Cuando `deal-health` flagea "stakeholder coverage gap".

**Do not use** para mapear el equipo Arkangel (eso es interno, no aplica), o para deals < 50.000 USD donde el comité es trivial (1 DM = no necesita mapa).

## Inputs

- **Required:** prospecto + lista de personas conocidas (nombre, rol, fuente — quién los mencionó).
- **Optional:** transcripts de reuniones para inferir actitud, LinkedIn de cada persona, historial de interacciones.

## Procedure

1. **List every known person** del lado del cliente. Incluye:
   - Asistentes a reuniones.
   - Personas mencionadas pero ausentes ("mi jefe", "el comité", "el de IT").
   - Champion declarado.
   - Cualquier nombre que aparezca en correos / contratos / casos públicos.

   Si una persona se menciona sin nombre ("el CFO"), entra al mapa como `[CFO — nombre desconocido]` y queda flagged.

2. **Score each person on two axes (0–3 each).**

   **Influencia** (0 = sin voto, 3 = veta o aprueba):
   - 0 — sin voto en esta decisión.
   - 1 — input consultivo, no decide.
   - 2 — voz fuerte en el comité, puede frenar pero no decidir solo.
   - 3 — decide o vetea esta compra.

   **Support** (0 = detractor, 3 = champion activo):
   - 0 — Detractor: declarado o evidente en contra.
   - 1 — Skeptic: dudas, neutral con sesgo negativo.
   - 2 — Neutral o Supporter: positivo pasivo, no empuja.
   - 3 — Champion: empuja activamente, agenda reuniones, defiende internamente.

3. **Map a 4 cuadrantes.**

   ```
                          Support
                  detractor ─────▶ champion
                  ┌─────────┬─────────┐
   alta influencia│ BLOCKER │CHAMPION │
   (3)            │  (3,0)  │  (3,3)  │
                  ├─────────┼─────────┤
   baja influencia│  NOISE  │SUPPORTER│
   (0)            │  (0,0)  │  (0,3)  │
                  └─────────┴─────────┘
   ```

   - **CHAMPION** (alta influencia + alto support): tu activo más valioso. Sin uno, no hay deal.
   - **BLOCKER** (alta influencia + bajo support): la mayor amenaza. Cada deal grande tiene mínimo uno.
   - **SUPPORTER** (baja influencia + alto support): aliados internos del champion. Útiles para reforzar el caso.
   - **NOISE** (baja influencia + bajo support): consume tiempo del champion sin matar el deal. Manejar con eficiencia.

4. **For each person, define a tactical plan.**

   - **CHAMPION:** mantener informado, armar con `champion-kit`, agendar 1:1 fuera de reuniones grandes, reforzar antes de cada decisión.
   - **BLOCKER:** *neutralizar*, no convertir. Identificar su objeción principal, responder con evidencia, idealmente que el champion lleve la conversación. Convertir un blocker raras veces funciona; dejar de ser su enemigo, sí.
   - **SUPPORTER:** mantener al loop, pedirle que reafirme el caso ante el champion, no consume mucho tiempo.
   - **NOISE:** copiar en correos críticos, no buscar reunión 1:1.

5. **Identify gaps.**
   - **Coverage gap:** roles esperados (CFO, CMO, CIO, CISO típicamente en healthtech enterprise) que no están en el mapa.
   - **Champion gap:** si no hay champion identificado (3 en ambos ejes), el deal está en riesgo — vuelve a `diagnose-dolor`.
   - **Blocker visibility gap:** si todos están scored 2–3 en support, hay un blocker que no estás viendo. Asume que existe y búscalo.

6. **Output structure.**

   ```markdown
   # Stakeholder Map — <Empresa>

   ## Resumen
   - Total stakeholders mapeados: <N>
   - Champion: <nombre o "missing">
   - Blockers identificados: <N>
   - Coverage gap: <roles esperados pero no mapeados>

   ## Mapa
   | Persona | Rol | Influencia | Support | Cuadrante | Última interacción |
   |---|---|---|---|---|---|
   | ... | ... | 3 | 3 | CHAMPION | <fecha> |

   ## Plan por persona
   ### <Nombre — Cuadrante>
   - Estado actual: <1–2 frases>
   - Plan: <acciones concretas con quién y para cuándo>
   - Dueño Arkangel: <nombre>

   ## Gaps
   - <coverage / champion / blocker visibility>

   ## Próxima acción priorizada
   <una sola cosa que mueve el deal — usualmente neutralizar al blocker más grande o agendar 1:1 con el champion>
   ```

7. **Update Attio.**
   - `decision_makers` array con todos los scored ≥ 2 en influencia.
   - `champion_email` con la persona scored (3,3).
   - `blockers` con quienes scored (3,0) o (3,1) — flag específico.

## Pitfalls

- **Síntoma:** todos los stakeholders están en cuadrante CHAMPION. **Causa:** sesgo optimista. **Fix:** si todo es champion, no hay champion. Re-score con escepticismo — los humanos rara vez están todos a favor.
- **Síntoma:** un BLOCKER se intenta convertir. **Causa:** instinto comercial. **Fix:** los blockers se neutralizan; convertirlos cuesta más que ganarlos. El champion lidera esa conversación, no nosotros.
- **Síntoma:** "el comité" aparece como una persona. **Causa:** no se desagregó. **Fix:** un comité son N personas; cada una entra al mapa por separado.
- **Síntoma:** el mapa no se actualiza tras nuevas reuniones. **Causa:** se trató como entregable de una vez. **Fix:** `postcall-recap` debe gatillar refresh — cualquier nombre nuevo entra; cualquier cambio de actitud se re-puntúa.
- **Síntoma:** hay champion (3,3) pero no agenda reuniones internas. **Causa:** champion en el mapa, no en la realidad. **Fix:** si no agenda en 14 días, baja a (3,2) — supporter, no champion. Re-evaluar si compartimento 2 realmente cerró.

## Verification

- Cada persona tiene score en ambos ejes con razón observable.
- Hay máximo 1–2 champions reales (más es alucinación).
- Cada cuadrante BLOCKER tiene plan de neutralización con dueño y fecha.
- Si no hay champion, el output dice explícitamente "champion missing — bloquea avance".

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`diagnose-dolor`](../diagnose-dolor/) — donde el champion debe haberse cerrado.
- [`postcall-recap`](../postcall-recap/) — gatilla refresh del mapa.
- [`decision-maker-kit`](../decision-maker-kit/) — usa el mapa para priorizar a qué DM adaptar primero.
- [`deal-health`](../deal-health/) — flagea coverage gaps cuando los detecta.
