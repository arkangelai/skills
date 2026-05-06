---
name: legal-kit
description: Build the legal package for any Arkangel deal — service agreement, data processing addendum (Hab. Datos Colombia / GDPR / HIPAA BAA depending on jurisdiction and data type), SLA annex, and the redline map showing which clauses we'll likely negotiate. Compartment 6 of the Arkangel sales submarine.
---

# Legal Kit

Compartment 6 of the Arkangel sales submarine. Legal is where deals go to age slowly — every day counts. The job: pre-package the contract + data agreement + SLA annex calibrated to the prospect's jurisdiction and the data sensitivity, plus an internal map of the clauses they'll redline.

## When to Use

- Procurement (compartment 5) cleared — moving to legal review.
- The owner says "prepara contrato + DPA para X" or "qué pasa con los datos de pacientes en este deal".
- Legal del cliente envió un MSA o template y necesitamos responder.

**Do not use** for security questionnaires (use `security-kit`), for procurement vendor forms (use `procurement-kit`), or for grant / non-commercial agreements.

## Inputs

- **Required:** prospecto + jurisdicción del cliente (CO, MX, US, EU, etc.) + tipo de datos que se procesarán (PHI clínico, PII, datos sensibles no-clínicos, datos no sensibles).
- **Optional:** template MSA del cliente, redlines previos, condiciones especiales acordadas en compartimento 4.

## Procedure

1. **Determine the legal stack required.**

   | Combinación | Documentos requeridos |
   |---|---|
   | CO + datos sensibles (PHI, PII) | MSA + Hab. Datos Colombia (Ley 1581 / Decreto 1377) + SLA annex |
   | CO + datos no sensibles | MSA + cláusula de tratamiento de datos en MSA + SLA annex |
   | EU + cualquier dato personal | MSA + DPA GDPR + SCCs si hay transferencia internacional + SLA annex |
   | US + healthcare PHI | MSA + BAA HIPAA + Security Addendum + SLA annex |
   | US + non-healthcare | MSA + DPA + SLA annex |
   | LATAM (MX, CL, PE, AR) | MSA + DPA local correspondiente + SLA annex |

   Si la combinación no está en la tabla, frena y pregunta al equipo legal Arkangel. No improvises.

2. **Build the MSA / Service Agreement.**
   - Partes, objeto, término (default 12 meses con renovación automática), pago.
   - Alcance de servicios (referencia al SOW / propuesta validada en compartimento 4).
   - Niveles de servicio (referencia al SLA annex).
   - Limitación de responsabilidad: típicamente capped al valor pagado en los últimos 12 meses.
   - Confidencialidad mutua, IP (Arkangel mantiene IP del producto, cliente mantiene sus datos).
   - Terminación: por incumplimiento con cura de 30 días, por conveniencia con notificación de 60 días.
   - Ley aplicable y resolución de disputas según jurisdicción.

3. **Build the DPA / Hab. Datos / BAA correspondiente.**
   - **CO (Hab. Datos):** finalidades del tratamiento, categorías de titulares, transferencia internacional, retención, derechos del titular, medidas de seguridad técnicas.
   - **EU (DPA GDPR):** roles (controller / processor), Art. 28, sub-procesadores, breach notification 72h, DPIA support, SCCs si datos salen del EEE.
   - **US healthcare (BAA HIPAA):** permitted uses, safeguards (Administrative / Physical / Technical), breach notification, sub-contractors, return/destruction of PHI on termination.
   - Lista de sub-procesadores (Vercel, Supabase, OpenAI, Anthropic, Google, etc.) con país y propósito.

4. **Build the SLA annex.**
   - Disponibilidad: 99,5 % uptime mensual standard; 99,9 % en tier premium si el cliente lo pidió.
   - Tiempos de respuesta: L1 en 4 horas hábiles, L2 en 24 horas, L3 / hotfix por SLA específico.
   - Mantenimientos planeados: ventana definida + notificación previa.
   - Penalizaciones: créditos de servicio según fórmula estándar (no descuentos de cash).
   - Exclusiones: causas externas, modificaciones por el cliente, fuerza mayor.

5. **Map the likely redlines.**
   - Limitación de responsabilidad: clientes enterprise pedirán uncapped en ciertos casos (data breach por culpa de Arkangel). Postura: capped en 12 meses excepto incumplimiento doloso o data breach por negligencia grave.
   - Indemnidad por IP de terceros: aceptada con cap.
   - Audit rights: aceptados con notificación previa, costo del cliente, no más de 1 vez al año.
   - Sub-procesadores: notificación 30 días antes de cambio, derecho a objetar.
   - Data residency: especificar si el cliente exige LATAM-only; podría requerir setup adicional.
   - Termination for convenience: aceptada con notificación + pago pro-rata.

6. **Output structure.**

   ```markdown
   # Legal Kit — <Empresa> · Jurisdicción: <CO / EU / US>

   ## Stack legal aplicable
   <lista de documentos requeridos según jurisdicción + datos>

   ## 1. MSA
   <referencia a template + variables del deal>

   ## 2. DPA / Hab. Datos / BAA
   <referencia a template + lista de sub-procesadores>

   ## 3. SLA annex
   <disponibilidad, tiempos, penalizaciones, exclusiones>

   ## 4. Redlines anticipados
   - <cláusula → postura Arkangel → margen de negociación>
   - mínimo 6 redlines mapeados

   ## 5. Escalaciones requeridas
   - <ítems que requieren aprobación legal Arkangel antes de firmar>

   ## 6. Próximo paso
   <quién manda qué a quién, fecha objetivo>
   ```

7. **Update Attio.**
   - Adjuntar paquete legal.
   - Notar fecha de envío.
   - `pipeline_stage = 7.security` cuando legal del cliente confirme aprobación o redlines manejables.

## Pitfalls

- **Síntoma:** se firma BAA HIPAA cuando el deal no procesa PHI. **Causa:** copy-paste del legal-kit anterior. **Fix:** mapear stack según jurisdicción **+ tipo de datos**, no solo país.
- **Síntoma:** se acepta limitación de responsabilidad uncapped sin escalar. **Causa:** comercial quiso destrabar el deal. **Fix:** uncapped es escalación obligatoria a CEO/CFO Arkangel; el skill marca el campo y no lo cierra.
- **Síntoma:** SLA promete 99,99 % sin que la arquitectura lo soporte. **Causa:** match al pedido del cliente. **Fix:** 99,5 % es standard; 99,9 % requiere validación con Eng; > 99,9 % es escalación. Sin validación, no se ofrece.
- **Síntoma:** sub-procesadores listados de manera incompleta. **Causa:** se olvidó alguno. **Fix:** la lista debe incluir Vercel, Supabase, los providers de LLM (OpenAI, Anthropic, Google), Stripe, y cualquier proveedor con acceso a datos del cliente. Un cliente que descubre un sub-procesador no listado puede romper contrato.
- **Síntoma:** redlines anticipados no se cumplen porque el cliente trajo otros distintos. **Causa:** el mapping fue genérico, no calibrado al sector del cliente. **Fix:** revisar redlines previos del sector (banca pide más uncapped, healthcare pide más privacidad, gobierno pide más auditoría).

## Verification

- El stack legal coincide con jurisdicción + tipo de datos en la tabla del paso 1.
- Los sub-procesadores listados son completos y reflejan la stack real.
- El SLA propuesto está dentro de lo que la arquitectura soporta.
- Los redlines anticipados son específicos al sector / tamaño del cliente, no genéricos.
- Las escalaciones requeridas están explícitamente marcadas.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`procurement-kit`](../procurement-kit/) — compartimento previo.
- [`security-kit`](../security-kit/) — siguiente compartimento.
- [`postcall-recap`](../postcall-recap/) — para registrar redlines acordados durante negociación.
