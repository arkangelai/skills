# Methodology — 14 phases

Detalle de cada fase del workflow de `attrition-model-trainer`. Cada fase produce un artefacto concreto y se registra en `docs/05_modeling_log.md` con un experimento numerado (`E0`, `E1`, …).

Las funciones referenciadas (`run_icl`, `oof_binary_predictions`, `optuna_blend_weights`, etc.) son nombres convencionales que se reimplementan localmente cuando se aplica este skill — la documentación describe la **metodología**, no un package específico.

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

**Cohort-indicator scan (extension):** además del leakage estadístico, listar features que son **marcas administrativas de cohorte** (no atributos del individuo) y marcarlas como sospechosas — no se descartan automáticamente, pero requieren OOT validation antes de que entren al scorer final. Patrones típicos:

- `Tipo_examen`, `Tipo_evaluacion`, `Modulo_*` — distingue subpoblaciones de uso (preingreso vs control vs periódico).
- `Wave_*`, `Phase_*`, `Batch_*`, `Cohort_*` — id de la oleada de captura.
- `Source_*`, `Origen_*`, `Canal_*` — fuente de captura.

Si una de estas aparece en el top-5 de importance del ganador después de Phase 6, es bandera roja (Hard rule 17): el modelo está aprendiendo de la cohorte, no del individuo. Caso conocido: un ensemble HR mostraba un cohort indicator administrativo en el top-3 de importance (~11%) y al medir OOT en la subpoblación de uso real el AUC colapsaba a ~0.30.

**Document features descartadas en `docs/04_features.md` § "Removed for leakage".**
**Document cohort-indicators sospechosos en `docs/04_features.md` § "Cohort indicators (validate via OOT)".**

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

En implementaciones de referencia esto subió AUC en el orden de +0.02-0.03 sobre baseline. Documentar cuántas muestras se identificaron como low-quality por ronda en `05_modeling_log.md`.

**Pause-point 🔴** para configurar ICL si el threshold de "low quality" o el número de rondas se desvía del default — afecta directamente qué labels quedan en train.

---

## Phase 5 — Multiclass reformulation (cuando binary AUC se estanca)

**El patrón más importante.** Cuando el binary AUC alcanza un techo (típicamente ~0.73 en datasets HR/SST con N~1000), **no toques los labels** (label-flipping cambia los labels del test, no del mundo real — es antipattern). En lugar de eso, reformular como multiclass:

1. Generar **OOF binary probabilities** con `oof_binary_predictions()` (5-fold CV, modelo ganador binario).
2. **Derivar 3 clases** desde las OOF: `NEGATIVE` (proba baja), `INTERMEDIATE` (proba media), `POSITIVE` (proba alta + label original = RETIRADO). Threshold de "INTERMEDIATE" típico = 0.50.
3. Re-entrenar como multiclass.

En implementaciones de referencia esto suele mover AUC del orden de +0.05-0.07 sin modificar ningún label.

**Pause-point 🔴** antes de cambiar la estructura del problema — confirmar con the project owner.

---

## Phase 5.5 — Foundation model benchmark (TabPFN, opcional)

Cuando `Hard rule 17` (cohort indicator en top-5) **o** binary AUC se estanca después de Phase 5 multiclass, **TabPFN entra como benchmark obligatorio antes de Phase 6** — no como alternativa, sino como sanity check del ensemble.

**Por qué TabPFN aquí:** es un foundation model pre-entrenado sobre millones de tablas sintéticas que hace **in-context learning** (sin gradiente sobre los datos del cliente). En datasets <2k filas suele beat ensemble tradicional, y por construcción **no se sobreajusta a indicadores de cohorte** porque no construye una representación específica del dataset.

**Pipeline mínimo:**
1. Instalar `tabpfn>=2.0` (CPU OK para n<1000).
2. Fit en train completo (sin holdout interno — TabPFN no entrena).
3. Predict probabilidades sobre el mismo split de evaluación que usaron Phase 5/6.
4. Comparar AUC binario en CV + (especialmente) en sliding-window OOT (Phase 6.5).

**Criterio de adopción:** si TabPFN **gana** ≥0.02 AUC en OOT preingreso o subpob de uso real, entra como ganador candidato y se valida en Phase 6.5. Si pierde o empata, sigue ensemble Phase 6 — pero se reporta el benchmark en `06_results.md` como sanity check.

**Limitaciones operacionales que hay que confirmar antes:**
- Latencia: 1-2 segundos por candidato vs ~50ms del ensemble. Aceptable para screening, **no** para tiempo real.
- Tamaño: ~30 MB el modelo + train data (vs ~5 MB ensemble). Sin impacto operacional pero relevante para serverless / cold-start.
- No tiene `feature_importances_` nativo — usar Random Forest fitted sobre los mismos features como **proxy** para reportar importance al cliente.

Caso de referencia: en un dataset HR pequeño con cohort overfitting en el ensemble, TabPFN dominó en OOT (delta AUC en el orden de +0.18 global, +0.55 en la subpoblación de uso real) y eliminó la dependencia del cohort indicator.

**Pause-point 🔴 (Pause-point 12)** antes de adoptar TabPFN como winner — confirma con el project owner que la latencia y el tamaño son aceptables en el destino de deploy.

---

## Phase 6 — Optuna-weighted ensemble

Combinar ~10 modelos diversos con pesos optimizados por Optuna contra el AUC binario.

**Zoo típico:** XGB×2 (params distintos), LGBM×2, RandomForest, ExtraTrees, GradientBoosting, SVM, LR, KNN.

**Pipeline:**
1. Generar OOF risk scores por modelo (5-fold CV).
2. Optuna maximiza AUC binario sobre la blend de OOFs (100 trials, 5-fold inner CV).
3. Outer evaluation con `RepeatedStratifiedKFold(n_splits=5, n_repeats=5, seed=42)`.
4. Dropear modelos con peso <0.005 (ahorra cómputo en producción).

En implementaciones de referencia, los pesos suelen concentrarse en 4-5 modelos (XGB×2 + LGBM×2 + RF típicamente) con peso individual ≥0.13.

---

## Phase 6.5 — Sliding-window OOT validation (mandatory si hay timestamp)

**Hard rule 18:** si el dataset tiene `Fecha_registro` / `Fecha_ingreso` o equivalente, sliding-window OOT es **obligatorio** antes de declarar un winner. Random CV solo no se acepta en `model_card.md`.

**Por qué:** random CV mezcla cohortes en train y test, y oculta cohort drift. Sliding-window simula producción: entrenar con el pasado, evaluar con el futuro.

**Configuración default (5 cortes mensuales):**

```python
cutoffs = ["YYYY-MM-DD"] * 5  # 5 cortes mensuales contiguos
for cutoff in cutoffs:
    train = df[df["<date_column>"] <= cutoff]
    test  = df[df["<date_column>"] >  cutoff]
    # fit on train, score on test
    # log AUC_full + AUC_subpop_uso (subpoblación de uso real)
```

**Bootstrap delta CI obligatorio** (1000 reps) sobre `delta_AUC = AUC(new) - AUC(old)`. Reportar en `06_results.md`:
- `delta_mean`, `delta_CI_95_lo`, `delta_CI_95_hi`, `P(delta > 0)`.
- Si `P(delta > 0) < 0.95` la mejora **no se reporta como significativa**.

**Pause-point 🔴 (Pause-point 14)** para definir los cortes — eventos históricos (cambios de política, COVID, restructuraciones) pueden invalidar ventanas; tamaño mínimo por corte ≥100 filas.

**Walk-forward expanding-window (opcional, refinamiento):** 5 ventanas no superpuestas (entrenar mes 1-3, eval mes 4 / entrenar mes 1-4, eval mes 5, etc.). Reportar AUC promedio + std.

Caso conocido: un ensemble HR reportaba CV AUC ~0.80 pero al medir OOT en la subpoblación de uso real (preingreso) el AUC colapsaba a ~0.30 — random CV escondió el colapso por cohort effects durante meses.

---

## Phase 7 — Synthetic data augmentation (opcional)

Si llegaste al techo y necesitas confirmarlo, probar CTGAN / GaussianCopula / Mixup sobre la **clase minoritaria solamente** (máximo 2x). En casos de referencia las ganancias suelen ser <0.005 AUC (marginal, dentro de bootstrap noise).

**Hard rule:** ganancias <0.005 AUC son ruido bootstrap, **no las vendas como mejora**. Augmentar 3x+ o todas las clases empeora.

**Pause-point 🔴** para aceptar synthetic augmentation — the project owner confirma si igual lo deja documentado.

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

Cuando el cliente tiene reglas de negocio explícitas (típicamente reglas SST o señales de bienestar: depresión, fatiga, reubicación, cansancio emocional, etc.), combinar con el score ML.

**Dos estrategias:**
- **Linear blend:** `final_score = alpha * ml_score + (1 - alpha) * rule_score`. Simple, calibrable.
- **Cascade / layered:** rules pasan/fallan primero; ML decide en el subset restante. Más interpretable.

**Sanity check obligatorio:** auditar poder discriminativo de las reglas por subpoblación antes de mezclar. Patrón común: en candidatos de preingreso, las reglas de salud mental / fatiga / cansancio son **constantes** (porque se miden post-ingreso vía SST) → no discriminan ahí.

**Hybrid puede HURT — Hard rule 19.** "No discrimina" no es el peor caso; el peor es que las reglas **bajen** el AUC del ML en la subpob de uso. Antes de mezclar, calcular delta:

```python
auc_ml_only = roc_auc_score(y, ml_score)
auc_hybrid  = roc_auc_score(y, alpha * ml_score + (1-alpha) * rule_score)
if auc_hybrid < auc_ml_only - 0.01:  # con bootstrap CI
    # deploy ML-only; document as D-NNN: dropped rules
```

Caso de referencia: un ensemble HR + N reglas SST colapsaba a AUC OOT ~0.30 en la subpoblación de uso real, mientras que la versión ML-only (TabPFN) daba ~0.87. **Las reglas NO se aplican** en producción cuando la auditoría OOT muestra que destruyen señal.

**Pause-point 🔴 (Pause-point 5)** para elegir reglas + alpha — depende de cuánto pesa el negocio sobre ML.
**Pause-point 🔴 (Pause-point 13)** si la auditoría dice "drop rules" — el project owner confirma con el cliente antes de cambiar la arquitectura del scorer.

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

## Phase 11 — Model card + decisions log + calibration audit

Llenar `docs/08_model_card.md` (Mitchell-style) y agregar entradas a `docs/09_decisions_log.md` (`D-001…D-NNN`, formato `Decisión → Razón → Aplicación`, append-only).

**Mandatory model card sections:**
- Detalles del modelo (name, version, type, hyperparams, artifact path).
- Uso previsto + 🚫 fuera de alcance.
- Datos + cohorte + tasa de retiro.
- Features in/out.
- Output (probabilidad calibrada + thresholds operativos por uso de negocio).
- Desempeño global + por subgrupos + LOIO.
- **Calibration audit (mandatory):** tabla de 10 buckets equiprobables con `[bin, n, mean_predicted_pct, fraction_positives_pct]`. Hard rule 20: el bucket de mayor probabilidad debe cumplir `fraction_positives ≥ 0.5 × mean_predicted`. Reportar Brier, ECE y calibration slope. Si slope < 0.8 o > 1.2, el modelo no se despliega aunque AUC sea aceptable — RH no puede priorizar con probabilidades infladas.
- **OOT validation (mandatory si timestamp existe):** AUC por corte (≥3) + bootstrap delta CI vs baseline.
- Limitaciones conocidas.
- Consideraciones éticas (especialmente sesgos por género, edad, cargo).

Caso conocido: un ensemble HR tenía bucket top que decía ~78% pero solo ~5% se retiraba (slope 0.18, ECE 14.8%) — el modelo "tenía AUC" pero las probabilidades eran inutilizables. La versión recalibrada (TabPFN) tenía bucket top ~42% predicho vs ~37% real (slope 1.32, ECE 5.6%).

---

## Phase 12 — Deployment packaging

Empaquetar para el destino (model registry, serverless platform, API interna, …). Mínimo a producir:

- `model.pkl` con `{label, features, model, threshold}`.
- `feature_names.json` con el orden exacto de columnas para inferencia.
- `means.npy` + `stds.npy` si hubo preprocessing manual.
- `background_shap_set.csv` para SHAP (subset estratificado de ~100 filas del train).
- README de inferencia (cómo cargar y predecir).

**Verificación de bundle:** ningún feature listado en `feature_names.json` debe estar en la lista de leakage descartada en Phase 1.5.

### Phase 12.1 — Model-registry packaging spec (cuando deploy es a un object-store + serverless)

Cuando el destino es un model registry tipo Supabase Storage + Modal (o equivalente), empaquetar **exactamente** estos 5 archivos + 1 sidecar:

| Archivo | Contenido | Notas |
|---|---|---|
| `model.pkl` | `{label, features, model, threshold}` | Pickle. Verificar round-trip byte-exact en `tests/`. |
| `means.npy` | numpy 1-D de medias post-imputation | orden = `feature_names.json` |
| `stds.npy` | numpy 1-D de stds post-imputation | orden = `feature_names.json` |
| `background_shap_set.csv` | ~100 filas estratificadas del train | columnas = features pre-OHE; usado por la inference platform para SHAP en runtime |
| `sucess_io_data.json` | esquema I/O (`{"input": {...}, "output": {...}}`) | dtype + range + ejemplo de cada variable |
| `deploy_metadata.json` (sidecar) | `{model_version, training_date, n_train, oot_auc, brier, calibration_slope, top_bucket_actual_pct, hard_rules_passed}` | metadata para auditoría / rollback |

**Verificación del bundle (smoke test obligatorio antes de subir a Storage):**

```python
# 1. Pickle round-trip byte-exact
import pickle, hashlib
b1 = open("model.pkl","rb").read()
m = pickle.loads(b1)
b2 = pickle.dumps(m, protocol=pickle.HIGHEST_PROTOCOL)
assert hashlib.sha256(b1).hexdigest() == hashlib.sha256(b2).hexdigest(), "pickle not stable"

# 2. Predict-on-background sanity
preds = m["model"].predict_proba(background_shap_set[m["features"]])
assert preds.shape[1] == 2 and preds.min() >= 0 and preds.max() <= 1

# 3. Hard rule 20 attestation
assert deploy_metadata["calibration_slope"] >= 0.8 and deploy_metadata["calibration_slope"] <= 1.2
```

**Rollback plan:** mantener la versión anterior en Storage hasta confirmar 14 días de canary 10% (ver Phase 13 client deliverables).

---

## Phase 13 — Client deliverables (cuando hay presentación a stakeholder no-ML)

Documentación cliente-facing en `docs/cliente/` con scaffolds dedicados (templates 10-14). Cinco artefactos:

1. **`1pager_cliente_vN.md`** (template 10) — resumen ejecutivo de 1 página: qué entrega, qué cambió, validación, recomendación. Sin AUC/Brier/ECE — todo traducido a "de cada 100 retiros, cuántos detecta".
2. **`deploy_spec.md`** (template 11) — spec técnico para ML/eng: archivos del bundle, contrato I/O, latencia esperada, rollback plan, monitoring.
3. **`slides_outline.md`** (template 12) — outline de 10-12 slides ordenadas (cover → problema → metodología → big number → razones → variables → consistencia → kit operativo → calibración → métricas → pedidos → cierre).
4. **`talking_points.md`** (template 13) — guión interno del presenter con números exactos por slide y respuestas FAQ.
5. **`team_presentation/index.html`** (template 14) — deck HTML/CSS responsive con brand kit del cliente.

**Reglas de comunicación (vinculantes para cliente externo):**

- **Todas las métricas en %**, no en escala 0-1. AUC 0.78 → 78%. Brier 0.055 → 5.5%. Diferencias en "puntos porcentuales (pp)".
- **AUC se traduce** a "de cada 100 retiros reales, cuántos detecta el modelo" (sensitivity at deployed threshold). Es lo único que el negocio puede accionar.
- **SHAP / feature importance en HTML/CSS** (`.shap-grid` / `.shap-row` componentes), **no como imagen PNG** — texto siempre nítido a cualquier zoom.
- **Tablas de comparación en HTML** (`table.cmp` componente), no como imagen.
- **Sin email / contacto en slide de cierre** por default — se agrega solo si the project owner/cliente lo piden explícitamente.
- **Variables traducidas a etiquetas plain-Spanish** (`Tipo_examen` → "Momento de evaluación (preingreso vs control)", `Antiguedad_dias` → "Antigüedad en el cargo actual").
- **Sin terminología técnica:** no foundation model, no ensemble, no calibration slope, no Brier, no ECE — usar "modelo nuevo", "más exacto", "probabilidades confiables".

Lección recurrente: primer deck con PNGs de matplotlib + métricas en escala 0-1 + jargon ML genera feedback "no se ve, está muy pequeño" + "métricas en %, todas". Pasar a HTML/CSS y % resuelve ambos.

**Patrón de deck válido:** copiar el HTML/CSS del deck más reciente con Phase 13 completa que tenga el equipo. Los componentes ya están testeados en producción.
