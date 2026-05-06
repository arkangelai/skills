---
name: attrition-model-trainer
description: Train a calibrated employee-attrition / retention ML model end-to-end on tabular HR/SST data, with multiclass reformulation, ICL noise handling, foundation-model benchmark (TabPFN), sliding-window OOT validation, calibration audit, threshold + business-value analysis, optional hybrid ML+rules deployment, and client-facing deliverables. Use when the user asks to build, train, or refresh an attrition / turnover / retention model (e.g. "entrena un modelo de retiro", "predice qué empleados van a renunciar", "refresca el modelo de attrition").
version: 1.1.0
author: laura.bellon@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [ml, training, attrition, retention, hr, sst, tabpfn, calibration, oot]
    category: model-training
    requires_toolsets: [terminal]
---

# attrition-model-trainer

End-to-end methodology for training a calibrated employee-attrition / retention ML model on tabular HR or occupational-health (SST) data. Encapsula los patrones reutilizables validados en producción: multiclass reformulation, ICL noise handling, **foundation-model benchmark (TabPFN)**, **sliding-window OOT validation con bootstrap delta CI**, **cohort-indicator leakage detection**, **calibration audit a nivel de bucket**, threshold + business-value analysis, hybrid ML+rules deployment (con check obligatorio de degradación), packaging spec para deployment, y client-facing deliverables (1pager + slides HTML/CSS + deploy spec).

Es la contraparte de `screening-model-trainer` (screening clínico binario): comparten metodología pero el dominio, los costos y las reglas son distintos.

## When to Use

- Cuando el usuario pide "entrena/refresca un modelo de retiro / attrition / rotación / turnover".
- Cuando hay que predecir qué empleados van a renunciar o retirarse en una ventana temporal.
- Cuando el dataset es **tabular** (HR exports + SST + datos de cargo / fechas / salarios) y el target es binario o reformulable a multiclass (ACTIVO / PRE-RETIRADO / RETIRADO).
- Cuando se necesita filtrar candidatos de preingreso por riesgo de retiro.
- Cuando hay reglas de negocio explícitas que deben combinarse con el score ML (hybrid scorer).

**No uses:** para texto libre (notas de RH, reseñas), imágenes, datos no tabulares, modelos clínicos (usa `screening-model-trainer`), o problemas que no son de attrition (performance, promoción, salario).

## Procedure

El workflow son **14 fases** mapeadas a 15 deliverables markdown en `templates/`. Cada fase produce un artefacto concreto y se registra en `docs/05_modeling_log.md`. Para detalle de cada fase, ver `references/methodology.md`.

1. **Phase 0 — Project scaffolding.** Crear `<project>/model_training/{docs,src,data/{raw,interim,processed},artifacts,results,tests}` y copiar los 15 templates a `docs/`.

2. **Phase 1 — Data ingestion & cleaning.** Mergear los CSVs (encuestas SST, cargos, fechas, salarios) por `employee_id`. Documentar cada columna en `docs/01_data_dictionary.md`. Correr **leakage gate + cohort-indicator scan** (Phase 1.5) antes de modelar — features que construyeron el target se descartan; cohort indicators (`Tipo_examen`, `Wave_*`, `Phase_*`) se marcan para validación OOT obligatoria.

3. **Phase 2 — EDA + cohort + arquetipos.** Generar las 5 figuras estándar. Definir inclusión/exclusión y target en `docs/03_cohort_and_outcome.md`. **Pause-point 🔴**: agrupación de cargos / arquetipos cuando los grupos existentes no encajan con el negocio.

4. **Phase 3 — Baseline binary.** Entrenar LR elastic-net + XGB + LightGBM + CatBoost con `class_weight='balanced'` o `scale_pos_weight`. Stratified 80/20 holdout (seed=42) + 5-fold CV + LOIO si hay grupos. **Nunca SMOTE.** Comparar contra al menos un baseline literario / regla de dominio.

5. **Phase 4 — ICL (noise-robust training).** Aplicar Iterative Confidence Learning (5 rondas, 5-fold CV) para identificar labels ruidosos. En implementaciones de referencia esto suele subir AUC en el orden de +0.02-0.03.

6. **Phase 5 — Multiclass reformulation.** Cuando el binary AUC se estanca, derivar 3 clases (NEGATIVE / INTERMEDIATE / POSITIVE) desde las probabilidades OOF binarias. **No tocar los labels originales.** **Pause-point 🔴** antes de cambiar la estructura del problema.

7. **Phase 5.5 — Foundation model benchmark (TabPFN).** Si binary AUC se estanca **o** un cohort indicator aparece en top-5 importance (Hard rule 17), TabPFN entra como benchmark obligatorio antes del ensemble. Pre-trained foundation model que en datasets <2k filas suele beat ensemble y es robusto a cohort drift. **Pause-point 🔴** antes de adoptarlo (latencia 1-2s, artefacto 30MB).

8. **Phase 6 — Optuna-weighted ensemble.** Combinar ~10 modelos diversos con pesos optimizados por Optuna contra AUC binario. Outer 5×5 RepeatedStratifiedKFold para evaluación honesta.

9. **Phase 6.5 — Sliding-window OOT validation (mandatory si timestamp).** Si el dataset tiene `Fecha_registro`, ≥3 cortes mensuales (train-on-past, eval-on-future) + bootstrap delta AUC CI (1000 reps). Random CV solo no se acepta en `model_card.md`. **Pause-point 🔴** para definir cortes (eventos históricos pueden invalidar ventanas).

10. **Phase 7 — Synthetic augmentation (opcional).** CTGAN / GaussianCopula sobre la clase minoritaria, máximo 2x. **Hard rule**: ganancia <0.005 AUC = ruido bootstrap, no se vende como mejora.

11. **Phase 8 — Threshold + business value.** Producir `threshold_sweep.csv`, escenarios E1 (costo simétrico de reemplazo) y E2 (E1 + salario pagado durante permanencia), y subpop thresholds (preingreso vs periódico). **El threshold lo elige el negocio**, no ML. **Pause-point 🔴** para validar costos E1/E2 con cliente.

12. **Phase 9 — Hybrid ML + rules.** Combinar score ML con reglas de negocio (linear blend con `alpha` o cascade). Auditar poder discriminativo de las reglas por subpoblación antes de mezclar — y si las reglas **bajan** AUC del ML en la subpob de uso (Hard rule 19), deploy es **ML-only**. **Pause-point 🔴** si la auditoría dice "drop rules".

13. **Phase 10 — Re-fit winner on full cohort.** Re-entrenar el ganador sobre N completo (sin holdout) para producción. Empaquetar como `vN_full_cohort.pkl` con `{label, features, model, threshold}`.

14. **Phase 11 — Model card + decisions log + calibration audit.** Llenar `docs/08_model_card.md` (Mitchell-style: uso previsto, datos, performance global + por subgrupo + LOIO, limitaciones, ética). **Calibration audit obligatorio:** tabla bin-level (10 buckets) con `mean_predicted` vs `fraction_positives`; Hard rule 20 exige que bucket top tenga `actual ≥ 0.5 × predicted`. Slope ∈ [0.8, 1.2]. Agregar `D-NNN` en `docs/09_decisions_log.md` (append-only).

15. **Phase 12 — Deployment packaging.** Producir `model.pkl`, `feature_names.json`, `means.npy`/`stds.npy` (si aplica), `background_shap_set.csv` para SHAP (~100 filas estratificadas), README de inferencia. **Phase 12.1** especifica el bundle exacto cuando el destino es un model registry tipo Supabase + Modal (5 archivos + `deploy_metadata.json` sidecar) con smoke test pickle round-trip + Hard rule 20 attestation.

16. **Phase 13 — Client deliverables (cuando hay presentación a stakeholder no-ML).** 5 artefactos en `docs/cliente/`: `1pager_cliente_vN.md`, `deploy_spec.md`, `slides_outline.md`, `talking_points.md`, `team_presentation/index.html`. **Reglas vinculantes:** todas las métricas en %, AUC se traduce a "de cada 100 retiros, cuántos detecta", SHAP/tablas en HTML/CSS no PNG, sin email/contacto en slide de cierre por default, sin jargon (foundation model, ensemble, Brier, ECE, slope).

**Operación entre fases:** Claude opera en uno de tres modos por paso (🟢 Autónomo / 🟡 Propose-N / 🔴 Pause-and-ask) con 14 pause-points obligatorios y 20 hard rules no negociables. Ver `references/operating-modes.md`, `references/pause-points.md`, `references/hard-rules.md`.

**Una hipótesis por iteración.** Cada experimento numerado (`E0`, `E1`, …) en `05_modeling_log.md` cambia exactamente una variable. Cada métrica producida se escribe a `artifacts/trial_log.jsonl`.

## Pitfalls

- **Síntoma:** AUC se cae al desplegar; el modelo "funcionaba bien en validación". **Causa:** SMOTE u otro oversampling distorsiona la calibración. **Fix:** nunca SMOTE en HR tabular; usar `class_weight='balanced'` o `scale_pos_weight = (1-prev)/prev` + threshold tuning.

- **Síntoma:** binary AUC se estanca en ~0.73 después de tunear hparams y features. **Causa:** los labels son heterogéneos (despidos + fines de contrato + jubilaciones + traslados etiquetados todos como `RETIRADO`). **Fix:** reformular como multiclass (Phase 5) usando OOF binarias para derivar NEGATIVE / INTERMEDIATE / POSITIVE, sin tocar labels originales. **Antipattern:** label-flipping — cambia los labels del test, no del mundo real.

- **Síntoma:** se reporta "+0.003 AUC con synthetic augmentation, mejoramos el modelo". **Causa:** ganancia <0.005 AUC está dentro del ruido del bootstrap (CI half-width típico ~0.01). **Fix:** hard rule — ganancias <0.005 son ruido, documentar como negativo en `05_modeling_log.md` y parar augmentación.

- **Síntoma:** equipo ML elige threshold por max F1 y el cliente lo rechaza. **Causa:** F1 asume costos FN=FP simétricos; en attrition el costo de reemplazo (FN) suele ser >>20× el de un FP. **Fix:** presentar tabla con escenarios E1 (costo simétrico de reemplazo) y E2 (E1 + salario pagado durante permanencia) y subpop thresholds; **el threshold lo elige el negocio**. Validar costos con el project owner / cliente antes de calcular.

- **Síntoma:** las reglas de negocio aportan 0 al hybrid scorer en preingreso, aunque ayudan en monitoreo periódico. **Causa:** reglas como "depresión", "fatiga", "cansancio emocional" se miden post-ingreso (SST), por lo que en candidatos de preingreso son constantes/missing y no discriminan. **Fix:** correr `evaluate_rules_discriminative_power(...)` por subpoblación antes de combinar; aplicar reglas solo donde aportan.

- **Síntoma:** modelo "predice perfecto" en train pero es random en test. **Causa:** label leakage — features derivadas de la fecha de retiro (antigüedad calculada al cierre, salario final, etc.) se incluyeron porque construyeron el target. **Fix:** ejecutar leakage gate (Phase 1.5) entre Phase 1 y Phase 2; documentar features descartadas en `04_features.md`.

- **Síntoma:** CV AUC del ensemble es 0.80 pero al desplegar y medir contra retiros reales el AUC OOT colapsa a 0.30 en la subpoblación de uso. **Causa:** **cohort overfitting** — el ensemble está aprendiendo de un indicador administrativo de la cohorte (ej. variable que distingue preingreso vs control) en vez de atributos del individuo. Random CV mezcla cohortes en train y test y oculta el problema. **Fix:** Phase 1.5 cohort-indicator scan + Phase 6.5 sliding-window OOT obligatoria + Hard rule 17 (cohort indicator en top-5 importance es bandera roja).

- **Síntoma:** AUC del ensemble es aceptable pero RH se queja de que "las probabilidades no se entienden — dice 78% pero no se va casi nadie". **Causa:** miscalibración severa — el modelo discrimina (AUC OK) pero las probabilidades están infladas (slope < 0.3, ECE > 10%). **Fix:** Hard rule 20 — el bucket top debe cumplir `actual ≥ 0.5 × predicted`; si slope < 0.8 o > 1.2, no desplegar aunque AUC sea bueno. Reportar tabla bin-level en `06_results.md` y `08_model_card.md`. Si el modelo no calibra con isotonic / Platt, considerar Phase 5.5 (TabPFN) — es naturalmente mejor calibrado.

- **Síntoma:** "el cliente histórico siempre usó N reglas, las dejamos en el deploy aunque la auditoría OOT dice que bajan el AUC". **Causa:** inercia organizacional / sesgo de status quo. **Fix:** Hard rule 19 — si `evaluate_rules_discriminative_power(...)` muestra que las reglas **bajan** el AUC del ML en la subpob de uso (con bootstrap CI), deploy es **ML-only**. Documentar en `09_decisions_log.md` como `D-NNN: dropped rules (deploy ML-only)` y comunicar al cliente con tabla delta.

- **Síntoma:** el stakeholder no técnico no entiende el deck — "están muy pequeños los SHAP", "qué es Brier", "AUC 0.78 qué significa". **Causa:** primer deck usa PNGs de matplotlib + métricas en escala 0-1 + jargon ML. **Fix:** Phase 13 — todas las métricas en %, SHAP/tablas en HTML/CSS (`.shap-grid`, `table.cmp`), AUC traducido a "de cada 100 retiros detecta X". Sin foundation model / ensemble / slope / Brier / ECE en slides cliente-facing. Quitar email/contacto del slide de cierre por default.

## Verification

Al cierre de la invocación el proyecto target debe contener:

- `docs/00..14_*.md` — los 15 deliverables markdown llenos (no quedan `<!-- TODO -->` sin resolver en secciones que aplican). Templates 10-14 (cliente) son obligatorios solo si hay presentación a stakeholder no-ML.
- `artifacts/trial_log.jsonl` — al menos una fila por experimento numerado en `05_modeling_log.md`. Sin huecos.
- `artifacts/dataset_profile.json` — generado en Phase 1, cargado al inicio de cada sesión Claude.
- `artifacts/vN_full_cohort.pkl` — modelo ganador re-entrenado sobre cohorte completa.
- `docs/09_decisions_log.md` — con al menos `D-001` (definición de target), `D-NNN` para cada decisión 🟡 propose-N tomada (cargo grouping, calibración, threshold, alpha del hybrid scorer, decisión de dropear reglas, adopción de TabPFN, etc.). Append-only, formato `Decisión → Razón → Aplicación`.
- `results/threshold_sweep.csv` + `business_value_E1.md` + `business_value_E2.md` + (si aplica) `subpop_thresholds.csv`.
- Métricas reportadas en `docs/06_results.md` y `08_model_card.md` incluyen **AUROC + AUPRC + Brier + ECE + slope/intercept + ≥4 thresholds operativos + bin-level calibration table (10 buckets)**. Reportar solo AUROC se rechaza.
- **Hard rule 17 attestation:** cohort indicator scan documentado en `04_features.md`; si alguno apareció en top-5 importance del ganador, OOT comparison documentada con bootstrap delta CI.
- **Hard rule 18 attestation:** si dataset tiene timestamp, sliding-window OOT (≥3 cortes) reportada en `06_results.md` con bootstrap delta CI vs baseline. Random CV solo no se acepta.
- **Hard rule 20 attestation:** bucket top del modelo final cumple `fraction_positives ≥ 0.5 × mean_predicted`; calibration slope ∈ [0.8, 1.2] en el modelo final. Si no, el modelo no se despliega.
- Si Phase 5.5 (TabPFN) se evaluó: comparison documentada en `05_modeling_log.md` con OOT AUC + latency + tamaño del artefacto.
- Si Phase 13 aplica: `docs/cliente/{1pager_cliente_vN.md, deploy_spec.md, slides_outline.md, talking_points.md, team_presentation/index.html}` cumplen las reglas vinculantes (todas las métricas en %, SHAP en HTML/CSS, sin jargon, sin email en slide de cierre por default).
- Si deploy es a un model registry / serverless: bundle Phase 12.1 (`model.pkl + means.npy + stds.npy + background_shap_set.csv + sucess_io_data.json + deploy_metadata.json`) con smoke test `pickle round-trip byte-exact + Hard rule 20 attestation` pasando.

Smoke test del skill: copiar `skills/attrition-model-trainer/` a `~/.claude/skills/` y verificar que Claude Code reconoce el skill por su `description` cuando se le pide "entrena un modelo de attrition".

## References

- `references/methodology.md` — las 14 fases en detalle (objetivos, inputs, outputs, criterios de salida). Incluye Phase 5.5 (TabPFN benchmark), Phase 6.5 (sliding-window OOT), Phase 12.1 (model-registry packaging spec), Phase 13 (client deliverables).
- `references/hard-rules.md` — 20 reglas no negociables con justificación.
- `references/pause-points.md` — los 14 puntos donde Claude debe parar y preguntar.
- `references/operating-modes.md` — los 3 modos (🟢 Autónomo / 🟡 Propose-N / 🔴 Pause-and-ask) con ejemplos.
- `templates/00_problem_framing.md` … `templates/09_decisions_log.md` — scaffolds técnicos.
- `templates/10_cliente_1pager.md` … `templates/14_cliente_team_presentation.md` — scaffolds cliente-facing (Phase 13).
- Sibling skill: `skills/screening-model-trainer/SKILL.md` (screening clínico binario).
