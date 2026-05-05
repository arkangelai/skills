# 07 — Threshold operativo y valor de negocio

> Esta sección la usa el negocio para decidir el threshold de despliegue. Tu trabajo es presentar las opciones honestamente, no decidir por ellos.

## Supuestos de costo (validados con el cliente)

| Parámetro | Valor | Fuente |
|---|---|---|
| Costo de reemplazo (FN) | <!-- TODO: $X COP/USD --> | <!-- TODO --> |
| Costo de vacante (FP) | <!-- TODO: $Y --> | <!-- TODO --> |
| ¿Costos varían por cargo? | <!-- TODO: sí/no --> | <!-- TODO --> |
| Periodo de datos | <!-- TODO: N años --> | <!-- TODO --> |

## Barrido completo de thresholds

> Generado con `attrition_model_trainer.threshold.sweep_thresholds`. Tabla completa en `results/threshold_sweep.csv`.

| Threshold | Precision | Recall | F1 | Flagged | % workforce | Use case sugerido |
|---|---|---|---|---|---|---|
| 0.15 | | | | | | Screening amplio |
| 0.20 | | | | | | Balance |
| 0.30 | | | | | | Moderado |
| 0.50 | | | | | | Alta precisión |
| 0.70 | | | | | | Ultra conservador |

## Escenarios de costo

### E1 — Costo asimétrico (reemplazo por FN, vacante por FP)

| Threshold | TP | FP | FN | Beneficio neto E1 | Anualizado |
|---|---|---|---|---|---|
| <!-- TODO --> | | | | | |

### E2 — E1 + salario pagado durante permanencia

| Threshold | TP | FP | FN | Beneficio neto E2 | Anualizado |
|---|---|---|---|---|---|
| <!-- TODO --> | | | | | |

## Subpopulation thresholds

> Si el use case difiere por segmento (ej. preingreso filter vs monitoreo periódico), el threshold puede ser distinto por subgrupo. Generado con `subpop_thresholds`.

| Subgrupo | N | Threshold óptimo | Precision | Recall | F1 | Criterio |
|---|---|---|---|---|---|---|
| <!-- TODO --> | | | | | | <!-- TODO: max_f1 / max_business_e1 --> |

## Recomendación al negocio

<!-- TODO: presentar 2-3 opciones (conservadora / balanceada / agresiva) con consecuencias claras. NO recomendar una sola — la decisión es del stakeholder. -->

> **Hard rule:** el threshold lo elige el negocio. El equipo de modelado presenta opciones, no decide.

## Decisión final

<!-- TODO: completar después del workshop con el stakeholder. -->

| Use case | Threshold elegido | Stakeholder | Fecha |
|---|---|---|---|
| <!-- TODO --> | | | |
