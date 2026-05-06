# 05 — Bitácora de Modelado

> Append-only. Una entrada por experimento ejecutado.

## Convenciones

- **Validación primaria:** stratified 80/20 holdout (seed=42).
- **Tuning:** StratifiedKFold(5) sobre el train.
- **Calibración:** `CalibratedClassifierCV(method='isotonic', cv=5)` aplicada al pipeline ganador.
- **Métrica de selección:** AUROC (CV mean en train) → desempate por Brier en holdout.
- **Threshold operativo:** se elige en `07_threshold_and_business_value.md`, no aquí.
- **Seed:** `RANDOM_STATE = 42` en todo el pipeline.

---

## YYYY-MM-DD · E0 · Baseline interno

<!-- TODO: regla heurística / regresión logística simple. AUC y observación. -->

## YYYY-MM-DD · E1-E4 · GBMs binarios (XGB / LGBM / CatBoost / LR-EN)

<!-- TODO: hyperparams, CV AUROC, holdout AUROC, calibración, observación. -->

## YYYY-MM-DD · E5 · Optuna tuning del ganador

<!-- TODO: best CV AUROC + delta vs default. -->

## YYYY-MM-DD · E6 · ICL (Iterative Confidence Learning)

<!-- TODO: n_rounds, mean_weight final, # samples low-quality, AUC delta. -->

## YYYY-MM-DD · E7 · Multiclass reformulation (Phase 5)

<!-- TODO: solo si el binary AUC se estancó. Definición de PRE-RETIRADO, n por clase, AUC binaria derivada del risk_score. -->

## YYYY-MM-DD · E8 · Optuna-weighted ensemble (Phase 6)

<!-- TODO: 10 modelos, pesos finales, AUC OOF. -->

## YYYY-MM-DD · E9 · Synthetic augmentation (opcional)

<!-- TODO: técnica (Copula minority 2x), AUC delta. Recordar: gana <0.005 = ruido. -->

---

## Decisiones de modelado pendientes

<!-- TODO: hipótesis no exploradas que vale la pena reintentar en futuras iteraciones. -->
