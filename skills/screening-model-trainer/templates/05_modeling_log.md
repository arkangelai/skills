# 05 — Bitácora de Modelado

> Append-only. Una entrada por experimento ejecutado.

## Convenciones

- **Validación primaria:** stratified 80/20 holdout (seed=42).
- **Tuning:** StratifiedKFold(5) sobre el train.
- **Calibración:** `CalibratedClassifierCV(method='isotonic', cv=5)` aplicada al pipeline ganador.
- **Métrica de selección:** AUROC (CV mean en train) → desempate por Brier en holdout.
- **Threshold operativo:** 4 puntos clínicos (aggressive / balanced / strict / confirmatory).
- **Seed:** `RANDOM_STATE = 42` en todo el pipeline.

---

## YYYY-MM-DD · E0 · Baseline interno

<!-- TODO: por qué este baseline (KFRE / regla heurística / regresión logística simple). -->

## YYYY-MM-DD · E1 · Logistic Regression elastic-net

<!-- TODO: hyperparams, CV AUROC, holdout AUROC, calibración, observación. -->

## YYYY-MM-DD · E2 · XGBoost · E3 · LightGBM · E4 · CatBoost

<!-- TODO: una entrada por modelo. -->

## YYYY-MM-DD · v0.2 — Optuna tuning

### E5 · Optuna 30 trials × 3 GBMs

<!-- TODO: best CV AUROC + delta vs default. -->

### E6 · Feature engineering manual (extended set)

<!-- TODO: ¿ayudó o no? Documentar empíricamente. -->

## YYYY-MM-DD · v0.3 — Feature search híbrido

### E7-E9 · Forward greedy + Optuna binary mask + Backward elimination

<!-- TODO: features seleccionados, CV AUROC, comparación contra v0.2. -->

### E10 · Comparación final en holdout

<!-- TODO: tabla de candidates ranked por test AUROC. -->

---

## Decisiones de modelado pendientes

<!-- TODO: hypotheses worth re-trying en futuras iteraciones. -->
