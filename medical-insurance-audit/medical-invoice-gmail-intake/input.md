# Input del pipeline de auditoría

Cada radicado es una carpeta con un archivo `metadata.json` y los documentos enviados por el prestador.

---

## Estructura de carpeta

```
RAD-20260401-FV10231/
├── metadata.json          ← obligatorio
├── factura.pdf            ← obligatorio
├── epicrisis.pdf          ← obligatorio en hospitalización / cirugía
└── soportes/              ← opcionales según tipo de caso
    ├── autorizacion.pdf
    ├── nota_quirurgica.pdf
    ├── kardex_medicamentos.pdf
    ├── consentimiento_informado.pdf
    └── resultados_laboratorio.pdf
```

---

## `metadata.json`

Sobre logístico del radicado. No contiene datos clínicos ni del paciente — esa información la extrae el agente de los documentos.

```json
{
  "caso_id": "RAD-20260401-FV10231",
  "fecha_radicacion": "2026-04-01T00:00:00-05:00",
  "num_factura": "FV-2026-10231",
  "prestador_nit": "899.999.017-4",
  "prestador_nombre": "Hospital San Jose",
  "pagador_nit": "800.088.702-2",
  "pagador_nombre": "Sura EPS",
  "documentos": [
    "factura.pdf",
    "epicrisis.pdf",
    "soportes/autorizacion.pdf",
    "soportes/nota_quirurgica.pdf"
  ],
  "reply_sent": false
}
```

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `caso_id` | string | Identificador único del radicado. Formato `RAD-YYYYMMDD-<num_factura_sin_prefijo>`. |
| `fecha_radicacion` | string ISO-8601 | Fecha y hora en que el prestador radicó la cuenta. Incluye offset Colombia (`-05:00`). |
| `num_factura` | string | Número de factura tal como aparece en el documento. |
| `prestador_nit` | string | NIT del prestador (IPS) con dígito de verificación. |
| `prestador_nombre` | string | Nombre o razón social del prestador. |
| `pagador_nit` | string | NIT del pagador (EPS / aseguradora) con dígito de verificación. |
| `pagador_nombre` | string | Nombre del pagador. |
| `documentos` | array de strings | Rutas relativas de todos los archivos adjuntos, en el orden en que se recibieron. |
| `reply_sent` | boolean · opcional | `true` una vez que la EPS ha enviado respuesta al prestador para este caso. Por defecto: `false`. |

---

## Documentos

### Obligatorios

| Archivo | Descripción |
|---|---|
| `factura.pdf` | Factura de venta de servicios de salud. Debe incluir CUV, datos del prestador y pagador, ítems con CUPS, cantidades y valores. |

### Obligatorios según tipo de servicio

| Archivo | Cuándo aplica |
|---|---|
| `epicrisis.pdf` | Hospitalización, cirugía, parto, UCI. |
| `soportes/nota_quirurgica.pdf` | Cualquier procedimiento quirúrgico facturado. |
| `soportes/kardex_medicamentos.pdf` | Cuando se facturan medicamentos administrados durante la estancia. |
| `soportes/consentimiento_informado.pdf` | Procedimientos mayores o de alto riesgo. |

### Opcionales

| Archivo | Descripción |
|---|---|
| `soportes/autorizacion.pdf` | Autorización previa emitida por el pagador. |
| `soportes/resultados_laboratorio.pdf` | Resultados de ayudas diagnósticas facturadas. |
| `soportes/historia_clinica.pdf` | Notas de evolución cuando la epicrisis no es suficiente. |
| `rips.csv` | Registro Individual de Prestaciones de Salud (RIPS). Formato estándar MinSalud. |
