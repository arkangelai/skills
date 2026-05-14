---
name: hospital-devolucion-audit
description: Analiza UNA glosa recibida de una EPS (un ítem objetado sobre una factura) y produce la respuesta argumental — disputar o aceptar, con valor a defender y a aceptar, y la justificación clínica/administrativa/financiera. Aplica DAMA-UK, PERT-CLIN o FIN-CTR según la causal. Emite glosa-response.json. Usar cuando la IPS recibe una glosa y necesita construir su respuesta dentro del plazo de 15 días hábiles (Res. 3047/2008).
version: 2.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, glosa, devolucion, hospital, ips, eps, colombia]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
---

# hospital-devolucion-audit

Agente de respuesta a UNA glosa (un ítem objetado por la EPS sobre una factura). Construye la argumentación que fundamenta la postura de la IPS — **disputar** o **aceptar** — sobre ese ítem.

La pregunta que responde: **¿cuál es la posición defensiva de la IPS frente a este cargo glosado, y cuánto del valor objetado es recuperable?**

> **Nota sobre el modelo (v2):** una glosa = un ítem. Si la EPS objeta varios ítems de la misma factura, cada uno es una task independiente y este skill se ejecuta una vez por cada uno. El skill `hospital-devolucion-batch-parse` se encarga de separar un Excel multi-glosa en tasks individuales.

## When to Use

- La IPS recibe una glosa y necesita preparar la respuesta formal dentro del plazo.
- El orquestador despacha un caso al agente con `task_type = hospital_devolucion` y el `context` contiene un único ítem objetado (GlosaContext).
- Reprocesamiento de un caso cuyo análisis terminó en error o requiere re-evaluación tras adjuntar nuevos documentos.

**No usar:**
- Si `task_type != hospital_devolucion`.
- Si el `context` carga un array `lineas[]` (modelo legacy — debe pasar primero por `hospital-devolucion-batch-parse`).
- Si la task aún está `archived` o `done` y no se solicitó re-auditoría.

## Input Contract

### Required environment variables

- `LOCAL_DEVOLUCION_REF_PATH` — Ruta absoluta al directorio espejo del knowledge base de devolución en el host del agente. Default si no está definida: `/root/.hermes/ref-data/hospital-devolucion/`. El skill aborta con error claro si la ruta no existe o no contiene los `INDEX.md` esperados.

### Reference data resolution

Antes de aplicar reglas, el skill resuelve tres jerarquías de referencias:

**1. Parámetros operativos por aseguradora** (bundle, no env var):
- `references/aseguradoras.json` — mapa `pagador_id → { tarifa_base, vigencia_aut_dias, aut_format_regex, portal_radicacion, plazos, soportes_minimos, ... }`. Toda regla con variación per-EPS lee de aquí.

**2. Instrumentos de reglas** (bundle, no env var):
- `references/dama_uk.json` — 24 reglas A01–A24 para causales 1 (Facturación), 3 (Soportes), 4 (Autorización), 7 (Anulaciones).
- `references/pert_clin.json` — 29 reglas M01–M29 para causales 5 (Cobertura), 6 (Pertinencia).
- `references/fin_ctr.json` — 42 reglas F01–F42 para causal 2 (Tarifas).

**3. Documentos contractuales y clínicos** (externos, via `$LOCAL_DEVOLUCION_REF_PATH`, enrutados por `INDEX.md` en cada subdirectorio):

```
$LOCAL_DEVOLUCION_REF_PATH/
  contratos/INDEX.md          ← pagador_id → Contrato-{EPS}-2026.pdf
  tarifarios/INDEX.md         ← pagador_id → Tarifario-{EPS}-2026.pdf
  radicacion/INDEX.md         ← portal → Reglas-Empaquetado-{portal}.pdf
  soportes_clinicos/INDEX.md  ← escenario (UCI/Qx/Hosp) → Checklist-*.pdf
  guias_clinicas/INDEX.md     ← rango CIE-10 → GPC-MinSalud-*.pdf
  plantillas/INDEX.md         ← (evidence_status, decision) → Carta-*.pdf
```

Cada `INDEX.md` documenta el algoritmo de selección y la tabla de routing. El skill DEBE cargar el `INDEX.md` correspondiente antes de cargar archivos individuales.

### Task context shape

El context de la task (entregado al agente) es un `GlosaContext` — schema `hospitals/devolucion/glosa-context` (ver `references/glosa-context-template.json`).

Campos clave:

| Campo | Tipo | Descripción |
|---|---|---|
| `caso_id` | `string` | Ej: `HOSP-GL-20260513-A1B2C` |
| `num_factura_original` | `string` | Factura sobre la cual la EPS interpuso esta glosa |
| `codigo` | `string` | CUPS/SOAT del ítem facturado |
| `descripcion` | `string` | Descripción del servicio o insumo |
| `cantidad` | `number` | Unidades facturadas |
| `valor_facturado` | `integer` (COP) | Lo que la IPS cobró por este ítem |
| `valor_glosado` | `integer` (COP) | Lo que la EPS objeta. Puede ser ≤ valor_facturado |
| `causal_num` | `"1"`–`"7"` | Causal según Res. 3047/2008 |
| `motivo_glosa` | `string` | Texto literal con el que la EPS justifica la objeción |
| `pagador_*` | — | Datos de la EPS |
| `prestador_*` | — | Datos de la IPS |
| `paciente_*` | — | Alias / documento alias del paciente |
| `fecha_glosa` | `date` | Cuándo la EPS notificó la glosa |
| `fecha_vencimiento` | `date` | Plazo de respuesta |

Además del context, el directorio de trabajo de la task puede contener documentos clínicos y administrativos (HC, autorización, RIPS, factura, soportes adicionales). Leer todos los disponibles antes de evaluar.

## Output Contract

El skill genera **un solo archivo**: `glosa-response.json`. Schema `hospitals/devolucion/glosa-response` (ver `references/glosa-response-template.json`).

```json
{
  "instrumento": "RESPUESTA-GLOSA",
  "meta": {
    "caso_id": "HOSP-GL-20260513-A1B2C",
    "fecha_auditoria": "2026-05-13T10:00:00-05:00",
    "agente": "hospital-devolucion-audit-v2"
  },
  "capa": "medico",
  "reglas_aplicadas": [
    {
      "id": "M22",
      "nombre": "Justificación de estancia en UCI",
      "resultado": "pass",
      "evidencia": "HC p.6 \"APACHE II: 14 — ventilación mecánica activa\"",
      "observaciones": "La HC documenta los criterios de severidad que justifican la estancia.",
      "confianza": 0.92
    }
  ],
  "evidence_status": "sufficient",
  "decision": "disputar",
  "argumentacion": "La estancia en UCI está justificada por los criterios de severidad documentados en la HC del paciente: APACHE II = 14, ventilación mecánica activa al ingreso. Se adjuntan folios 4–8 de la HC.",
  "valor_a_defender": 1160000,
  "valor_a_aceptar": 0
}
```

### Capa por causal

| `causal_num` | Nombre | Capa | Instrumento |
|---|---|---|---|
| 2 | Tarifas | `financiero` | FIN-CTR (reglas F01–F42) |
| 5 | Cobertura / no-PBS | `medico` | PERT-CLIN (reglas M01–M29) |
| 6 | Pertinencia | `medico` | PERT-CLIN (reglas M01–M29) |
| 1, 3, 4, 7 | Facturación / Soportes / Autorización / Anulaciones | `administrativo` | DAMA-UK (reglas A01–A27) |

### Campos del veredicto

**`evidence_status`** (uno de):
- `sufficient` — la información disponible permite emitir un veredicto firme.
- `pending` — faltan documentos críticos (HC, autorización, RIPS, etc.) para decidir. En este caso, `decision` debe ser `null` y `evidencia_requerida` debe listar qué documentos se necesitan.

**`decision`** (postura final de la IPS):
- `disputar` — la IPS tiene argumentos para revertir total o parcialmente la objeción. `valor_a_defender > 0`. Las disputas parciales (con `valor_a_aceptar > 0`) siguen siendo `disputar`.
- `aceptar` — la objeción es válida. `valor_a_defender = 0` y `valor_a_aceptar = valor_glosado`.
- `null` — **solamente** cuando `evidence_status = pending`. No pre-comprometer veredicto si no hay evidencia suficiente.

**Invariantes** (validados en `lib/hospitales/devolucion/validation.ts` del backend):

1. `evidence_status === 'pending'` ⇔ `decision === null`
2. `valor_a_defender + valor_a_aceptar = valor_glosado` (cuando `evidence_status = sufficient`)
3. `decision = 'aceptar'` ⇔ `valor_a_defender = 0` (cuando `sufficient`)
4. `decision = 'disputar'` ⇒ `valor_a_defender > 0` (cuando `sufficient`)
5. `valor_a_defender ≥ 0` y `valor_a_aceptar ≥ 0` siempre

### Reglas de `confianza`

- `≥ 0.95` — cita literal del documento o consulta de sistema verificable.
- `0.80–0.94` — referencia específica sin cita literal.
- `< 0.80` en todas las reglas de soporte → `evidence_status = pending` (no comprometer `disputar` sin evidencia firme).

### `evidencia_requerida`

Campo opcional. **Obligatorio cuando `evidence_status = pending`**. Lista de documentos que el agente necesita para finalizar el veredicto. Ej:

```json
"evidencia_requerida": [
  "Historia clínica folios 4-12 (evolución pre-UCI)",
  "Orden médica de ingreso a UCI",
  "Resultados de gases arteriales del 2026-04-04"
]
```

## Procedure

1. **Cargar inputs y referencias.**
   - Leer el `context` de la task (GlosaContext).
   - Leer todos los documentos del directorio de trabajo (HC, autorización, RIPS, factura, etc.).
   - Cargar `references/aseguradoras.json`. Validar que `context.pagador_id` exista como clave. Si no, abortar con `error_unknown_pagador`.
   - Verificar `context.fecha_vencimiento`. Si hoy > vencimiento, documentar en `argumentacion` el número de días de mora pero continuar.
   - Validar que `$LOCAL_DEVOLUCION_REF_PATH` (o el default `/root/.hermes/ref-data/hospital-devolucion/`) exista y contenga los 6 `INDEX.md`. Si no, abortar con `error_missing_ref_data` y listar las rutas faltantes.

2. **Determinar la capa y el instrumento** según `context.causal_num` (ver tabla arriba). Cargar el instrumento JSON correspondiente (`references/dama_uk.json`, `references/pert_clin.json`, o `references/fin_ctr.json`). Filtrar reglas por `causales_aplicables` para considerar solo las relevantes a `context.causal_num`.

3. **Resolver documentos contractuales y clínicos** según la causal:
   - **Causal 2 (Tarifas)** → cargar `tarifarios/INDEX.md`, resolver el tarifario por `pagador_id`, abrir el PDF y localizar la fila del CUPS (`context.codigo`). Citar literalmente en evidencia.
   - **Causales 5/6 (Cobertura/Pertinencia)** → cargar `guias_clinicas/INDEX.md`, resolver la GPC por CIE-10 (extraer del HC o RIPS-AC). Cargar también `soportes_clinicos/INDEX.md` y el checklist del escenario (UCI/Qx/Hosp). Poblar `meta.gpc_aplicada` y `meta.checklist_aplicado`.
   - **Causales 1/3/4/7 (Administrativas)** → cargar `contratos/INDEX.md` y el contrato del pagador. Usar `aseguradoras.json[pagador_id]` como fuente primaria para vigencia, formato AUT, plazos. Recurrir al PDF del contrato solo si necesita cita literal de cláusula.

4. **Aplicar las reglas relevantes** del instrumento al ítem. No aplicar todas las reglas — solo las pertinentes al servicio y al motivo de glosa. Para cada regla completa `resultado`, `evidencia`, `observaciones`, `confianza`. Cuando la regla referencia `aseguradoras.json[pagador_id].field`, sustituir el valor correspondiente al pagador real.

5. **Determinar `evidence_status`.**
   - Si todas las reglas de soporte tienen `confianza ≥ 0.80` y la evidencia es citable → `sufficient`.
   - Si faltan documentos críticos para llegar a una conclusión firme → `pending`. Listar los documentos faltantes en `evidencia_requerida`. **Saltar al paso 8.**

6. **Determinar `decision`** (solo si `sufficient`):
   - Si alguna regla tiene `resultado = pass` con `confianza ≥ 0.80` y el argumento es completo → `disputar`.
   - Si la evidencia confirma la objeción → `aceptar`.

7. **Calcular `valor_a_defender` y `valor_a_aceptar`** (solo si `sufficient`):
   - `decision = 'aceptar'`: `valor_a_defender = 0`, `valor_a_aceptar = valor_glosado`.
   - `decision = 'disputar'` total: `valor_a_defender = valor_glosado`, `valor_a_aceptar = 0`.
   - `decision = 'disputar'` parcial: ambos > 0, suma = `valor_glosado`. Ej: 600k defendidos, 400k aceptados.

8. **Redactar `argumentacion`** — texto en español, apto para incluir directamente en la carta respuesta a la EPS. Citar evidencia con formato `{archivo} [p.{página}] ["{cita literal}"]`. Cuando `evidence_status = pending`, `argumentacion` puede ser `null` o un mensaje breve indicando los documentos pendientes. Para citas del tarifario o de cláusulas contractuales, usar el nombre del PDF cargado en el paso 3 (ej: `Tarifario-Sura-Quirurgicos-2026.pdf Sección C fila S55201`).

9. **Emitir `glosa-response.json`** con el schema exacto y subirlo como output con label `report`. La task transita automáticamente:
   - `evidence_status = pending` → `status = review` (espera subsanación).
   - `evidence_status = sufficient` → `status = done`.

## Notes for partial disputes

Cuando la IPS solo puede defender parte del valor glosado:
- `decision` sigue siendo `disputar` (estamos discutiendo algo).
- `valor_a_defender` y `valor_a_aceptar` ambos > 0 con suma = `valor_glosado`.
- La `argumentacion` debe explicar **por qué se acepta la porción aceptada** y **por qué se defiende la otra**.

Ej (UCI 3 días glosados, 2 días defendibles):
> "Se acepta la glosa por 1 día (COP 333.000). Folio 30 de la HC documenta que el día 3 el paciente cumplía criterios de egreso (SOFA = 2, hemodinámicamente estable). Se disputan los 2 días previos (COP 666.000) por inestabilidad documentada en folios 22 y 26."

## Pitfalls

- **Causal mixta:** si el `motivo_glosa` sugiere dos capas (ej: tarifa Y pertinencia), elegir la causal dominante por impacto económico y documentar la secundaria en `observaciones`.
- **Causal 5 (no PBS):** verificar si el servicio está fuera del PBS antes de argumentar pertinencia. Si está excluido, la glosa puede ser válida independientemente de la HC.
- **`confianza` inflada en F-CTR:** para reglas de tarifa, máximo `0.80` sin el anexo tarifario del contrato vigente. Con el anexo a la vista, `≥ 0.95` exige cita literal de la fila tarifaria.
- **`fecha_vencimiento` vencida:** advertir en `argumentacion` con los días de mora pero no bloquear — la IPS puede radicar extemporáneamente con justificación.

## Verification

- [ ] `glosa-response.json` existe en el directorio de trabajo y es válido contra `hospitals/devolucion/glosa-response`.
- [ ] `instrumento == "RESPUESTA-GLOSA"`.
- [ ] `capa` coincide con la causal según la tabla.
- [ ] Si `evidence_status == 'pending'`: `decision == null`, `argumentacion` puede ser null, `evidencia_requerida` no vacío.
- [ ] Si `evidence_status == 'sufficient'`: `decision` ∈ `{disputar, aceptar}`, `valor_a_defender + valor_a_aceptar == valor_glosado`.
- [ ] Si `decision == 'aceptar'`: `valor_a_defender == 0` y `valor_a_aceptar == valor_glosado`.
- [ ] Si `decision == 'disputar'`: `valor_a_defender > 0`.
- [ ] Cada `evidencia` contiene archivo + página/sección + cita o justificación específica.
- [ ] No se exporta más de un output por corrida (label `report`).

## References

### Bundled in this skill (`references/`)

- [`references/aseguradoras.json`](references/aseguradoras.json) — parámetros operativos per pagador (tarifa_base, vigencia_aut_dias, plazos, soportes_minimos, etc.). Looked up by `pagador_id`.
- [`references/dama_uk.json`](references/dama_uk.json) — 24 reglas A01–A24 para causales 1, 3, 4, 7 (administrativo).
- [`references/pert_clin.json`](references/pert_clin.json) — 29 reglas M01–M29 para causales 5, 6 (médico).
- [`references/fin_ctr.json`](references/fin_ctr.json) — 42 reglas F01–F42 para causal 2 (financiero).
- [`references/glosa-context-template.json`](references/glosa-context-template.json) — schema de input.
- [`references/glosa-response-template.json`](references/glosa-response-template.json) — schema de output.

### External (via `$LOCAL_DEVOLUCION_REF_PATH`)

Documentos contractuales y clínicos en el filesystem del host, organizados por categoría con `INDEX.md` de routing. Para sincronización desde Supabase Storage, ver el issue [`arkangelai/tasks-ark-cli#32`](https://github.com/arkangelai/tasks-ark-cli/issues/32).

### Skills relacionados

- [`../medical-invoice-admin-audit/SKILL.md`](../medical-invoice-admin-audit/SKILL.md) — versión EPS-side de DAMA-UK (causales 1, 3, 4, 7).
- [`../medical-invoice-medical-audit/SKILL.md`](../medical-invoice-medical-audit/SKILL.md) — versión EPS-side de PERT-CLIN (causales 5, 6).
- [`../medical-invoice-financial-audit/SKILL.md`](../medical-invoice-financial-audit/SKILL.md) — versión EPS-side de FIN-CTR (causal 2).
- [`../hospital-devolucion-batch-parse/SKILL.md`](../hospital-devolucion-batch-parse/SKILL.md) — separa un Excel multi-glosa en tasks individuales (upstream de este skill).

### Marco normativo

- Resolución 3047/2008 + Resolución 416/2009 — Manual Único de Glosas, Devoluciones y Respuestas. Causales 1–7 y plazos.
- Resolución 2481/2020 — Plan de Beneficios en Salud (PBS).
- Resolución 5993/2018 — Manual Único Tarifario SOAT 2024.
- Acuerdo 256/2001 CNSSS — Manual ISS 2001.
- Resolución 5928/2017 — auditoría concurrente y posterior.
- Resolución 866/2017 — Anexo Técnico de cuentas médicas (RIPS).
- Resolución 1536/2022 — estructura RIPS.
- Resolución 1995/1999 — historia clínica mínima.
- Ley 1438/2011 — Art. 67 (urgencias sin autorización previa).
- Ley 1581/2012 — protección de datos personales.
