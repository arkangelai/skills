# Output del pipeline de auditoría

El archivo `output_base.json` es el resultado final del pipeline. Lo produce el agente orquestador una vez que los tres sub-agentes (administrativo, médico, financiero) completan su trabajo. Es la única entrega que sale del pipeline hacia el dashboard, el Excel de glosas y la notificación al prestador.

El template vacío está en `output_base.json`. Todos los campos con `null` deben ser llenados por el agente.

---

## Secciones

### `caso_id`
Copiado directamente de `metadata_input_base.json`. Vincula el output con el radicado de entrada.

---

### `factura`
Extraída por el agente de `factura.pdf`. No se copia de `metadata_input_base.json` — se lee del documento.

| Campo | Cómo se llena |
|---|---|
| `num_factura` | Número de factura del documento. |
| `prestador` | Nombre del prestador tal como aparece en la factura. |
| `prestador_nit` | NIT del prestador. |
| `paciente_nombre` | Nombre completo del paciente. |
| `paciente_documento` | Tipo y número de documento (ej. `"CC 52489731"`). |
| `fecha_atencion` | Fecha de prestación del servicio. ISO-8601 (`YYYY-MM-DD`). |
| `fecha_factura` | Fecha de emisión de la factura. ISO-8601. |
| `diagnostico_principal` | Código CIE-10 + descripción (ej. `"K80.1 - Cálculo de la vesícula biliar"`). |
| `plan_afiliado` | Plan del afiliado extraído de la factura (ej. `"ORO"`, `"PLATA"`, `"BASICO"`). |
| `total_facturado` | Total en COP como entero (ej. `7285000`). |

---

### `hallazgos`
Array con un objeto por cada ítem facturado. Los ítems conformes y los glosados aparecen todos — ninguno se omite.

| Campo | Valores válidos | Descripción |
|---|---|---|
| `item` | int | Número de ítem tal como aparece en la factura. |
| `codigo_cups` | string | Código CUPS del servicio. |
| `descripcion` | string | Descripción del servicio con tildes. |
| `valor_facturado` | int COP | Valor total del ítem en la factura. |
| `hallazgo` | `"conforme"` · `"glosa"` | Resultado del ítem. `"conforme"` si pasa todas las capas. `"glosa"` si hay objeción fundamentada. `"devolucion"` es **exclusivo del nivel de caso** (`resumen.concepto_final`), nunca por ítem. |
| `reglas_aplicadas` | array de string · `null` | IDs de todas las reglas que fallaron para este ítem en cualquier capa (ej. `["A08", "F06"]`). `null` si conforme. Para ver la evidencia detallada de cada regla, consultar el checklist JSON de la capa correspondiente. |
| `severidad` | `"critica"` · `"mayor"` · `"menor"` · `null` | Severidad máxima entre las reglas en `reglas_aplicadas`. `null` si conforme. |
| `valor_glosado` | int COP | Monto objetado del ítem. `0` si conforme. Corresponde al `valor_glosado` de la regla más severa (no se suman reglas del mismo ítem). |
| `valor_a_reconocer` | int COP | Valor que el pagador reconoce. Igual a `valor_facturado` si conforme; puede ser menor si la glosa es parcial (ej. diferencia tarifaria). |
| `confianza` | float 0.0–1.0 · `null` | Confianza en el hallazgo. `null` si conforme. Valores `< 0.75` en regla crítica escalan a humano. |
| `evidencia_requerida` | string · `null` | Qué debe presentar el prestador para subsanar. `null` si conforme o si no aplica. |

---

### `resumen_por_capa`
Tres párrafos cortos (1–2 oraciones cada uno) que resumen lo encontrado en cada capa de auditoría. Permiten al auditor humano tener un panorama rápido sin necesidad de leer todos los hallazgos.

| Campo | Descripción |
|---|---|
| `administrativo` | Resumen de la auditoría administrativa. Ej: `"2 reglas críticas fallidas (A01, A08): CUV inválido y autorización ausente."` |
| `medico` | Resumen de la auditoría médica. Ej: `"Sin hallazgos clínicos relevantes."` |
| `financiero` | Resumen de la auditoría financiera. Ej: `"3 reglas fallidas (F13, F33, F37): sobretarifa, duplicación y upcoding."` |

---

#### `glosa_sugerida`
`null` si el ítem es conforme. Objeto con los cinco campos si hay hallazgo:

| Campo | Descripción |
|---|---|
| `causal_num` | Código Anexo 6 Res. 3047/2008: `"1"` Facturación · `"2"` Tarifas · `"3"` Soportes · `"4"` Autorización · `"5"` Cobertura · `"6"` Pertinencia · `"7"` Anulaciones. `null` si no hay mapeo claro — en ese caso `concepto_final = ESCALAR_HUMANO` hasta que un auditor asigne la causal en fix-review. |
| `causal_nombre` | Nombre legible de la causal (ej. `"Tarifas"`, `"Pertinencia"`). |
| `texto` | Justificación concreta y trazable de la glosa. 1–2 oraciones. |
| `valor_glosado` | Monto objetado en COP. En glosas tarifarias es la diferencia; en glosas de pertinencia o soportes es el valor total del ítem. |
| `moneda` | Siempre `"COP"`. |

---

### `resumen`
Calculado por el orquestador al consolidar los tres sub-agentes.

| Campo | Descripción |
|---|---|
| `total_facturado` | Suma de `valor_facturado` de todos los ítems. |
| `total_aprobado` | Suma de `valor_a_reconocer` de todos los ítems. |
| `total_glosado` | `total_facturado − total_aprobado`. Es el **dinero recuperado**. |
| `num_items` | Total de ítems en la factura. |
| `num_conformes` | Ítems con `hallazgo == "conforme"`. |
| `num_glosas` | Ítems con `hallazgo == "glosa"`. |
| `tasa_objecion` | `total_glosado / total_facturado × 100`. Float con un decimal. |
| `glosas_por_capa` | Conteo de glosas por sub-agente: `administrativo`, `medico`, `financiero`. |
| `concepto_final` | `"APTA"` · `"NO_APTA"` · `"DEVOLUCION"` · `"ESCALAR_HUMANO"`. Ver lógica abajo. |
| `accion_requerida` | `"Correccion"` · `"Complemento"` · `"Rechazo"` · `"Escalar"` · `null`. |
| `resumen_ejecutivo` | 1–2 frases para el dashboard. Debe mencionar el concepto final y los hallazgos críticos. |

#### Lógica de `concepto_final`

```
# Evaluado en orden; primer match gana
si (cualquier regla crítica en fail y no subsanable):      "NO_APTA"        → accion: "Rechazo"
si (cualquier regla crítica en fail subsanable con docs):  "DEVOLUCION"     → accion: "Complemento"
si (confianza < 0.75 en cualquier regla crítica):          "ESCALAR_HUMANO" → accion: "Escalar"
si (antifraude F32–F36 con confianza < 0.9):               "ESCALAR_HUMANO" → accion: "Escalar"
si (causal_num = null en cualquier hallazgo):              "ESCALAR_HUMANO" → accion: "Escalar"
si (tasa_objecion == 0):                                   "APTA"           → accion: null
si (tasa_objecion > 0 y solo glosas parciales):            "APTA"           → accion: "Correccion"
```

---

## Ejemplo de output completo

```json
{
  "caso_id": "RAD-20260401-FV10231",
  "factura": {
    "num_factura": "FV-2026-10231",
    "prestador": "Hospital San Jose",
    "prestador_nit": "899.999.017-4",
    "paciente_nombre": "Maria Alejandra Gutierrez Ospina",
    "paciente_documento": "CC 52489731",
    "fecha_atencion": "2026-03-02",
    "fecha_factura": "2026-04-01",
    "diagnostico_principal": "K80.1 - Calculo de la vesicula biliar con otra colecistitis",
    "plan_afiliado": "ORO",
    "total_facturado": 7285000
  },
  "hallazgos": [
    {
      "item": 1,
      "codigo_cups": "H30103",
      "descripcion": "Colecistectomia laparoscopica",
      "valor_facturado": 4350000,
      "hallazgo": "glosa",
      "reglas_aplicadas": ["F13"],
      "severidad": "critica",
      "valor_glosado": 600000,
      "valor_a_reconocer": 3750000,
      "glosa_sugerida": {
        "causal_num": "2",
        "causal_nombre": "Tarifas",
        "texto": "Valor facturado $4.350.000 excede tarifa contractual para H30103 ($3.750.000). Diferencia: $600.000.",
        "valor_glosado": 600000,
        "moneda": "COP"
      },
      "confianza": 0.97,
      "evidencia_requerida": null
    },
    {
      "item": 2,
      "codigo_cups": "S10101",
      "descripcion": "Estancia hospitalaria general - dia",
      "valor_facturado": 855000,
      "hallazgo": "conforme",
      "reglas_aplicadas": null,
      "severidad": null,
      "valor_glosado": 0,
      "valor_a_reconocer": 855000,
      "glosa_sugerida": null,
      "confianza": null,
      "evidencia_requerida": null
    }
  ],
  "resumen_por_capa": {
    "administrativo": "Sin hallazgos administrativos.",
    "medico": "Sin hallazgos clínicos.",
    "financiero": "1 regla crítica fallida (F13): tarifa H30103 excede contrato en $600.000."
  },
  "resumen": {
    "total_facturado": 7285000,
    "total_aprobado": 6685000,
    "total_glosado": 600000,
    "num_items": 8,
    "num_conformes": 7,
    "num_glosas": 1,
    "tasa_objecion": 8.2,
    "glosas_por_capa": {
      "administrativo": 0,
      "medico": 0,
      "financiero": 1
    },
    "concepto_final": "APTA",
    "accion_requerida": "Correccion",
    "resumen_ejecutivo": "Factura con 1 glosa tarifaria (ítem 1, colecistectomía laparoscópica). Valor glosado $600.000 sobre tarifa contractual. Resto de ítems conformes. Se reconoce $6.685.000."
  }
}
```
