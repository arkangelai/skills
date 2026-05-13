# Ejemplo de correo de glosa EPS→IPS

## Señales de clasificación positiva

Un correo de glosa típico tiene al menos 2 de estas señales:

**En el asunto:**
- "Notificación de glosas – Contrato CTO-2024-0087 – Mayo 2026"
- "Glosas radicadas – Clínica del Country – Abril 2026"
- "Devolución técnica No. DT-2026-00441"
- "Objetación de cuentas médicas – Factura FC-982144"

**En el remitente:**
- `cuentasmedicas@eps-sura.com.co`
- `glosas@compensar.com`
- `auditoria@sanitas.com.co`

**En el adjunto:**
- Archivo `.xlsx` o `.csv` con columnas como: `NUM_GLOSA`, `NUM_FACTURA`, `CUPS`, `CAUSAL`, `VALOR_GLOSADO`, `MOTIVO`

## Señales de exclusión (no es una glosa para este skill)

- Factura ordinaria enviada por una IPS a una EPS (esa es `medical-invoice-gmail-intake`)
- Respuesta de la EPS a una glosa ya radicada (flujo de subsanación, no intake)
- Correo sin adjunto Excel/CSV
- Autorizaciones o pre-autorizaciones de servicios

## Gmail labels aplicados

| Resultado | Label aplicado |
|---|---|
| Glosa procesada | `hospital-devolucion/intake` + `hospital-devolucion/batch-{BATCH_ID}` |
| No es una glosa | `hospital-devolucion/not-applicable` |
| Error en procesamiento | `hospital-devolucion/error` |
| Ya procesado (duplicado) | `hospital-devolucion/intake` (si faltaba) |
