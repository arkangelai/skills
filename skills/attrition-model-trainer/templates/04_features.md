# 04 — Features

> Una entrada por feature en producción. Si una feature se descarta, dejar la entrada con razón.

## Tabla de features

| Feature | Definición | Tipo | Origen | En modelo final | Razón si excluida |
|---|---|---|---|---|---|
| <!-- TODO --> | <!-- TODO --> | <!-- TODO --> | <!-- TODO --> | <!-- TODO --> | <!-- TODO --> |

## Features explícitamente excluidas por leakage

> Cualquier feature derivada del target o medida después del evento es leakage.

- <!-- TODO: ej. Antigüedad_calculada porque se calcula con Fecha_retiro -->
- <!-- TODO -->

## Feature engineering

<!-- TODO: interacciones, agrupaciones, encodings. Documentar cuáles ayudaron y cuáles no.
Patrón típico: pairwise interactions + KNN distance suelen no aportar sobre baseline en datasets HR/SST de N~1000.
Lección: feature engineering empírico, no por moda — registrar negativos también. -->

## Tratamiento de missing

<!-- TODO: columna por columna. Usar indicador binario `<feature>_was_missing` antes que imputación a la mediana, para no destruir la señal. -->
