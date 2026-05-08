# Methodology — 13 phases (linear sub-numbering N.1, N.2, …)

Detalle de cada fase del workflow de `screening-model-trainer`. Cada fase produce un artefacto concreto y se registra en `docs/05_modeling_log.md` con un experimento numerado (`E0`, `E1`, …).

Las funciones referenciadas (`download_dataset`, `tune_gbms`, `hybrid_search`, `bootstrap_metrics_ci`, `loio_validation`, etc.) son nombres convencionales que se reimplementan localmente — la documentación describe la **metodología**, no un package específico.

---

## Phase 0 — Project scaffolding

**Goal:** crear el árbol del proyecto y copiar los templates.

```
<project>/model_training/
├── docs/                  # 9 templates TRIPOD+AI copiados de skill/templates/
├── src/                   # build_features.py + tests
├── data/{raw,interim,processed,raw_upstream}/
├── artifacts/             # pickles, Optuna studies, OOF, trial_log.jsonl
├── results/               # operating_points, bootstrap CI, audit, per_1000
├── tests/
└── README.md
```

---

## Phase 1 — Data ingestion

**Goal:** EHR zip / CSV → CSV normalizado.

1. **Download** del object store / EHR data lake, ruta convencional `<userId>/<projectId>/<file>.zip`.
2. **Decompress + normalize** al CSV de trabajo.
3. **Document** cada columna en `docs/01_data_dictionary.md`: dtype, units, missing-rate, value range, source.

### Phase 1.1 — Probe upstream pre-existing splits (mandatory cuando hay deployed)

Cuando el pipeline upstream persiste `train.csv`/`val.csv`/`test.csv` + `background_shap_set.csv` junto al `.pkl` desplegado en `<bucket>/<userId>/<projectId>/<expId>/`, intentar bajarlos.

**Por qué importa:** el `test.csv` upstream es el ÚNICO holdout libre de contaminación vs el modelo desplegado (un split nuestro 80/20 puede solapar con el train original).

**Si `test.csv` upstream existe:** queda como face-value test set en Phase 8. **NO usar para training ni feature search.**

### Phase 1.2 — Upstream drop-chain audit (mandatorio cuando se hereda un pipeline existente)

Cuando el proyecto hereda un `build_features.py` previo (refresh de un modelo desplegado, segunda iteración del cliente, integración de un dataset previamente procesado por otro equipo), el pipeline upstream puede estar descartando silenciosamente columnas clínicamente útiles del raw del cliente.

**Procedimiento:**
1. Listar todas las columnas del raw del cliente (`data/raw/`) — incluyendo las que el `build_features` actual ignora.
2. Listar las columnas que sobreviven a `build_features` y llegan al modelo.
3. **Diferencia = drop-chain.** Marcar las clínicamente útiles que se cayeron silenciosamente (signos vitales, biomarcadores secundarios, mediciones físicas de baja fiabilidad pero alta señal — e.g., densidad urinaria, hemoglobina, pulso, presión).
4. Recuperar las que valen la pena via MICE / IterativeImputer (si missing-rate <60%) o flag binario `*_unknown` (si la ausencia es informativa por sí misma).
5. Re-evaluar AUROC con las features recuperadas en Phase 4 baseline antes de avanzar.

**Por qué importa:** en proyectos previos esta auditoría fue el primer uplift real de la fase (>+0.04 AUROC random) cuando todos los demás experimentos (focal loss, calibración Beta, sample weights, augmentation) fueron neutros. Drop-chains existen porque pipelines heredados se construyeron para una versión más estricta del schema.

**Antitesis con Phase 1.3 leakage gate:** Phase 1.3 quita features que predicen el target *demasiado bien* (leakage); Phase 1.2 recupera features que predicen el target *suficientemente bien* y se cayeron sin razón documentada. Ambas son auditorías de columnas pero en direcciones opuestas.

### Phase 1.3 — Leakage gate (mandatory)

Entre Phase 1 y Phase 2, antes de cualquier fit, scanner estadístico de leakage. Toda feature que construyó el target (ej. ERC computado de creatinina/eGFR/ACR upstream → esas son leakage) se descarta. Documentar en `docs/04_features.md` § "Removed for leakage".

---

## Phase 2 — EDA & cohort definition

5 figuras estándar (`standard_figures`):
1. Distribución del target.
2. Distribuciones numéricas por target.
3. Tasas categóricas por target.
4. Scatter pairwise.
5. Correlation heatmap.

Referenciar en `docs/02_eda_report.md`.

**Define en `docs/03_cohort_and_outcome.md`:** inclusión/exclusión, target encoding, baseline window, exclusiones.

**Pause-point 🔴:** target encoding cuando hay >1 interpretación clínica (ej. ERC: `Estadio_3+` vs `eGFR<60` vs label clínico textual). Inclusión/exclusión que reduzca cohorte >10%.

---

## Phase 3 — Feature engineering

Única fase con **código project-specific**. Escribir `<project>/src/features/build_features.py`:

```
def build_features(df, extended=False, drop_group=False) -> tuple[X, y, group]:
    """Return (X DataFrame, y Series, group Series). Pure, no leakage."""
    # base features (raw + capping + binary encoding)
    if extended:
        # add engineered (interactions, polynomials, composites)
    return X, y, group_col
```

Documentar cada feature con racional clínico en `docs/04_features.md`.

**Literature baseline obligatorio:** Phase 3 incluye comparación contra ≥1 scoring system publicado (KFRE, FINDRISC, Framingham, FIB-4, etc.). Sin ese baseline, la "ganancia" del modelo no es clínicamente interpretable.

---

## Phase 4 — Baseline + Optuna tuning (v0.1 → v0.2)

**Models in scope (en este orden):**
1. Logistic Regression elastic-net (interpretable baseline).
2. XGBoost · 3. LightGBM · 4. CatBoost (Optuna-tuned, 30 trials TPE).
5. Optional: voting CB+XG.

**Class imbalance:** `class_weight='balanced'` o `scale_pos_weight = (1-prev)/prev`. **Never SMOTE on tabular EHR.** Documentar en `08_decisions_log.md`.

**Validation:** stratified 80/20 holdout (seed=42) + 5-fold CV. Si hay `group` (institución, región), también LOIO.

Log en `05_modeling_log.md` (`E0`, `E1`, `E2`, …).

---

> **Antes de Phase 5** (feature search expensive), validar que el GBM baseline es la arquitectura correcta y que todos los scores publicados relevantes fueron benchmarkeados. Phases 4.1, 4.2, 4.3 son tres tracks independientes — correr todos los que apliquen.

## Phase 4.1 — Foundation tabular models (TabPFN, etc.)

Foundation models a veces matchean o superan GBMs tuneados out-of-the-box, especialmente en cohortes pequeñas (n<5,000). Vale 30 minutos antes de invertir días en feature engineering.

**Decision rule:**
- TabPFN AUROC ≥ tuned GBM + 0.01 AND latencia <100ms/pred → **propose-N al project owner**.
- TabPFN dentro de ±0.01 pero latencia >> GBM → quedarse con GBM (latencia gana en clínico).
- Documentar la comparación en `05_modeling_log.md` siempre — un "tie" descarta una hipótesis.

**Mandatorio para n<5,000.** Si no se prueba, no se puede afirmar que el GBM tuneado es la mejor arquitectura.

---

## Phase 4.2 — Transfer learning desde datasets públicos

Cuando un dataset público mayor existe para tarea relacionada (NHANES respiratorio/renal/cardio, MIMIC ICU, eICU sepsis), transfer learning puede romper el techo del cohort size.

**Estrategias:** `pretrain_finetune`, `stacking` (usar scores public-trained como feature), `feature_augmentation`.

**Decision rule:**
- Public-pretrained alone NO debería ganarle a nuestro modelo en nuestro test (poblaciones distintas). Si lo hace, sospechar harmonization error.
- Stacking que añade ≥0.01 AUROC → propose-N como v0.3 candidate.
- Sin lift → documentar el negativo (importante para conversación cliente: "probamos data pública, no ayuda porque nuestra población difiere en X").

---

## Phase 4.3 — Multi-score literature benchmark (cuando ≥2 scores publicados existen)

Phase 3 ya requiere 1 baseline literario. Cuando existen múltiples (COPD: PUMA, LFQ, SQ-COPD, COPD-PS, CDQ; CVD: Framingham, ASCVD, QRisk; renal: KFRE, MDRD, CKD-EPI), benchmarkear TODOS standalone antes de elegir cuál combinar en Phase 5.3.

**Decision rule:** elegir el score con **mayor AUROC standalone Y menor correlación de Pearson con la proba del modelo** — es el más complementario. Si ningún score tiene corr <0.85, ensemble no ayudará (Phase 5.3 retornará pure-model winner).

**Documentar TODOS los scores benchmarkeados** aunque solo se use uno — cliente y regulators preguntan "¿por qué este y no aquel?".

Caso de referencia (COPD): PUMA ganó (AUROC ~0.65, lowest corr con proba) → adoptado en 90/10 ensemble (Phase 5.3).

---

## Phase 5 — Feature search (v0.3)

Killer step. Agregar 8-15 engineered features al `extended` set, luego buscar:

**Tres etapas:** forward greedy → Optuna binary mask (TPE, 60 trials) → backward elimination.

Comparar contra v0.2_base sobre el holdout. Adoptar v0.3 solo si domina en AUROC + calibración + parsimonia o gana claro en el operating point clínico relevante.

**Honest reporting:** ganancia <0.005 AUROC = bootstrap noise, no se vende como mejora.

---

## Phase 5.1 — Feature-selection audit (mandatorio si winner set >30 columnas)

Audita el winner contra multicollinearity y over-engineering.

1. **`elasticnet_sparsity`** — qué % de features L1 zero.
2. **`compute_vif`** — flag VIF >10.
3. **`family_ablation`** — ablation por familia: `no_sq`, `no_interactions`, `no_engineered`, `no_flags`, `minimalist`.

**Decision rules:**
- Structural collinearity (OHE complementary pairs, VIF=∞) NO es problema — flag pero no actuar.
- Polynomial collinearity (`age` vs `age_sq` Pearson >0.95) la maneja ElasticNet L1 si efectivamente zero redundantes. Confirmar con sparsity.
- Si `no_engineered` está dentro del bootstrap CI de `full` (Δ AUROC <0.01) → **build parsimonious bundle (Phase 5.2)**.
- Si L1 zero <5% de features al `C` elegido, modelo no está seleccionando — aumentar regularización o documentar que engineered features genuinamente añaden valor.

Output: `results/feature_selection_audit.{md,json}`.

---

## Phase 5.2 — Parsimonious alternative bundle (`v_next_candidate`, condicional)

🔴 **Pause-point.** Cuando Phase 5.1 ablation muestra `no_engineered` estadísticamente equivalente (Δ AUROC <0.01, dentro del bootstrap CI), producir bundle alternativo como **off-ramp documentation** — NO reemplaza el deploy sin aprobación explícita.

Bundle artifacts: `.pkl` + `comparison_full_vs_parsimonious.json` + `model_card.md` con banner **"STATUS: v_next_candidate — NOT FOR DEPLOY"**.

**Por qué importa:** futuras revisiones regulatorias o ciclos de recalibración pueden priorizar simplicidad. Tener `v_next_candidate` listo (validado equivalente, documentado "por qué no desplegado hoy") evita re-hacer la auditoría 6-12 meses después.

**Lean models suelen dominar en operating points conservadores.** Aún con AUROC idéntico a la versión full, un set lean de 8-12 features puede dar **+3pp en sens@spec=0.90** vs el set full. Reportar tres puntos de operación (Youden, spec=0.85, spec=0.90) en la comparación lean-vs-full antes de elegir — el promedio AUROC oculta la diferencia que importa cuando el cliente opera en threshold conservador (típico de cribado en primer nivel donde el costo de FP es alto).

---

## Phase 5.3 — External scoring ensemble (condicional)

Si la baseline literaria de Phase 3 (KFRE, FINDRISC, PUMA, etc.) tiene discriminación comparable o complementaria sobre el test (dentro de 0.05 AUROC del modelo), evaluar weighted ensemble (linear blend) antes de lockear deploy.

**Pipeline:**
1. Calcular score externo por paciente.
2. Grid search de pesos (0/10/.../100) sobre split estratificado honesto.
3. Métricas: auroc, brier, spec_at_sens85, subgroup_F_non_smoker_auroc.

**Decision rule:** adoptar ensemble solo si peso óptimo da ≥+0.005 AUROC AND no degrada Brier ni subgrupo crítico.

**Patrones validados:**
- Caso de referencia hipoglucemia: 60/40 model+score.
- Caso de referencia COPD: 90/10 model+PUMA (modesto +0.005 AUROC, +0.029 en subgrupo demográfico crítico, defensa regulatoria más fácil que meta-stacking).

**External score NO es feature input** — se calcula independiente y se combina linealmente DESPUÉS de la predicción del modelo. Documentar claramente; nunca listar PUMA en variables dictionary slide.

---

## Phase 6 — Calibration + multi-threshold reporting

`fit_isotonic(estimator, X_train, y_train, cv=5)`.

**Pause-point 🔴 si N_pos<200** — isotónica puede sobreajustar; sigmoid (Platt) es más estable. Confirmar con el project owner.

`operating_points_table` reporta 4 thresholds:
- **aggressive** (Youden index, max sens+spec).
- **balanced** (spec=80%).
- **strict** (spec=95%).
- **confirmatory** (spec=99%).

**Por qué 4, no 1:** el operating point correcto depende del costo FN:FP, que depende del use case clínico. ML elige arquitectura; clínico elige threshold. Documentar explícito en `07_model_card.md`.

---

## Phase 6.1 — Bootstrap CI on test set (mandatory)

Point estimate de AUROC en un único 80/20 holdout es sample-size-dependent. Reportar 95% CI desde stratified bootstrap.

`bootstrap_metrics_ci(y_test, proba, n_bootstrap=1000, seed=42, target_specificity=0.85, metrics=("auroc","auprc","brier","calibration_slope","sens_at_target_spec"))`.

Stratified por clase para preservar prevalencia. Resamples que fallan (e.g., AUROC undefined cuando una clase falta) se dropean silenciosamente; flag si `n_valid<950` (>5% drop).

**Decision rules:**
- Lower bound AUROC <0.55 → modelo estadísticamente indistinguible de random; reconsiderar deployment o correr nested CV (Phase 7.1).
- CI half-width >0.05 → test set es muy chico para defender un point estimate; reportar CI en model card.
- Bootstrap CI captura variance del test set, NO del estimator (eso es nested CV).

Save CI table para CADA variant comparado en Phase 4-5 (logreg, GBMs tuned, v0.3 winner).

---

## Phase 6.2 — Per-1.000-patients clinical impact (mandatory antes de cualquier cambio de operating point)

Operating points son abstractos. Equipo clínico entiende "casos perdidos por mil tamizados" o "exámenes confirmatorios innecesarios por mil"; no entiende "Spec 50.5% vs 42.2%". Toda comparación entre bundles o threshold candidatos DEBE incluir esta traducción.

`per_1000_breakdown(bundles, cohort_prevalence, n_patients=1000)` retorna por bundle: TP, FN (cases missed), TN, FP (unnecessary referrals), total_marked.

**Decision rule:** cuando alguien propone bajar Sens X→Y para recuperar Spec, COMPUTAR FN-gained / 1000 primero. Presentar AMBOS costos:
- Ej: "Bajar Sens 85→80 cuesta ~30 casos perdidos / 1000 tamizados, ahorra ~12 exámenes confirmatorios / 1000."
- Comparar cost ratio (1 missed case vs 1 unnecessary confirmatory test) a literatura clínica.

Para condiciones subdiagnosticadas (COPD LATAM ~60-70%, CKD ~80-90%), costo de FN domina y "save tests" raramente justifica.

---

## Phase 7 — Validation: LOIO + subgroups + DCA

- `loio_validation(X, y, group, model_factory)` — AUROC por grupo retenido.
- `subgroup_table(y_test, proba, X_test, ["sex","age_bin"])`.
- `decision_curve_analysis(y_test, proba, thresholds=np.arange(0.01,0.51,0.01))`.

Si LOIO AUROC drops >0.05 vs stratified holdout, documentar como deployment-scope limitation (modelo no generaliza sin recalibración). **Pause-point 🔴** para drop de un grupo entero.

**Subgroup table: mandatorio para condiciones clínicamente heterogéneas.** Para cribado de condiciones donde la prevalencia y el patrón de presentación cambian fuerte por subgrupo (e.g., enfermedad renal en obesidad vs no-obesidad, enfermedad cardiovascular en edad <50 vs >75, control de la condición de base), reportar siempre AUROC por:
- Sexo.
- Bandas de edad clínicamente relevantes (típicamente <50 / 50-65 / 65-75 / 75+).
- Bandas del biomarcador clínico principal cuando aplica (e.g., HbA1c bandas para diabéticos, control PA para hipertensos, IMC bandas para metabólico).
- Severidad / control de la condición de base.

**Decision rule — el delta promedio puede esconder pérdidas concentradas.** Cuando se compara dos variantes (modelo nuevo vs deployed, lean vs full, combined vs specialized) y el ΔAUROC promedio es pequeño (e.g., ±0.02), siempre leer la tabla por subgrupo antes de recomendar. Una pérdida concentrada ≥0.05 en un subgrupo clínicamente crítico (enfermedad controlada, comorbilidad, edad avanzada) es deal-breaker incluso cuando el promedio es aceptable. Reportar la distribución completa al project owner — el headline NO es el promedio si la varianza por subgrupo es alta. Ver hard rule #16.

---

## Phase 7.1 — Nested CV (opcional, condicional)

Single 80/20 + bootstrap captura *sampling* variance, no *estimator* variance. Cuando test set chico o bootstrap CI ancho, nested CV escala.

**Invocar si:**
- `n_total<2000` AND bootstrap CI half-width >0.05 sobre AUROC.
- Bootstrap lower bound AUROC <0.55.
- Reviewer/regulator pide variance del estimator.
- `cv_auroc_std` baseline 5-fold >0.04.

**Skip si:** `n_total>10,000` o compute budget restringido.

`nested_cv_evaluation(X_full[winner], y_full, model_factory=frozen_arch, n_outer_splits=5, n_outer_repeats=3, n_inner_calibration_folds=5, calibrate=True)` → 15 outer folds.

**Frozen-architecture design:** por default no re-tunea hparams ni re-corre feature search por fold. Mide cuán estable es *esa arquitectura* across resamples.

---

## Phase 8 — Comparison vs deployed (si existe)

1. Bajar artefactos del bucket: `.pkl`, `means.npy`, `stds.npy`, `background_shap_set.csv`.
2. **(a) Face-value en NUESTRO re-split holdout** — conveniente pero puede contaminarse.
3. **(b) Face-value en UPSTREAM `test.csv`** (preferred si Phase 1.1 lo encontró) — leakage-free 1:1.
4. **(c) Leakage check** entre `background_shap_set` upstream y nuestro train/test (sanity).
5. **(d) Honest CV replicating la arquitectura desplegada** sobre full cohort.

**Critical lesson:** AUROC del deployed sobre tu holdout puede estar inflado por contamination. SIEMPRE:
1. Preferir upstream `test.csv` de Phase 1.1.
2. Replicar honestamente la arquitectura.
3. Comparar honest CV vs deployed-on-holdout. Gap >0.05 = leakage red flag.

Documentar en `docs/06_results.md § N` y `D-NNN` en `08_decisions_log.md`. Reportar AMBOS números (face-value re-split Y upstream test) — deben coincidir dentro de sampling noise; si no, la divergencia ES el finding.

---

## Phase 8.1 — Combined-cohort vs specialized decision (condicional)

**Cuándo aplica:** el cliente opera 2+ modelos especializados sobre cohortes clínicamente relacionadas (e.g., cohorte con patología metabólica + cohorte con patología cardiovascular, ambas con un mismo desenlace renal) y se evalúa migrar a un modelo único unificado para reducir overhead operacional (un solo monitoreo, una sola recalibración, un solo SHAP poster).

**Goal:** decidir con evidencia si conviene reemplazar 2 especializados con 1 combinado, o mantener especializados.

### Procedimiento

1. **Construir schema unificado:**
   - Features comunes (presentes en ambas cohortes).
   - Features cohort-only (presentes solo en una cohorte) con `NaN` cuando no aplica — los GBMs manejan NaN nativamente.
   - **Cohort flags explícitos**: `is_<cohorte_A>`, `is_<cohorte_B>`, `is_both`. Documentar que pueden tener importancia <1% si una variable continua redundante codifica el cohorte (ver pitfall en SKILL.md).
   - Features derivadas (interacciones, polinomios) calculadas sobre el schema unificado.

2. **Subsamplear el cohorte de mayor prevalencia** del positivo para evitar imbalance artificial entre cohortes. La meta es que el modelo combinado vea proporciones realistas de cada cohorte, no la distribución de los datos crudos.

3. **Entrenar el modelo combinado** con el mismo random_state que cada modelo especializado (`random_state=42` por convención del skill).

4. **Apples-to-apples por cohorte (CRÍTICO):** aplicar el modelo combinado al EXACTO mismo split de test que cada especializado.
   - Reproducir el split del especializado vía `train_test_split` con mismo `random_state` y misma estratificación.
   - Aplicar el combinado sobre ese split idéntico.
   - Comparar `combined.predict_proba` vs `specialized.predict_proba` paciente-a-paciente.
   - Esto NO es opcional — comparar el combinado en su propio split vs el especializado en SU propio split es un confound clásico (los splits son distintos).

5. **Reportar tres tablas:**
   - **(a)** AUROC global combinado (todas las cohortes juntas).
   - **(b)** AUROC del combinado restringido al split de cada especializado vs el especializado en su propio split.
   - **(c)** Tabla por subgrupo en cada cohorte (ver Phase 7 — sexo, edad, control, biomarcador principal).

### Decision rule

| Caso | Acción |
|---|---|
| Pérdidas **uniformes** (todos los subgrupos en ±0.011 vs especializado) | Considerar combined si la ganancia operacional compensa la pérdida promedio. **Pause-point #18** obligatorio. |
| Pérdidas **concentradas** en subgrupos clínicamente críticos (≥0.05 AUROC drop) | **Mantener especializados.** Pause-point #18 con la tabla de pérdidas como evidencia. Documentar como `D-NNN`. |
| Combined **descarta cohort flags** (<1% SHAP) porque hay signal continuo redundante | Confirmar que el modelo igual respeta la pertenencia al cohorte vía análisis por subgrupo. No es bug; es comportamiento esperado de árboles. Pero significa que la lógica cohort-aware vive en una sola feature continua, no en los flags — fragilidad para casos atípicos. |
| Combined gana en alguna cohorte y pierde en otra | NUNCA promediar las dos. La cohorte que pierde es el constraint binding. |

**Caso de referencia:** combined model −0.024 AUROC promedio en una cohorte (vs especializado), aceptable a primera vista. Tabla por subgrupo reveló: pacientes con la condición de base controlada perdieron −0.10, obesidad perdió −0.06, edad 65+ perdió −0.05. La cohorte hermana se preservó uniformemente (todos los subgrupos en ±0.011). Decisión: mantener especializados, documentar D-NNN. La pérdida concentrada en pacientes con la condición controlada — justo el subgrupo donde el cribado más agrega valor — fue deal-breaker.

### Output

- `results/combined_vs_specialized_apples_to_apples.{md,csv}` — tabla (b).
- `results/combined_subgroups_per_cohort.{md,csv}` — tabla (c).
- `results/combined_shap_aggregated.{md,csv}` — SHAP del combinado agregado por variable clínica (Phase 6, regla cliente-communication.md).
- `D-NNN` en `08_decisions_log.md` con la decisión + justificación + tabla de subgrupos.

---

## Phase 9 — Re-train winner on full cohort

Una vez v0.3 (o variante) gana, re-fit sobre full N (sin holdout) para producción:

```
final = fit_isotonic(make_catboost(best_params), X_full[winner_features], y_full, cv=5)
pickle.dump({"label": "vN_full_cohort", "features": winner_features, "model": final},
            open("artifacts/vN_full_cohort.pkl", "wb"))
```

Este es el artefacto de deploy. El holdout 80/20 fue solo para evaluación honesta.

---

## Phase 10 — Model card + decisions log

`docs/07_model_card.md` (Mitchell-style) + append a `docs/08_decisions_log.md` (`D-001…D-NNN`, formato `Decisión → Razón → Aplicación`, append-only).

**Mandatory model card sections:**
- Detalles del modelo (name, version, type, hyperparams, artifact path).
- Uso previsto + 🚫 fuera de alcance.
- Datos de entrenamiento + cohorte + prevalencia.
- Features (in/out).
- Output (probabilidad calibrada + thresholds operativos por uso clínico).
- Desempeño global + por subgrupos + LOIO.
- Limitaciones conocidas (siempre incluye al menos: cohorte limitada, features faltantes, posibles correlaciones causales engañosas).
- Consideraciones éticas (equidad, privacidad, daños/beneficios).
- Recomendaciones de uso.

---

## Phase 11 — Model-registry packaging (deferred)

Solo después de cumplir métricas target:
- AUROC ≥0.75.
- Brier <0.13.
- Calibration slope 0.95-1.05.
- Net benefit positivo en DCA en threshold clínico.

Producir: `model.pkl`, `means.npy`, `stds.npy`, `background_shap_set.csv`, `<exp_id>_<projectId>_<userId>_sucess_io_data.json`.

---

## Phase 12 — Cliente-facing materials

En `<project>/docs/cliente/`:

```
cliente/
├── 1pager_<project>.md              # 1-page summary, technical-leaning
├── talking_points.md                # Q&A script para reunión cliente
├── slides_outline.md                # Slide-by-slide narrativa
├── deploy_spec.md                   # API contract + monitoring plan
└── team_presentation/index.html     # HTML deck self-contained
```

**11-slide template** validado en producción:

1. **Cover** — `Ark × Cliente` lockup, project + date + version.
2. **Problem** — por qué cambiar el deployed (≤4 limitaciones numeradas).
3. **Headline** — UN big number (típicamente AUROC delta) + side panel con métricas mantenidas.
4. **Features comparison** — production list (N variables) izquierda, new model mostrando SOLO las NUEVAS (M-N) derecha. No repetir compartidas.
5. **Variables dictionary** — nombres clínicos español + tipo + range/categorías. `existe / no existe` para binarias, min-max para numéricas, listas categóricas explícitas. Marcar NEW con ★.
6. **Metrics comparison** — tabla side-by-side, highlight rows que mejoraron.
7. **Subgroups** — bar chart por demographic split.
8. **SHAP comparison** — agregado por variable clínica (NUNCA por OHE column), en % del total importance.
9. **Architecture** — visual del ensemble (modelo + score externo, 90% / 10%).
10. **Insights** — 3 cards en plain language, una idea por card.
11. **CTA / next steps** — acciones numeradas + bundle path + audit references.

Convenciones obligatorias en `references/cliente-communication.md` (variables en español clínico, jargon translation, framing de "spec sin cambio", manejo de discrepancia deployed vs honest re-eval).
