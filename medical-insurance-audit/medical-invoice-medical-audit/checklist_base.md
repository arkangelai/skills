# Checklist médico — Guía del auditor

Documento maestro del instrumento **PERT-CLIN** (`checklist_base.json`). Explica qué significa cada campo del JSON, cómo llenarlo, cuándo consultar una GPC del directorio externo `$GUIAS_CLINICAS_PATH`, qué valores son válidos y cuándo escalar a revisión humana.

---

## 1. Propósito del instrumento

El sub-agente médico valida la **pertinencia clínica** de cada servicio facturado: ¿el procedimiento estaba indicado?, ¿el medicamento era el correcto?, ¿la estancia estaba justificada?, ¿se siguió la guía de práctica clínica (GPC)?

A diferencia del administrativo (formalidad) y financiero (tarifas), aquí el juicio es **clínico**. Por eso el JSON se complementa siempre con una GPC concreta del directorio externo `$GUIAS_CLINICAS_PATH`.

### Relación con guías clínicas externas

1. El agente lee el **diagnóstico principal CIE-10** del radicado.
2. Consulta `$GUIAS_CLINICAS_PATH/INDEX.md` para mapear el código CIE-10 → archivo GPC.
3. Registra la guía seleccionada en `meta.gpc_aplicada` (p.ej. `"GPC_falla_cardiaca.md v2024"`).
4. Usa esa GPC como referencia al evaluar M04, M06, M10, M14, M19, M22.

Si ningún CIE-10 coincide con las GPCs disponibles, el agente debe llenar `meta.gpc_aplicada = null`, M04 queda en `"n/a"` con observación explicativa, y el audit continúa normalmente — las reglas GPC-dependientes (M04, M06, M10, M14, M19, M22) se marcan `"n/a"`. No escalar por ausencia de GPC.

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
- `"pass"` — la información clínica requerida por la regla fue encontrada en los documentos disponibles Y cumple los criterios de la regla.
- `"fail"` — el agente tiene EVIDENCIA POSITIVA de una violación clínica. La información fue encontrada y contradice los criterios de la regla (ej. procedimiento contradice GPC, dosis incorrecta según evidencia en documentos, trayectoria clínica no justifica la estancia). Una regla NO DEBE marcarse `"fail"` simplemente porque un tipo de documento está ausente.
- `"n/a"` — la regla no aplica estructuralmente (ej. M11 nota operatoria cuando no hubo cirugía), O la información clínica necesaria no está disponible en ningún documento y no hay evidencia de violación. Cuando se usa `"n/a"` por información faltante, `observaciones` DEBE explicar qué se buscó y no se encontró.

**Principio: información sobre documentos.** Si la epicrisis contiene la información clínica que una "HC completa" contendría (diagnóstico de ingreso, trayectoria clínica, procedimientos, medicamentos, egreso), evaluar las reglas contra esa información. No marcar `"fail"` porque la información proviene de una epicrisis en lugar de un documento de historia clínica independiente.

Requiere llenar `glosa_sugerida` SOLO cuando `resultado == "fail"`.

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
| `texto` | String. Justificación breve y trazable. 1–2 oraciones. **Si `AUDIT_PERSPECTIVE = hospital`**: redactar como predicción ("el pagador objetará este ítem por causal X"), no como glosa emitida. |
| `valor_glosado` | Integer COP o `null` si el agente médico no puede determinarlo; el financiero lo consolida. |
| `moneda` | Siempre `"COP"`. |

- `glosa_sugerida` es **obligatoria** si `resultado == "fail"`. Debe ser `null` si `resultado == "pass"` o `"n/a"`.
- Con `AUDIT_PERSPECTIVE = hospital`: `glosa_sugerida` representa el **riesgo de glosa previsto** — se llena igual para que el equipo de facturación anticipe la objeción del pagador.

Causales frecuentes en médico: **3** (soporte faltante), **4** (autorización no-PBS), **5** (cobertura), **6** (pertinencia).

#### Tabla resumen de valores válidos en reglas

| Campo | Valores válidos |
|---|---|
| `resultado` | `"pass"` · `"fail"` · `"n/a"` · `null` (solo mientras no ha sido evaluado) |
| `confianza` | Float 0.0–1.0. `0.90+`: evidencia unívoca alineada con GPC. `0.75–0.90`: requiere inferencia pero hay soporte en HC. `<0.75` en cualquier regla → el agente debe igualmente emitir un veredicto (`pass`, `fail`, o `n/a`) pero agregar una observación señalando la baja confianza para que el revisor humano priorice la verificación. La baja confianza por sí sola NO cambia el `concepto_final`. |
| `glosa_sugerida` | `null` si `resultado != "fail"`. Objeto con 5 campos si `resultado == "fail"`. |
| `glosa_sugerida.causal_num` | `"1"` Facturación · `"2"` Tarifas · `"3"` Soportes · `"4"` Autorización · `"5"` Cobertura · `"6"` Pertinencia · `"7"` Anulaciones |
| `glosa_sugerida.causal_nombre` | Nombre que corresponde al `causal_num` (ej. `"Pertinencia"` para `"6"`) |
| `glosa_sugerida.valor_glosado` | Integer COP o `null` si el agente médico no puede determinarlo; el financiero lo consolida. |
| `glosa_sugerida.moneda` | Siempre `"COP"`. |

### 2.4 `cierre`

| Campo | Valores válidos / cómo llenarlo |
|---|---|
| `score_total` | `round(Σ(peso × 1 if resultado=="pass") / Σ(peso where resultado != "n/a") × 100, 1)`. Rango 0–100. `null` mientras se evalúa. |
| `concepto_final` | `"APTA"` · `"NO_APTA"`. Ver §4. `DEVOLUCION` se expresa como `NO_APTA` con `en_devolucion = true`. |
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
si (existe alguna regla con resultado "fail" — evidencia positiva de violación clínica):
    si (todas las reglas en fail son subsanables):   concepto_final = "NO_APTA", en_devolucion = true,  accion_requerida = "Complemento"
    sino:                                            concepto_final = "NO_APTA", en_devolucion = false, accion_requerida = "Rechazo"

sino (todas las reglas aplicables tienen resultado "pass" o "n/a"):  concepto_final = "APTA", accion_requerida = null

Nota: `concepto_final` solo tiene dos valores válidos: "APTA" y "NO_APTA". "DEVOLUCION" no es un valor válido — se expresa como NO_APTA + en_devolucion = true.
Nota: M06 con resultado "fail" (evidencia positiva de desviación de GPC sin justificación) → NO_APTA. Si la documentación clínica es insuficiente para determinar adherencia a GPC, M06 es "n/a" con observación, NO "fail".
Nota: las reglas con resultado "n/a" por información faltante son observaciones — NO impiden un veredicto APTA.
Nota: `ESCALAR_HUMANO` ya no es un valor válido de concepto_final. La baja confianza se documenta como observación.
```

---

## 5. Cuándo agregar observaciones para revisión humana

Las siguientes condiciones generan **observaciones** (no cambian el `concepto_final`, pero se documentan para que el auditor humano priorice su revisión):

- M06 con `resultado = "n/a"` por documentación clínica insuficiente para determinar adherencia a GPC.
- Diagnóstico principal sin GPC en el corpus — M04 queda en `"n/a"` con observación.
- Uso de medicamento no-PBS sin MIPRES (M18 fail con evidencia positiva) en paciente pediátrico, oncológico o de alto costo. **Con `AUDIT_PERSPECTIVE = hospital`**: documentar además como aviso al equipo de facturación ("corrija antes de radicar").
- Servicio experimental o fuera de vademécum aun con autorización.
- `confianza < 0.75` en cualquier regla — el agente emite su mejor veredicto pero señala la incertidumbre.
- Desenlace con evento adverso grave (M29).
- Información clínica necesaria para evaluar una regla no disponible en ningún documento — la regla se marca `"n/a"` con observación.

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
          "evidencia_requerida": "HC, protocolo institucional, GPC referenciada (directorio $GUIAS_CLINICAS_PATH).",
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

### 6.2 Ejemplo `fail` — medicamento no-PBS sin MIPRES

#### 6.2a AUDIT_PERSPECTIVE = aseguradora (glosa emitida)

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

#### 6.2b AUDIT_PERSPECTIVE = hospital (riesgo de glosa interno)

Mismos `resultado`, `evidencia` y `confianza`. Solo cambia `observaciones` y el `texto` de `glosa_sugerida`:

```json
{
  "id": "M18",
  "resultado": "fail",
  "evidencia": "Factura ítem 12: Sacubitril/Valsartán 49/51 mg × 60 comp ($842.000). Medicamento no incluido en PBS (vademécum 2026). No se encontró MIPRES, junta técnica ni autorización en el expediente. HC evolución día 3 menciona 'inicio sacubitril/valsartán' sin referencia a autorización.",
  "observaciones": "CORRIJA ANTES DE RADICAR — El pagador objetará este ítem por causal 3 (Soportes). Adjunte el MIPRES o la autorización previa del pagador antes de enviar la cuenta. Medicamento clínicamente indicado (FEVI <35%, NYHA II) — solo falta el soporte formal.",
  "confianza": 0.91,
  "glosa_sugerida": {
    "causal_num": "3",
    "causal_nombre": "Soportes",
    "texto": "Riesgo de glosa: Sacubitril/Valsartán (no-PBS) sin MIPRES ni autorización en el expediente. El pagador aplicará causal 3 si se radica sin este soporte.",
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
