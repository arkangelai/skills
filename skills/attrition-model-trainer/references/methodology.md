# Methodology — 12 phases

Detalle de cada fase del workflow de `attrition-model-trainer`. Cada fase produce un artefacto concreto y se registra en `docs/05_modeling_log.md` con un experimento numerado (`E0`, `E1`, …).

Las funciones referenciadas (`run_icl`, `oof_binary_predictions`, `optuna_blend_weights`, etc.) viven en la librería interna del proyecto Comfama y se reimplementan localmente cuando se aplica este skill — la documentación describe la **metodología**, no el package.

---

## Phase 0 — Project scaffolding

**Goal:** crear el árbol del proyecto y copiar los templates.

```
<project>/model_training/
├── docs/                  # 10 templates copiados de skill/templates/
├── src/                   # feature engineering + training scripts
├── data/{raw,interim,processed}/
├── artifacts/             # pickles, Optuna studies, OOF predictions, trial_log.jsonl
├── results/               # threshold_sweep.csv, business_value_*.md, subpop_thresholds.csv
├── tests/
└── README.md
```

**Output:** árbol creado, `docs/00..09_*.md` con `<!-- TODO -->` placeholders listos para llenar.

---

## Phase 1 — Data ingestion & cleaning

**Goal:** raw HR/SST exports → CSV normalizado en `data/interim/`.

Attrition data llega típicamente como **múltiples CSVs** (encuestas SST, datos de cargo, fechas de ingreso/retiro, salarios) que se mergean por `employee_id`.

**Document in `docs/01_data_dictionary.md`:** cada columna, dtype, units, missing-rate, value range, source. Usar `df.describe()`, `df.isna().sum()`, `df[col].value_counts()`.

### Phase 1.5 — Leakage gate (mandatory)

Entre Phase 1 y Phase 2, antes de cualquier fit, correr un scanner estadístico de leakage. Cualquier feature que construyó el target (ej. fecha de retiro derivada en antigüedad calculada al cierre, salario final post-retiro) se descarta.

**Document features descartadas en `docs/04_features.md` § "Removed for leakage".**

---

## Phase 2 — EDA, cohort definition & arquetipos

EDA en attrition tiene un componente extra que screening clínico no tiene: **arquetipos de empleado/cargo**. Si los cargos son heterogéneos (operativo vs ejecutivo vs comercial), agruparlos antes de modelar mejora la señal.

**5 figuras estándar:** distribución del target, distribuciones numéricas por target, tasas categóricas por target, scatter pairwise, heatmap de correlación. Referenciarlas en `docs/02_eda_report.md`.

**Define en `docs/03_cohort_and_outcome.md`:**
- Inclusión/exclusión (ej. solo activos con ≥X días, solo preingreso, etc.).
- Encoding del target (binario `RETIRADO` vs `ACTIVO` — pero ver Phase 5 antes de fijarlo).
- Ventana de observación si aplica (ej. retiro en los próximos 6 meses).

**Pause-point 🔴**: agrupación de cargos / arquetipos cuando los grupos existentes no encajan con el negocio (ej. crear "comercial" agrupando 8 cargos diferentes).

---

## Phase 3 — Baseline binary

Entrenar XGB / LGBM / CatBoost binarios con `class_weight='balanced'` o `scale_pos_weight = (1-prev)/prev`.

**Models in scope (en este orden):**
1. Logistic Regression elastic-net (interpretable baseline).
2. XGBoost · 3. LightGBM · 4. CatBoost (Optuna-tuned, 30-60 trials).

**Class imbalance:** `class_weight` / `scale_pos_weight`. **Never SMOTE.** Documentar en `09_decisions_log.md`.

**Validation:** stratified 80/20 holdout (seed=42) + 5-fold CV. Si hay `group` (sede, región, empresa), también reportar Leave-One-Group-Out (LOIO).

**Literature / rule baseline obligatorio.** Comparar contra al menos un baseline simple del dominio (ej. "tenure < 6 meses + cargo operativo + salario Q1") o un score HR publicado si aplica. Sin ese baseline, la "ganancia" del modelo no es interpretable contra la práctica actual.

Log cada experimento en `docs/05_modeling_log.md` (`E0`, `E1`, `E2`, …).

---

## Phase 4 — Iterative Confidence Learning (ICL)

Datos de attrition tienen labels ruidosos: empleados que se "retiran" pueden ser despidos, fines de contrato, traslados, jubilaciones — todo etiquetado igual. Aplicar ICL (5 rondas, 5-fold CV, seed=42) reduce el ruido.

**Inputs:** X, y, model_factory, n_rounds=5, cv_folds=5, seed=42.
**Outputs:** modelo fitteado + `sample_weights` por muestra + `history` (ronda × low-quality identificadas).

En Comfama esto subió AUC +0.024 sobre baseline. Documentar cuántas muestras se identificaron como low-quality por ronda en `05_modeling_log.md`.

**Pause-point 🔴** para configurar ICL si el threshold de "low quality" o el número de rondas se desvía del default — afecta directamente qué labels quedan en train.

---

## Phase 5 — Multiclass reformulation (cuando binary AUC se estanca)

**La lección más importante de Comfama.** Cuando el binary AUC alcanza un techo (~0.73 en Comfama), **no toques los labels** (label-flipping cambia los labels del test, no del mundo real — es antipattern). En lugar de eso, reformular como multiclass:

1. Generar **OOF binary probabilities** con `oof_binary_predictions()` (5-fold CV, modelo ganador binario).
2. **Derivar 3 clases** desde las OOF: `NEGATIVE` (proba baja), `INTERMEDIATE` (proba media), `POSITIVE` (proba alta + label original = RETIRADO). Threshold de "INTERMEDIATE" típico = 0.50.
3. Re-entrenar como multiclass.

En Comfama esto subió AUC de 0.732 → 0.798 sin modificar ningún label.

**Pause-point 🔴** antes de cambiar la estructura del problema — confirmar con Laura.

---

## Phase 6 — Optuna-weighted ensemble

Combinar ~10 modelos diversos con pesos optimizados por Optuna contra el AUC binario.

**Zoo típico:** XGB×2 (params distintos), LGBM×2, RandomForest, ExtraTrees, GradientBoosting, SVM, LR, KNN.

**Pipeline:**
1. Generar OOF risk scores por modelo (5-fold CV).
2. Optuna maximiza AUC binario sobre la blend de OOFs (100 trials, 5-fold inner CV).
3. Outer evaluation con `RepeatedStratifiedKFold(n_splits=5, n_repeats=5, seed=42)`.
4. Dropear modelos con peso <0.005 (ahorra cómputo en producción).

En Comfama, los pesos terminaron concentrados en 4 modelos (XGB×2 + LGBM×2 + RF) con peso ≥0.13.

---

## Phase 7 — Synthetic data augmentation (opcional)

Si llegaste al techo y necesitas confirmarlo, probar CTGAN / GaussianCopula / Mixup sobre la **clase minoritaria solamente** (máximo 2x). En Comfama esto subió AUC de 0.7976 → 0.8000 (+0.0025 — marginal).

**Hard rule:** ganancias <0.005 AUC son ruido bootstrap, **no las vendas como mejora**. Augmentar 3x+ o todas las clases empeora.

**Pause-point 🔴** para aceptar synthetic augmentation — Laura confirma si igual lo deja documentado.

---

## Phase 8 — Threshold selection + business value

Producir el barrido completo y los escenarios de costo:

1. **Sweep** de thresholds 0.05 → 0.95 en pasos de 0.01, con métricas (sens, spec, F1, prec, recall) por punto.
2. **E1 (costo simétrico de reemplazo):** `replacement_cost_per_fn` × FN + `vacancy_cost_per_fp` × FP.
3. **E2 (E1 + salario pagado durante permanencia):** suma adicional el salario que se pagó al empleado retenido por error.
4. **Subpop thresholds:** preingreso filter vs monitoreo periódico vs filtro mensual — use cases distintos = thresholds distintos.

**Hard rule:** el threshold lo elige **el negocio**, no ML. Presentar tabla con E1/E2 y subpoblaciones; la decisión es del stakeholder. Documentar en `docs/07_threshold_and_business_value.md`.

**Pause-point 🔴** para validar costos E1/E2 con cliente — Claude no inventa los números.

---

## Phase 9 — Hybrid ML + rules (opcional, deployment)

Cuando el cliente tiene reglas de negocio explícitas (ej. las 37 reglas de Comfama: depresión, fatiga, individuo reubicado, cansancio emocional, …), combinar con el score ML.

**Dos estrategias:**
- **Linear blend:** `final_score = alpha * ml_score + (1 - alpha) * rule_score`. Simple, calibrable.
- **Cascade / layered:** rules pasan/fallan primero; ML decide en el subset restante. Más interpretable.

**Sanity check obligatorio:** auditar poder discriminativo de las reglas por subpoblación antes de mezclar. Lección Comfama: en preingreso, las reglas de depresión/cansancio/fatiga son **constantes** (porque se miden post-ingreso vía SST) → no discriminan ahí.

**Pause-point 🔴** para elegir reglas + alpha — depende de cuánto pesa el negocio sobre ML.

---

## Phase 10 — Re-train winner on full cohort

Una vez el ganador es claro, re-fittear sobre N completo (sin holdout) para producción:

```
final_model = make_winner_pipeline(best_params).fit(X_full[winner_features], y_full)
pickle.dump({"label": "vN_full_cohort", "features": winner_features,
             "model": final_model, "threshold": chosen_threshold},
            open("artifacts/vN_full_cohort.pkl", "wb"))
```

Este es el artefacto que despliegas. El holdout fue solo para evaluación honesta.

---

## Phase 11 — Model card + decisions log

Llenar `docs/08_model_card.md` (Mitchell-style) y agregar entradas a `docs/09_decisions_log.md` (`D-001…D-NNN`, formato `Decisión → Razón → Aplicación`, append-only).

**Mandatory model card sections:**
- Detalles del modelo (name, version, type, hyperparams, artifact path).
- Uso previsto + 🚫 fuera de alcance.
- Datos + cohorte + tasa de retiro.
- Features in/out.
- Output (probabilidad calibrada + thresholds operativos por uso de negocio).
- Desempeño global + por subgrupos + LOIO.
- Limitaciones conocidas.
- Consideraciones éticas (especialmente sesgos por género, edad, cargo).

---

## Phase 12 — Deployment packaging

Empaquetar para el destino (Modal, Hippocrates, API interna, …). Mínimo a producir:

- `model.pkl` con `{label, features, model, threshold}`.
- `feature_names.json` con el orden exacto de columnas para inferencia.
- `means.npy` + `stds.npy` si hubo preprocessing manual.
- `background_set.csv` para SHAP (subset estratificado de ~100 filas del train).
- README de inferencia (cómo cargar y predecir).

**Verificación de bundle:** ningún feature listado en `feature_names.json` debe estar en la lista de leakage descartada en Phase 1.5.
