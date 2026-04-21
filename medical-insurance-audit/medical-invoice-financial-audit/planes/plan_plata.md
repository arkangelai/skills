# Plan Plata

**plan_id:** PLATA
**nombre_comercial:** Plan Plata Complementario
**vigencia:** 2026-01-01 — 2026-12-31
**pagador:** EPS (Régimen Contributivo + complementario medio)

## Descripción

Plan intermedio con cobertura del PBS + paquete complementario moderado. Habitación bipersonal, acceso a red preferente con autorizaciones, medicamentos no-PBS con copago. Dirigido a afiliados con IBC medio que buscan mejor experiencia hospitalaria y acceso ampliado sin el costo del Plan Oro.

## Coberturas

### Hospitalización

- **Habitación:** bipersonal
- **Estancia general:** 100 %
- **UCI adulto/pediátrica/neonatal:** 100 % hasta 15 días. Justificación clínica obligatoria para días adicionales.
- **UCE:** 100 % hasta 10 días
- **Acompañante:** cama/silla en habitación con tarifa reducida

### Consultas

- **Medicina general:** 100 %
- **Especializada primera vez:** 100 %
- **Subespecializada:** 90 %, requiere autorización
- **Interconsulta hospitalaria:** 100 %
- **Red:** preferente (autorización previa para subespecialidades). Red complementaria con autorización.
- **Autorización previa:** requerida para subespecialidades y segundas opiniones

### Ayudas diagnósticas

- **Baja/mediana complejidad:** 100 %
- **Alta complejidad (TC, RM, medicina nuclear):** 90 %, requiere autorización previa
- **PET-CT, estudios genómicos:** MIPRES obligatorio + junta técnica
- **Laboratorio clínico de alto costo:** 90 %

### Procedimientos quirúrgicos

- **Cobertura:** 100 % de la tarifa contractual
- **Implantes:** cubiertos con trazabilidad INVIMA. Implantes de alta gama (cardiacos especiales, prótesis premium) requieren MIPRES.
- **Cirugía bariátrica:** cubierta con comité + carencia de 18 meses
- **Cirugía estética reparadora:** cubierta sólo post-trauma u oncológica

### Medicamentos

- **PBS:** 100 %
- **No-PBS con MIPRES:** 90 % del valor reconocido — el afiliado asume 10 % de copago
- **Alto costo (oncológicos, biológicos, huérfanos):** 90 % con junta técnica científica
- **Ambulatorio crónico:** 100 % si está en formulario; 80 % si fuera de formulario con MIPRES

### Salud mental

- **Hospitalización psiquiátrica:** 100 % hasta 30 días/año
- **Terapias individuales:** 100 % hasta 40 sesiones/año
- **Terapias grupales:** 100 %
- **Medicación psiquiátrica:** 100 % si PBS; 90 % si no-PBS

### Rehabilitación

- **Fisioterapia:** 100 % hasta 100 sesiones/año
- **Terapia ocupacional / fonoaudiología:** 100 % hasta 80 sesiones/año
- **Rehabilitación cardíaca / pulmonar:** 100 %
- **Rehabilitación neurológica intensiva:** 90 % en centros de referencia con autorización

### Otros

- **Traslado asistencial básico:** 100 %
- **Traslado medicalizado:** 90 %, requiere autorización
- **Trasplantes:** cubiertos (riñón, hígado, médula, corazón) con comité + carencia aplicable si es preexistencia no declarada
- **Diálisis:** 100 %
- **Maternidad integral:** 100 % con carencia de 10 meses

## Exclusiones

- Tratamientos estéticos no reparadores.
- Fertilidad asistida (todas las modalidades).
- Tratamientos experimentales.
- Medicamentos sin registro INVIMA.
- Servicios prestados en el exterior salvo pre-autorización explícita y tope máximo.
- Medicina alternativa/complementaria.

## Topes anuales (COP)

| Concepto | Tope |
|---|---|
| Medicamentos no-PBS con MIPRES | $80.000.000 |
| Terapias físicas | 100 sesiones |
| Terapia ocupacional / fonoaudiología | 80 sesiones |
| Salud mental hospitalaria | 30 días |
| Salud mental terapia individual | 40 sesiones |
| Hospitalización UCI | 15 días (sin autorización especial) |
| UCE | 10 días |
| Ayudas diagnósticas alta complejidad | Sin tope (con autorización) |

## Períodos de carencia

| Servicio | Carencia |
|---|---|
| Preexistencias declaradas | 12 meses (50 % cobertura primer año) |
| Preexistencias no declaradas | Exclusión durante 12 meses |
| Ortopedia electiva no traumática | 12 meses |
| Cirugía bariátrica | 18 meses |
| Maternidad | 10 meses |
| Trasplantes electivos | 24 meses |

## Copagos y cuotas moderadoras

Calculados según IBC del afiliado (topes 2026):

| Rango IBC | Copago por servicio hospitalario | Cuota moderadora |
|---|---|---|
| < 2 SMMLV | $0 (exención legal) | $4.500 |
| 2 – 5 SMMLV | 10 % (tope $1.1 SMMLV/año) | $18.500 |
| > 5 SMMLV | 20 % (tope $2.2 SMMLV/año) | $48.500 |

- **Medicamentos no-PBS:** 10 % de copago (sin tope) adicional al porcentaje de cobertura del plan.

## Exenciones automáticas de copago

- Gestantes.
- Menores de 5 años.
- Víctimas del conflicto armado.
- Pacientes en cuidados paliativos.
- Enfermedades huérfanas registradas.

## Reglas especiales para auditoría financiera

- F20 (topes anuales) se evalúa contra los topes numéricos arriba. Requiere consultar histórico del afiliado.
- F21 (carencia) es la regla más activa en Plata: aplica a preexistencias, ortopedia electiva, bariátrica, maternidad, trasplantes.
- F22 (preexistencias) evaluar contra declaración del afiliado al ingresar al plan.
- F23 (copago por IBC) es obligatoria; verificar contra BDUA el IBC vigente.
- Medicamento no-PBS con MIPRES: el agente debe cruzar con `cierre.valor_aprobado` al 90 % del tarifario reconocido por el pagador.
