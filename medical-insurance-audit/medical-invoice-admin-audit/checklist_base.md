# Checklist administrativo — Guía del auditor

Documento maestro del instrumento **DAMA-UK** (`checklist_base.json`) y su variante **SOAT-TEC** (`checklist_soat_base.json`). Explica qué significa cada campo del JSON, cómo llenarlo, qué valores son válidos y cuándo escalar a revisión humana.

---

## 1. Propósito del instrumento

El sub-agente administrativo valida la **formalidad documental** de la cuenta médica *antes* de que los sub-agentes médico y financiero comiencen su trabajo. Si la cuenta no supera el check administrativo, se devuelve (no se glosa): no tiene sentido auditar pertinencia clínica de un caso sin historia clínica firmada o sin autorización válida.

**DAMA-UK** cubre las 7 dimensiones de calidad de datos: Exactitud, Completitud, Consistencia, Validez, Unicidad, Oportunidad, Trazabilidad. Es el instrumento por defecto.

**SOAT-TEC** se aplica sólo cuando el pagador real del evento es **SOAT/ADRES** (accidente de tránsito). Incluye reglas específicas sobre SIRAS, INFOPOL, RUNT y FURIPS que no aplican a una cuenta EPS normal. El agente debe detectar el pagador leyendo el campo `pagador` del radicado y, si es SOAT, cargar `checklist_soat_base.json` en lugar de `checklist_base.json`.

---

## 2. Esquema del JSON — campo por campo

### 2.1 Raíz

| Campo | Tipo | Descripción |
|---|---|---|
| `instrumento` | string fijo | `"DAMA-UK"` o `"SOAT-TEC"`. No se modifica. |
| `descripcion` | string fijo | Texto descriptivo del instrumento. No se modifica. |
| `meta` | objeto | Metadata del caso auditado. Ver §2.2. |
| `categorias` | array | Las 8 (DAMA-UK) o 9 (SOAT-TEC) categorías con sus reglas. Ver §2.3. |
| `cierre` | objeto | Resultado global de la auditoría. Ver §2.4. |

### 2.2 `meta`

| Campo | Cómo llenarlo |
|---|---|
| `caso_id` | ID del radicado. Formato `RAD-YYYYMMDD-xxxx` (ej. `RAD-20260418-A3F7`). Se toma del subject del correo o del sistema de radicación. |
| `fecha_auditoria` | Fecha ISO-8601 del momento en que el agente ejecutó la auditoría (ej. `2026-04-21T14:32:00-05:00`). |
| `agente` | Identificador del sub-agente (ej. `"admin-agent-v1"`). Útil para trazabilidad y debugging. |

### 2.3 Reglas dentro de `categorias[].reglas[]`

Cada regla tiene **campos rúbrica** (fijos, no se tocan) y **campos llenables** (el agente los completa).

**Campos rúbrica — NUNCA se modifican:**

| Campo | Significado |
|---|---|
| `id` | Código único (`A01`–`A27` para DAMA-UK, `S01`–`S21` para SOAT). |
| `nombre` | Nombre corto de la regla. |
| `severidad` | `"critica"` (peso 3) · `"mayor"` (peso 2) · `"menor"` (peso 1). |
| `peso` | 1, 2 ó 3. Severidad del impacto: `critica`=3, `mayor`=2, `menor`=1. |
| `descripcion` | Qué valida la regla. |
| `evidencia_requerida` | Qué documentos/datos se necesitan para decidir. |
| `dimensiones` | Dimensiones DAMA-UK que la regla toca (p.ej. `["Validez","Unicidad"]`). |

**Campos llenables — el agente los completa:**

#### `resultado`
Valores válidos (strings):
- `"pass"` — la regla se cumple.
- `"fail"` — la regla se incumple. Requiere llenar `glosa_sugerida`.
- `"n/a"` — la regla no aplica al caso (ej. A14 traslado en ambulancia cuando no hubo traslado).

#### `evidencia`
Texto libre. Debe ser **verificable y específico**. Tres formatos válidos, en orden de preferencia:
1. **Cita textual** del documento: `"Epicrisis p.3: 'paciente egresa estable el 2026-04-13...'"`.
2. **Referencia a soporte** con localización: `"Autorización #AUT-2026-04412, vigente 2026-04-01/2026-04-30, archivo 03_audit/autorizacion.pdf"`.
3. **Resultado de consulta externa**: `"BDUA consultada 2026-04-21 14:28; afiliado activo, régimen contributivo, plan ORO"`.

**Evitar** evidencias débiles del tipo `"se verifica en HC"` sin cita o referencia concreta.

#### `observaciones`
Texto libre. Campo opcional en reglas con `pass`; **obligatorio** cuando hay ambigüedad, excepción o desviación aceptable. Ejemplos:
- `"Fecha de expedición 2 días después del egreso — dentro del plazo contractual de 30 días (cláusula 5.3)."`
- `"Documento en HC ilegible pero número coincide con BDUA; se solicita reemplazo al prestador."`

#### `confianza`
Número `0.0`–`1.0`. Calibración sugerida:
- `0.95+` — evidencia directa y unívoca (cita textual exacta, consulta BDUA en vivo).
- `0.80–0.95` — evidencia fuerte pero con leve inferencia (p.ej. número coincide aunque el formato difiere).
- `0.60–0.80` — evidencia indirecta o parcialmente ambigua.
- `<0.60` — el agente no está seguro; escalar a humano obligatorio.

Umbral operativo: **`confianza < 0.75` en cualquier regla crítica dispara `concepto_final = "ESCALAR_HUMANO"`**.

#### `glosa_sugerida`
Objeto o `null`. Estructura:
```json
{
  "causal_num": "1",
  "causal_nombre": "Facturación",
  "texto": "Usuario no identificado plenamente: documento en factura no coincide con BDUA.",
  "valor_glosado": 1250000,
  "moneda": "COP"
}
```
- `causal_num` — código Anexo 6 Res. 3047/2008 (`"1"`–`"7"`). Ver §7.
- `causal_nombre` — nombre de la causal (ej. `"Facturación"`, `"Autorización"`, `"Soportes"`). Ver tabla §7.
- `texto` — justificación breve y trazable.
- `valor_glosado` — valor del ítem objetado en COP (generalmente el valor total del ítem cuando la regla impide su pago completo). Puede ser `null` si el agente no puede determinarlo en esta capa; el sub-agente financiero lo consolida.
- `moneda` — siempre `"COP"`.
- **Obligatorio** si `resultado == "fail"`. **Debe ser `null`** si `resultado == "pass"` o `"n/a"`.

### 2.4 `cierre`

| Campo | Valores válidos / cómo llenarlo |
|---|---|
| `score_total` | `round(Σ(peso × 1 if resultado=="pass") / Σ(peso where resultado != "n/a") × 100, 1)`. Rango 0–100. `null` mientras se evalúa. |
| `concepto_final` | `"APTA"` · `"NO_APTA"` · `"DEVOLUCION"` · `"ESCALAR_HUMANO"`. Ver §4. Determinado por lógica de reglas, no por score. |
| `clasificacion` | `"Administrativo"` · `"Tecnico"` · `"Clinico"` · `"Financiero"`. Dimensión dominante del hallazgo. |
| `accion_requerida` | `"Correccion"` · `"Complemento"` · `"Rechazo"` · `"Escalar"` · `null`. |
| `resumen_ejecutivo` | String. 1–2 frases para la UI. Debe mencionar explícitamente cualquier hallazgo crítico (regla crítica en `fail`). |

---

## 3. Tabla completa de las 27 reglas DAMA-UK

| ID | Categoría | Nombre | Severidad | Peso |
|---|---|---|---|---|
| A01 | Identificación y unicidad | CUV válido y legible | crítica | 3 |
| A02 | Identificación y unicidad | Número de factura único | crítica | 3 |
| A03 | Identificación y unicidad | Fecha de expedición coherente | mayor | 2 |
| A04 | Usuario y derechos | Identificación del usuario completa | crítica | 3 |
| A05 | Usuario y derechos | Derechos vigentes | crítica | 3 |
| A06 | Usuario y derechos | Régimen y entidad coinciden | mayor | 2 |
| A07 | Entidad responsable | Pagador correcto | crítica | 3 |
| A08 | Entidad responsable | Autorización válida | crítica | 3 |
| A09 | Entidad responsable | Servicios dentro del alcance | mayor | 2 |
| A10 | Servicios facturados | Codificación correcta | crítica | 3 |
| A11 | Servicios facturados | Coherencia clínica | crítica | 3 |
| A12 | Servicios facturados | Cantidades y fechas coinciden | mayor | 2 |
| A13 | Servicios facturados | Procedimientos quirúrgicos soportados | crítica | 3 |
| A14 | Servicios facturados | Traslado en ambulancia soportado | mayor | 2 |
| A15 | Servicios facturados | Ayudas diagnósticas soportadas | mayor | 2 |
| A16 | Soportes | Historia clínica completa y firmada | crítica | 3 |
| A17 | Soportes | Certificado o recibido del usuario | mayor | 2 |
| A18 | Soportes | Anexos técnicos y envíos | mayor | 2 |
| A19 | Soportes | Récord de anestesia (si aplica) | mayor | 2 |
| A20 | Soportes | Hoja administración de medicamentos | crítica | 3 |
| A21 | Valores | Tarifas conforme contrato | crítica | 3 |
| A22 | Valores | Cálculos correctos | crítica | 3 |
| A23 | Oportunidad | Emisión dentro de plazos | mayor | 2 |
| A24 | Oportunidad | Trazabilidad del expediente | crítica | 3 |
| A25 | Cierre | Concepto final definido | crítica | 3 |
| A26 | Cierre | Clasificación del hallazgo | mayor | 2 |
| A27 | Cierre | Acción requerida asignada | crítica | 3 |

Peso total DAMA-UK: **72**. Peso crítico: **48**. Peso mayor: **24**.

Las 21 reglas SOAT (S01–S21) están listadas en `checklist_soat_base.json` con la misma semántica.

---

## 4. Umbrales y lógica de decisión

El `concepto_final` se deriva del estado de las reglas — no de un score numérico:

```
si (existe alguna regla crítica con resultado "fail"):
    si (todas las criticas en fail son subsanables con complemento docs): concepto_final = "DEVOLUCION", accion_requerida = "Complemento"
    sino:                                                                  concepto_final = "NO_APTA",   accion_requerida = "Rechazo"

sino si (alguna regla con confianza < 0.75):                               concepto_final = "ESCALAR_HUMANO", accion_requerida = "Escalar"

sino si (no hay criticas en fail):                                         concepto_final = "APTA", accion_requerida = "Correccion" si hay mayores en fail, sino null
```

- **DEVOLUCION** ≠ glosa. Es pedir al prestador que adjunte documentación faltante *antes* de reabrir auditoría.
- **NO_APTA** = la cuenta tiene hallazgos no subsanables → glosa definitiva.
- **APTA** no significa "paga todo": el agente médico y financiero aún pueden generar glosas; sólo significa que la formalidad documental pasa.

---

## 5. Cuándo escalar a humano

Dispara `ESCALAR_HUMANO` **cualquiera** de estas condiciones:

1. Una regla crítica con `confianza < 0.75`.
2. Dos o más reglas críticas en `fail` que se contradicen entre sí (p.ej. A05 dice derechos vigentes pero A07 dice pagador incorrecto).
3. Caso atípico: pagador ≠ SOAT/EPS estándar (ARL, medicina prepagada, particular), pluri-afiliación, paciente internacional.
4. Servicio de alto costo (>$50.000.000 COP) aunque todas las reglas estén en `pass`.
5. Prestador en lista de "patrón recurrente de hallazgos" (ver checklist financiero F42).

El agente debe poblar `observaciones` a nivel de regla **y** `cierre.resumen_ejecutivo` con la razón del escalamiento.

---

## 6. Ejemplos de llenado

### 6.1 Ejemplo `pass` (caso limpio — cardiología)

```json
{
  "meta": {
    "caso_id": "RAD-20260418-A3F7",
    "fecha_auditoria": "2026-04-21T14:32:00-05:00",
    "agente": "admin-agent-v1"
  },
  "categorias": [
    {
      "id": 2, "nombre": "Usuario y derechos",
      "reglas": [
        {
          "id": "A05", "nombre": "Derechos vigentes",
          "severidad": "critica", "peso": 3,
          "descripcion": "Usuario activo y con cobertura vigente al momento de la prestacion del servicio.",
          "evidencia_requerida": "Consulta BDUA o soporte EPS equivalente.",
          "dimensiones": ["Validez", "Exactitud"],
          "resultado": "pass",
          "evidencia": "BDUA consultada 2026-04-21 14:28; CC 71.234.567 activa, régimen contributivo, plan ORO, sin novedades entre 2026-04-08 y 2026-04-13 (fechas de atención).",
          "observaciones": null,
          "confianza": 0.98,
          "glosa_sugerida": null
        }
      ]
    }
  ],
  "cierre": {
    "score_total": 97.2,
    "concepto_final": "APTA",
    "clasificacion": "Administrativo",
    "accion_requerida": null,
    "resumen_ejecutivo": "Cuenta formalmente completa. 26/27 reglas en pass, 1 mayor (A23 emisión fuera de plazo menor) con tolerancia contractual. Se remite a auditoría médica y financiera."
  }
}
```

### 6.2 Ejemplo `fail` (autorización faltante → glosa causal 4)

```json
{
  "id": "A08", "nombre": "Autorizacion valida",
  "severidad": "critica", "peso": 3,
  "descripcion": "Autorizacion vigente, corresponde al usuario, al servicio y a la IPS asignada.",
  "evidencia_requerida": "Numero y soporte de autorizacion.",
  "dimensiones": ["Validez", "Exactitud"],
  "resultado": "fail",
  "evidencia": "Factura lista CUPS 882301 (cateterismo diagnóstico) el 2026-04-10. No se adjuntó número de autorización ni se encuentra autorización vigente en el sistema del pagador para este servicio electivo. Contrato marco cláusula 10.1 exige autorización previa.",
  "observaciones": "La autorización para cateterismo debe solicitarse al menos 72h antes. Verificado con equipo de autorizaciones: no hay registro de solicitud.",
  "confianza": 0.93,
  "glosa_sugerida": {
    "causal_num": "4",
    "causal_nombre": "Autorización",
    "texto": "Servicio electivo facturado (CUPS 882301) sin autorización previa del pagador. Incumplimiento cláusula 10.1 del contrato marco.",
    "valor_glosado": null,
    "moneda": "COP"
  }
}
```

### 6.3 Evidencias sólidas vs débiles

| Regla | Evidencia débil | Evidencia sólida |
|---|---|---|
| A05 Derechos vigentes | `"afiliado activo"` | `"BDUA consultada 2026-04-21 14:28; CC 71234567 activa, régimen contributivo, plan ORO, sin novedades entre 2026-04-08 y 2026-04-13"` |
| A11 Coherencia clínica | `"coherente con HC"` | `"HC ingreso p.1: 'dx I50.01 falla cardíaca sistólica aguda'. Servicios facturados: hospitalización 5d, ecocardiograma, BNP, telemetría → todos indicados por GPC_falla_cardiaca.md §3"` |
| A16 HC completa y firmada | `"HC completa"` | `"HC 12 páginas (ingreso, 5 evoluciones diarias, epicrisis, nota de egreso). Todas firmadas con registro RETHUS 12345 (MD Pérez, cardiología). Consultado RETHUS 2026-04-21: registro activo"` |
| A21 Tarifas conforme contrato | `"tarifas ok"` | `"Comparativo contra tarifario_contrato_eps_2026.csv: 4 ítems dentro de tarifa contratada; diferencia agregada $0 COP. Detalle en anexo comparativo."` |

---

## 7. Mapa regla → causal Anexo 6 (Res. 3047/2008)

| Causal | Nombre | Reglas que típicamente disparan esta causal |
|---|---|---|
| 1 | Facturación | A02 (duplicada), A03 (fecha), A10 (codificación), A22 (cálculos) |
| 2 | Tarifas | A21 |
| 3 | Soportes | A13, A14, A15, A16, A17, A18, A19, A20, A24 |
| 4 | Autorización | A07, A08, A09 |
| 5 | Cobertura | A05, A06 |
| 6 | Pertinencia | A11, A12 (principalmente del lado médico) |
| 7 | Anulaciones | A01 (CUV inválido puede implicar factura anulada) |

Nota: las causales 5 y 6 las emite con más frecuencia el sub-agente médico o financiero. El administrativo las toca sólo cuando el problema es documental (ej. usuario sin derechos → causal 5).
