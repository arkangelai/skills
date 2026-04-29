# Checklist financiero — Guía del auditor

Documento maestro del instrumento **FIN-CTR** (`checklist_base.json`). Explica cómo el sub-agente financiero llena el JSON, cómo orquesta `$PLANES_PATH` + `$TARIFARIOS_PATH` + el contrato marco, y cómo documenta los controles antifraude.

---

## 1. Propósito del instrumento

El sub-agente financiero valida la **corrección económica y contractual** de la factura y detecta fraude. Responde tres preguntas:
1. ¿La tarifa facturada es la que corresponde según contrato, plan y manual tarifario?
2. ¿El servicio está cubierto por el plan del afiliado (Oro/Plata/Básico), sin superar topes ni carencias?
3. ¿Hay indicios de fraude — duplicidad, upcoding, unbundling, phantom billing, doble cobro?

Es el último sub-agente en el pipeline: presupone que el administrativo y el médico ya pasaron (o marcaron sus hallazgos). Sobre esa base, genera las glosas tarifarias y las objeciones por coberturas/antifraude.

### Orquestación con datos externos

| Necesidad | Fuente | Regla que la usa |
|---|---|---|
| ¿Cuál es el plan del afiliado? | `BDUA` (externo) → `$PLANES_PATH/INDEX.md` → `$PLANES_PATH/plan_<id>.md` | F04, F06, F20, F21, F22, F25 |
| ¿Qué tarifario aplica? | Contrato → `$TARIFARIOS_PATH/INDEX.md` → `$TARIFARIOS_PATH/<nombre>.csv` | F07, F08, F09, F13 |
| ¿Qué dice el contrato marco? | `contrato.md` (referencia en repo) | F01, F02, F03, F18, F27 |
| ¿Hay otros cobros cruzados? | BDUA, ADRES-SOAT, ARL, historiales | F32, F33, F35 |

### Precedencia de tarifario

```
1. Tarifario contratado con la IPS ($TARIFARIOS_PATH/tarifario_contrato_eps_2026.csv)  ← siempre primero
2. ISS 2001 actualizado                                                ← si el contrato lo referencia como fallback
3. SOAT 2026                                                           ← piso legal para lo no contratado
```

Si un CUPS no está en el tarifario contratado y el contrato (cláusula 5.2) exige autorización para usar SOAT, el agente debe verificar que esa autorización exista antes de aplicar la tarifa SOAT.

---

## 2. Esquema del JSON — campo por campo

### 2.1 Raíz y `meta`

| Campo | Cómo llenarlo |
|---|---|
| `meta.caso_id` | `RAD-YYYYMMDD-xxxx`. |
| `meta.fecha_auditoria` | ISO-8601. |
| `meta.agente` | Ej. `"financial-agent-v1"`. |
| `meta.plan_afiliado` | Uno de: `"ORO"`, `"PLATA"`, `"BASICO"` (o el ID real del plan). Obtenido de BDUA / consulta al pagador. |
| `meta.tarifario_aplicado` | Nombre del CSV que el agente usó de referencia (ej. `"tarifario_contrato_eps_2026.csv"`). |

### 2.2 Reglas

Campos rúbrica (fijos): `id`, `nombre`, `severidad`, `peso`, `descripcion`, `evidencia_requerida`, `dimensiones`.

Campos llenables — con matices financieros:

#### `resultado`
- `"pass"` — la información financiera requerida por la regla fue encontrada en los documentos disponibles Y cumple los criterios.
- `"fail"` — el agente tiene EVIDENCIA POSITIVA de una violación financiera. La información fue encontrada y contradice los criterios (ej. tarifa excede contrato, doble cobro confirmado, liquidación incorrecta). Una regla NO DEBE marcarse `"fail"` simplemente porque un documento está ausente o un sistema externo no es accesible.
- `"n/a"` — la regla no aplica a la modalidad (p.ej. F19 PGP/cápita si la cuenta no está bajo esas modalidades), O la información necesaria no está disponible y no hay evidencia de violación. Cuando se usa `"n/a"` por información faltante o bases de datos externas inaccesibles, `observaciones` DEBE explicar qué se buscó.

**Principio central: inocente hasta que se demuestre lo contrario.** La ausencia de un documento (contrato, anexos) o la inaccesibilidad de bases externas (BDUA, ADRES, RUAF) no es evidencia de violación. Es una observación.

Requiere llenar `glosa_sugerida` SOLO cuando `resultado == "fail"`.

#### `evidencia`
En financiero, la mayoría de evidencias son **comparativos numéricos**. Formatos típicos:
- `"Ítem 3 factura: CUPS 890268 'Ecocardiograma transtorácico' facturado $450.000. Tarifa contratada (tarifario_contrato_eps_2026.csv línea 42): $380.000. Diferencia: +$70.000 (+18.4%)."`
- `"Plan ORO ($PLANES_PATH/plan_oro.md §Topes anuales): ayudas diagnósticas sin tope. Servicio facturado dentro de cobertura."`
- `"Cruce BDUA 2026-04-21 15:30: afiliado CC 71234567 también aparece en radicado RAD-20260410-B22C de IPS Clínica Marly con estancia 2026-04-10/2026-04-14 — solapa con RAD actual (2026-04-08/2026-04-13)."`

#### `observaciones`
Obligatorio cuando:
- Se aceptó una desviación tarifaria por exclusión contractual (F18).
- Hay justificación de un no-PBS con MIPRES (F06 pass + observación).
- El hallazgo requiere contexto histórico del prestador (F28, F42).

#### `confianza`
- `0.95+` para diferencias numéricas exactas (basta restar).
- `0.80–0.95` para inferencias contra el plan (p.ej. interpretación de "médicamente necesario").
- `<0.80` en antifraude siempre escala (F32–F42).

**Regla dura:** hallazgo antifraude (F32–F42) con confianza ≥0.9 y evidencia positiva → glosa automática; confianza <0.9 → `concepto_final = "NO_APTA"` con observación de baja confianza para verificación humana. Reglas antifraude que requieren bases de datos externas inaccesibles → `resultado = "n/a"` con observación.

#### `glosa_sugerida`
En financiero, la glosa debe incluir **monto**:
```json
{
  "causal_num": "2",
  "causal_nombre": "Tarifas",
  "texto": "Sobrecobro sobre tarifa contratada.",
  "valor_glosado": 70000,
  "moneda": "COP"
}
```
- `causal_num` — código Anexo 6 Res. 3047/2008 (`"1"`–`"7"`). Ver §8.
- `causal_nombre` — nombre legible de la causal. Ver tabla §8.
- `valor_glosado` — **obligatorio en financiero**. Diferencia exacta entre valor facturado y valor reconocible (en COP).
- `moneda` — siempre `"COP"`.

Causales financieras más comunes: **1** (facturación), **2** (tarifas), **4** (autorización), **5** (cobertura), **6** (pertinencia cuando hay upcoding).

#### Tabla resumen de valores válidos en reglas

| Campo | Valores válidos |
|---|---|
| `resultado` | `"pass"` · `"fail"` · `"n/a"` · `null` (solo mientras no ha sido evaluado) |
| `confianza` | Float 0.0–1.0. `0.95+`: diferencia numérica exacta. `0.80–0.95`: inferencia contra el plan. `<0.80` en antifraude → siempre escala. |
| `glosa_sugerida` | `null` si `resultado != "fail"`. Objeto obligatorio si `resultado == "fail"`. |
| `glosa_sugerida.causal_num` | `"1"` Facturación · `"2"` Tarifas · `"3"` Soportes · `"4"` Autorización · `"5"` Cobertura · `"6"` Pertinencia · `"7"` Anulaciones |
| `glosa_sugerida.causal_nombre` | Nombre que corresponde al `causal_num`. |
| `glosa_sugerida.valor_glosado` | Integer COP. **Obligatorio en financiero** — diferencia exacta entre valor facturado y valor reconocible. |
| `glosa_sugerida.moneda` | Siempre `"COP"`. |

### 2.3 `cierre`

Campos estándar + tres específicos del financiero:

| Campo | Valores válidos / cómo llenarlo |
|---|---|
| `score_total` | `round(Σ(peso × 1 if resultado=="pass") / Σ(peso where resultado != "n/a") × 100, 1)`. Rango 0–100. `null` mientras se evalúa. |
| `concepto_final` | `"APTA"` · `"NO_APTA"`. Ver §4. `DEVOLUCION` se expresa como `NO_APTA` con `en_devolucion = true`. |
| `clasificacion` | `"Administrativo"` · `"Tecnico"` · `"Clinico"` · `"Financiero"`. |
| `accion_requerida` | `"Correccion"` · `"Complemento"` · `"Rechazo"` · `"Escalar"` · `null`. |
| `resumen_ejecutivo` | String. 1–2 frases. Debe indicar el total glosado en COP. |
| `valor_facturado` | Integer COP. Total facturado por el prestador. `null` mientras se evalúa. |
| `valor_aprobado` | Integer COP. Valor que el pagador reconoce tras glosas. `valor_facturado − valor_glosado`. `null` mientras se evalúa. |
| `valor_glosado` | Integer COP. Suma de todos los `valor_glosado` de las reglas en `fail`. `null` mientras se evalúa. |

---

## 3. Tabla completa de las 42 reglas FIN-CTR

| ID | Categoría | Nombre | Severidad | Peso |
|---|---|---|---|---|
| F01 | Contrato | Contrato activo al momento de la atención | crítica | 3 |
| F02 | Contrato | Modalidad de contratación identificada | crítica | 3 |
| F03 | Contrato | Anexos y otrosíes vigentes aplicados | mayor | 2 |
| F04 | Plan | Identificación del plan del afiliado | crítica | 3 |
| F05 | Plan | Tarifario específico del plan | crítica | 3 |
| F06 | Plan | Coberturas y exclusiones del plan | mayor | 2 |
| F07 | Tarifario | Manual tarifario pactado | crítica | 3 |
| F08 | Tarifario | Versión vigente del manual | crítica | 3 |
| F09 | Tarifario | UVB / UVR / factor multiplicador | crítica | 3 |
| F10 | Codificación | CUPS homologado correctamente | crítica | 3 |
| F11 | Codificación | CUM / ATC de medicamentos válido | mayor | 2 |
| F12 | Codificación | Homologación de insumos y dispositivos | mayor | 2 |
| F13 | Liquidación | Tarifa base correcta | crítica | 3 |
| F14 | Liquidación | Recargos aplicados correctamente | mayor | 2 |
| F15 | Liquidación | Liquidación quirúrgica por vía de acceso | mayor | 2 |
| F16 | Liquidación | Honorarios profesionales conforme | mayor | 2 |
| F17 | Paquetes | Servicios de paquete no duplicados | crítica | 3 |
| F18 | Paquetes | Evento fuera de paquete justificado | mayor | 2 |
| F19 | Paquetes | PGP / cápita sin cobros individuales | crítica | 3 |
| F20 | Coberturas | Topes anuales respetados | mayor | 2 |
| F21 | Coberturas | Períodos de carencia cumplidos | mayor | 2 |
| F22 | Coberturas | Preexistencias excluidas | mayor | 2 |
| F23 | Copagos | Copago / cuota moderadora por IBC | mayor | 2 |
| F24 | Copagos | Recaudo registrado y descontado | mayor | 2 |
| F25 | Copagos | Exención correctamente aplicada | mayor | 2 |
| F26 | Cierre | Valor total conciliable | crítica | 3 |
| F27 | Cierre | Radicación dentro de plazos | mayor | 2 |
| F28 | Cierre | Histórico del prestador en umbral | menor | 1 |
| F29 | Antifraude | Fecha de emisión anterior al vencimiento | crítica | 3 |
| F30 | Antifraude | Fecha emisión vs fecha de prestación | mayor | 2 |
| F31 | Antifraude | Consecutivo DIAN válido y continuo | mayor | 2 |
| F32 | Antifraude | Unicidad: mismo paciente en múltiples IPS | crítica | 3 |
| F33 | Antifraude | No solapamiento de hospitalizaciones | crítica | 3 |
| F34 | Antifraude | Servicios post-mortem | crítica | 3 |
| F35 | Antifraude | Doble cobro SOAT / EPS / ARL / plan | crítica | 3 |
| F36 | Antifraude | Servicios no realizados (phantom billing) | crítica | 3 |
| F37 | Antifraude | Upcoding sospechoso | mayor | 2 |
| F38 | Antifraude | Unbundling detectado | mayor | 2 |
| F39 | Antifraude | Profesional sin concurrencia imposible | mayor | 2 |
| F40 | Antifraude | Cambio de diagnóstico sospechoso | mayor | 2 |
| F41 | Antifraude | Cantidades atípicas de insumos / medicamentos | mayor | 2 |
| F42 | Antifraude | Patrón recurrente del prestador | menor | 1 |

Peso total: **100**. Peso crítico: **54**. Peso mayor: **44**. Peso baja: **2**.

---

## 4. Umbrales y lógica de decisión

```
Solo reglas con resultado "fail" (evidencia positiva) cuentan para el veredicto:

si (F32 / F33 / F34 / F35 / F36 en "fail" con evidencia positiva y confianza ≥0.9): concepto_final = "NO_APTA" + bloqueo pagos
si (cualquier antifraude F29–F42 "fail" con evidencia positiva y confianza <0.9):    concepto_final = "NO_APTA" con observación de baja confianza
si (antifraude sin acceso a base de datos externa):                                   resultado = "n/a" con observación
si (F17 / F19 / F26 "fail" con evidencia positiva):                                  concepto_final = "NO_APTA" (o "DEVOLUCION" si es corregible)
si (diferencia tarifaria >10 % del valor facturado):                                 concepto_final = "NO_APTA"
si (diferencia tarifaria 2–10 %):                                                    concepto_final = "APTA con glosa parcial"
si (diferencia <2 %):                                                                concepto_final = "APTA"
si (todas las reglas "pass" o "n/a"):                                                concepto_final = "APTA"

Nota: `ESCALAR_HUMANO` ya no es un valor válido. Las reglas con "n/a" por información faltante son observaciones que NO impiden APTA.
```

`valor_aprobado` nunca puede ser negativo. Si `valor_glosado > valor_facturado`, hay error de cálculo — escalar.

---

## 5. Patrones antifraude — cómo documentarlos

Cada regla antifraude tiene un formato de evidencia esperado. El agente debe seguirlo para que la glosa resista impugnación.

### F32 — Mismo paciente en múltiples IPS

**Evidencia esperada:**
> "Cruce BDUA y cuentas del pagador el {fecha}: afiliado {tipo-doc} {número} aparece facturado por IPS {A} (RAD-{x}) y por IPS {B} (RAD-{y}) con solapamiento de periodo {inicio}–{fin}. Servicios sobrepuestos: {lista CUPS}."

### F33 — Solapamiento de hospitalizaciones

Formato similar a F32, pero restringido a estancia (CUPS S10*). Debe incluir fechas de ingreso y egreso.

### F34 — Servicios post-mortem

**Evidencia esperada:**
> "RUAF consultado el {fecha}: certificado de defunción {número}, fecha fallecimiento {YYYY-MM-DD}. Factura incluye ítem {CUPS} prestado el {fecha posterior} por valor $X."

### F35 — Doble cobro SOAT/EPS/ARL

**Evidencia esperada:**
> "Cruce ADRES-SOAT el {fecha}: evento SIRAS #{número} del paciente facturado a SOAT por IPS {A} por valor $X. Cuenta actual (a EPS) factura los mismos CUPS {lista} en la misma fecha. No hay soporte de agotamiento de topes SOAT ni certificado de pagador diferencial."

### F36 — Phantom billing

**Evidencia esperada:**
> "Ítem {n} factura: {CUPS} {descripción} × {cantidad} por $X. HC revisada {páginas}: no se evidencia registro de ejecución (sin nota, sin firma, sin consumo en kardex). Contrato cláusula 12.1 exige soporte en HC."

### F37 — Upcoding

**Evidencia esperada:**
> "Ítem {n}: CUPS {código-alto} '{descripción-alta}' por $X. HC documenta procedimiento realmente ejecutado: '{descripción-real}', que corresponde a CUPS {código-bajo} por $Y. Diferencia $X–$Y = $Z. Histórico del prestador: {N} upcodings similares en los últimos 12 meses."

### F38 — Unbundling

**Evidencia esperada:**
> "Ítems {a, b, c} facturados por separado: {CUPS a}, {CUPS b}, {CUPS c}, total $X. Manual tarifario agrupa estos servicios bajo {CUPS paquete} por $Y (ahorro $X–$Y=$Z). Regla de agrupación: {cita manual}."

### F39 — Concurrencia imposible

**Evidencia esperada:**
> "Profesional {MD nombre, RETHUS {n}} facturado en ítem {a} ejecutando {CUPS} en sede {A} el {fecha/hora} y simultáneamente en ítem {b} ejecutando {CUPS} en sede {B} el mismo {fecha/hora}. Distancia entre sedes: {km}. Incompatible físicamente."

### F40 — Cambio de diagnóstico

**Evidencia esperada:**
> "Versión v1 de la cuenta ({fecha}): diagnóstico principal {CIE-10 A}. Versión v2 ({fecha}): diagnóstico principal {CIE-10 B} (valor aproximado superior). HC no evidencia soporte adicional para el cambio."

---

## 6. Cuándo agregar observaciones para revisión humana

Las siguientes condiciones generan **observaciones** (no cambian el `concepto_final`, pero se documentan para que el auditor humano priorice su revisión):

- Cualquier regla F32–F36 en `fail` con `confianza < 0.9` → `concepto_final = "NO_APTA"` con observación de baja confianza.
- Reglas antifraude que requieren bases de datos externas inaccesibles → `resultado = "n/a"` con observación.
- Hallazgo antifraude con monto total objetado >$10.000.000 COP → observación de alto impacto para revisión humana prioritaria.
- Prestador con score histórico en rojo (F42) + 2 o más reglas antifraude en fail → observación + alerta a Superintendencia si procede.
- Plan del afiliado no identificable con certeza (F04 con confianza <0.9) → F04 `resultado = "n/a"` con observación. Evaluar reglas de cobertura con el plan más conservador disponible.
- Información necesaria para evaluar una regla financiera no disponible — la regla se marca `"n/a"` con observación.

---

## 7. Ejemplos de llenado

### 7.1 Ejemplo `pass` — factura coincide con tarifario

```json
{
  "id": "F13", "nombre": "Tarifa base correcta",
  "severidad": "critica", "peso": 3,
  "descripcion": "La tarifa base de cada servicio se calcula conforme al manual y contrato, sin sobrecosto ni descuento indebido.",
  "evidencia_requerida": "Manual, liquidador.",
  "dimensiones": ["Exactitud"],
  "resultado": "pass",
  "evidencia": "Comparativo factura vs tarifario_contrato_eps_2026.csv (5 ítems): S10101 estancia día ×5 @ $285.000 = $1.425.000 (match); 890203 consulta subespecializada ×2 @ $135.000 = $270.000 (match); D08005 ecocardiograma ×1 @ $720.000 (match); M00501 enoxaparina 40mg ×10 @ $28.000 = $280.000 (match); D08002 química básica ×3 @ $42.000 = $126.000 (match). Diferencia total $0.",
  "observaciones": null,
  "confianza": 0.98,
  "glosa_sugerida": null
}
```

### 7.2 Ejemplo `fail` — sobrecobro tarifa → glosa causal 2

```json
{
  "id": "F13", "nombre": "Tarifa base correcta",
  "severidad": "critica", "peso": 3,
  "descripcion": "La tarifa base de cada servicio se calcula conforme al manual y contrato, sin sobrecosto ni descuento indebido.",
  "evidencia_requerida": "Manual, liquidador.",
  "dimensiones": ["Exactitud"],
  "resultado": "fail",
  "evidencia": "Ítem 7 factura: CUPS 892900 'Holter 24h' facturado $240.000. Tarifa contratada (tarifario_contrato_eps_2026.csv línea 58): $180.000. Diferencia: +$60.000 (+33.3%). Sin anexo/otrosí que justifique la diferencia.",
  "observaciones": "Verificado en contrato vigente v2.1 del 2026-01-15: no hay anexo que modifique tarifa 892900. La tarifa base aplica.",
  "confianza": 0.96,
  "glosa_sugerida": {
    "causal_num": "2",
    "causal_nombre": "Tarifas",
    "texto": "Sobrecobro tarifa CUPS 892900: facturado $240.000 vs tarifa contratada $180.000.",
    "valor_glosado": 60000,
    "moneda": "COP"
  }
}
```

### 7.3 Ejemplo `fail` antifraude — upcoding

```json
{
  "id": "F37", "nombre": "Upcoding sospechoso",
  "severidad": "mayor", "peso": 2,
  "descripcion": "El codigo facturado corresponde a la complejidad real del servicio. No hay elevacion injustificada a un CUPS de mayor valor que el realmente ejecutado.",
  "evidencia_requerida": "HC, comparativo de CUPS relacionados.",
  "dimensiones": ["Exactitud"],
  "resultado": "fail",
  "evidencia": "Ítem 3: CUPS 881345 'Ecocardiograma transesofágico con contraste' $1.150.000. HC evolución día 1: 'se realiza ecocardiograma transtorácico' (sin vía transesofágica, sin contraste). CUPS correspondiente al servicio ejecutado: 881201 'Ecocardiograma transtorácico' $420.000. Diferencia: $730.000. Histórico prestador: 4 upcodings de ecocardiografía en últimos 6 meses.",
  "observaciones": "Patrón recurrente — también afecta F42 (patrón del prestador).",
  "confianza": 0.92,
  "glosa_sugerida": {
    "causal_num": "6",
    "causal_nombre": "Pertinencia",
    "texto": "Upcoding ecocardiograma: facturado CUPS 881345 (transesofágico con contraste, $1.150.000) pero HC documenta ecocardiograma transtorácico (CUPS 881201, $420.000).",
    "valor_glosado": 730000,
    "moneda": "COP"
  }
}
```

---

## 8. Mapa regla → causal Anexo 6

| Causal | Nombre | Reglas FIN-CTR típicas |
|---|---|---|
| 1 | Facturación | F10, F11, F12, F26, F27, F29, F30, F31 |
| 2 | Tarifas | F05, F07, F08, F09, F13, F14, F15, F16, F23 |
| 3 | Soportes | F18, F36 |
| 4 | Autorización | F04, F20, F21 |
| 5 | Cobertura | F06, F22, F25 |
| 6 | Pertinencia | F17, F19, F37, F38, F41 |
| 7 | Anulaciones | F31 (consecutivo duplicado), F29 |
| — | Antifraude (causal especial / denuncia) | F32, F33, F34, F35, F39, F40, F42 |

Las F32–F35 y F39 cuando se confirman activan además un proceso paralelo (denuncia ante Superintendencia, suspensión de pagos al prestador) que está fuera del alcance del pipeline de auditoría y se escala a humano.
