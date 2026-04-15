---
name: eps-audit
description: Audita cuentas de cobro de EPS colombianas en formato RIPS contra Resolución 2175 de 2015 y sus modificatorias. Úsala cuando el usuario pide revisar glosas, validar códigos CUPS/CIE-10, detectar inconsistencias entre archivos RIPS (US, AF, AC, AP, AH, AM, AN, AT, AU), o estimar el valor glosable de una cuenta antes de radicarla.
version: 1.0.0
author: ejemplo@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, rips, eps, colombia]
    category: medical
    requires_toolsets: [terminal]
---

# EPS Audit — Revisión RIPS

Skill de ejemplo. Audita un paquete RIPS (conjunto de archivos planos que las IPS radican ante las EPS) antes de que el usuario lo envíe, para minimizar glosas.

## When to Use

- Cuando el usuario comparte una carpeta o ZIP con archivos RIPS (`US.txt`, `AF.txt`, `AC.txt`, `AP.txt`, `AH.txt`, `AM.txt`, `AN.txt`, `AT.txt`, `AU.txt`).
- Cuando pregunta "¿qué glosas probables tiene esta cuenta?" o "¿está lista para radicar?".
- Cuando menciona una resolución de la Supersalud, MinSalud, o un código de glosa específico.

## Procedure

1. **Inventario de archivos.** Lista los archivos del paquete y verifica que estén los que corresponden al tipo de atención facturada. `US` y `AF` son obligatorios siempre.

2. **Valida estructura de cada archivo.** Cada uno tiene un número fijo de columnas definidas en la Resolución 3374 de 2000 y sus modificaciones. Comando de ejemplo:
   ```bash
   awk -F',' '{print NF}' AC.txt | sort -u
   ```
   Si hay más de un valor, el archivo tiene filas con cantidad de columnas inconsistente.

3. **Cruza identificadores.** Cada `numFactura` en `AF.txt` debe aparecer en los archivos de detalle (`AC`, `AP`, `AH`, `AM`, `AN`, `AT`, `AU`). Cada usuario en detalle debe existir en `US.txt`.

4. **Valida códigos CUPS.** Todos los códigos de procedimiento en `AP.txt` y `AC.txt` deben existir en la tabla CUPS vigente. Flag los que no.

5. **Valida CIE-10.** Diagnósticos principal, relacionado y de complicación deben ser códigos CIE-10 válidos. Rechaza códigos de 3 dígitos cuando el CIE-10 exige 4.

6. **Calcula valor glosable.** Suma el valor de las filas con inconsistencias y repórtalo como % del valor total facturado.

7. **Genera reporte.** Formato markdown con: resumen ejecutivo, hallazgos por archivo, valor glosable estimado, acciones recomendadas.

## Pitfalls

- **Síntoma:** CUPS marcado como inválido aunque existe. **Causa:** tabla CUPS desactualizada (cambia anualmente). **Fix:** verifica que usas la versión vigente a la fecha de prestación, no a la fecha de radicación.
- **Síntoma:** cruces fallan por `numFactura`. **Causa:** IPS rellena con ceros a la izquierda en unos archivos y en otros no. **Fix:** normaliza quitando ceros antes de comparar.
- **Síntoma:** encoding roto en tildes y eñes. **Causa:** RIPS oficial usa ISO-8859-1, no UTF-8. **Fix:** `iconv -f ISO-8859-1 -t UTF-8 archivo.txt`.

## Verification

- Reporte final incluye las 4 secciones mencionadas.
- Valor glosable reportado es consistente con la suma manual de las filas flagged.
- Si el paquete pasa todas las validaciones, el reporte dice explícitamente "Listo para radicar" — nunca infieras ese estado si hubo hallazgos.

## References

- Resolución 3374 de 2000 — MinSalud (estructura RIPS).
- Resolución 2175 de 2015 — criterios de auditoría concurrente.
- Manual Único de Glosas, Devoluciones y Respuestas.
