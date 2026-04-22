# Checklist médico — Guía del auditor

Documento maestro del instrumento **PERT-CLIN** (`checklist_base.json`). Explica qué significa cada campo del JSON, cómo llenarlo, cuándo consultar una GPC del corpus `guias-clinicas/`, qué valores son válidos y cuándo escalar a revisión humana.

---

## 1. Propósito del instrumento

El sub-agente médico valida la **pertinencia clínica** de cada servicio facturado: ¿el procedimiento estaba indicado?, ¿el medicamento era el correcto?, ¿la estancia estaba justificada?, ¿se siguió la guía de práctica clínica (GPC)?

A diferencia del administrativo (formalidad) y financiero (tarifas), aquí el juicio es **clínico**. Por eso el JSON se complementa siempre con una GPC concreta del corpus `guias-clinicas/`.

### Relación con `guias-clinicas/`

1. El agente lee el **diagnóstico principal CIE-10** del radicado.
2. Consulta `guias-clinicas/INDEX.md` para mapear el código CIE-10 → archivo GPC.
3. Registra la guía seleccionada en `meta.gpc_aplicada` (p.ej. `"GPC_falla_cardiaca.md v2024"`).
4. Usa esa GPC como referencia al evaluar M04, M06, M10, M14, M19, M22.

Si ningún CIE-10 coincide con las GPCs disponibles, el agente debe llenar `meta.gpc_aplicada = null`, M04 queda en `"n/a"` con observación, y se escala a humano (§5 de `checklist_base.md`).

---

## 2. Esquema del JSON — campo por campo

### 2.1 Raíz

| Campo | Tipo | Descripción |
|---|---|---|
| `instrumento` | string fijo | `"PERT-CLIN"`. |
| `descripcion` | string fijo | Descriptor del instrumento. |
| `meta` | objeto | Metadata del caso. Ver §2.2. |
| `categorias` | array | 8 categorías con 29 reglas (M01–M29). |
| `cierre` | objeto | Resultado global. |

### 2.2 `meta`

| Campo | Cómo llenarlo |
|---|---|
| `caso_id` | ID del radicado (`RAD-YYYYMMDD-xxxx`). |
| `fecha_auditoria` | Fecha ISO-8601. |
| `agente` | Identificador del sub-agente (ej. `"medical-agent-v1"`). |
| `gpc_aplicada` | Nombre del archivo GPC elegido (ej. `"GPC_falla_cardiaca.md"`) o `null` si ninguna aplica. |

### 2.3 Reglas (dentro de `categorias[].reglas[]`)

**Campos rúbrica** (fijos): `id`, `nombre`, `severidad` (`critica` · `mayor` · `baja`), `peso` (1–3), `descripcion`, `evidencia_requerida`, `dimensiones`.

**Campos llenables:**

#### `resultado`
- `"pass"` — la regla se cumple.
- `"fail"` — la regla se incumple → `glosa_sugerida` obligatoria.
- `"n/a"` — la regla no aplica (ej. M11 nota operatoria cuando no hubo cirugía).

#### `evidencia`
Específica del dominio clínico. Ejemplos válidos:
- Cita textual de nota de evolución: `"HC evolución 2026-04-10 08:30: 'Paciente estable, sin signos de falla derecha. BNP 380 pg/mL en descenso. Se continúa furosemida IV.'"`.
- Referencia a ayuda diagnóstica: `"Ecocardiograma 2026-04-09, FEVI 32%, dilatación VI severa — consistente con GPC_falla_cardiaca §2 criterios Framingham"`.
- Acta de junta médica: `"Junta médica cardiología 2026-04-11 acta #7: se acuerda mantener estancia por inestabilidad hemodinámica a pesar de criterios estándar de egreso"`.

#### `observaciones`
Campo clave en médico. Obligatorio cuando:
- Se aceptó una **desviación de GPC** (M06) — explicar por qué.
- Hay ambigüedad en la indicación (ej. medicamento prescrito off-label).
- El servicio es de alto costo aunque esté en pass.

Ejemplo: `"GPC sugiere furosemida 40 mg IV c/8h; el paciente recibió 80 mg c/6h por deterioro hemodinámico documentado en evolución día 2. Desviación justificada."`.

#### `confianza`
Calibración médica:
- `0.90+` — evidencia unívoca alineada con GPC.
- `0.75–0.90` — requiere inferencia pero hay soporte en HC.
- `<0.75` — escalar a auditor humano.

Dos gatillos adicionales en médico:
- **M06 `fail` siempre escala** (desviación de GPC sin justificación → glosa causal 6).
- **Caso atípico** (diagnóstico raro, manejo experimental) → escalar aun con confianza alta.

#### `glosa_sugerida`
```json
{
  "causal_num": "6",
  "causal_nombre": "Pertinencia",
  "texto": "Procedimiento sin indicación clínica según GPC vigente.",
  "valor_glosado": 1250000,
  "moneda": "COP"
}
```

| Campo | Valores válidos |
|---|---|
| `causal_num` | `"1"` Facturación · `"2"` Tarifas · `"3"` Soportes · `"4"` Autorización · `"5"` Cobertura · `"6"` Pertinencia · `"7"` Anulaciones |
| `causal_nombre` | Nombre que corresponde al `causal_num` (ej. `"Pertinencia"` para `"6"`) |
| `texto` | String. Justificación breve y trazable. 1–2 oraciones. |
| `valor_glosado` | Integer COP o `null` si el agente médico no puede determinarlo; el financiero lo consolida. |
| `moneda` | Siempre `"COP"`. |

- `glosa_sugerida` es **obligatoria** si `resultado == "fail"`. Debe ser `null` si `resultado == "pass"` o `"n/a"`.

Causales frecuentes en médico: **3** (soporte faltante), **4** (autorización no-PBS), **5** (cobertura), **6** (pertinencia).

#### Tabla resumen de valores válidos en reglas

| Campo | Valores válidos |
|---|---|
| `resultado` | `"pass"` · `"fail"` · `"n/a"` · `null` (solo mientras no ha sido evaluado) |
| `confianza` | Float 0.0–1.0. `0.90+`: evidencia unívoca alineada con GPC. `0.75–0.90`: requiere inferencia pero hay soporte en HC. `<0.75` en cualquier regla crítica → `concepto_final = "ESCALAR_HUMANO"`. |
| `glosa_sugerida` | `null` si `resultado != "fail"`. Objeto con 5 campos si `resultado == "fail"`. |
| `glosa_sugerida.causal_num` | `"1"` Facturación · `"2"` Tarifas · `"3"` Soportes · `"4"` Autorización · `"5"` Cobertura · `"6"` Pertinencia · `"7"` Anulaciones |
| `glosa_sugerida.causal_nombre` | Nombre que corresponde al `causal_num` (ej. `"Pertinencia"` para `"6"`) |
| `glosa_sugerida.valor_glosado` | Integer COP o `null` si el agente médico no puede determinarlo; el financiero lo consolida. |
| `glosa_sugerida.moneda` | Siempre `"COP"`. |

### 2.4 `cierre`

| Campo | Valores válidos / cómo llenarlo |
|---|---|
| `score_total` | `round(Σ(peso × 1 if resultado=="pass") / Σ(peso where resultado != "n/a") × 100, 1)`. Rango 0–100. `null` mientras se evalúa. |
| `concepto_final` | `"APTA"` · `"NO_APTA"` · `"DEVOLUCION"` · `"ESCALAR_HUMANO"`. Ver §4. |
| `clasificacion` | `"Administrativo"` · `"Tecnico"` · `"Clinico"` · `"Financiero"`. Dimensión dominante del hallazgo. |
| `accion_requerida` | `"Correccion"` · `"Complemento"` · `"Rechazo"` · `"Escalar"` · `null`. |
| `resumen_ejecutivo` | String. 1–2 frases. Debe nombrar cualquier regla crítica en `fail`. |

---

## 3. Tabla completa de las 29 reglas PERT-CLIN

| ID | Categoría | Nombre | Severidad | Peso |
|---|---|---|---|---|
| M01 | Diagnóstico | Diagnóstico principal CIE-10 | crítica | 3 |
| M02 | Diagnóstico | Diagnósticos secundarios relacionados | mayor | 2 |
| M03 | Diagnóstico | Motivo de consulta y anamnesis | crítica | 3 |
| M04 | GPC | GPC vigente aplicada | crítica | 3 |
| M05 | GPC | Protocolo institucional alineado | mayor | 2 |
| M06 | GPC | Desviación de guía justificada | crítica | 3 |
| M07 | Orden médica | Orden médica firmada y trazable | crítica | 3 |
| M08 | Orden médica | Profesional con competencia | crítica | 3 |
| M09 | Orden médica | Orden legible y específica | mayor | 2 |
| M10 | Procedimientos | Procedimiento indicado clínicamente | crítica | 3 |
| M11 | Procedimientos | Nota operatoria completa | crítica | 3 |
| M12 | Procedimientos | Consentimiento informado específico | crítica | 3 |
| M13 | Procedimientos | Cantidad acorde a lo realizado | mayor | 2 |
| M14 | Medicamentos | Medicamento pertinente al diagnóstico | crítica | 3 |
| M15 | Medicamentos | Dosis, vía y duración adecuadas | crítica | 3 |
| M16 | Medicamentos | Registro de administración completo | mayor | 2 |
| M17 | Medicamentos | Insumos proporcionales al procedimiento | mayor | 2 |
| M18 | Medicamentos | Medicamentos no PBS con autorización | crítica | 3 |
| M19 | Ayudas dx | Ayuda diagnóstica justificada | crítica | 3 |
| M20 | Ayudas dx | Resultado incorporado al manejo | mayor | 2 |
| M21 | Ayudas dx | Sin duplicidad injustificada | mayor | 2 |
| M22 | Estancia | Criterio de ingreso documentado | crítica | 3 |
| M23 | Estancia | Estancia justificada día a día | crítica | 3 |
| M24 | Estancia | Egreso o traslado con criterio | mayor | 2 |
| M25 | Estancia | Interconsultas pertinentes y respondidas | mayor | 2 |
| M26 | Alta | Epicrisis con plan de egreso | crítica | 3 |
| M27 | Alta | Fórmula de egreso consistente | mayor | 2 |
| M28 | Alta | Referencia o contrarreferencia trazable | mayor | 2 |
| M29 | Alta | Desenlace clínico documentado | baja | 1 |

Peso total: **73**. Peso crítico: **48**. Peso mayor: **24**. Peso baja: **1**.

---

## 4. Umbrales y lógica de decisión

```
si (M06 "fail"):                                           concepto_final = "ESCALAR_HUMANO"   # siempre
si (cualquier regla crítica "fail" y no subsanable):       concepto_final = "NO_APTA"
si (crítica "fail" subsanable con info adicional HC):      concepto_final = "DEVOLUCION"
si (confianza < 0.75 en alguna crítica):                   concepto_final = "ESCALAR_HUMANO"
si (caso atípico o dx raro sin GPC):                       concepto_final = "ESCALAR_HUMANO"
si (sin críticas en fail):                                 concepto_final = "APTA"
sino:                                                      concepto_final = "DEVOLUCION"
```

---

## 5. Cuándo escalar a humano

- **Siempre:** M06 `fail` (desviación de GPC sin justificación).
- **Siempre:** diagnóstico principal sin GPC en el corpus.
- **Siempre:** uso de medicamento no-PBS sin MIPRES (M18 fail) en paciente pediátrico, oncológico o de alto costo.
- **Siempre:** servicio experimental o fuera de vademécum aun con autorización.
- **Condicional:** `confianza < 0.75` en cualquier regla crítica.
- **Condicional:** desenlace con evento adverso grave (M29).

---

## 6. Ejemplos de llenado

### 6.1 Ejemplo `pass` — hospitalización por I50.0 alineada con GPC

```json
{
  "meta": {
    "caso_id": "RAD-20260418-A3F7",
    "fecha_auditoria": "2026-04-21T15:10:00-05:00",
    "agente": "medical-agent-v1",
    "gpc_aplicada": "GPC_falla_cardiaca.md"
  },
  "categorias": [
    {
      "id": 2, "nombre": "Adherencia a guias de practica clinica",
      "reglas": [
        {
          "id": "M04", "nombre": "GPC vigente aplicada",
          "severidad": "critica", "peso": 3,
          "descripcion": "El manejo clinico se ajusta a la GPC vigente (MinSalud o sociedad cientifica reconocida) para la patologia principal.",
          "evidencia_requerida": "HC, protocolo institucional, GPC referenciada (carpeta guias-clinicas/).",
          "dimensiones": ["Evidencia", "Adherencia"],
          "resultado": "pass",
          "evidencia": "Dx principal I50.01 (falla cardíaca sistólica aguda). HC ingreso documenta Framingham 2 mayores + 2 menores (GPC §2). Manejo: furosemida 40 mg IV c/8h, enalapril 10 mg VO c/12h, carvedilol 6.25 mg VO c/12h — esquema alineado con GPC_falla_cardiaca §5 tabla 1. Ecocardiograma realizado día 1 (FEVI 32%).",
          "observaciones": null,
          "confianza": 0.94,
          "glosa_sugerida": null
        }
      ]
    }
  ],
  "cierre": {
    "score_total": 100.0,
    "concepto_final": "APTA",
    "clasificacion": "Clinico",
    "accion_requerida": null,
    "resumen_ejecutivo": "Hospitalización 5 días por falla cardíaca sistólica aguda. Manejo alineado con GPC_falla_cardiaca. Todos los procedimientos, medicamentos y ayudas diagnósticas indicados y soportados. Epicrisis completa."
  }
}
```

### 6.2 Ejemplo `fail` — medicamento no-PBS sin MIPRES → glosa causal 3

```json
{
  "id": "M18", "nombre": "Medicamentos no PBS con autorizacion",
  "severidad": "critica", "peso": 3,
  "descripcion": "Medicamentos fuera del PBS tienen justificacion clinica explicita y autorizacion (MIPRES u otra) antes de su uso.",
  "evidencia_requerida": "MIPRES, HC, autorizacion.",
  "dimensiones": ["Validez"],
  "resultado": "fail",
  "evidencia": "Factura ítem 12: Sacubitril/Valsartán 49/51 mg × 60 comp ($842.000). Medicamento no incluido en PBS (vademécum 2026). No se anexó MIPRES, ni junta técnica, ni autorización del pagador. HC evolución día 3 menciona 'inicio sacubitril/valsartán' sin referencia a autorización. GPC_falla_cardiaca §5.3 permite su uso pero exige MIPRES previo.",
  "observaciones": "El medicamento está clínicamente indicado (FEVI <35% con sintomatología NYHA II), pero la autorización es un requisito formal no subsanable post-hoc.",
  "confianza": 0.91,
  "glosa_sugerida": {
    "causal_num": "3",
    "causal_nombre": "Soportes",
    "texto": "Sacubitril/Valsartán (no-PBS) facturado sin soporte MIPRES ni autorización previa del pagador. Resolución 1885/2018 art. 14.",
    "valor_glosado": 842000,
    "moneda": "COP"
  }
}
```

---

## 7. Mapa regla → causal Anexo 6

| Causal | Nombre | Reglas PERT-CLIN típicas |
|---|---|---|
| 3 | Soportes | M07, M09, M11, M12, M16, M20, M23, M26, M28 |
| 4 | Autorización | M18 (no-PBS), M19 (ayuda dx sin orden) |
| 5 | Cobertura | M18 (excluido del plan) |
| 6 | Pertinencia | M01, M02, M04, M06, M10, M13, M14, M15, M17, M19, M21, M22, M25 |

La causal dominante en medicina es **6 (Pertinencia)**: el servicio no estaba indicado o no correspondía al caso.
