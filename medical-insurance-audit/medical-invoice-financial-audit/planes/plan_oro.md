# Plan Oro

**plan_id:** ORO
**nombre_comercial:** Plan Oro Integral
**vigencia:** 2026-01-01 — 2026-12-31
**pagador:** EPS (Régimen Contributivo + complementario)

## Descripción

Plan premium con red preferente, cobertura total del PBS y ampliada para no-PBS, habitación individual y sin carencias para preexistencias. Dirigido a afiliados con IBC alto y cotización voluntaria complementaria.

## Coberturas

### Hospitalización

- **Habitación:** individual
- **Estancia general:** 100 %
- **UCI adulto/pediátrica/neonatal:** 100 %, sin tope de días
- **UCE:** 100 %
- **Estancia adicional a paquete:** cubierta con justificación clínica documentada en evolución
- **Acompañante:** 1 cama en habitación individual sin costo adicional

### Consultas

- **Medicina general:** 100 %
- **Especializada primera vez:** 100 %
- **Subespecializada:** 100 %
- **Interconsulta hospitalaria:** 100 %
- **Red:** preferente (ver `contratos_ips.json`). Red complementaria con autorización.
- **Autorización previa:** no requerida para primera vez; no requerida para control postquirúrgico.

### Ayudas diagnósticas

- **Baja/mediana complejidad:** 100 %
- **Alta complejidad (TC, RM, ecografía doppler, medicina nuclear):** 100 %
- **Autorización previa:** no requerida
- **Excepciones que requieren MIPRES:** PET-CT, estudios genómicos complejos, estudios de precisión oncológica

### Procedimientos quirúrgicos

- **Cobertura:** 100 %
- **Implantes y dispositivos:** cubiertos con trazabilidad INVIMA (registro sanitario, lote, sticker)
- **Cirugía bariátrica:** cubierta con comité multidisciplinario (IMC ≥35 + comorbilidad o IMC ≥40)
- **Cirugía estética reparadora post-trauma u oncológica:** cubierta

### Medicamentos

- **PBS:** 100 %
- **No-PBS con MIPRES:** 100 % del valor reconocido por el pagador
- **Alto costo (oncológicos, biológicos, huérfanos):** 100 % con junta técnica científica previa
- **Ambulatorio crónico (formulario del plan):** 100 %

### Salud mental

- **Hospitalización psiquiátrica:** 100 %, sin tope de días si hay criterio clínico
- **Terapias individuales/grupales:** 100 %
- **Medicación psiquiátrica:** 100 %

### Rehabilitación

- **Fisioterapia, terapia ocupacional, fonoaudiología:** 100 %, ilimitada mientras haya progreso clínico
- **Rehabilitación cardíaca / pulmonar:** 100 %
- **Rehabilitación neurológica intensiva:** 100 % (incluye centros de referencia)

### Otros

- **Traslado asistencial:** básico y medicalizado, 100 %
- **Trasplantes:** cubiertos (riñón, hígado, médula, corazón) con comité de trasplantes
- **Diálisis:** 100 %
- **Maternidad integral:** 100 % desde el día uno de afiliación (sin carencia)

## Exclusiones

- Tratamientos estéticos no reparadores.
- Fertilidad asistida de alta complejidad más allá de 2 ciclos.
- Tratamientos experimentales sin respaldo científico.
- Medicamentos sin registro INVIMA.
- Servicios prestados por fuera del país sin pre-autorización.

## Topes anuales (COP)

| Concepto | Tope |
|---|---|
| Medicamentos no-PBS con MIPRES | Sin tope |
| Terapias físicas/ocupacionales | Sin tope (mientras haya progreso clínico) |
| Hospitalización (todos los niveles) | Sin tope |
| Salud mental hospitalaria | Sin tope |
| Traslados internacionales pre-autorizados | $120.000.000 |
| Tratamientos oncológicos (todos los servicios) | Sin tope |

## Períodos de carencia

| Servicio | Carencia |
|---|---|
| Preexistencias | 0 meses (cobertura inmediata) |
| Ortopedia electiva no traumática | 6 meses |
| Cirugía bariátrica | 12 meses |
| Fertilidad asistida | 12 meses |
| Maternidad | 0 meses |
| Atención domiciliaria de largo plazo | 6 meses |

## Copagos y cuotas moderadoras

- **Consulta externa:** $0
- **Hospitalización día:** $0
- **Ayudas diagnósticas:** $0
- **Medicamentos:** $0
- **Urgencias triage 4–5:** $18.500 (cuota moderadora estándar 2026)
- **Urgencias triage 1–3:** $0

## Exenciones automáticas de copago

- Gestantes.
- Menores de 5 años.
- Mayores de 65 años con enfermedad de alto costo.
- Víctimas del conflicto armado (certificadas).
- Pacientes en cuidados paliativos.
- Enfermedades huérfanas registradas.

## Reglas especiales para auditoría financiera

- Si `meta.plan_afiliado == "ORO"` → las reglas F20 (topes anuales) típicamente resultan `"n/a"` salvo traslado internacional.
- F21 (carencia) sólo se evalúa contra ortopedia electiva, cirugía bariátrica y fertilidad.
- F22 (preexistencias) siempre `"n/a"` en Plan Oro: no aplican.
- F25 (exención) debe verificarse contra las 6 condiciones arriba.
