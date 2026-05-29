# iss2001-lookup

Herramienta CLI para consultar el **Manual Tarifario ISS 2001** (Instituto de Seguros Sociales, Colombia). Permite buscar procedimientos, validar codigos, consultar tarifas en UVR o pesos, y calcular montos con un valor contractual de UVR.

## Contexto

El Manual Tarifario ISS 2001 fue publicado mediante el Acuerdo 256 de 2001 del ISS. Aunque tiene mas de 20 anos, sigue siendo referencia en la facturacion y contratacion de servicios de salud en Colombia. Muchos contratos entre EPS e IPS aun lo usan como base tarifaria, aplicando un multiplicador sobre el valor UVR original.

El manual tiene dos secciones de tarifas:

| Seccion | Articulos | Tipo de valor | Filas | Descripcion |
|---------|-----------|---------------|-------|-------------|
| **UVR** | 1 - 18 | Unidades de Valor Relativo | 3,372 | Procedimientos quirurgicos. El valor en pesos se calcula multiplicando UVR x valor contractual. |
| **VALOR** | 19+ | Pesos fijos | 2,450 | Laboratorio clinico, imagenologia, consultas, procedimientos clinicos. Ya estan en pesos. |
| **Apendice** | 132 | Sin valor | 142 | Lista de procedimientos que puede realizar el medico general. Solo referencia. |

**Totales:** 5,964 filas, 5,643 codigos unicos, 51 capitulos.

## Requisitos

- Node.js 18+
- Cero dependencias externas

## Instalacion

No requiere instalacion. Clonar o copiar la carpeta completa y ejecutar directamente:

```bash
node iss2001-lookup.js <comando> [argumentos]
```

## Comandos

### `validate <codigo>`

Verifica si un codigo existe en el manual. Si no existe, sugiere codigos cercanos.

```bash
# Codigo valido
$ node iss2001-lookup.js validate 020101
{
  "codigo": "020101",
  "status": "valid",
  "descripcion": "CORRECION DE CRANEO SINOSTOSIS, POR CRANIECTOMIA SIN AVANCES",
  "tipo": "UVR"
}

# Codigo invalido
$ node iss2001-lookup.js validate 999999
{
  "codigo": "999999",
  "status": "invalid",
  "sugerencias": [
    { "codigo": "990101", "descripcion": "EDUCACION GRUPAL EN SALUD ..." },
    ...
  ]
}
```

### `lookup <codigo>`

Devuelve el registro completo: descripcion, valor UVR o pesos, capitulo y referencia.

```bash
$ node iss2001-lookup.js lookup 903841
{
  "codigo": "903841",
  "descripcion": "GLUCOSA EN SUERO, LCR U OTRO FLUIDO DIFERENTE A ORINA",
  "uvr": null,
  "valor": 3095,
  "capitulo": "ARTICULO 19",
  "ref": "1912730",
  "tipo": "VALOR",
  "fuente": "Manual Tarifario ISS 2001 — Acuerdo 256 de 2001, ISS"
}
```

### `search <terminos...>`

Busca procedimientos por palabras clave en la descripcion. Devuelve los 20 mejores resultados ordenados por relevancia.

```bash
$ node iss2001-lookup.js search apendicectomia
{
  "consulta": "apendicectomia",
  "total": 5,
  "resultados": [
    { "codigo": "471100", "descripcion": "APENDICECTOMIA SOD", "uvr": 80, "valor": null, "capitulo": "ARTICULO 7" },
    { "codigo": "471200", "descripcion": "APENDICECTOMIA POR PERFORACION...", "uvr": 100, ... },
    ...
  ]
}
```

### `seccion <prefijo>`

Lista todos los codigos bajo un prefijo. Util para explorar un capitulo o grupo.

```bash
$ node iss2001-lookup.js seccion 47
{
  "prefijo": "47",
  "total": 25,
  "codigos": [
    { "codigo": "470100", "descripcion": "GASTROSTOMIA SOD", "uvr": 85, "valor": null },
    ...
  ]
}
```

### `tarifa <codigo> <valor_uvr>`

Calcula la tarifa en pesos colombianos. Para codigos UVR, multiplica `UVR x valor_uvr`. Para codigos VALOR, devuelve el monto fijo directamente.

```bash
# Codigo UVR: 380 UVR x $29,000 = $11,020,000
$ node iss2001-lookup.js tarifa 020101 29000
{
  "codigo": "020101",
  "descripcion": "CORRECION DE CRANEO SINOSTOSIS, POR CRANIECTOMIA SIN AVANCES",
  "uvr": 380,
  "valor_uvr_unitario": 29000,
  "tarifa_pesos": 11020000,
  "capitulo": "ARTICULO 1"
}

# Codigo VALOR: ya esta en pesos fijos
$ node iss2001-lookup.js tarifa 903841 29000
{
  "codigo": "903841",
  "descripcion": "GLUCOSA EN SUERO, LCR U OTRO FLUIDO DIFERENTE A ORINA",
  "valor": 3095,
  "nota": "Este codigo es tipo VALOR — el monto ya esta en pesos fijos, no requiere multiplicacion por UVR.",
  "capitulo": "ARTICULO 19"
}
```

## Formatos de codigo aceptados

El CLI normaliza automaticamente estos formatos a 6 caracteres:

| Entrada | Normalizado |
|---------|-------------|
| `190201` | `190201` |
| `19.02.01` | `190201` |
| `19-02-01` | `190201` |
| ` 190201 ` | `190201` |
| `c40403` | `C40403` |

Codigos con prefijo de letra (C, S, E, M, I, A) se convierten a mayuscula.

## UVR vs VALOR: como funciona

Entender la diferencia es clave para usar la herramienta correctamente:

- **UVR (Unidades de Valor Relativo):** El manual asigna un puntaje relativo a cada procedimiento quirurgico. El valor en pesos depende del contrato. Si el contrato dice que 1 UVR = $29,000 COP, entonces un procedimiento de 380 UVR cuesta $11,020,000.

- **VALOR (Pesos fijos):** Los procedimientos de laboratorio, imagenologia y consultas tienen un monto fijo en pesos del 2001. No necesitan multiplicacion.

- **APENDICE:** Lista referencial de procedimientos que puede hacer un medico general. No tienen valor tarifario.

El campo `tipo` en la respuesta de `validate` y `lookup` indica cual es.

## Estructura del proyecto

```
iss2001-lookup/
├── iss2001-lookup.js          # CLI principal (Node.js, zero deps)
├── SKILL.md                   # Documentacion para agentes
├── README.md                  # Este archivo
├── test_iss2001.js            # Suite de tests (64 tests)
├── test_cases.json            # Casos de prueba
├── .gitignore
├── data/
│   ├── ISS_2001.csv           # 5,964 filas extraidas del manual
│   └── MANUAL-ISS-2001.pdf    # PDF fuente (gitignored)
└── scripts/
    ├── extract_iss2001.py     # Extraccion del PDF (pdfplumber)
    └── validate_extraction.py # Validacion estructural del CSV
```

## Tests

```bash
$ node test_iss2001.js
# 64/64 tests pasaron
```

Los tests cubren: validacion de codigos, lookup, busqueda por keywords, seccion, calculo de tarifa, normalizacion de formatos y edge cases.

## Pipeline de datos

El CSV se genero con el siguiente pipeline:

1. **Descarga:** PDF del Manual Tarifario ISS 2001 (207 paginas, 7.1 MB)
2. **Extraccion:** `scripts/extract_iss2001.py` usa pdfplumber para extraer texto crudo de cada pagina y parsear filas con regex
3. **Limpieza:** Separadores de miles removidos, descripciones multi-linea unificadas, notas INCLUYE/APLICA filtradas
4. **Validacion:** `scripts/validate_extraction.py` ejecuta 3 pasadas (estructural, estadistica, spot-check)
5. **Verificacion cruzada:** Agente independiente verifico 355 codigos contra el PDF — 100% match

Para re-generar el CSV desde el PDF:

```bash
python3 scripts/extract_iss2001.py           # genera data/ISS_2001.csv
python3 scripts/validate_extraction.py       # valida el resultado
```

## Columnas del CSV

| Columna | Descripcion |
|---------|-------------|
| `codigo` | Codigo del procedimiento (6 caracteres) |
| `descripcion` | Nombre del procedimiento |
| `uvr` | Valor en UVR (vacio para seccion VALOR) |
| `valor` | Valor en pesos (vacio para seccion UVR) |
| `capitulo` | Capitulo del manual (ej: ARTICULO 1, ARTICULO 19) |
| `ref` | Codigo de referencia interna del manual |

## Fuente

Manual Tarifario ISS 2001 — Acuerdo 256 de 2001, Instituto de Seguros Sociales de Colombia.
