# Sales pipeline

Reference doc for the Arkangel sales-pipeline skills. Mirror of `GRANTS.md` and `AUDIT.md`.

## Methodology

Hybrid Sandler + MEDDIC adapted to enterprise healthtech (long multi-stakeholder cycle, heavy legal/security review because of clinical data).

The pipeline is shaped as a **submarine**: 7 sequential compartments. You don't open the next one until the current one is closed. Each meeting has one job — close one compartment.

```
  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
  │     1     │ │     2     │ │     3     │ │     4     │ │     5     │ │     6     │ │     7     │
  │ Qualify   │▶│ Diagnose  │▶│ Champion  │▶│ Decision  │▶│Procurement│▶│   Legal   │▶│ Security  │
  │  dolor    │ │  dolor    │ │   kit     │ │  makers   │ │           │ │           │ │           │
  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
       │             │             │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼             ▼             ▼
   match dolor   pain funnel    champion       DMs ven       compras       legal         security
   presupuesto   ROI cuant.     vende          el caso       verde         verde         verde
   DM conocidos  línea compra   internamente   y validan
```

**Compartment exit criteria** (the door you must close before opening the next):

| # | Compartment | Closed when… |
|---|---|---|
| 1 | Qualify dolor | 100 % match en dolor + presupuesto reconocido + tomadores de decisión identificados |
| 2 | Diagnose dolor | Dolor cuantificado en $ + línea de compra clara + ROI estimado + champion identificado |
| 3 | Champion kit | Champion tiene materiales para vender internamente y se compromete a una próxima reunión con DM |
| 4 | Decision makers | Todos los DM cercanos vieron la propuesta y validaron precio + dirección |
| 5 | Procurement | Vendor form completo, condiciones comerciales aceptadas |
| 6 | Legal | Contrato + DPA / BAA / Hab. Datos firmados |
| 7 | Security | Cuestionario seguridad respondido, arquitectura validada |

## Skills index

### Transversal — corren en cualquier compartimento

| Skill | When |
|---|---|
| [`precall-brief`](./skills/precall-brief/) | Antes de cualquier reunión. Detecta el compartimento abierto, produce brief + Up-Front Contract calibrados al objetivo de esa reunión. |
| [`postcall-recap`](./skills/postcall-recap/) | Después de cualquier reunión. Convierte transcript en recap estructurado, actualiza Attio, redacta el follow-up con el siguiente UFC. |
| [`deal-health`](./skills/deal-health/) | En cualquier momento. Auditoría del deal contra el submarino: qué compartimentos están cerrados, cuáles abiertos, qué falta, riesgo de stall. |

### Por compartimento — uno por etapa

| # | Skill | Closes |
|---|---|---|
| 1 | `qualify-dolor` | Compartment 1 |
| 2 | `diagnose-dolor` | Compartment 2 |
| 3 | `champion-kit` | Compartment 3 |
| 4 | `decision-maker-kit` | Compartment 4 |
| 5 | `procurement-kit` | Compartment 5 |
| 6 | `legal-kit` | Compartment 6 |
| 7 | `security-kit` | Compartment 7 |

> Skills 1–7 se agregan en PRs siguientes.

### Soporte (datos, en repo privado)

`icp-match`, `pain-quantifier`, `stakeholder-map`, `proposal-pricer`, `competitive-intel`. Estos viven en repo privado por contener pricing, ICP y datos de Attio.

## Conventions

- **Up-Front Contract** es obligatorio al inicio de cada reunión. `precall-brief` lo deja redactado, listo para decir verbalmente.
- **Cuantificación de dolor** en COP/USD es obligatoria antes de pasar de compartimento 2 a 3. Si no hay número, no hay champion-kit.
- **Stakeholder map** se actualiza en cada `postcall-recap`. Sin DM identificado, no se pasa de compartimento 3 a 4.
- **Attio es la fuente de verdad** del estado del deal. Si una skill detecta divergencia entre lo que dice el usuario y Attio, frena y pregunta.

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
