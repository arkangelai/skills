# 03 — Cohorte y desenlace

## Criterios de inclusión

- <!-- TODO: ej. empleados con ≥30 días de antigüedad al corte -->
- <!-- TODO -->

## Criterios de exclusión

- <!-- TODO: ej. contratos temporales <90 días -->
- <!-- TODO -->

## Definición del desenlace

<!-- TODO: qué cuenta como retiro (voluntario / despido / fin de contrato / ...).
Variable derivada exacta + filtro temporal. -->

## Encoding del target

| Estado | Label | N |
|---|---|---|
| ACTIVO | 0 | <!-- TODO --> |
| RETIRADO | 1 | <!-- TODO --> |

> **Si vas a reformular como multiclass (Phase 5):** documenta aquí cómo definirás la clase intermedia (ej. ACTIVO con OOF binary prob > 0.50 → PRE-RETIRADO). Esto se decide DESPUÉS del baseline.

## Ventana de observación

<!-- TODO: ¿retiro en cualquier momento futuro / siguientes 6 meses / siguientes 12 meses? -->

## Tasa de prevalencia final en la cohorte

<!-- TODO: n_pos / n_total con denominador exacto. -->
