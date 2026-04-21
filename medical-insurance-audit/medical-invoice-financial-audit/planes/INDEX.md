# Índice de planes

Ruteo para el sub-agente financiero: dado `plan_id` obtenido de BDUA, se carga el archivo correspondiente.

## Ruteo por `plan_id`

| `plan_id` (BDUA) | Archivo | Alias comerciales aceptados |
|---|---|---|
| `ORO` | [plan_oro.md](plan_oro.md) | "Plan Oro Integral", "Oro", "Premium" |
| `PLATA` | [plan_plata.md](plan_plata.md) | "Plan Plata Complementario", "Plata", "Intermedio" |
| `BASICO` | [plan_basico.md](plan_basico.md) | "Plan Básico PBS", "Básico", "PBS", "POS" |

Si `plan_id` no coincide con ninguno de los tres → `concepto_final = "ESCALAR_HUMANO"` con observación en F04.

## Comparativa resumida

| Concepto | Oro | Plata | Básico |
|---|---|---|---|
| Habitación | Individual | Bipersonal | Multipersonal |
| UCI sin tope de días | Sí | Hasta 15 días | Hasta 10 días |
| Subespecialidades | Sin autorización | Con autorización | Sólo con remisión + autorización |
| Ayudas dx alta complejidad | 100 % sin autorización | 90 % con autorización | 100 % con autorización |
| Medicamentos no-PBS | 100 % MIPRES | 90 % MIPRES (10 % copago) | Sólo MIPRES autorizado |
| Alto costo (oncológico / biológico) | 100 % con junta | 90 % con junta | 100 % si en listado PBS |
| Fisioterapia | Ilimitada | 100 sesiones/año | 60 sesiones/año |
| Salud mental hospitalaria | Sin tope | 30 días/año | 20 días/año |
| Maternidad | Sin carencia | 10 meses | 10 meses |
| Preexistencias | Sin carencia | 12 meses | 24 meses |
| Ortopedia electiva | 6 meses | 12 meses | 24 meses |
| Cirugía bariátrica | 12 meses | 18 meses | 24 meses |
| Tope medicamentos no-PBS | Sin tope | $80M | $40M |
| Copago consulta externa | $0 | $0 (según IBC para hospit.) | Según IBC |
| Traslado internacional | Hasta $120M | No | No |
| Red | Preferente + complementaria | Preferente con autorización | Básica geográfica |

## Notas operativas

- **Detección del plan** del afiliado: el sub-agente debe consultar BDUA al iniciar la auditoría financiera (F04). Fuentes secundarias: certificación escrita del pagador, historial de cuentas anteriores del mismo afiliado.
- **Cambio de plan mid-year:** si el afiliado cambió de plan durante el periodo facturado, aplicar el plan vigente en la **fecha de prestación** del servicio, no el plan actual.
- **Plan no reconocido:** escalar siempre. No inventar coberturas.
- **Pluri-afiliación** (ej. contributivo + complementario voluntario): aplicar el plan base del contributivo al PBS y el complementario a lo que excede. Registrar ambos en `observaciones` de F04.

## Extensibilidad

Para añadir un nuevo plan (p.ej. "Plan Diamante" o variantes regionales):
1. Crear `plan_<nombre>.md` con las 10 secciones canónicas (descripción, coberturas, exclusiones, topes, carencias, copagos, exenciones, reglas especiales).
2. Añadir fila en el ruteo y en la comparativa arriba.
3. Si introduce nuevas reglas de validación, documentarlas en `checklist_base.md` §7 del financiero.
