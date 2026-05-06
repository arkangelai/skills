---
name: sales-pipeline
description: The Arkangel sales submarine — hybrid Sandler + MEDDIC adapted to enterprise healthtech. Tells you which compartment a deal is in, which skill to invoke before/during/after each meeting, and the exit criteria to advance. Use when you need the full pipeline view, when onboarding a new sales rep, or when deciding "what do I run next?".
---

# Sales Pipeline

The methodology and orchestration layer for all Arkangel sales skills. This is **the** skill to read first if you're about to work a deal — it tells you which compartment you're in and which skill to invoke at every step.

## When to Use

- The owner says "qué skill corro ahora", "cómo se usa esto", or "explícame el pipeline".
- A new sales rep is onboarding and needs the full picture.
- Deciding which skill applies in the current state of a deal.
- Designing or reviewing a sales playbook.

**Do not use** for a specific meeting prep (use `precall-brief`), a specific recap (`postcall-recap`), or a specific audit (`deal-health`). This skill orchestrates them — it doesn't replace them.

## Methodology

Hybrid **Sandler + MEDDIC** adapted to enterprise healthtech. Long multi-stakeholder cycle, heavy legal/security review because of clinical data.

The pipeline is shaped as a **submarine**: 7 sequential compartments. You don't open the next one until the current one is closed. Each meeting has one job — close one compartment.

```
  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
  │     1     │ │     2     │ │     3     │ │     4     │ │     5     │ │     6     │ │     7     │
  │ Qualify   │▶│ Diagnose  │▶│ Champion  │▶│ Decision  │▶│Procurement│▶│   Legal   │▶│ Security  │
  │  dolor    │ │  dolor    │ │   kit     │ │  makers   │ │           │ │           │ │           │
  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
```

## How to use the skills at each compartment

For every compartment, the playbook is the same shape: **before the meeting → during/right after → audit anytime**. The transversal skills (`precall-brief`, `postcall-recap`, `deal-health`) work at every compartment; the per-compartment skill (`qualify-dolor`, `diagnose-dolor`, etc.) handles that specific stage's logic.

### Compartment 1 — Qualify dolor

**Goal:** Confirm this prospect is a real opportunity, not a curious tire-kicker.
**Closed when:** 100 % match en dolor + presupuesto reconocido + tomadores de decisión identificados.

| When | Skill | How to invoke | Expected output |
|---|---|---|---|
| Before meeting #1 | [`precall-brief`](../precall-brief/) | `/precall-brief` · "prepara la primera reunión con <empresa>" | Brief + UFC con outcomes "califica / no califica / hablamos en 6 meses" |
| During / right after #1 | [`qualify-dolor`](../qualify-dolor/) | `/qualify-dolor` · "evalúa si <empresa> califica" | GO / NO-GO con razón concreta y datos faltantes |
| Right after #1 | [`postcall-recap`](../postcall-recap/) | `/postcall-recap` con transcript | Attio actualizado a `pipeline_stage = 2.diagnose` si GO |
| Anytime | [`deal-health`](../deal-health/) | `/deal-health` con deal | Si compartimento 1 abierto: lista qué falta para califiar |

### Compartment 2 — Diagnose dolor

**Goal:** Cuantificar el dolor en plata, mapear la línea de compra, y cerrar al champion.
**Closed when:** Dolor cuantificado en COP/USD + ROI estimado + champion identificado y comprometido.

| When | Skill | How to invoke | Expected output |
|---|---|---|---|
| Before meeting #2 | [`precall-brief`](../precall-brief/) | `/precall-brief` · "prepara la reunión de diagnóstico" | Brief + UFC con outcomes "salimos con número y champion" |
| During #2 | [`diagnose-dolor`](../diagnose-dolor/) | `/diagnose-dolor` · "corre el pain funnel con <empresa>" | Pain funnel completo + ROI + Dx doc para champion |
| Right after #2 | [`postcall-recap`](../postcall-recap/) | `/postcall-recap` con transcript | Attio: `pain_quantified_cop`, `champion_email`, stage 3 |
| If pricing needed | [`pain-quantifier`](../pain-quantifier/) | `/pain-quantifier` · "cuantifica el dolor de <empresa>" | Cuantificación detallada con fórmulas por sector |
| Anytime | [`deal-health`](../deal-health/) | `/deal-health` con deal | Si compartimento 2 abierto: número faltante o champion ausente |

### Compartment 3 — Champion kit

**Goal:** Que el champion venda la solución internamente sin nosotros en la sala.
**Closed when:** Champion tiene materiales para defender el caso + agendó próxima reunión con DMs cercanos.

| When | Skill | How to invoke | Expected output |
|---|---|---|---|
| Before sending materials | [`precall-brief`](../precall-brief/) | `/precall-brief` · "qué le mando al champion de <empresa>" | UFC con outcomes "vuelve con DMs y fecha" |
| Build the kit | [`champion-kit`](../champion-kit/) | `/champion-kit` · "arma kit para <champion>" | Deck + propuesta one-pager + email vende-por-ti |
| Right after handoff | [`postcall-recap`](../postcall-recap/) | `/postcall-recap` (incluye email/llamada) | Attio: kit enviado, fecha próxima con DMs |
| Anytime | [`deal-health`](../deal-health/) | `/deal-health` con deal | Si compartimento 3 abierto > 14 días: alerta de stall |

### Compartment 4 — Decision makers cercanos

**Goal:** Que cada DM cercano (CFO, CMO, CIO) vea la propuesta y valide precio + dirección.
**Closed when:** Todos los DMs cercanos vieron la propuesta, validaron price-bracket y se comprometieron al siguiente paso.

| When | Skill | How to invoke | Expected output |
|---|---|---|---|
| Before meeting con DMs | [`precall-brief`](../precall-brief/) | `/precall-brief` · "prepara reunión con CFO/CMO/CIO de <empresa>" | Brief por rol + UFC con outcomes "validan price-bracket" |
| Build the kit por rol | [`decision-maker-kit`](../decision-maker-kit/) | `/decision-maker-kit` · "adapta kit para CFO de <empresa>" | Deck + price bracket Good/Better/Best, lenguaje por rol |
| Right after meeting | [`postcall-recap`](../postcall-recap/) | `/postcall-recap` con transcript | Attio: DMs en `decision_makers`, stage 5 |
| Stakeholder coverage check | [`stakeholder-map`](../stakeholder-map/) | `/stakeholder-map` · "mapea stakeholders de <empresa>" | Mapa 2x2 influencia × support con plan por persona |
| Anytime | [`deal-health`](../deal-health/) | `/deal-health` con deal | Si DM crítico no validó: marca como blocker |

### Compartment 5 — Procurement

**Goal:** Pasar el filtro de compras sin perder semanas.
**Closed when:** Vendor form completo, condiciones comerciales aceptadas.

| When | Skill | How to invoke | Expected output |
|---|---|---|---|
| Before procurement call | [`precall-brief`](../precall-brief/) | `/precall-brief` · "prepara reunión con compras" | Brief + UFC con outcomes "salimos con vendor form lleno" |
| Build the kit | [`procurement-kit`](../procurement-kit/) | `/procurement-kit` · "responde vendor form de <empresa>" | Vendor form pre-llenado, NIT, SLAs, condiciones |
| Right after | [`postcall-recap`](../postcall-recap/) | `/postcall-recap` | Attio: nota "procurement done", stage 6 |
| Anytime | [`deal-health`](../deal-health/) | `/deal-health` con deal | Si > 21 días sin movimiento: escalar via champion |

### Compartment 6 — Legal

**Goal:** Cerrar contrato + DPA / BAA / Hab. Datos sin retrabajos.
**Closed when:** Contrato + anexos firmados.

| When | Skill | How to invoke | Expected output |
|---|---|---|---|
| Before legal call | [`precall-brief`](../precall-brief/) | `/precall-brief` · "prepara reunión legal de <empresa>" | Brief + UFC con outcomes "salimos con redlines o firma" |
| Build the kit | [`legal-kit`](../legal-kit/) | `/legal-kit` · "prepara contrato + DPA para <empresa>" | Contrato marco, DPA, BAA, anexo Hab. Datos / GDPR / HIPAA |
| Right after | [`postcall-recap`](../postcall-recap/) | `/postcall-recap` | Attio: nota "legal signed", stage 7 |
| Anytime | [`deal-health`](../deal-health/) | `/deal-health` con deal | Bloqueos legales históricamente más largos: alerta a 30 días |

### Compartment 7 — Security

**Goal:** Cuestionario de seguridad respondido, arquitectura validada.
**Closed when:** Security questionnaire + arquitectura aprobados por CISO/equipo de seguridad.

| When | Skill | How to invoke | Expected output |
|---|---|---|---|
| Before security call | [`precall-brief`](../precall-brief/) | `/precall-brief` · "prepara reunión con CISO de <empresa>" | Brief + UFC con outcomes "salimos con sign-off o action items" |
| Build the kit | [`security-kit`](../security-kit/) | `/security-kit` · "responde cuestionario seguridad de <empresa>" | SOC2 / ISO27001 / HIPAA pre-llenado + arquitectura, RLS, encriptación, evidencia pentest |
| Right after | [`postcall-recap`](../postcall-recap/) | `/postcall-recap` | Attio: nota "security cleared", stage `won` |
| Anytime | [`deal-health`](../deal-health/) | `/deal-health` con deal | Si security se traba: usualmente requiere AppSec, no solo comercial |

## Skill index (cheat sheet)

**Transversal — corren en cualquier compartimento:**
- [`precall-brief`](../precall-brief/) — antes de cualquier reunión
- [`postcall-recap`](../postcall-recap/) — después de cualquier reunión
- [`deal-health`](../deal-health/) — auditoría en cualquier momento
- [`sales-roleplay`](../sales-roleplay/) — practicar reuniones difíciles antes de hacerlas

**Por compartimento:**
- [`qualify-dolor`](../qualify-dolor/) · [`diagnose-dolor`](../diagnose-dolor/)
- [`champion-kit`](../champion-kit/) · [`decision-maker-kit`](../decision-maker-kit/)
- [`procurement-kit`](../procurement-kit/) · [`legal-kit`](../legal-kit/) · [`security-kit`](../security-kit/)

**Soporte — frameworks específicos invocables desde otros compartimentos:**
- [`icp-match`](../icp-match/) — score 0-10 contra ICP antes de qualify
- [`pain-quantifier`](../pain-quantifier/) — cuantifica el dolor en COP/USD con fórmulas por sector
- [`stakeholder-map`](../stakeholder-map/) — mapa 2x2 influencia × support con plan por persona
- [`proposal-pricer`](../proposal-pricer/) — bracket Good/Better/Best con scope distinto por tier (rate-card vive en config privada, no en el skill)
- [`competitive-intel`](../competitive-intel/) — counter-positioning vs competidores con concesiones honestas

## Conventions

- **Up-Front Contract** es obligatorio al inicio de cada reunión. `precall-brief` lo deja redactado, listo para decir verbalmente.
- **Cuantificación de dolor** en COP/USD es obligatoria antes de pasar de compartimento 2 a 3. Si no hay número, no hay champion-kit.
- **Stakeholder map** se actualiza en cada `postcall-recap`. Sin DM identificado, no se pasa de compartimento 3 a 4.
- **Attio es la fuente de verdad** del estado del deal. Si una skill detecta divergencia entre lo que dice el usuario y Attio, frena y pregunta.
- **Una reunión = un compartimento.** Si te ves cerrando dos a la vez, divide la reunión en dos.

## Attio integration

Las skills transversales leen el deal vía Attio MCP cuando está disponible (`mcp__attio__*`), y caen a preguntar al usuario si no responde. Comportamiento híbrido: cero fricción cuando Attio está OK, robusto cuando no.

Campos esperados en el objeto Deal de Attio:

- `pipeline_stage` — `1.qualify | 2.diagnose | 3.champion | 4.dm | 5.procurement | 6.legal | 7.security | won | lost`
- `pain_quantified_cop` — número en pesos
- `champion_email` — contacto principal
- `decision_makers` — array de contactos
- `last_meeting_date`, `next_meeting_date`
- `blockers` — texto libre

Si tu pipeline en Attio aún no tiene estos campos, las skills funcionan en modo "preguntar" — pero te recomendamos crearlos para que la automatización entre.

## Pitfalls

- **Síntoma:** se invoca `champion-kit` antes de cuantificar el dolor. **Causa:** se saltó el compartimento 2. **Fix:** correr `deal-health` antes; si compartimento 2 no está cerrado, regresar a `diagnose-dolor`.
- **Síntoma:** se manda propuesta a procurement sin tocar a los DMs cercanos primero. **Causa:** champion empujó por velocidad; el deal va a morir en compras. **Fix:** insistir en cerrar compartimento 4 antes de bajar a 5.
- **Síntoma:** dos compartimentos abiertos a la vez (ej. champion-kit y decision-maker-kit en paralelo). **Causa:** confusión sobre qué cerró. **Fix:** el submarino es secuencial; si dudas, `deal-health` decide.

## Verification

- Cualquier persona del equipo comercial puede leer este SKILL.md y saber qué correr en su deal hoy.
- Para cada compartimento, hay 3 skills citadas (before / during / after) más la auditoría.
- El estado de `pipeline_stage` en Attio se mapea 1:1 a los compartimentos de aquí.

## References

- [`precall-brief`](../precall-brief/) — meeting prep.
- [`postcall-recap`](../postcall-recap/) — meeting recap.
- [`deal-health`](../deal-health/) — deal audit.
