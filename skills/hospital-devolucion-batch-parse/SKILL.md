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

Task del tipo `hospital_devolucion_batch`. Su `context` contiene metadata del lote (no datos de la glosa):

```json
{
  "batch_id": "BATCH-20260513-XYZ12",
  "documentos": ["sura_glosas_2026-05.xlsx"],
  "pagador_nombre": "EPS SURA",
  "email_origen": "glosas@sura.com.co",
  "message_id": "..."
}
```

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
   | `batch_id` | Heredar del context del envelope |
   | `codigo` | Código CUPS/SOAT del ítem |
   | `descripcion` | Descripción literal del ítem |
   | `cantidad` | Unidades facturadas |
   | `valor_facturado` | Lo que la IPS cobró por el ítem (entero COP) |
   | `valor_glosado` | Lo que la EPS objeta (entero COP, puede ser ≤ valor_facturado) |
   | `causal_num` | "1"–"7" según Res. 3047/2008. Inferir del texto si el archivo no lo declara explícitamente |
   | `motivo_glosa` | Texto literal con que la EPS justifica la objeción |
   | `prestador_nombre` | "Clínica del Country" (o lo que indique el contrato) |
   | `prestador_nit` | "860.008.600-4" (o el del contrato) |
   | `pagador_id` | Slug del pagador derivado del nombre: "sura", "compensar", "sanitas", etc. |
   | `pagador_nombre` | Nombre completo de la EPS |
   | `pagador_nit` | NIT de la EPS |
   | `paciente_alias` | "Paciente X-NNNN" donde NNNN = últimos 4 dígitos del documento del paciente |
   | `paciente_documento_alias` | "CC ***NNNN" (TI/CE/PA según tipo) |
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
- **Causal ausente:** si el archivo no trae `causal_num` explícito, inferir del texto del `motivo_glosa`. Default seguro: causal `1` (Facturación) para administrativo, `2` (Tarifas) para discrepancias de precio, `6` (Pertinencia) para clínico.
- **Valor parcial:** si `valor_glosado < valor_facturado`, registrar ambos. No reemplazar uno por el otro.
- **PII:** generar siempre el alias de paciente (`Paciente X-NNNN`) y nunca incluir el nombre real ni el número completo del documento.
- **Sin datos:** si una fila no tiene los campos requeridos del schema (codigo, valor_glosado, causal_num), NO crear la task. Anotar en un comentario del envelope qué filas se omitieron y por qué.

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

- [`../hospital-devolucion-gmail-intake/SKILL.md`](../hospital-devolucion-gmail-intake/SKILL.md) — upstream: crea el envelope task desde un email de la EPS.
- [`../hospital-devolucion-audit/SKILL.md`](../hospital-devolucion-audit/SKILL.md) — downstream: procesa cada task hija.
- Resolución 3047/2008 Anexo 6 — causales de glosa (1–7).
- Issue [`arkangelai/salmona-api#210`](https://github.com/arkangelai/salmona-api/issues/210) — modelo de datos único-glosa.
