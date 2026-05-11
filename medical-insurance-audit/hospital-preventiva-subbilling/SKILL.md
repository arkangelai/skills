---
name: hospital-preventiva-subbilling
description: Analiza la historia clínica y la factura de un caso hospitalario para identificar servicios documentados que no fueron facturados (subfacturación). Produce output_subbilling.json con hallazgos, CUPS sugeridos y monto estimado por hallazgo. Usar cuando la tarea es de tipo hospital_preventiva y el objetivo es detectar brechas entre lo documentado clínicamente y lo cobrado.
version: 1.0.0
author: raul.escandon@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, subbilling, hospital, preventiva, cups, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
---

# hospital-preventiva-subbilling

Skill de análisis de subfacturación para el contexto hospitalario colombiano. Opera desde el lado del hospital (o del auditor de la EPS en modo preventivo): cruza línea a línea la historia clínica del paciente — epicrisis, nota quirúrgica, kardex de medicamentos, resultados de laboratorio, consentimiento informado — contra el detalle de servicios facturados, e identifica brechas.

La pregunta que responde: **¿qué está documentado en la historia clínica que debería estar en la factura y no está?**

No evalúa si los servicios facturados son pertinentes (eso es `medical-invoice-medical-audit`). Solo busca servicios prestados y no cobrados.

## When to Use

- La tarea es de tipo `hospital_preventiva` y el contexto incluye factura + historia clínica.
- El hospital quiere verificar su propia factura antes de radicarla a la EPS.
- El auditor de la EPS detecta que el expediente tiene más servicios de los que aparecen en la factura.
- El usuario pide "revisar si hay subfacturación", "analizar qué falta en la factura", "buscar servicios no facturados".

**No usar:** si la tarea es `eps_audit` (ese flujo tiene su propia revisión de subfacturación como paso opcional post-glosa); si la historia clínica está incompleta o los documentos de soporte son menos de 3; si el objetivo es evaluar pertinencia clínica.

## Input Contract

Archivos en el directorio de trabajo de la tarea (`task_inputs`):

| Archivo | Obligatorio | Descripción |
|---|---|---|
| `factura.pdf` o `factura.xml` | Sí | Detalle de servicios facturados con CUPS, cantidades y valores |
| `epicrisis.pdf` | Sí | Resumen de hospitalización: diagnósticos, procedimientos, evolución, plan al alta |
| `nota_quirurgica.pdf` | Condicional | Si hubo cirugía — describe técnica, insumos usados, hallazgos |
| `kardex_medicamentos.pdf` | Condicional | Registro de medicamentos administrados durante la hospitalización |
| `resultados_laboratorio.pdf` | No | Resultados de exámenes — útil para detectar estudios no facturados |
| `consentimiento_informado.pdf` | No | Confirma procedimientos realizados |

Metadatos del caso en `metadata_input.json`:
```json
{
  "caso_id": "RAD-YYYYMMDD-XXX",
  "num_factura": "FV-YYYY-XXXXX",
  "prestador_nit": "string",
  "prestador_nombre": "string",
  "pagador_nit": "string",
  "pagador_nombre": "string",
  "paciente_documento": "string",
  "paciente_nombre": "string",
  "fecha_atencion": "YYYY-MM-DD",
  "manual_tarifario": "ISS-2001 | SOAT | contractual | null"
}
```

## Output Contract

Produce `output_subbilling.json` siguiendo exactamente `schema.json` en este directorio.

Campos clave:
- `hallazgos[].nivel_certeza`: solo `"alto"`, `"medio"`, `"bajo"`. Nunca `"medio-alto"` ni `"bajo-medio"`.
- `hallazgos[].monto_estimado`: número en COP o `null`. Usar el `manual_tarifario` del input para calcular. Si no hay referencia suficiente, `null`.
- `monto_total_estimado`: suma de todos los `monto_estimado` no-null. `null` solo si todos son `null`.
- `confianza_global`: promedio ponderado de confianza por hallazgo (peso = 1/número de hallazgos).

**Reglas de `nivel_certeza`:**
- `"alto"`: el servicio está explícitamente documentado en al menos dos fuentes (ej. nota quirúrgica + kardex) y no aparece en la factura.
- `"medio"`: el servicio está documentado en una fuente o se infiere fuertemente del procedimiento realizado (ej. anestesia balanceada implica agente inhalatorio).
- `"bajo"`: el servicio es estándar para el procedimiento según guías o protocolos, pero no hay evidencia documental directa en el expediente aportado.

**Reglas de `monto_estimado`:**
- Usar el manual tarifario especificado en `metadata_input.json.manual_tarifario`.
- ISS-2001: multiplicar el valor base del CUPS por el factor de conversión vigente.
- SOAT: usar tabla de valores SOAT del año de atención.
- Contractual: si no se conoce el valor pactado, usar ISS-2001 como referencia y marcar `null`.
- Si el CUPS sugerido es de insumos (código M o similar), estimar por catálogo de insumos hospitalarios del prestador si está disponible, o `null`.

## Procedure

1. **Cargar inputs.**
   Leer `metadata_input.json`. Cargar cada documento listado. Si falta `factura.pdf`/`factura.xml` o `epicrisis.pdf`, detener y retornar error.

2. **Extraer servicios facturados.**
   Del documento de factura, extraer la lista completa de CUPS facturados con cantidad y valor. Esta es la lista de referencia — todo lo que ya está cobrado no se reporta como hallazgo.

3. **Extraer servicios documentados.**
   De cada documento clínico, extraer:
   - Epicrisis: diagnósticos CIE-10, procedimientos realizados, medicamentos al alta.
   - Nota quirúrgica: técnica quirúrgica, insumos nombrados, duración, vía de abordaje.
   - Kardex: cada medicamento con dosis, frecuencia y período de administración.
   - Laboratorio: cada examen solicitado y resultante.

4. **Cruzar y detectar brechas.**
   Por cada servicio documentado, verificar si tiene CUPS correspondiente en la factura. Registrar como hallazgo todo servicio documentado sin facturar. Ignorar servicios facturados sin documentación (eso es pertinencia, no subfacturación).

5. **Asignar CUPS sugeridos.**
   Para cada hallazgo, sugerir los códigos CUPS, CUM o de insumo correspondientes usando las tablas de `../../../medical/cups-lookup/` si están disponibles.

6. **Estimar montos.**
   Para cada hallazgo con CUPS asignable y manual tarifario conocido, calcular `monto_estimado` en COP. Documentar la fórmula usada en `evidencia_documental`.

7. **Calcular totales y confianza.**
   Sumar `monto_estimado` no-null → `monto_total_estimado`. Calcular `confianza_global`.

8. **Escribir output.**
   Generar `output_subbilling.json` siguiendo `schema.json`. Validar que `nivel_certeza` solo use los tres valores permitidos antes de escribir.

## Pitfalls

- **Síntoma:** hallazgos de medicamentos con `nivel_certeza: "alto"` cuando el kardex solo cubre el período intraoperatorio. **Causa:** el período postoperatorio no está documentado, la ausencia no es evidencia de que no se administraron. **Fix:** bajar a `"medio"` y documentar la limitación en `evidencia_documental`.
- **Síntoma:** anestesia general documentada, sin insumos anestésicos en la factura. **Causa:** los agentes inhalatorios (sevoflurano, desflurano) frecuentemente se omiten porque el anestesiólogo factura honorarios pero no insumos. **Fix:** reportar como SB con `"medio"` y solicitar reporte de consumo de gases al anestesiólogo.
- **Síntoma:** `monto_total_estimado` inflado por insumos quirúrgicos sin catálogo. **Causa:** trocares, clips y material desechable no tienen CUPS fijo — su precio depende del proveedor. **Fix:** dejar `monto_estimado: null` en esos hallazgos e indicarlo en `evidencia_documental`.
- **Síntoma:** skill reporta diagnósticos CIE-10 como hallazgos de subfacturación. **Causa:** confusión entre subfacturación de servicios y subfacturación de diagnósticos. **Fix:** los diagnósticos van en `resumen.nota_diagnosticos`, no en `hallazgos[]`. Los hallazgos son servicios, insumos o medicamentos, no códigos diagnósticos.

## Verification

- `output_subbilling.json` existe en el directorio de trabajo.
- Pasa validación contra `schema.json` sin errores.
- Ningún `hallazgos[].nivel_certeza` tiene valor fuera de `["alto", "medio", "bajo"]`.
- Cada hallazgo tiene `cups_sugeridos` con al menos un ítem (o array vacío justificado en `evidencia_documental`).
- `monto_total_estimado` es igual a la suma de los `monto_estimado` no-null de `hallazgos[]`.
- No hay hallazgos que dupliquen CUPS ya presentes en la factura original.

## References

- Issue salmona-api#171 — schema canónico y decisión de task_type.
- `../../../medical/cups-lookup/` — tablas de referencia CUPS/CUM.
- Manual Tarifario ISS-2001 — referencia de tarifas base Colombia.
- Resolución 3047/2008 Anexo 6 — causales de glosa (para contexto inverso).
