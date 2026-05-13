# Índice de Skills Médicos — Arkangel AI

Skills disponibles para demos y flujos de **auditoría médica** colombiana (EPS/IPS). Organizados por categoría funcional.

---

## 1. Codificación y catálogos clínicos

### `cups-lookup`
**Qué hace:** Consulta el catálogo oficial CUPS 2026 (Resolución 2706/2025, MinSalud). Valida códigos de procedimiento, busca por descripción o keyword, lista códigos por sección. CLI local sobre Node 18+, sin dependencias externas.

**Cuándo usarlo en demo:**
- Mostrar validación de CUPS antes de radicar una factura
- Demostrar búsqueda de código para un procedimiento descrito en texto libre
- Parte del flujo de auditoría administrativa o médica (valida que los CUPS facturados existan en el catálogo vigente)

---

### `icd10-lookup`
**Qué hace:** Consulta el código set ICD-10-CM FY2026 (CMS/NCHS, dominio público). Valida códigos de diagnóstico, verifica si son billables, lista hijos de una categoría, busca por keyword clínico, y detecta relaciones de par entre dos códigos (useAdditional, codeFirst, excludes). CLI local sobre Node 18+.

**Cuándo usarlo en demo:**
- Validar que el CIE-10 facturado es billable y no es solo un código cabecera
- Descubrir códigos compañeros obligatorios que el IPS omitió (ej. insulina para E11)
- Detectar inconsistencias de códigos en una cuenta médica

---

### `gpc-minsalud-lookup`
**Qué hace:** Recupera y cita Guías de Práctica Clínica (GPC) publicadas por MinSalud e IETS. Busca la GPC por condición o CIE-10, extrae recomendaciones numeradas con graduación GRADE y fuente trazable.

**Cuándo usarlo en demo:**
- Defender o atacar pertinencia clínica con evidencia de la GPC colombiana
- Mostrar que un procedimiento no sigue la recomendación GPC vigente (causal de glosa 2)
- Responder glosas con cita explícita: "GPC-2013-13 Recomendación 4.2.1 — Fuerza: fuerte a favor"

---

## 2. Pipeline de auditoría de facturas médicas (aseguradora → EPS)

El pipeline tiene 9 skills en secuencia. El orquestador los coordina; en demos se puede mostrar cada uno individualmente.

```
Intake (Gmail / Portal) → Document Understanding → Admin Audit
                                                  → Medical Audit    → Consolidator → Fix Review → Claim Denial Generator → Gmail Sender
                                                  → Financial Audit
```

### `medical-invoice-gmail-intake`
**Qué hace:** Skill 1. Vigila una bandeja Gmail con `gogcli`, clasifica emails como facturas médicas, descarga adjuntos, extrae metadatos (DIAN XML > RIPS > PDF > envelope), y crea una tarea en el sistema de auditoría.

**Cuándo usarlo en demo:**
- Mostrar cómo entra una factura de IPS al sistema sin intervención humana
- Demostrar extracción automática de NIT, número de factura y diagnóstico desde el correo
- Arranque end-to-end del pipeline ante un cliente que recibe facturas por email

---

### `medical-invoice-portal-intake`
**Qué hace:** Skill 1 alternativo. Usa Playwright para hacer login en el portal mock (`portal-facturas-ark.vercel.app`), leer submissions pendientes, descargar archivos y crear tareas de auditoría.

**Cuándo usarlo en demo:**
- Demo visual con portal web en lugar de Gmail (más fácil de mostrar en pantalla)
- Prueba end-to-end del pipeline sin necesidad de una bandeja real
- Mostrar integración con portales externos como los que usan algunas EPS

---

### `medical-invoice-document-understanding`
**Qué hace:** Skill 0 (corre antes que los tres auditores). Lee todos los documentos del caso, los clasifica por contenido (no por nombre), extrae hechos estructurados (paciente, fechas, diagnósticos, procedimientos, medicamentos, firmas, autorizaciones), verifica consistencia cruzada entre documentos, y genera `case_evidence.json`.

**Cuándo usarlo en demo:**
- Mostrar extracción automática de datos desde PDFs clínicos heterogéneos
- Demostrar detección de inconsistencias: nombre del paciente diferente en HC vs factura
- Explicar por qué el sistema no necesita que los documentos se llamen de una forma específica

---

### `medical-invoice-admin-audit`
**Qué hace:** Auditor administrativo. Evalúa ~27 reglas DAMA-UK sobre identidad del paciente, contrato IPS-EPS, estructura RIPS, factura DIAN, autorización previa, historia clínica firmada y oportunidad de radicación. Genera `admin_checklist_output.json`.

**Cuándo usarlo en demo:**
- Mostrar verificación automática de los requisitos formales de una cuenta médica
- Demostrar detección de "autorización no cubre el CUPS facturado" o "NIT diferente en RIPS vs factura"
- Flujo: si hay fallo crítico administrativo → devolución antes de auditar clínica y financiera

---

### `medical-invoice-medical-audit`
**Qué hace:** Auditor médico/clínico. Evalúa ~29 reglas PERT-CLIN sobre pertinencia clínica: diagnóstico CIE-10 válido, adherencia a GPC, ordenes médicas firmadas por profesional con RETHUS, pertinencia de procedimientos y medicamentos, justificación de estancia hospitalaria, epicrisis completa. Genera `medical_checklist_output.json`. Soporta perspectiva `aseguradora` (glosas) y `hospital` (autoauditoría preventiva).

**Cuándo usarlo en demo:**
- Mostrar cómo el sistema detecta que un procedimiento no sigue la GPC
- Demostrar verificación de días de hospitalización vs criterios clínicos documentados
- Caso de autoauditoría: el hospital revisa su propia cuenta antes de radicarla

---

### `medical-invoice-financial-audit`
**Qué hace:** Auditor financiero y antifraude. Evalúa ~42 reglas FIN-CTR: contrato activo, plan del afiliado, tarifario correcto (ISS 2001 / SOAT / contractual), liquidación con sobretarifas y reglas de acceso quirúrgico, paquetes vs eventos, límites de cobertura, copagos, y 14 reglas de antifraude (numeración DIAN, doble cobro, estancias superpuestas, servicios post-mortem, upcoding, unbundling). Genera `financial_checklist_output.json`.

**Cuándo usarlo en demo:**
- Demostrar detección de sobretarifa: "CUPS 890201 esperado $85.000; cobrado $120.000; delta 41%"
- Mostrar reglas antifraude: mismo paciente con dos hospitalizaciones simultáneas
- Validar que el tarifario contractual es el que se aplica, no el ISS genérico

---

### `medical-invoice-consolidator-audit`
**Qué hace:** Skill 5. Une los tres checklists de auditoría, agrupa hallazgos por ítem de factura (CUPS + fecha), asigna causal del Anexo 6 (Resolución 3047/2008) a cada hallazgo por severidad, calcula totales y determina `concepto_final` (APTA / NO_APTA) y si aplica devolución. Genera `output.json`.

**Cuándo usarlo en demo:**
- Mostrar el dictamen consolidado: "Factura con 3 glosas por $1.800.000 (21% del total)"
- Explicar cómo el sistema asigna causales Res. 3047 sin ambigüedad
- Punto de entrada para el demo del flujo completo antes de generar el PDF

---

### `medical-invoice-fix-review`
**Qué hace:** Skill 6. Lee comentarios del auditor humano en `comments.json`, interpreta la intención (modificar hallazgo, agregar, eliminar, cambiar causal, ajustar valor, aprobar), aplica cambios a `output.json` con JSON Patch, y gestiona etiquetas del flujo hasta que el auditor aprueba con `claim-denial-ready`.

**Cuándo usarlo en demo:**
- Mostrar el flujo de revisión humana: el auditor senior ajusta un monto y el sistema re-calcula totales
- Demostrar trazabilidad: cada cambio queda en `audit-log.json` con autor y timestamp
- Explicar cómo se controla que solo un auditor (no el bot) pueda aprobar el envío

---

### `medical-invoice-claim-denial-generator`
**Qué hace:** Skill 7. Genera el PDF formal de glosa (claim denial) con encabezado institucional, resumen ejecutivo, tabla de hallazgos por causal Res. 3047, justificación legal y clínica con evidencia citada, y pie de respuesta con plazo de 15 días hábiles. Soporta versiones incrementales (v1, v2, ...).

**Cuándo usarlo en demo:**
- Mostrar el PDF de glosa generado automáticamente listo para enviar al IPS
- Destacar que cada hallazgo tiene cita de archivo + página + texto literal
- Comparar v1 vs v2 después de una revisión humana para mostrar trazabilidad

---

### `medical-invoice-claim-denial-gmail-sender`
**Qué hace:** Skill 8 (final). Envía la glosa aprobada al IPS por Gmail usando `gogcli`, adjunta el PDF, mantiene el hilo del correo original de radicación, y registra la entrega en `delivery-log.json`. Marca el caso como `claim-denial-sent`.

**Cuándo usarlo en demo:**
- Mostrar el cierre del pipeline: desde email de entrada hasta glosa enviada de vuelta al IPS
- Demostrar trazabilidad end-to-end: el caso queda con fechas, IDs y SHA256 del PDF enviado
- Explicar el plazo legal de 15 días hábiles (Art. 6 Res. 3047/2008) que se activa al enviar

---

## 3. Auditoría desde el lado del hospital (IPS)

### `hospital-devolucion-batch-parse`
**Qué hace:** Lee el Excel/CSV de glosas que la EPS envió a la IPS y crea **una task hija por cada fila** (una glosa = un ítem). Sin agrupación por `num_documento`. Encadena con `hospital-devolucion-audit` aguas abajo.

### `hospital-devolucion-audit`
**Qué hace:** Agente de respuesta a UNA glosa (un ítem objetado por la EPS). Aplica el instrumento correspondiente según la causal (DAMA-UK / PERT-CLIN / FIN-CTR) y emite `glosa-response.json` con el veredicto (`disputar` o `aceptar`), las reglas aplicadas, la argumentación y el split de valor (`valor_a_defender` + `valor_a_aceptar`).

**Cuándo usarlo en demo:**
- Mostrar Salmona trabajando **para el hospital**, no para la EPS
- Demo: IPS recibe glosa de $5M, Salmona defiende $3.8M y acepta $1.2M con argumentación trazable
- Explicar cómo el mismo framework de reglas sirve para atacar y para defender

---

### `hospital-preventiva-subbilling`
**Qué hace:** Detecta subfacturación en hospitalizaciones colombianas. Cruza la historia clínica (epicrisis, nota quirúrgica, kardex de medicamentos, laboratorio) contra el detalle de la factura e identifica servicios documentados que no fueron cobrados. Produce `output_subbilling.json` con hallazgos, CUPS sugeridos, certeza (alto/medio/bajo) y monto estimado por hallazgo en COP.

**Cuándo usarlo en demo:**
- Mostrar que Salmona no solo glosa sino que ayuda al hospital a **recuperar ingresos perdidos**
- Demo: factura de colecistectomía → "se documentaron 5 servicios sin facturar por $835.000 estimados"
- Explicar el caso de uso preventivo: el hospital revisa su propia factura **antes** de radicarla

---

## 4. Documentación clínica

### `clinical-report-writer`
**Qué hace:** Genera documentos clínicos colombianos formales: epicrisis, evolución diaria, nota operatoria, resumen de egreso, historia clínica de ingreso, interconsulta. Sigue Resolución 1995/1999 y el formato que esperan los auditores de EPS. Valida CIE-10 y CUPS en el output.

**Cuándo usarlo en demo:**
- Mostrar que Salmona no solo audita sino que ayuda al IPS a documentar bien
- Demo: médico pega notas crudas → Salmona genera epicrisis lista para auditoría
- Explicar cómo una epicrisis bien estructurada previene glosas antes de que ocurran

---

### `patient-document-simplifier`
**Qué hace:** Traduce documentos médicos colombianos (glosas, epicrisis, recetas MIPRES, resultados de laboratorio, comunicados de pre-autorización, fallos de tutela) a lenguaje claro y digno para pacientes. Sin jerga, sin consejo médico, con acciones concretas y disclaimer.

**Cuándo usarlo en demo:**
- Mostrar el caso de uso de accesibilidad: una EPS que quiere darle al paciente una versión legible de su glosa
- Demo: pegar epicrisis densa → obtener resumen en lenguaje cotidiano con "qué hacer ahora"
- Diferenciador ante clientes del sector salud con énfasis en experiencia del paciente

---

## 5. Pre-autorización

### `prior-authorization-review`
**Qué hace:** Revisa solicitudes de pre-autorización de EPS colombianas. Valida inclusión en PBS, pertinencia vs GPC, cobertura contractual EPS-IPS, duplicidad, y si requiere Comité Técnico-Científico (CTC). Emite decisión estructurada (autorizado / negado / condicional) con causal y fundamento normativo, y genera comunicado de respuesta.

**Cuándo usarlo en demo:**
- Mostrar la capa preventiva: Salmona decide **antes** de que se preste el servicio
- Demo: EPS recibe solicitud de medicamento no-PBS → sistema detecta que necesita MIPRES
- Explicar cómo pre-auth y auditoría post-pago son complementarios en el mismo producto

---

## 6. Extracción de entidades médicas

### `medical-entity-extractor`
**Qué hace:** Extrae entidades médicas estructuradas (síntomas, medicamentos, valores de laboratorio, diagnósticos, signos vitales, acciones requeridas) desde mensajes de pacientes en texto libre. Diseñado para integrarse con colas de mensajes priorizados.

**Cuándo usarlo en demo:**
- Mostrar extracción automática desde notas de enfermería o mensajes de pacientes
- Integración en flujos de triaje o monitoreo de pacientes
- Componente de preprocesamiento antes de `patient-document-simplifier` o auditoría clínica

---

## 7. Búsqueda de evidencia clínica

### `pubmed-search`
**Qué hace:** Busca literatura biomédica en PubMed (NCBI E-utilities) sin scraping. Retorna citas estructuradas (PMID, autores, journal, año, abstract, DOI). Soporta queries con field tags MeSH, filtros por tipo de publicación (RCT, systematic review) y fecha.

**Cuándo usarlo en demo:**
- Mostrar cómo el agente de glosas busca evidencia para defender una decisión clínica
- Demo: `hospital-devolucion-audit` cita un Cochrane review para defender una hospitalización
- Explicar que la auditoría de Salmona está respaldada por literatura peer-reviewed, no solo por reglas

---

## 8. Ventas y cualificación (dominio de salud)

### `qualify-dolor`
**Qué hace:** Compartimento 1 del submarino de ventas Arkangel. Valida dolor, presupuesto y tomadores de decisión en una primera reunión con un prospecto. Retorna GO / NO-GO / PENDING con razonamiento explícito y actualiza Attio.

**Cuándo usarlo en demo:**
- Demo del proceso de ventas interno de Arkangel con un prospecto de EPS o IPS
- Mostrar cómo el agente acompaña al comercial en tiempo real durante una reunión de discovery
- No es un skill de la plataforma Salmona sino del proceso comercial de Arkangel

---

### `diagnose-dolor`
**Qué hace:** Compartimento 2. Ejecuta el funnel de dolor en 5 niveles (síntoma → impacto operativo → impacto financiero → impacto personal → costo de no hacer nada), cuantifica el dolor en dinero, mapea la línea de compra y produce el Dx Document que el champion puede compartir internamente.

**Cuándo usarlo en demo:**
- Continuación natural después de `qualify-dolor` cuando el prospect calificó
- Mostrar cómo Salmona ayuda al equipo de ventas a estructurar el caso de negocio del cliente
- Genera artefacto editable que el champion puede presentar a su CFO

---

### `pain-quantifier`
**Qué hace:** Convierte números que dio el prospecto en un rango monetario defensible (low / mid / high) con fórmulas específicas por categoría: glosas, búsqueda médica, extracción de records, autorizaciones, errores de codificación, eficiencia clínica. Incluye análisis de sensibilidad y supuestos explícitos.

**Cuándo usarlo en demo:**
- Parte del flujo de `diagnose-dolor` cuando hay números concretos del prospecto
- Mostrar que el equipo no infla el dolor sino que lo cuantifica honestamente con supuestos trazables
- Genera el "número del champion": frase one-liner que el comprador puede repetir internamente

---

## 9. Modelos de ML clínico

### `screening-model-trainer`
**Qué hace:** Entrena modelos de tamizaje clínico binario (CKD, diabetes, HTA, COPD, etc.) sobre datos tabulares de EHR, siguiendo TRIPOD+AI. Incluye benchmarks con TabPFN, transfer learning desde NHANES/MIMIC, comparación con scores publicados (KFRE, FINDRISC, PUMA), validación LOIO + bootstrap CI, y materiales cliente (deck HTML + 1-pager).

**Cuándo usarlo en demo:**
- Mostrar capacidad de ML clínico de Arkangel para proyectos de detección temprana
- Demo: dataset de EHR → modelo calibrado con card TRIPOD-AI y análisis de thresholds operativos
- Diferenciador ante clientes (EPS, IPS grandes) que quieren modelos propios, no solo auditoría

---

### `attrition-model-trainer`
**Qué hace:** Entrena modelos de retención/attrition de personal (SST/HR) end-to-end. Multiclass reformulation, ICL noise handling, TabPFN benchmark, validación sliding-window OOT, calibración auditada, hybrid ML+rules, materiales cliente. Contraparte clínica: `screening-model-trainer`.

**Cuándo usarlo en demo:**
- Proyectos de salud ocupacional: predecir qué empleados van a retirarse (EPS, clínicas grandes)
- Mostrar capacidad ML más allá de auditoría: retención de talento médico
- Clientes que tienen datos de SST y quieren convertirlos en modelos predictivos

---

## Resumen rápido para demos

| Skill | Qué muestra en 30 segundos |
|---|---|
| `cups-lookup` | Buscar CUPS de un procedimiento en lenguaje natural → código oficial |
| `icd10-lookup` | Validar CIE-10 y descubrir códigos compañeros obligatorios |
| `gpc-minsalud-lookup` | Citar GPC colombiana con número de recomendación y fuerza de evidencia |
| `medical-invoice-document-understanding` | Leer documentos clínicos mezclados → hechos estructurados en segundos |
| `medical-invoice-admin-audit` | 27 reglas administrativas → checklist APTA / NO_APTA con evidencia trazable |
| `medical-invoice-medical-audit` | 29 reglas clínicas → pertinencia vs GPC, nota operatoria, estancia justificada |
| `medical-invoice-financial-audit` | 42 reglas financieras + antifraude → sobretarifa con cálculo explícito |
| `medical-invoice-consolidator-audit` | Tres auditorías → dictamen único con causal Res. 3047 y monto a glosar |
| `medical-invoice-claim-denial-generator` | Dictamen → PDF de glosa formal listo para enviar |
| `hospital-devolucion-batch-parse` | Excel de glosas EPS → N tasks hijas (una por glosa = un ítem) |
| `hospital-devolucion-audit` | Una glosa → respuesta argumental (disputar/aceptar) con valor a defender y a aceptar |
| `hospital-preventiva-subbilling` | Historia clínica + factura → servicios no cobrados con monto estimado en COP |
| `prior-authorization-review` | Solicitud de pre-autorización → decisión con fundamento normativo |
| `clinical-report-writer` | Notas crudas del médico → epicrisis auditable lista para radicar |
| `patient-document-simplifier` | Glosa o epicrisis densa → versión legible para el paciente |
| `pubmed-search` | Defensa clínica → citas PubMed de Cochrane reviews y RCTs |
| `screening-model-trainer` | Dataset EHR → modelo de tamizaje calibrado con materiales cliente |
