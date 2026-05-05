---
name: prior-authorization-review
description: Review pre-autorización (prior authorization) requests for Colombian EPS — assesses medical necessity, validates the requested service against the Plan de Beneficios en Salud (PBS, ex-POS), checks contract coverage between EPS and IPS, and emits an approval/denial/conditional decision with the specific causal and references. Use it when the user pastes a pre-autorización solicitud (medication, procedure, ayuda diagnóstica, hospitalización), asks "¿se debe autorizar X?", or needs to draft the formal response to an IPS requesting authorization.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, eps, prior-auth, pre-autorizacion, pbs, mipres, audit, colombia]
    category: medical
    requires_toolsets: [terminal]
---

# prior-authorization-review

Reviews **pre-autorización** requests submitted by IPS to EPS in Colombia. Mirrors the medical-invoice audit pipeline but runs **before** the service is rendered — same regulatory framework (PBS, MIPRES, contratos, GPC), different temporal posture.

A pre-autorización decision has three possible outcomes: **autorizado**, **negado** with causal, or **autorizado con condiciones** (e.g. cantidad menor, frecuencia ajustada, requiere segunda opinión, requiere comité técnico-científico). The skill produces a structured JSON decision the EPS authorization desk can act on.

## When to Use

- The user pastes a pre-autorización request (medication, procedure, hospitalización, ayuda diagnóstica, transporte) and asks for a decision.
- The user asks "¿esto está cubierto por PBS?" / "¿requiere MIPRES?" / "¿el contrato cubre esto?".
- An EPS authorization analyst needs to draft the formal **comunicado de respuesta** to the IPS.
- A medical director wants to triage a batch of solicitudes by automated risk score before manual review.
- During pre-audit of a hospitalización event — would the projected services be authorized?

**Do not use:**
- For invoices that have already been billed — use the `medical-invoice-*` audit pipeline instead. Pre-auth is *ex ante*, audit is *ex post*.
- For tutelas / fallos judiciales — those override PBS coverage and need a different skill (judicial pathway).
- For PAC (Plan de Atención Complementaria) coverage — most pre-auth logic is for the contributory regime under PBS.

## Procedure

### 1. Parse the solicitud

Required input fields (extract from the document or ask the user):

| Field | Example | Required? |
|---|---|---|
| Paciente (nombre, tipo doc, número) | María Pérez · CC · 1234567890 | Yes |
| EPS | Sanitas, Sura, Compensar… | Yes |
| Régimen | Contributivo / Subsidiado | Yes |
| IPS solicitante | Clínica Marly | Yes |
| Servicio solicitado | CUPS o nombre del medicamento + CUM | Yes |
| Cantidad / frecuencia / duración | 30 tabletas, 1 vez/día, 30 días | Yes |
| Diagnóstico (CIE-10) | E11.9 (DM2 sin complicaciones) | Yes |
| Justificación clínica | Texto del médico tratante | Yes |
| Médico tratante (nombre + RM) | Dr. X, RM 12345 | Yes |
| Estado de autorización previa | Primera vez / continuación | Conditional |

### 2. Coverage classification — run these checks in order

**Check A — PBS inclusion.** Validate the CUPS code (use `cups-lookup`) or CUM code. Cross-reference against the current PBS (Resolución 2366 de 2023 + actualizaciones). Outcomes:
- **Incluido en PBS:** proceed.
- **Excluido por Resolución 244/2019:** reject with causal "Servicio expresamente excluido del PBS — Art. 154 Ley 100, Resolución 244/2019".
- **No-PBS (no excluido pero no incluido):** required vía **MIPRES** prescription. If MIPRES exists → proceed; if not → reject with causal "Requiere prescripción MIPRES" and indicate the IPS must use the MIPRES platform.

**Check B — pertinencia clínica vs GPC.** Use `gpc-minsalud-lookup` to find the relevant GPC for the CIE-10 diagnosis. Compare the requested service against the GPC recommendation:
- **Conforme con GPC:** strong support for autorización.
- **No conforme con GPC:** flag for medical review. Possible causal: "No corresponde a la línea de manejo recomendada por GPC <id> Recomendación <n>".
- **GPC no disponible para esta condición:** rely on contract + clinical judgment; mark `evidence_level: low` in the output.

**Check C — contrato EPS-IPS.** The service must be in the contracted services list between this specific EPS and IPS, at the agreed tarifa (manual ISS / SOAT / propio). Causal if not: "Servicio no incluido en contrato EPS-IPS — derivación a red autorizada".

**Check D — autorizaciones previas y duplicidad.** Check whether the same patient + service was already authorized recently (avoid double-billing). For chronic medications, validate that prior dispensaciones were claimed.

**Check E — comité técnico-científico (CTC).** Some services require CTC approval before EPS can authorize:
- Servicios de alto costo no incluidos en PBS.
- Tratamientos experimentales o de uso compasivo.
- Solicitudes que ya fueron negadas previamente (re-solicitud).

If CTC is required and no CTC acta is attached → return decision `pending_ctc` with required documentation list.

### 3. Emit the decision

Write the decision to `decision.json` with this schema:

```json
{
  "solicitud_id": "PA-2026-001234",
  "paciente": { "tipo_doc": "CC", "numero": "1234567890" },
  "decision": "autorizado | autorizado_con_condiciones | negado | pendiente_ctc | pendiente_mipres",
  "servicio": { "cups_o_cum": "...", "cantidad_solicitada": 30, "cantidad_autorizada": 30 },
  "vigencia_autorizacion_dias": 30,
  "causal": null,
  "fundamento_normativo": [
    "Resolución 2366 de 2023 (PBS)",
    "GPC-2013-13 Recomendación 4.2.1 (HTA)"
  ],
  "evidencia": {
    "cups_validado": true,
    "incluido_pbs": true,
    "conforme_gpc": true,
    "en_contrato": true,
    "requiere_ctc": false,
    "requiere_mipres": false
  },
  "observaciones": "...",
  "auditor": "automated:prior-authorization-review",
  "fecha_decision": "2026-05-05"
}
```

### 4. Draft the comunicado de respuesta

When the user asks for the formal response letter, generate a Colombian-format comunicado addressed to the IPS, signed by the EPS authorization office. Include:
- Encabezado con datos de paciente y servicio.
- Decisión (autorizado / negado / condiciones).
- Causal y fundamento normativo (literal de la resolución / GPC).
- Vigencia de la autorización (si aplica).
- Vía para apelar la decisión (si negado).

Save to `comunicado.md` in the working directory.

## Pitfalls

- **Síntoma:** Solicitud con CUPS válido pero rechazada por "no PBS". **Causa:** El CUPS está vigente pero el procedimiento fue excluido del PBS (las dos listas no están sincronizadas). **Fix:** PBS inclusion is the source of truth, not CUPS validity. Cross-check both.

- **Síntoma:** Médico tratante sin RM válido. **Causa:** Algunos médicos rurales o residentes firman bajo supervisión y omiten el RM. **Fix:** Reject with causal "Prescripción debe estar firmada por profesional con Registro Médico vigente — Art. 19 Ley 14/1962". Re-radicar.

- **Síntoma:** MIPRES emitido por médico sin habilitación específica. **Causa:** MIPRES de medicamentos de alto costo requiere especialidad afín. **Fix:** Validar especialidad del prescriptor contra el grupo terapéutico antes de aceptar.

- **Síntoma:** Solicitud justificada con un GPC, pero el GPC fue actualizado y la versión citada está superseded. **Causa:** Médico tratante usó la GPC vigente cuando entrenó. **Fix:** Use `gpc-minsalud-lookup` always with the **most recent** version. Communicate the update gently in the comunicado.

- **Síntoma:** "Negado por no estar en contrato" pero el contrato sí lo incluye. **Causa:** Lectura del manual contractual incorrecta — algunos servicios están en anexos modificados que no se cargaron al sistema. **Fix:** Validar contra el contrato vigente firmado, no la copia en el sistema. Pedir la última modificación contractual al área de contratación.

- **Síntoma:** Alta cantidad de pre-auths "automáticas" pasan, pero al auditar después aparecen glosas. **Causa:** Pre-auth solo valida pertinencia formal — no detecta upcoding ni servicios no prestados. **Fix:** Pre-auth y audit son complementarios; no se reemplazan.

- **Síntoma:** Paciente con tutela activa recibió negación. **Causa:** Tutela no fue capturada en el sistema de PA. **Fix:** Antes de negar, consultar la base de tutelas vigentes. Una tutela activa override PBS para los servicios cubiertos por la sentencia.

## Verification

- Output expected: a `decision.json` matching the schema in step 3, plus optionally a `comunicado.md`.
- Validation: every `causal` must reference at least one entry in `fundamento_normativo`.
- Sanity check: `decision == "negado"` ⟹ `causal != null`. `decision == "autorizado"` ⟹ `causal == null`.
- A decision should be reproducible — re-running the skill on the same input must produce the same `decision`, `causal`, and `fundamento_normativo`.

## References

- Resolución 2366 de 2023 — Plan de Beneficios en Salud actualizado.
- Resolución 244 de 2019 — Servicios y tecnologías excluidos.
- MIPRES (Mi Prescripción) — https://mipres.minsalud.gov.co
- Resolución 5395 de 2013 — comités técnico-científicos.
- Sister skills: `cups-lookup`, `icd10-lookup`, `gpc-minsalud-lookup`, `medical-invoice-medical-audit`.
