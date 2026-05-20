---
name: hospital-devolucion-batch-parse
description: Lee el Excel/CSV de glosas que la EPS envió a la IPS y crea una task hija por cada fila — una task = una glosa = un ítem objetado. Cada hija arranca el skill hospital-devolucion-audit. Sin agregaciones, sin agrupación por num_documento. La task envelope transita a archived al terminar.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, glosa, devolucion, hospital, intake, excel, colombia]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
---

# hospital-devolucion-batch-parse

Recibe un Excel/CSV de glosas (uno o varios ítems objetados de una o varias facturas) y crea una **task hija independiente por cada glosa** (una glosa = un ítem). El envelope task original transita a `archived` cuando todas las hijas fueron creadas.

La pregunta que responde: **¿cómo separar el archivo que envió la EPS en unidades atómicas que el agente de auditoría pueda procesar una a una?**

## When to Use

- El orquestador despacha una task con `task_type = hospital_devolucion_batch` y un archivo Excel/CSV cargado como input.
- La task fue creada por `hospital-devolucion-gmail-intake` o por la intake form en `salmona-api`.

**No usar:**
- Si la task ya está `archived` o `done`.
- Si no hay archivo Excel/CSV en los inputs de la task.
- Si la task carga ya un `GlosaContext` en su `context` (esa es una task hija — usar `hospital-devolucion-audit`).

## Input Contract

### Required environment variables

- `LOCAL_DEVOLUCION_REF_PATH` — Ruta absoluta al directorio de referencias de devolución en el host. Default si no está definida: `/root/.hermes/ref-data/hospital-devolucion/`. Debe contener `prestador.json` (datos de la IPS) y `aseguradoras.json` (catálogo de pagadores). Si la ruta no existe o estos archivos faltan, abortar con `error_missing_ref_data`.

### Tenant configuration (external)

El skill es IPS-agnóstico — no asume ningún prestador ni pagador específico. Los datos del tenant se cargan en tiempo de ejecución:

- `$LOCAL_DEVOLUCION_REF_PATH/prestador.json` — datos de la IPS que opera el skill. Estructura:

  ```json
  {
    "nombre": "<razón social IPS>",
    "nit": "<NIT IPS>"
  }
  ```

  Schema canónico bundled en `../hospital-devolucion-audit/references/prestador.schema.json`.

- `$LOCAL_DEVOLUCION_REF_PATH/aseguradoras.json` — catálogo de pagadores con sus parámetros operativos (looked up by `pagador_id`). Estructura definida por `../hospital-devolucion-audit/references/aseguradoras.schema.json`.

### Task input

Task del tipo `hospital_devolucion_batch`. Su `context` contiene metadata del lote (no datos de la glosa):

```json
{
  "batch_id": "BATCH-YYYYMMDD-XXXXX",
  "documentos": ["<nombre_archivo>.xlsx"],
  "pagador_nombre": "<EPS según email/intake>",
  "email_origen": "<remitente>",
  "message_id": "..."
}
```

`context.pagador_nombre` es una etiqueta humana del email/intake; el `pagador_id` definitivo se resuelve por fila al construir el GlosaContext (matching contra las claves de `aseguradoras.json.pagadores`).

Los inputs de la task incluyen al menos un Excel o CSV con las glosas. **No usar librerías de parsing.** Leer el archivo con las capacidades nativas del modelo.

## Output Contract

Por cada fila (= glosa) en el archivo:

1. Construir un `GlosaContext` completo (ver `references/glosa-context-template.json` en `hospital-devolucion-audit`).
2. `POST /api/tasks` para crear la task hija de tipo `hospital_devolucion`.
3. `POST /api/tasks/{id}/inputs/upload` para adjuntar el archivo Excel original (referencia para el agente de auditoría).
4. `PATCH /api/tasks/{id}/status` → `queued`.

Al final, transitar el envelope a `archived`.

## Procedure

1. **Cargar el Excel.**
   - Listar los inputs de la task envelope: `GET /api/tasks/{ENVELOPE_ID}/inputs`.
   - Descargar el primer Excel/CSV. Si hay varios, procesarlos todos en secuencia con un único `batch_id`.

2. **Identificar las filas-glosa.** Cada fila del archivo representa una glosa (un ítem objetado). Si el archivo agrupa varias filas bajo un `num_documento` compartido por la EPS, **igual** crear una task hija por fila — el num_documento no es un identificador de unidad atómica en nuestro modelo.

3. **Para cada fila, construir el `GlosaContext`:**

   | Campo | Cómo se obtiene |
   |---|---|
   | `caso_id` | Generar nuevo: `HOSP-GL-YYYYMMDD-XXXXX` (fecha actual + 5 chars en mayúsculas) |
   | `num_factura_original` | Columna de "factura" / "FC-" en el archivo |
   | `item_position` | Número de línea (1-indexado) del ítem objetado en la factura original |
   | `glosa_id` | Construir: `{num_factura_original}_{item_position}_g{seq}`, p.ej. `FC-982144_3_g1`. `seq` = 1 para la primera glosa de ese ítem |
   | `batch_id` | Heredar del context del envelope |
   | `codigo` | Código CUPS/SOAT del ítem |
   | `descripcion` | Descripción literal del ítem |
   | `cantidad` | Unidades facturadas |
   | `valor_facturado` | Lo que la IPS cobró por el ítem (entero COP) |
   | `valor_glosado` | Lo que la EPS objeta (entero COP, puede ser ≤ valor_facturado) |
   | `codigo_completo` | Código causal de 6 dígitos del Manual Único (Res. 2284/2023 Anexo 3), p.ej. `FA0101`, `TA0601`, `CL0101`. Extraer de la columna de causal / código de glosa del archivo. Si el archivo no lo declara, inferir del `motivo_glosa` |
   | `motivo_glosa` | Texto literal con que la EPS justifica la objeción |
   | `prestador_nombre` | Leer de `$LOCAL_DEVOLUCION_REF_PATH/prestador.json` campo `nombre` |
   | `prestador_nit` | Leer de `$LOCAL_DEVOLUCION_REF_PATH/prestador.json` campo `nit` |
   | `pagador_id` | Slug lowercase derivado del nombre de la EPS. **Debe** existir como clave en `aseguradoras.json.pagadores`. Si el matching es ambiguo o no hay coincidencia, omitir la fila y documentar en un comentario del envelope. |
   | `pagador_nombre` | `aseguradoras.json.pagadores[pagador_id].nombre` (autoritativo, sobre lo que diga el Excel) |
   | `pagador_nit` | `aseguradoras.json.pagadores[pagador_id].nit` |
   | `paciente_alias` | "Paciente X-NNNN" donde NNNN = últimos 4 dígitos del documento del paciente |
   | `paciente_documento_alias` | "CC ***NNNN" (TI/CE/PA según tipo) |
   | `plan_afiliado` | Plan o régimen del afiliado si el archivo lo trae; si no, `null` (lo completa el hospital desde sus registros) |
   | `fecha_ingreso` / `fecha_egreso` / `fecha_glosa` / `fecha_vencimiento` | Fechas YYYY-MM-DD |

4. **Crear la task hija como `draft`** (sin status — el agente no la recoge hasta que tenga el input cargado). Capturar el `id` retornado por el API:

   ```bash
   CREATE_RESP=$(ark tasks create \
     --type hospital_devolucion \
     --title "Glosa ${CODIGO} — ${PAGADOR_NOMBRE}" \
     --description "Run skill hospital-devolucion-audit on the attached context." \
     --priority medium \
     --context "$GLOSA_CONTEXT_JSON")
   CHILD_ID=$(echo "$CREATE_RESP" | jq -r '.data.id')
   ```

   El campo `--description` es deliberadamente **un puntero corto al skill**, no el prompt completo. El skill canónico vive en `skills/hospital-devolucion-audit/SKILL.md`.

5. **Adjuntar el Excel original** como input de la task hija (referencia para el agente de auditoría):

   ```bash
   ark tasks inputs upload "$CHILD_ID" "$WORK_DIR/$FILENAME"
   ```

6. **Encolar la task hija** ahora que tiene su input cargado:

   ```bash
   ark tasks status "$CHILD_ID" --status queued
   ```

7. **Cerrar el envelope** una vez creadas todas las hijas:

   ```bash
   ark tasks status "$ENVELOPE_ID" --status archived
   ```

## Pitfalls

- **`num_documento` no es atómico:** un Excel puede traer varias filas bajo el mismo `num_documento` (la EPS agrupó). Cada fila igual es una glosa independiente. No fusionar filas.
- **Código causal ausente:** si el archivo no trae el código de 6 dígitos explícito, inferir del texto del `motivo_glosa` usando los prefijos del Manual Único (Res. 2284): `FA` Facturación, `TA` Tarifas, `SO` Soportes, `AU` Autorización, `CO` Cobertura, `CL` Calidad, `SA` Seguimiento a Acuerdos. Elegir el código de 6 dígitos más específico que respalde la evidencia. Si no hay forma de determinarlo con confianza, tratar la fila como dato faltante (ver "Sin datos").
- **Valor parcial:** si `valor_glosado < valor_facturado`, registrar ambos. No reemplazar uno por el otro.
- **PII:** generar siempre el alias de paciente (`Paciente X-NNNN`) y nunca incluir el nombre real ni el número completo del documento.
- **Sin datos:** si una fila no tiene los campos requeridos del schema (codigo, valor_glosado, codigo_completo), NO crear la task. Anotar en un comentario del envelope qué filas se omitieron y por qué.

## Verification

- [ ] El envelope task transitó a `archived`.
- [ ] Se creó al menos una task hija de tipo `hospital_devolucion` por cada fila procesada.
- [ ] Cada task hija tiene un `context` válido contra `glosa-context.schema.json` (ver `../hospital-devolucion-audit/references/glosa-context-template.json`).
- [ ] Cada task hija tiene el Excel original cargado como input.
- [ ] Cada task hija está en `queued`.
- [ ] La `description` de cada task hija es un puntero corto al skill `hospital-devolucion-audit`, no el prompt completo.
- [ ] El `batch_id` del envelope aparece en el context de cada hija (para trazabilidad).
- [ ] Filas omitidas (por datos faltantes) están documentadas en un comentario del envelope.

## References

### Schemas bundled in `hospital-devolucion-audit/references/`

- `prestador.schema.json` — forma esperada de `$LOCAL_DEVOLUCION_REF_PATH/prestador.json`.
- `aseguradoras.schema.json` — forma esperada de `$LOCAL_DEVOLUCION_REF_PATH/aseguradoras.json`.
- `glosa-context-template.json` — ejemplo del output construido por este skill.

### Skills relacionados

- [`../hospital-devolucion-gmail-intake/SKILL.md`](../hospital-devolucion-gmail-intake/SKILL.md) — upstream: crea el envelope task desde un email de la EPS.
- [`../hospital-devolucion-audit/SKILL.md`](../hospital-devolucion-audit/SKILL.md) — downstream: procesa cada task hija.

### Marco normativo

- Resolución 2284 de 2023, Anexo Técnico 3 — Manual Único de Devoluciones, Glosas y Respuestas (códigos causales de 6 dígitos).
- Issue [`arkangelai/salmona-api#210`](https://github.com/arkangelai/salmona-api/issues/210) — modelo de datos único-glosa.
- Issue [`arkangelai/salmona-api#251`](https://github.com/arkangelai/salmona-api/issues/251) — códigos Res. 2284 y forma unificada del GlosaContext.
