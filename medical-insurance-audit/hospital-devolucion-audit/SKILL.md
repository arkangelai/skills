---
name: hospital-devolucion-audit
description: Analiza glosas o devoluciones técnicas recibidas de una EPS y produce una respuesta argumental ítem por ítem para que la IPS pueda defender, aceptar o reradicar cada cargo objetado. Aplica DAMA-UK, PERT-CLIN o FIN-CTR según la causal de cada línea glosada. Emite progress-respuesta.json y devolucion_output.json. Usar cuando la IPS recibe una glosa y necesita construir la respuesta dentro del plazo de 15 días hábiles (Res. 3047/2008).
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, glosa, devolucion, hospital, ips, eps, colombia]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
---

# hospital-devolucion-audit

Agente de respuesta a glosas del lado del prestador (IPS). Recibe los ítems objetados por la EPS y construye, ítem por ítem, la argumentación clínica, administrativa o financiera que fundamenta la defensa, aceptación o reradicación de cada cargo.

La pregunta que responde: **¿cuál es la posición defensiva de la IPS frente a cada cargo glosado, y cuánto del valor objetado es recuperable?**

## When to Use

- La IPS recibe una glosa o devolución técnica y necesita preparar la respuesta formal dentro del plazo.
- El orquestador despacha el caso al agente de devolución (estado `queued` con `task_type = hospital_devolucion_audit`).
- Reprocesamiento de un caso cuyo análisis terminó en error o incompleto.
- Auditoría preventiva: la IPS quiere anticipar qué ítems son vulnerables antes de radicar la factura.

**No usar:** si el caso no tiene `context.json` en el directorio de trabajo; si el análisis ya está publicado y no se solicitó reanálisis.

**IMPORTANTE — aislamiento de flujo:** Este skill pertenece exclusivamente al flujo `hospital_devolucion_audit`. No usar si `task_type != hospital_devolucion_audit`. No es un paso del pipeline de 9 skills (flujos `aseguradora` / `hospital` self-audit) — su input (`context.json`), sus outputs (`progress-respuesta.json`, `devolucion_output.json`) y su schema de tarea son completamente distintos. Un orquestador que no encuentra `task_type = hospital_devolucion_audit` en la tarea debe ignorar este skill por completo.

## Input Contract

**Template:** `context.json` en el directorio de trabajo — schema `hospitals/devolucion/context`.

Campos clave:

| Campo | Tipo | Descripción |
|---|---|---|
| `caso_id` | `string` | Ej: `HOSP-GL-1048` |
| `tipo_documento` | `"glosa" \| "devolucion_tecnica"` | Tipo de objeción de la EPS |
| `num_documento` | `string` | Número de la glosa |
| `num_factura_original` | `string` | Factura que originó la glosa |
| `prestador_nit` / `pagador_nit` | `string` | Identificadores de IPS y EPS |
| `fecha_vencimiento` | `date` | Límite de respuesta |
| `valor_facturado` / `valor_glosado` | `integer` (COP) | Montos clave |
| `lineas` | `array` | Una entrada por cada ítem objetado |

Cada `linea` contiene: `id`, `codigo` (CUPS/SOAT), `descripcion`, `fecha_servicio`, `cantidad`, `valor_facturado`, `valor_glosado`, `causal_num` (1–7, Res. 3047/2008), `motivo_glosa` (texto de la EPS), `accion`.

Además de `context.json`, el directorio de trabajo puede contener documentos clínicos y administrativos (HC, autorización, RIPS, factura, soportes adicionales). Leer todos los disponibles antes de evaluar cada línea.

## Output Contract

El skill genera **dos archivos** en el directorio de trabajo.

### 1. `progress-respuesta.json`

Schema: `hospitals/devolucion/progress-respuesta`.

```json
{
  "instrumento": "RESPUESTA-GLOSA",
  "descripcion": "Analisis focalizado de los items glosados por la EPS. Aplica las reglas del instrumento correspondiente (DAMA-UK, PERT-CLIN o FIN-CTR) segun la causal de cada item para construir la respuesta argumental.",
  "meta": {
    "caso_id": "HOSP-GL-1048",
    "fecha_auditoria": "2026-04-30T10:00:00Z",
    "agente": "hospital-devolucion-audit-v1",
    "causal_principal": "2"
  },
  "items_glosados": [
    {
      "linea_id": "L-01",
      "descripcion": "...",
      "valor_glosado": 850000,
      "causal_num": "2",
      "causal_nombre": "Falta de pertinencia médica",
      "capa": "medico",
      "reglas_aplicadas": [
        {
          "id": "M22",
          "nombre": "Justificación de procedimiento en HC",
          "resultado": "pass",
          "evidencia": "HC p.4 \"diagnóstico confirmado por patología el 2026-04-03\"",
          "observaciones": "La HC documenta el diagnóstico y la indicación clínica que justifica el procedimiento.",
          "confianza": 0.92
        }
      ],
      "decision_item": "disputar",
      "argumentacion": "...",
      "valor_a_defender": 850000,
      "valor_a_aceptar": 0
    }
  ],
  "cierre": {
    "concepto_final": "DEFENDER",
    "decision": "responder_glosa",
    "valor_total_glosado": 850000,
    "valor_total_defendible": 850000,
    "valor_total_aceptado": 0,
    "resumen_ejecutivo": "..."
  }
}
```

**Instrumento por causal:**

| Causales | Capa | Instrumento |
|---|---|---|
| 1, 2 | `medico` | PERT-CLIN (reglas M01–M29) |
| 3, 4 | `administrativo` | DAMA-UK (reglas A01–A27) |
| 5, 6, 7 | `financiero` | FIN-CTR (reglas F01–F42) |

**Reglas de `resultado` en `reglas_aplicadas`:**
- `pass` — la regla aporta evidencia que soporta la posición defensiva de la IPS.
- `fail` — la regla confirma la objeción de la EPS (hay evidencia positiva de la infracción).
- `n/a` — la regla no aplica a este tipo de servicio o no hay información disponible para evaluarla.

**Reglas de `confianza`:**
- `≥ 0.95`: cita literal del documento o consulta de sistema verificable.
- `0.80–0.94`: referencia específica sin cita literal.
- `< 0.80` en ítem con `decision_item = disputar` → cambiar a `adjuntar_soporte` o escalar a humano.

**`decision_item` por ítem:**
- `disputar` — la IPS tiene argumentos suficientes para revertir la glosa (confianza ≥ 0.80).
- `aceptar` — la glosa es válida; no hay base para disputar.
- `adjuntar_soporte` — faltan documentos; la IPS puede subsanar presentando soportes adicionales.
- `corregir` — hay un error en la factura subsanable (tarifa incorrecta, CUPS erróneo, etc.).

**Invariante:** `valor_a_defender + valor_a_aceptar == valor_glosado` para cada ítem.

**`cierre.concepto_final`:**
- `DEFENDER` si hay al menos un ítem con `decision_item = disputar`.
- `ACEPTAR` si todos los ítems tienen `decision_item = aceptar`.

---

### 2. `devolucion_output.json`

Schema: `hospitals/devolucion/output`.

Consolida el progress en la estructura que consume el UI de Salmona:

```json
{
  "caso_id": "HOSP-GL-1048",
  "glosa": {
    "tipo_documento": "glosa",
    "num_documento": "GL-004821",
    "num_factura_original": "FC-982144",
    "prestador": "Clínica del Country",
    "prestador_nit": "860.008.600-4",
    "pagador": "EPS Sura",
    "pagador_nit": "800.088.702-2",
    "paciente_alias": "Paciente C-1842",
    "paciente_documento_alias": "CC ***1842",
    "fecha_ingreso": "2026-04-03",
    "fecha_egreso": "2026-04-08",
    "fecha_vencimiento": "2026-04-30",
    "diagnostico_principal": "K80.0 - Colelitiasis con colecistitis aguda",
    "valor_facturado": 18420000,
    "valor_glosado": 1530000
  },
  "hallazgos": [
    {
      "linea_id": "L-03",
      "capa": "medico",
      "regla_aplicada": "M22",
      "nombre": "Justificación de estancia en UCI",
      "severidad": "mayor",
      "observacion": "EPS glosa 2 días UCI por falta de criterios de severidad. HC p.6 documenta APACHE II = 14 y ventilación mecánica.",
      "responsable": "cuentas_medicas",
      "argumentacion": "La estancia en UCI de 2 días está justificada por los criterios de severidad documentados en la HC..."
    }
  ],
  "resumen": {
    "valor_facturado": 18420000,
    "valor_glosado": 1530000,
    "valor_defendible": 1160000,
    "valor_aceptado": 370000,
    "num_items_glosados": 2,
    "num_defendidos": 1,
    "num_aceptados": 1,
    "tasa_recuperacion": 0.76,
    "concepto_final": "DEFENDER",
    "decision": "responder_glosa",
    "resumen_ejecutivo": "Se defienden COP 1.160.000 de 1.530.000 glosados (76%). La glosa L-03 por UCI tiene soporte clínico robusto; L-02 se acepta por tarifa contractual."
  }
}
```

**`hallazgos`** incluye solo ítems con `decision_item != aceptar`. Los ítems aceptados viven en `progress-respuesta.json`.

**`resumen.tasa_recuperacion`** = `valor_defendible / valor_glosado`.

## Procedure

1. **Cargar inputs.**
   - Leer `context.json` del directorio de trabajo.
   - Leer todos los documentos clínicos y de soporte disponibles (HC, autorización, RIPS, factura, imágenes, resultados de laboratorio). Usar contenido para evaluar cada ítem — no descartar ningún archivo por extensión o nombre.
   - Verificar `fecha_vencimiento`. Si hoy > `fecha_vencimiento`, documentarlo en el `resumen_ejecutivo` final pero continuar la ejecución.

2. **Para cada `linea` en `context.lineas`:**
   a. Determinar `capa` según `causal_num` (ver tabla de instrumento por causal).
   b. Identificar el instrumento aplicable (PERT-CLIN, DAMA-UK o FIN-CTR).
   c. Seleccionar las reglas relevantes del instrumento para el servicio y la objeción específica. No aplicar todas las reglas del instrumento — solo las pertinentes al caso del ítem.
   d. Para cada regla seleccionada, completar `resultado`, `evidencia`, `observaciones` y `confianza` con base en los documentos del directorio de trabajo.
   e. Calcular `decision_item`:
      - Si alguna regla tiene `resultado = pass` y `confianza ≥ 0.80` → `disputar`.
      - Si `confianza < 0.80` en todas las reglas de soporte → `adjuntar_soporte`.
      - Si hay evidencia positiva de que la glosa es válida → `aceptar`.
      - Si el error es subsanable por corrección de la IPS → `corregir`.
   f. Redactar `argumentacion` — texto de defensa trazable, en español, apto para incluir directamente en la carta respuesta a la EPS.
   g. Calcular `valor_a_defender` y `valor_a_aceptar`. Verificar invariante: su suma debe igualar `valor_glosado` del ítem.

3. **Calcular `cierre` del progress.**
   - `valor_total_glosado` = Σ `linea.valor_glosado`.
   - `valor_total_defendible` = Σ `item.valor_a_defender`.
   - `valor_total_aceptado` = Σ `item.valor_a_aceptar`.
   - `concepto_final`: `DEFENDER` si algún ítem tiene `decision_item = disputar`; `ACEPTAR` si todos aceptan.
   - `decision`: `responder_glosa` si hay argumentos; `solicitar_soportes` si el déficit es por falta de documentos; `reradicar` si el caso debe reiniciarse.
   - `causal_principal`: la causal más frecuente o de mayor impacto económico entre las líneas.

4. **Generar `progress-respuesta.json`** con el schema exacto. Los campos `instrumento` y `descripcion` son constantes — copiarlos literalmente del schema.

5. **Generar `devolucion_output.json`** consolidando desde el progress:
   - Completar `glosa` con los campos del `context.json`.
   - `diagnostico_principal`: extraer de la HC o los documentos clínicos. Si no se encuentra, usar `"Sin diagnóstico documentado"`.
   - Construir `hallazgos` solo para ítems con `decision_item != aceptar`. Seleccionar la regla principal aplicada (`regla_aplicada`) como la de mayor peso en la decisión.
   - Calcular `resumen` con los totales y ratios.

6. **Emitir evidencia citable.**
   Cada `evidencia` debe seguir el formato: `{archivo} [p.{página}] ["{cita literal}"]`. Ejemplos válidos:
   - `HC p.6 "APACHE II: 14 — criterios de ventilación mecánica presentes"`
   - `autorizacion.pdf "AUT-2026-04412, vigente 2026-04-01/2026-04-30, cubre 87451"`
   - `RIPS-AC.xml campo numCups "87451 — coincide con la factura FC-982144"`

   Evidencia inválida: `"se verificó en HC"`, `"pertinencia documentada"` sin cita.

## Pitfalls

- **`fecha_vencimiento` vencida:** advertir en `resumen_ejecutivo` con el número de días de mora, pero no bloquear la ejecución — la IPS puede radicar extemporáneamente con justificación.
- **Ítem con causal mixta:** si el `motivo_glosa` sugiere causales de dos capas (ej: tarifa incorrecta Y falta de pertinencia), elegir la causal dominante por impacto económico y documentar la secundaria en `observaciones` de la regla relevante.
- **`valor_glosado` parcial:** la EPS puede glosar solo parte del valor de una línea — usar siempre `linea.valor_glosado`, nunca `linea.valor_facturado`, como base de `valor_a_defender + valor_a_aceptar`.
- **`tipo_documento = devolucion_tecnica`:** no aplica el plazo de 15 días hábiles de Res. 3047; el `fecha_vencimiento` del context es el plazo contractual y debe respetarse tal como viene.
- **Causal 1 (no POS/PBS):** verificar en el context si el servicio está en el PBS antes de argumentar pertinencia — si no está cubierto, la glosa puede ser válida independientemente de la HC.
- **`confianza` inflada en reglas financieras:** para F-CTR aplicar confianza ≥ 0.95 solo si se tiene el anexo tarifario del contrato vigente; sin él, máximo 0.80.

## Verification

- [ ] `progress-respuesta.json` existe en el directorio de trabajo y es válido contra `hospitals/devolucion/progress-respuesta`.
- [ ] `devolucion_output.json` existe en el directorio de trabajo y es válido contra `hospitals/devolucion/output`.
- [ ] `instrumento == "RESPUESTA-GLOSA"` y `descripcion` es la cadena literal del schema.
- [ ] `Σ items_glosados[*].valor_glosado == cierre.valor_total_glosado`.
- [ ] `cierre.valor_total_defendible + cierre.valor_total_aceptado == cierre.valor_total_glosado`.
- [ ] Para cada ítem: `valor_a_defender + valor_a_aceptar == valor_glosado`.
- [ ] Ningún ítem con `confianza < 0.80` en todas sus reglas de soporte tiene `decision_item = disputar`.
- [ ] `hallazgos` en `devolucion_output.json` no contiene ítems con `decision_item = aceptar`.
- [ ] Cada `evidencia` contiene archivo + sección/página + cita o justificación específica.

## References

- [`../medical-invoice-admin-audit/SKILL.md`](../medical-invoice-admin-audit/SKILL.md) — instrumento DAMA-UK (causales 3–4), incluyendo `checklist_base.json` y `checklist_base.md`.
- [`../medical-invoice-medical-audit/SKILL.md`](../medical-invoice-medical-audit/SKILL.md) — instrumento PERT-CLIN (causales 1–2).
- [`../medical-invoice-financial-audit/SKILL.md`](../medical-invoice-financial-audit/SKILL.md) — instrumento FIN-CTR (causales 5–7).
- Resolución 3047/2008 Anexo 6 — causales de glosa (1–7) y plazos de respuesta.
- Resolución 1536/2022 — estructura RIPS.
- Resolución 1995/1999 — historia clínica mínima.
