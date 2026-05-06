---
name: clinical-report-writer
description: Drafts Colombian clinical reports — epicrisis, evolución diaria, nota operatoria, resumen de egreso, historia clínica de ingreso, interconsulta — following MinSalud Resolución 1995/1999 (historia clínica), Resolución 1552/2013 (RIPS), and the format expected by EPS auditors. Use it when the user pastes raw clinical data (notas del médico, paraclínicos, signos vitales, evolución) and asks to produce a formal clinical document, or when an IPS needs to standardize the format of an outgoing record before it goes to the EPS.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [clinical, documentation, epicrisis, ips, eps, colombia, rips, minsalud]
    category: clinical
    requires_toolsets: [terminal]
---

# clinical-report-writer

Generates Colombian clinical documents from structured or semi-structured input. Follows the legal format required by **Resolución 1995 de 1999** (componentes mínimos de la historia clínica) and aligns with the data fields RIPS expects so the resulting document is **audit-friendly** — i.e. when the EPS auditor reads it, every causal-relevant data point is in the place they expect.

This is the IPS-side counterpart to the audit pipeline. A well-formed epicrisis prevents glosas; a malformed one creates them.

## When to Use

- The user has clinical input (médico paste, paraclinics, vitals, evolution notes) and asks for a formal **epicrisis** / **resumen de egreso**.
- The user needs an **historia clínica de ingreso** in standard format.
- The user is documenting a **nota operatoria** post-procedimiento.
- The user is writing an **interconsulta** request to another specialty.
- The user is writing the **evolución diaria** of a hospitalized patient.
- An IPS is preparing documentation for radicación de cuenta and needs the clinical record to match RIPS expectations.

**Do not use:**
- For first-line clinical reasoning — the skill **formats and structures**, it doesn't decide diagnoses or treatments.
- For documents addressed to patients — use `patient-document-simplifier` instead.
- For research-grade documentation (case reports for journals, ICH-E3 CSR) — out of scope; use scientific writing tooling.
- For non-Colombian standards (CMS, NHS, ICH-GCP) — different fields, different regulatory framework.

## Procedure

### 1. Identify the document type

Each Colombian clinical document type has a fixed structure. Pick the right one:

| Document | When | Required components |
|---|---|---|
| **Historia clínica de ingreso** | Patient admitted to hospital/urgencias | Identificación · motivo de consulta · enfermedad actual · antecedentes · revisión por sistemas · examen físico · paraclínicos iniciales · impresión diagnóstica (CIE-10) · plan |
| **Evolución** | Daily during hospitalization | Fecha/hora · subjetivo · objetivo (signos vitales + examen físico dirigido) · análisis · plan |
| **Nota operatoria** | After surgery | Cirugía realizada (CUPS) · cirujano + ayudantes · anestesia · hallazgos · técnica · complicaciones · sangrado · piezas para patología |
| **Epicrisis / resumen de egreso** | Patient discharged from hospitalization | Diagnóstico de ingreso · evolución resumida · diagnóstico de egreso (CIE-10 principal + relacionados) · procedimientos realizados (CUPS) · medicamentos al egreso · recomendaciones · controles · signos de alarma |
| **Interconsulta** | One specialty asks another | Especialidad solicitante / solicitada · pregunta clínica concreta · datos relevantes · paraclínicos disponibles · qué se espera de la interconsulta |
| **Concepto especialista** | Response to interconsulta | Resumen del caso · examen dirigido · análisis · recomendaciones puntuales |

### 2. Validate inputs against required components

For the chosen document type, list the **mandatory fields** and check each one against the input. If a field is missing:
1. **Don't invent it.** Mark it as `[FALTA: <campo>]` in the draft.
2. Ask the user to provide it before producing the final version.

Mandatory identification fields (Resolución 1995/1999 Art. 2):
- Tipo y número de documento del paciente.
- Nombres y apellidos completos.
- Edad y sexo.
- Lugar de residencia.
- Fecha y hora del registro.
- Identificación del prestador (IPS).
- Identificación del profesional (nombre + RM + especialidad).

### 3. Use codified vocabularies where required

Audit-friendly clinical reports use codes alongside narrative:
- **Diagnósticos:** CIE-10 código + descripción. Use `icd10-lookup` to validate.
- **Procedimientos:** CUPS 2026 código + descripción. Use `cups-lookup` to validate.
- **Medicamentos:** principio activo + concentración + forma farmacéutica + vía + frecuencia + duración. CUM/IUM if available.
- **Paraclínicos:** nombre del examen + valor + unidad + rango de referencia + fecha.

### 4. Structure the narrative

Follow the **SOAP** framework for evolution-style documents (Subjetivo · Objetivo · Análisis · Plan). For epicrisis, use the chronological structure: **Ingreso → Hospitalización → Egreso**.

**Style rules:**
- Tercera persona, voz pasiva clínica ("se realizó", "se ordenó", "se observó").
- Tiempos verbales pretéritos para hechos pasados, presente para hallazgos actuales al momento del registro.
- Signos vitales como tabla o lista compacta, no prosa.
- Sin abreviaturas no estándar. Si se usa una abreviatura, la primera mención debe expandirse: "EPOC (enfermedad pulmonar obstructiva crónica)".

### 5. Audit-friendly placement of high-stakes data

EPS auditors look for these data points in **specific** sections. Place them where expected:

| Auditor expects to find | Place in this section |
|---|---|
| Justificación de admisión | "Motivo de consulta" + "Enfermedad actual" |
| Pertinencia de procedimiento | "Análisis" del día previo al procedimiento + "Nota operatoria" hallazgos |
| Pertinencia de medicamento | Indicación explícita en "Análisis" + dosis-frecuencia-duración en "Plan" |
| Necesidad de hospitalización vs ambulatorio | "Análisis" en historia clínica de ingreso |
| Criterios de egreso | "Epicrisis" sección "Estado al egreso" + "Recomendaciones" |
| Adherencia a GPC | Cita explícita: "Manejo según GPC <id> recomendación <n>" |

### 6. Generate output

Default output is Markdown with the structure of the chosen document type. Save to `<document-type>.md` in the working directory. Optionally produce a JSON summary with the codified data (CIE-10, CUPS, medicamentos) for the audit pipeline to consume.

When the user asks for a "ready-to-print" version, also produce a PDF using the markdown printer or LaTeX (out of scope for the SKILL itself — defer to a separate skill).

## Pitfalls

- **Síntoma:** Glosa por "diagnóstico no concuerda con plan terapéutico". **Causa:** El plan describe un manejo no consistente con el CIE-10 principal. **Fix:** Re-leer el "Análisis" antes de cerrar — el plan debe responder al diagnóstico, no a otra hipótesis.

- **Síntoma:** Glosa por "soporte clínico insuficiente para la hospitalización". **Causa:** La historia clínica de ingreso no explicita criterios de admisión (Sí/No: hipoxemia, descompensación hemodinámica, falla terapéutica ambulatoria, etc.). **Fix:** Toda hospitalización requiere ≥ 1 criterio de admisión documentado en "Análisis".

- **Síntoma:** Nota operatoria sin descripción de hallazgos. **Causa:** Se diligenció solo el campo "técnica". **Fix:** "Hallazgos" es campo obligatorio. Sin hallazgos, el procedimiento puede glosarse por falta de pertinencia.

- **Síntoma:** Epicrisis sin recomendaciones. **Causa:** Se asumió que las recomendaciones van en otra hoja. **Fix:** Resolución 1995 exige recomendaciones de egreso explícitas en la epicrisis. Sin ellas, la EPS puede glosar por documentación incompleta.

- **Síntoma:** Medicamento al egreso sin duración. **Causa:** Solo se anotó "metformina 850 mg cada 12 horas". **Fix:** Duración explícita ("por 30 días" o "manejo crónico, controlar en 3 meses"). Sin duración, MIPRES o autorización al egreso es ambigua.

- **Síntoma:** "Médico tratante" sin RM o sin especialidad. **Causa:** Plantillas heredadas que no exigen estos campos. **Fix:** RM + especialidad + nombre completo siempre. Para procedimientos de alto riesgo, también incluir registro especializado.

- **Síntoma:** Inventar paraclínicos que no se realizaron. **Causa:** Plantilla pre-diligenciada. **Fix:** Solo registrar exámenes con resultado real adjunto. Auditoría coteja contra los paraclínicos facturados — paraclínicos en historia clínica que no están en cuenta = sospecha de fraude.

- **Síntoma:** Copiar-pegar evolución del día anterior sin cambios. **Causa:** Mala práctica común de "evolución espejo". **Fix:** Cada evolución debe tener al menos un cambio en signos vitales, examen físico dirigido o análisis. Si el paciente está estable, decirlo explícitamente — no copiar la evolución previa.

## Verification

- Output expected: Markdown clinical document with all mandatory components from Resolución 1995/1999 + auditor-expected placement of high-stakes data (step 5).
- Validation: every CIE-10 in the document validates with `icd10-lookup`; every CUPS validates with `cups-lookup`.
- Sanity: no field is empty unless explicitly marked `[FALTA: <campo>]`.
- A reviewer (médico auditor or IPS clinical lead) reads the document and can answer:
  1. ¿Por qué se admitió este paciente?
  2. ¿Qué se hizo y por qué?
  3. ¿Cómo egresó y qué sigue?
  
  If any of those is unanswerable, the document is not done.

## References

- Resolución 1995 de 1999 — historia clínica.
- Resolución 1552 de 2013 — RIPS.
- Resolución 256 de 2016 — sistema de información para la calidad.
- Sister skills: `cups-lookup`, `icd10-lookup`, `gpc-minsalud-lookup`, `medical-invoice-document-understanding`.
