---
name: screening-model-trainer
description: Train a calibrated binary clinical-screening ML model end-to-end on tabular EHR data, following TRIPOD+AI, with foundation-model + transfer-learning + multi-score literature benchmarks, feature audit, parsimonious bundle, bootstrap CI, LOIO validation, and cliente-facing materials. Use when the user asks to build/train/refresh a screening model for a clinical condition (CKD/ERC, diabetes, hypertension, COPD/EPOC, etc.) on a tabular EHR dataset.
version: 2.0.0
author: laura.bellon@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [ml, training, screening, clinical, ehr, tripod-ai]
    category: model-training
    requires_toolsets: [terminal]
---

# screening-model-trainer

End-to-end methodology for training a calibrated binary clinical-screening ML model on tabular EHR data, conformante con TRIPOD+AI. Encapsula los patrones validados en producción para tabular learning sobre cohortes clínicas pequeñas, comparado contra modelos fundacionales (TabPFN), transfer learning desde datasets públicos (NHANES/MIMIC), múltiples scores publicados (KFRE, FINDRISC, PUMA, etc.), con auditoría de features, bundle parsimonioso opcional, validación LOIO + bootstrap CI + decision-curve analysis, y materiales cliente.

Es la contraparte de `attrition-model-trainer` (rotación de personal sobre HR/SST): comparten metodología pero el dominio, los costos y las reglas son distintos.

## When to Use

- Cuando el usuario pide "entrena/refresca un modelo de tamizaje / screening para X" donde X es una condición clínica binaria (CKD/ERC, diabetes, HTA, COPD/EPOC, falla renal, etc.).
- Cuando el dataset viene de un EHR data lake / object store (Supabase Storage, S3, etc.) en formato CSV / zip portable.
- Cuando hay un modelo desplegado para esa condición y se necesita comparación honesta vs el actual (Phase 8).
- Cuando existen scores clínicos publicados para la condición y hay que decidir cuál integrar (Phase 4.3, Phase 5.3).
- Cuando el cliente requiere materiales explicativos (deck HTML + 1-pager + talking points) además del model card.

**No uses:** para outcomes no clínicos (usa `attrition-model-trainer` o crea otra skill), para datasets no tabulares (imágenes, texto libre, señales), para problemas multiclass primarios (este skill es binario), o cuando la cohorte es n>100k (el skill optimiza para n<10k típico de EHR clínica).

## Procedure

El workflow son **13 fases principales (Phase 0–12) con sub-numeración linear N.X** (e.g., 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 8.1) mapeadas a 9 deliverables markdown TRIPOD+AI en `templates/`. Cada fase produce artefactos concretos y se registra en `docs/05_modeling_log.md`. Detalle completo en `references/methodology.md`.

1. **Phase 0 — Project scaffolding.** Crear `<project>/model_training/{docs,src,data,artifacts,results,tests}` y copiar los 9 templates a `docs/`.

2. **Phase 1 — Data ingestion.** Bajar zip / CSV del EHR data store, normalizar a CSV en `data/interim/`. Documentar cada columna en `docs/01_data_dictionary.md`. **Phase 1.1 — Probe upstream pre-existing splits**: si hay modelo desplegado, intentar bajar `train.csv`/`val.csv`/`test.csv` upstream — son el holdout honesto vs deployed. **Phase 1.2 — Upstream drop-chain audit** mandatorio cuando se hereda un `build_features` previo: listar columnas del raw vs columnas que llegan al modelo, recuperar las clínicamente útiles silenciosamente descartadas via MICE. **Phase 1.3 — Leakage gate** obligatorio antes de modelar.

3. **Phase 2 — EDA + cohort.** Generar las 5 figuras estándar. Definir inclusión/exclusión, target encoding, baseline window en `docs/03_cohort_and_outcome.md`. **Pause-point 🔴** cuando hay >1 interpretación clínica del target o cuando inclusión/exclusión reduce cohorte >10%.

4. **Phase 3 — Feature engineering.** Es la única fase que requiere código project-specific (`src/features/build_features.py`): función pura `build_features(df, extended, drop_group) -> (X, y, group)`. Documentar cada feature con racional clínico en `docs/04_features.md`. **Literature baseline obligatorio** (Phase 3 incluye ≥1 scoring system publicado).

5. **Phase 4 — Baseline + Optuna tuning (v0.1 → v0.2).** Logistic Regression elastic-net + XGB + LightGBM + CatBoost con `class_weight='balanced'`. Optuna 30 trials (TPE). **Nunca SMOTE.** Stratified 80/20 holdout (seed=42) + 5-fold CV + LOIO si hay `group`.

6. **Phases 4.1, 4.2, 4.3 — Alternative architectures + multi-score benchmark (mandatory).** Tres sub-fases **paralelas e independientes** (no secuenciales — correr las que apliquen al proyecto, en cualquier orden):
   - **Phase 4.1 — Foundation models (TabPFN, etc.):** mandatorio para `n<5,000`. Comparar AUROC + latencia clínica (<100ms/pred). Si TabPFN ≥ GBM + 0.01 AUROC y latencia OK → propose-N al project owner.
   - **Phase 4.2 — Transfer learning** desde datasets públicos (NHANES, MIMIC, eICU) cuando aplica. Pretrain + fine-tune o stacking.
   - **Phase 4.3 — Multi-score literature benchmark** cuando ≥2 scores publicados existen para la condición (ej. PUMA, LFQ, SQ-COPD para COPD; KFRE, MDRD, CKD-EPI para CKD). Pickear el menos correlacionado con la proba del modelo para Phase 5.3.

7. **Phase 5 — Feature search (v0.3).** Hybrid: forward greedy → Optuna binary mask (TPE, 60 trials) → backward elimination. Solo adoptar v0.3 si domina v0.2 en AUROC + calibración + parsimonia o gana claro en el operating point clínico relevante. **Hard rule:** ganancia <0.005 AUROC es bootstrap noise, no se vende como mejora.

8. **Phase 5.1 — Feature audit (post-hoc, mandatorio si winner set >30 columnas).** ElasticNet sparsity (qué % de features L1 zero), VIF (>10 = redflag), ablation por familia (no_sq, no_interactions, no_engineered, no_flags, minimalist).

9. **Phase 5.2 — Parsimonious alternative bundle (`v_next_candidate`, condicional).** **Pause-point 🔴** cuando ablation muestra `no_engineered` Δ AUROC <0.01 dentro del bootstrap CI. Producir bundle alternativo como off-ramp documentado, NO reemplaza el deploy actual sin aprobación.

10. **Phase 5.3 — External scoring ensemble (condicional).** Combinar modelo con score publicado (PUMA/KFRE/FINDRISC) en mezcla 90/10 o 60/40 si hay complementariedad (Pearson <0.85 con proba). Casos de referencia típicos: 60/40 model+score en hipoglucemia; 90/10 model+PUMA en COPD.

11. **Phase 6 — Calibration + 4 operating thresholds.** Isotonic regression (CV=5) si N_pos suficiente; sigmoid si N_pos<200 (**pause-point 🔴**). Reportar 4 thresholds: aggressive (Youden), balanced (spec=80%), strict (spec=95%), confirmatory (spec=99%). **El deck cliente recomienda UN default explícitamente** (típicamente el "sweet spot" donde el modelo nuevo vence simultáneamente al desplegado en Sens y Spec en al menos una cohorte) — el kit completo queda en slide-detalle/anexo.

12. **Phase 6.1 — Bootstrap CI (mandatory).** 1000 resamples estratificados por clase para AUROC, AUPRC, Brier, calibration slope, sens@target_spec. Reportar CI95% junto al point estimate.

13. **Phase 6.2 — Per-1.000-patients clinical impact (mandatory antes de cualquier cambio de operating point).** Traducir Sens/Spec a TP/FN/TN/FP por 1000 pacientes. **Nunca cambiar operating point sin computar FN-perdidos.** Para condiciones subdiagnosticadas (COPD LATAM ~60-70%, CKD ~80-90%), el costo de FN domina.

14. **Phase 6.3 — Hybrid rules safety-net check (condicional).** Cuando un stakeholder sugiere agregar reglas clínicas duras (KDIGO/ADA/GOLD) post-inferencia como safety net, evaluar empíricamente: `flag = (model ≥ thr_recomendado) OR (regla_score ≥ K)` vs modelo solo en Captura amplia. Si el modelo solo en Captura amplia iguala o supera al modelo+reglas en sensibilidad → no añadir reglas (el `extended` set ya las codifica estadísticamente). Documentar el experimento en deck-anexo (transparencia metodológica).

15. **Phase 7 — Validation: LOIO + subgroups + DCA.** Leave-One-Institution-Out, subgroup tables (sex, age_bin, etc.), Decision Curve Analysis. **Phase 7.1 — Nested CV (opcional)** cuando `n<2000` y bootstrap CI half-width >0.05.

16. **Phase 8 — Comparison vs deployed (si existe).** Bajar artefactos de Modal/Supabase, replicate inference, leakage check, honest CV replicando arquitectura desplegada. **Hard rule:** nunca aceptar AUROC del deployed at face value. Preferir `test.csv` upstream de Phase 1.1. **Phase 8.1 — Combined-cohort vs specialized decision (condicional)**: cuando el cliente opera 2+ modelos especializados sobre cohortes relacionadas, evaluar modelo unificado con apples-to-apples por cohorte + tabla por subgrupo + decision rule (mantener especializados si la pérdida está concentrada en subgrupos críticos).

17. **Phase 9 — Re-fit winner on full cohort.** `vN_full_cohort.pkl` con `{label, features, model}`. Este es el artefacto que despliegas; el holdout fue solo para evaluación honesta.

18. **Phase 10 — Model card + decisions log.** `docs/07_model_card.md` Mitchell-style + append a `docs/08_decisions_log.md` (`D-NNN: Decisión → Razón → Aplicación`).

19. **Phase 11 — Model-registry packaging (deferred).** Solo después de cumplir métricas target (AUROC ≥0.75, Brier <0.13, calibration slope 0.95-1.05, DCA positivo en threshold clínico). Producir `model.pkl`, `means.npy`, `stds.npy`, `background_shap_set.csv`, `<exp_id>_..._sucess_io_data.json`.

20. **Phase 12 — Cliente-facing materials.** En `docs/cliente/`: 1pager, talking_points, slides_outline, deploy_spec, y deck HTML 11-slide (Cover → Problem → Headline → Features comparison → Variables dictionary → Metrics → Subgroups → SHAP → Architecture → Insights → CTA). Convenciones obligatorias en `references/cliente-communication.md`.

**Operación entre fases:** Claude opera en uno de tres modos por paso (🟢 Autónomo / 🟡 Propose-N / 🔴 Pause-and-ask) con 18 pause-points obligatorios y 16 hard rules no negociables. Ver `references/operating-modes.md` (los 3 modos) y `references/governance.md` (rules + pause-points keyed by phase).

**Una hipótesis por iteración.** Cada experimento numerado (`E0`, `E1`, …) en `05_modeling_log.md` cambia exactamente una variable. Cada métrica producida se escribe a `artifacts/trial_log.jsonl`.

## Pitfalls

- **Síntoma:** AUROC se cae al desplegar; el modelo "funcionaba bien en validación". **Causa:** SMOTE (u otro oversampling de toda la cohorte) sobre tabular EHR distorsiona la calibración. **Fix:** nunca SMOTE whole cohort; usar `class_weight='balanced'`. Excepción documentada — SMOTE dirigido a un subgrupo con informational ceiling validado por 5+ ablations (típicamente subgrupo demográfico crítico). Pause-point 🔴 antes.

- **Síntoma:** "el modelo desplegado tiene AUROC 0.85 según el equipo de modelado" pero al replicar inferencia en nuestro holdout da 0.62. **Causa:** train/test contamination en el deploy original — su "test" tenía rows que también estaban en su train. **Fix:** Phase 1.1 mandatorio (bajar `test.csv` upstream del bucket), Phase 8 honest CV replicating la arquitectura desplegada. Reportar **ambos** números cuando upstream `test.csv` exista.

- **Síntoma:** v0.3 gana v0.2 por +0.003 AUROC y se reporta como mejora. **Causa:** la ganancia está dentro del CI half-width del bootstrap (típicamente >0.005 con n_test<2000). **Fix:** hard rule — feature search wins <0.005 AUROC son ruido. Reportar como negative result en `05_modeling_log.md` y considerar `v_next_candidate` parsimonious bundle (Phase 5.2) si `no_engineered` da números equivalentes.

- **Síntoma:** se incluyen creatinina + eGFR + ACR como features y el modelo "explica" ERC. **Causa:** label leakage — el target ERC se construyó upstream de esas mismas variables. **Fix:** ejecutar leakage gate (Phase 1.3) entre Phase 1 y Phase 2; documentar features descartadas en `04_features.md`.

- **Síntoma:** cliente pregunta "¿por qué la spec se mantiene igual si el modelo es mejor?" en una reunión y no hay respuesta clara. **Causa:** el threshold del nuevo modelo se eligió para reproducir la sensibilidad target del cliente, así que las dos curvas ROC coinciden por construcción en ese punto. **Fix:** framing explícito — "la ganancia AUROC viene de que TODO EL RESTO de la curva es mejor; el threshold actual está fijo para no costar operativamente, pero podés moverlo a otros puntos donde producción no puede llegar". Ver `references/cliente-communication.md` § "Por qué la spec se mantiene igual".

- **Síntoma:** se publica deck cliente con "modelo calibrado, Brier=0.13" y el cliente clínico no lo entiende. **Causa:** el equipo ML usó jargon. **Fix:** usar la tabla de traducción de `references/cliente-communication.md`. "calibrado" → "probabilidad clínica validada"; "Brier" → "validamos que cuando dice 70%, son 70 de cada 100"; nunca "AUROC" sin acompañar de "qué tan bien separa enfermos de sanos". Variables clínicas en español (`bmi` → `Índice de Masa Corporal`); binarias `existe / no existe`, no `sí / no`.

- **Síntoma:** el project owner pregunta "¿por qué PUMA y no LFQ?" en revisión y no hay datos para responder. **Causa:** Phase 4.3 se saltó — solo se benchmarkeó el primer score que apareció en literatura. **Fix:** cuando ≥2 scores publicados existen, benchmark sistemático de TODOS antes de elegir cuál integrar (mandatorio para Phase 5.3). Documentar también los descartados — regulators y cliente preguntan.

- **Síntoma:** `cross_val_score(catboost_model, X, y, cv=5)` retorna AUROC ≈ 0.5 silenciosamente — el feature search produce winners aleatorios. **Causa:** las utilities de sklearn `cross_val_score`, `cross_val_predict`, `cross_validate`, `GridSearchCV`, `RandomizedSearchCV` invocan `sklearn.clone()` en cada fold para producir un estimator fresco — y `clone()` no preserva correctamente los estimadores CatBoost; el modelo en cada fold queda sin entrenar. **El bug es de `clone()`, NO de paralelismo:** `n_jobs` solo controla parallel execution; `clone()` corre en cada fold sin importar el valor de `n_jobs` (`1`, `-1`, o cualquier otro). Confiar en `n_jobs=1` como "configuración segura" reproduce exactamente el mismo problema. **Fix:** evitar las CV utilities de sklearn cuando hay CatBoost embedded. Reemplazar por loops de CV manuales con instanciación explícita por fold (`CatBoostClassifier(**params)` dentro del loop, no `clone()`). Aplica a `cross_val_score`, `cross_val_predict`, `cross_validate`, `GridSearchCV`, `RandomizedSearchCV`, y `Pipeline` con CatBoost embedded.

- **Síntoma:** stacking pipeline con LogisticRegression como meta-learner falla con `ValueError: Input contains NaN`. **Causa:** los base models (CatBoost, LightGBM, XGBoost) toleran NaN nativamente, así que el feature matrix entra al meta-learner con NaNs en columnas que los base models predijeron sin imputación. LR no acepta NaN. **Fix:** agregar `SimpleImputer(strategy="median")` como **primer paso** del pipeline del meta-learner — antes de cualquier scaler/transformer si existe, o como único paso de imputación si el meta-learner es solo LR. Los base models siguen sin imputación; solo el meta-learner la requiere.

- **Síntoma:** se entrena modelo combinado multi-cohorte con cohort flags explícitos (`is_<cohorte_A>`, `is_<cohorte_B>`) y SHAP los muestra con <1% de importancia, lo que parece bug. **Causa:** una variable continua redundante ya codifica el cohorte (e.g., una distribución bimodal de un biomarcador clínico que separa las cohortes naturalmente). Los GBMs encuentran el split en esa variable continua y los flags binarios quedan redundantes. **Fix:** confirmar via análisis por subgrupo que el modelo igual respeta la pertenencia al cohorte (tabla AUROC por cohorte). No es bug; es comportamiento esperado de árboles. **Implicación operacional:** la lógica cohort-aware vive en una sola feature continua, no en los flags — fragilidad para casos atípicos donde esa variable está fuera de su distribución típica. Ver Phase 8.1 + pause-point PP-18.

- **Síntoma:** stakeholder clínico sugiere agregar reglas duras (KDIGO/ADA/GOLD) como safety net post-inferencia para "no perder pacientes obvios". Se implementa la regla y al evaluar en cohortes externas, el modelo solo en su threshold más sensible (Captura amplia / Youden) iguala o supera al modelo+reglas en sensibilidad — sin caída de PPV. **Causa:** el `extended` set de Phase 3 ya incluye step flags clínicos (`age_ge_75`, `tas_ge_160`, `condition_risk_proxy`, `htn_severity`) que codifican estadísticamente las mismas reglas. El modelo aprende los pesos óptimos de las reglas en lugar de imponer cutoffs binarios. **Fix:** correr Phase 6.3 (Hybrid rules safety-net check) ANTES de implementar safety net. Si el modelo solo en Captura amplia iguala/supera al modelo+reglas, NO añadir reglas — agrega complejidad operacional sin lift. Documentar el negativo en deck-anexo (transparencia metodológica) — el stakeholder clínico aprecia ver que la pregunta se respondió empíricamente.

- **Síntoma:** en la tabla side-by-side cliente, Producción reporta Sens 91% / F1 0.91 / Acc 90% pero el modelo nuevo da Sens 51% / F1 0.58 / Acc 90% — el cliente lee "el nuevo modelo es peor en sensibilidad". **Causa:** Producción se entrenó con SMOTE/oversampling y reporta métricas sobre test balanceado (~50% prev artificial), inflando Sens/F1/Acc simultáneamente. El nuevo modelo se evalúa correctamente sobre prevalencia natural (e.g., 13%), donde Sens/F1 caen aritméticamente con la prevalencia. **Fix:** liderar con AUC (invariante a prevalencia) en la headline; en la tabla side-by-side poner "ver nota ↓" en el delta de Sens/F1/Acc en lugar de calcular un delta numérico (que es matemáticamente correcto pero comunicacionalmente desastroso); caja metodológica naranja al pie explicando la diferencia de prevalencia. Ver `references/cliente-communication.md` § "Sub-caso: producción reportada sobre test balanceado".

## Verification

Al cierre de la invocación el proyecto target debe contener:

- `docs/00..08_*.md` — los 9 deliverables TRIPOD+AI markdown llenos.
- `docs/cliente/{1pager,talking_points,slides_outline,deploy_spec}.md` + `team_presentation/index.html` — Phase 12.
- `artifacts/trial_log.jsonl` — al menos una fila por experimento numerado en `05_modeling_log.md`.
- `artifacts/dataset_profile.json` — generado en Phase 1.
- `artifacts/best_params_<model>.json` + `optuna_study_<model>.pkl` — Phase 4.
- `artifacts/feature_search/` — Phase 5.
- `artifacts/vN_full_cohort.pkl` — modelo ganador re-entrenado.
- `artifacts/v_next_candidate/` — bundle parsimonioso si Phase 5.2 aplicó.
- `results/operating_points.csv` (4 thresholds) + `bootstrap_ci_winner.csv` + `feature_selection_audit.{md,json}` + `per_1000_breakdown.csv`.
- (si aplica) `results/comparison_vs_deployed.md` con face-value sobre upstream `test.csv` Y face-value sobre re-split (deben coincidir dentro de sampling noise).
- `docs/08_decisions_log.md` — al menos `D-001` (target encoding), `D-NNN` para cada decisión 🟡 propose-N (calibración, threshold, ensemble weight, parsimonious vs full, etc.), formato `Decisión → Razón → Aplicación`.
- Métricas reportadas en `docs/06_results.md` y `07_model_card.md` incluyen **AUROC + AUPRC + Brier + slope/intercept + ≥4 operating points + bootstrap CI95%**. Reportar solo AUROC se rechaza.
- Calibration slope ∈ [0.95, 1.05] en el modelo final desplegable; si está fuera, recalibrar o documentar como limitación.
- DCA: net benefit positivo en el threshold clínico target.
- Cliente deck cumple convenciones de `references/cliente-communication.md`: variables en español clínico, `existe/no existe` para binarias, SHAP agregado por variable clínica (no por OHE), tabla de jargon respetada.

Smoke test del skill: copiar `skills/screening-model-trainer/` a `~/.claude/skills/` y verificar que Claude Code reconoce el skill por su `description` cuando se le pide "entrena un modelo de screening para CKD".

## References

- `references/methodology.md` — las 13 fases (Phase 0–12) con sub-numeración linear N.X en detalle (objetivos, inputs, outputs, criterios de salida, fórmulas).
- `references/governance.md` — 16 hard rules + 1 bonus + 18 pause-points organizados por la fase donde aplican. Numeración estable (`#6`, `PP-3`).
- `references/operating-modes.md` — los 3 modos (🟢 Autónomo / 🟡 Propose-N / 🔴 Pause-and-ask) con ejemplos.
- `references/cliente-communication.md` — convenciones obligatorias para materiales externos: variables en español clínico, tabla de jargon, framing PPV/selectividad, framing de "spec sin cambio", SHAP por variable clínica, manejo de discrepancias deployed vs honest re-eval.
- `templates/00_literature_review.md` … `templates/08_decisions_log.md` — scaffolds TRIPOD+AI a copiar a `docs/` del proyecto target.
- Sibling skill: `skills/attrition-model-trainer/SKILL.md` (rotación de personal sobre HR/SST).
