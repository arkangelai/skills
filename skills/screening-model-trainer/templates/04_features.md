# 04 — Ingeniería de Variables

## 1. Set base

<!-- TODO: tabla con cada feature del set base (lo mínimo para correr el modelo). -->

| Feature | Definición | Tipo | Capping / encoding | Rationale clínico |
|---|---|---|---|---|

## 2. Decisiones de encoding

<!-- TODO: por qué binary indicators y no one-hot completo, por qué no z-score para árboles, etc. -->

## 3. Set extendido (engineered)

<!-- TODO: features adicionales para el feature search de v0.3. Polinomios, interacciones, ratios, composites clínicos. -->

| Feature engineered | Definición | Hipótesis |
|---|---|---|

## 4. Descartes explícitos

<!-- TODO: features que NO entran al modelo y por qué. Prioridad: cualquier feature que pueda ser leakage del target. -->

## 5. Tests del pipeline (`tests/test_build_features.py`)

<!-- TODO: lista de invariantes a verificar (shape, no NaN, determinismo, no leakage). -->

1. `build_features(df).shape[1] == N`
2. Sin NaN en flags
3. Capping aplicado correctamente
4. Determinístico (correr 2× = mismo output)
5. **Sin leakage:** no usa `y` para nada
