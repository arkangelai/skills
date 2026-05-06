# 06 — Resultados

## 1. Resumen comparativo (holdout n=N)

<!-- TODO: tabla maestra de todos los modelos. -->

| Modelo | AUROC | AUPRC | Brier | Cal slope | Cal int | Sens@85% | Sens@90% |
|---|---|---|---|---|---|---|---|

## 1b. Intervalos de confianza bootstrap (test n=N)

<!-- TODO: tabla del archivo `results/bootstrap_ci_<winner>.csv` (1,000 resamples estratificados). -->

| Métrica | Punto | IC95% (low–high) | Half-width | Lectura |
|---|---|---|---|---|
| AUROC |  | [_, _] |  | <!-- defensible si half-width <0.05 --> |
| AUPRC |  | [_, _] |  | |
| Brier |  | [_, _] |  | |
| Calibration slope |  | [_, _] |  | |
| Sens @ 85% Spec |  | [_, _] |  | |

**Lectura del IC:** si IC95% inferior de AUROC < 0.55 → indistinguible de azar, reconsiderar deployment. Si half-width > 0.05 → test set demasiado pequeño para un punto, reportar IC en el model card. Bootstrap captura solo varianza del test set; varianza del estimador requiere nested CV.

## 2. Calibración

<!-- TODO: figura `figures/06_calibration_curve.png` + comentario sobre slope/intercept. -->

## 3. Desempeño por subgrupos

<!-- TODO: tabla del archivo `results/subgroups_<winner>.csv`. -->

## 4. Validación Leave-One-Group-Out (LOIO)

<!-- TODO: si aplica. Si AUROC LOIO cae >0.05 vs split estratificado, documentar como limitación. -->

## 5. Decision Curve Analysis (DCA)

<!-- TODO: figura del net benefit. Confirmar que el modelo gana sobre treat-all y treat-none en el threshold operativo. -->

## 6. SHAP

<!-- TODO: top features por |SHAP|; figuras global + local (3-5 ejemplos). -->

## 7. Reproducir

```bash
python -m src.data.download
python -m src.data.load_arkformat
python -m src.features.build_features
python -m src.models.train          # v0.1
python -m src.models.tune            # v0.2 — Optuna
python -m src.models.train_v2
python -m src.models.search_features # v0.3
python -m src.eval.figures
```

## 8. Operating points por uso clínico

| Uso | Threshold | Spec | Sens | PPV | NPV | Marcados |
|---|---|---|---|---|---|---|
| Tamizaje agresivo (Youden) | | | | | | |
| Tamizaje balanceado (spec≈80%) | | | | | | |
| Diagnóstico estricto (spec≈95%) | | | | | | |
| Confirmatorio (spec≈99%) | | | | | | |

## 9. Feature search v0.3

<!-- TODO: si se ejecutó, tabla de candidates + winner + caveat de bootstrap noise si Δ<0.005. -->

## 10. Comparación contra modelo desplegado

<!-- TODO: si existe modelo en producción, tabla DT/deployed vs nuestros con las dos lecturas (ingenua vs honesta). -->

## 11. Re-entrenamiento sobre cohorte completa

<!-- TODO: artefacto de producción, métricas honestas. -->
