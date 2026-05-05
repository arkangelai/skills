---
name: attrition-model-trainer
description: Train a calibrated employee-attrition / retention ML model end-to-end on tabular HR/SST data, with multiclass reformulation, ICL noise handling, threshold + business-value analysis, and optional hybrid ML+rules deployment. Use when the user asks to build, train, or refresh an attrition / turnover / retention model (e.g. "entrena un modelo de retiro", "predice qué empleados van a renunciar", "refresca el modelo de attrition de Comfama").
version: 1.0.0
author: laura.bellon@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [ml, training, attrition, retention, hr, sst]
    category: model-training
    requires_toolsets: [terminal]
---

# attrition-model-trainer

End-to-end methodology for training a calibrated employee-attrition / retention ML model on tabular HR or occupational-health (SST) data. Encapsula el workflow validado en el proyecto **Comfama** (AUC 0.732 → 0.800, desplegado como sistema híbrido ML+reglas) y generaliza los tres patrones más reutilizables: análisis de threshold + business-value, scoring híbrido ML+reglas, y entrenamiento robusto a ruido vía Iterative Confidence Learning (ICL).

Es la contraparte de `screening-model-trainer` (screening clínico sobre Hippocrates EHR): comparten metodología pero el dominio, los costos y las reglas son distintos.

## When to Use

- Cuando el usuario pide "entrena/refresca un modelo de retiro / attrition / rotación / turnover".
- Cuando hay que predecir qué empleados van a renunciar o retirarse en una ventana temporal.
- Cuando el dataset es **tabular** (HR exports + SST + datos de cargo / fechas / salarios) y el target es binario o reformulable a multiclass (ACTIVO / PRE-RETIRADO / RETIRADO).
- Cuando se necesita filtrar candidatos de preingreso por riesgo de retiro.
- Cuando hay reglas de negocio explícitas que deben combinarse con el score ML (hybrid scorer).

**No uses:** para texto libre (notas de RH, reseñas), imágenes, datos no tabulares, modelos clínicos (usa `screening-model-trainer`), o problemas que no son de attrition (performance, promoción, salario).

## Procedure

El workflow son **12 fases** mapeadas a 10 deliverables markdown en `templates/`. Cada fase produce un artefacto concreto y se registra en `docs/05_modeling_log.md`. Para detalle de cada fase, ver `references/methodology.md`.

1. **Phase 0 — Project scaffolding.** Crear `<project>/model_training/{docs,src,data/{raw,interim,processed},artifacts,results,tests}` y copiar los 10 templates a `docs/`.

2. **Phase 1 — Data ingestion & cleaning.** Mergear los CSVs (encuestas SST, cargos, fechas, salarios) por `employee_id`. Documentar cada columna en `docs/01_data_dictionary.md`. Correr **leakage gate** (Phase 1.5) antes de modelar — features que construyeron el target se descartan.

3. **Phase 2 — EDA + cohort + arquetipos.** Generar las 5 figuras estándar. Definir inclusión/exclusión y target en `docs/03_cohort_and_outcome.md`. **Pause-point 🔴**: agrupación de cargos / arquetipos cuando los grupos existentes no encajan con el negocio.

4. **Phase 3 — Baseline binary.** Entrenar LR elastic-net + XGB + LightGBM + CatBoost con `class_weight='balanced'` o `scale_pos_weight`. Stratified 80/20 holdout (seed=42) + 5-fold CV + LOIO si hay grupos. **Nunca SMOTE.** Comparar contra al menos un baseline literario / regla de dominio.

5. **Phase 4 — ICL (noise-robust training).** Aplicar Iterative Confidence Learning (5 rondas, 5-fold CV) para identificar labels ruidosos. En Comfama esto subió AUC +0.024.

6. **Phase 5 — Multiclass reformulation.** Cuando el binary AUC se estanca, derivar 3 clases (NEGATIVE / INTERMEDIATE / POSITIVE) desde las probabilidades OOF binarias. **No tocar los labels originales.** **Pause-point 🔴** antes de cambiar la estructura del problema.

7. **Phase 6 — Optuna-weighted ensemble.** Combinar ~10 modelos diversos con pesos optimizados por Optuna contra AUC binario. Outer 5×5 RepeatedStratifiedKFold para evaluación honesta.

8. **Phase 7 — Synthetic augmentation (opcional).** CTGAN / GaussianCopula sobre la clase minoritaria, máximo 2x. **Hard rule**: ganancia <0.005 AUC = ruido bootstrap, no se vende como mejora.

9. **Phase 8 — Threshold + business value.** Producir `threshold_sweep.csv`, escenarios E1 (costo simétrico de reemplazo) y E2 (E1 + salario pagado durante permanencia), y subpop thresholds (preingreso vs periódico). **El threshold lo elige el negocio**, no ML. **Pause-point 🔴** para validar costos E1/E2 con cliente.

10. **Phase 9 — Hybrid ML + rules.** Combinar score ML con reglas de negocio (linear blend con `alpha` o cascade). Auditar poder discriminativo de las reglas por subpoblación antes de mezclarlas — pueden ser constantes en algún subgrupo.

11. **Phase 10 — Re-fit winner on full cohort.** Re-entrenar el ganador sobre N completo (sin holdout) para producción. Empaquetar como `vN_full_cohort.pkl` con `{label, features, model, threshold}`.

12. **Phase 11 — Model card + decisions log.** Llenar `docs/08_model_card.md` (Mitchell-style: uso previsto, datos, performance global + por subgrupo + LOIO, limitaciones, ética) y agregar entradas `D-NNN` en `docs/09_decisions_log.md` (append-only).

13. **Phase 12 — Deployment packaging.** Producir `model.pkl`, `feature_names.json`, `means.npy`/`stds.npy` (si aplica), `background_set.csv` para SHAP (~100 filas estratificadas), README de inferencia.

**Operación entre fases:** Claude opera en uno de tres modos por paso (🟢 Autónomo / 🟡 Propose-N / 🔴 Pause-and-ask) con 11 pause-points obligatorios y 16 hard rules no negociables. Ver `references/operating-modes.md`, `references/pause-points.md`, `references/hard-rules.md`.

**Una hipótesis por iteración.** Cada experimento numerado (`E0`, `E1`, …) en `05_modeling_log.md` cambia exactamente una variable. Cada métrica producida se escribe a `artifacts/trial_log.jsonl`.

## Pitfalls

- **Síntoma:** AUC se cae al desplegar; el modelo "funcionaba bien en validación". **Causa:** SMOTE u otro oversampling distorsiona la calibración. **Fix:** nunca SMOTE en HR tabular; usar `class_weight='balanced'` o `scale_pos_weight = (1-prev)/prev` + threshold tuning.

- **Síntoma:** binary AUC se estanca en ~0.73 después de tunear hparams y features. **Causa:** los labels son heterogéneos (despidos + fines de contrato + jubilaciones + traslados etiquetados todos como `RETIRADO`). **Fix:** reformular como multiclass (Phase 5) usando OOF binarias para derivar NEGATIVE / INTERMEDIATE / POSITIVE, sin tocar labels originales. **Antipattern:** label-flipping — cambia los labels del test, no del mundo real.

- **Síntoma:** se reporta "+0.003 AUC con synthetic augmentation, mejoramos el modelo". **Causa:** ganancia <0.005 AUC está dentro del ruido del bootstrap (CI half-width típico ~0.01). **Fix:** hard rule — ganancias <0.005 son ruido, documentar como negativo en `05_modeling_log.md` y parar augmentación.

- **Síntoma:** equipo ML elige threshold por max F1 y el cliente lo rechaza. **Causa:** F1 asume costos FN=FP simétricos; en attrition el costo de reemplazo (FN) suele ser >>20× el de un FP. **Fix:** presentar tabla con escenarios E1 (costo simétrico de reemplazo) y E2 (E1 + salario pagado durante permanencia) y subpop thresholds; **el threshold lo elige el negocio**. Validar costos con Laura/cliente antes de calcular.

- **Síntoma:** las reglas de negocio aportan 0 al hybrid scorer en preingreso, aunque ayudan en monitoreo periódico. **Causa:** reglas como "depresión", "fatiga", "cansancio emocional" se miden post-ingreso (SST), por lo que en candidatos de preingreso son constantes/missing y no discriminan. **Fix:** correr `evaluate_rules_discriminative_power(...)` por subpoblación antes de combinar; aplicar reglas solo donde aportan.

- **Síntoma:** modelo "predice perfecto" en train pero es random en test. **Causa:** label leakage — features derivadas de la fecha de retiro (antigüedad calculada al cierre, salario final, etc.) se incluyeron porque construyeron el target. **Fix:** ejecutar leakage gate (Phase 1.5) entre Phase 1 y Phase 2; documentar features descartadas en `04_features.md`.

## Verification

Al cierre de la invocación el proyecto target debe contener:

- `docs/00..09_*.md` — los 10 deliverables markdown llenos (no quedan `<!-- TODO -->` sin resolver en secciones que aplican).
- `artifacts/trial_log.jsonl` — al menos una fila por experimento numerado en `05_modeling_log.md`. Sin huecos.
- `artifacts/dataset_profile.json` — generado en Phase 1, cargado al inicio de cada sesión Claude.
- `artifacts/vN_full_cohort.pkl` — modelo ganador re-entrenado sobre cohorte completa.
- `docs/09_decisions_log.md` — con al menos `D-001` (definición de target), `D-NNN` para cada decisión 🟡 propose-N tomada (cargo grouping, calibración, threshold, alpha del hybrid scorer, etc.). Append-only, formato `Decisión → Razón → Aplicación`.
- `results/threshold_sweep.csv` + `business_value_E1.md` + `business_value_E2.md` + (si aplica) `subpop_thresholds.csv`.
- Métricas reportadas en `docs/06_results.md` y `08_model_card.md` incluyen **AUROC + AUPRC + Brier + slope/intercept + ≥4 thresholds operativos**. Reportar solo AUROC se rechaza.
- Calibration slope ∈ [0.8, 1.2] en el modelo final.
- Si span del dataset > 1 año: además del stratified holdout, hay un temporal holdout (últimos 6-12 meses como test) reportado.

Smoke test del skill: copiar `model-training/attrition-model-trainer/` a `~/.claude/skills/` y verificar que Claude Code reconoce el skill por su `description` cuando se le pide "entrena un modelo de attrition".

## References

- `references/methodology.md` — las 12 fases en detalle (objetivos, inputs, outputs, criterios de salida).
- `references/hard-rules.md` — 16 reglas no negociables con justificación.
- `references/pause-points.md` — los 11 puntos donde Claude debe parar y preguntar.
- `references/operating-modes.md` — los 3 modos (🟢 Autónomo / 🟡 Propose-N / 🔴 Pause-and-ask) con ejemplos.
- `templates/00_problem_framing.md` … `templates/09_decisions_log.md` — scaffolds markdown a copiar a `docs/` del proyecto target.
- Sibling skill: `model-training/screening-model-trainer/SKILL.md` (screening clínico binario sobre Hippocrates EHR).
- Reference implementation: proyecto **Comfama** (interno, `Clients/Comfama/`) — Phase results, ML experimentation guide, threshold + business value + hybrid analysis scripts.
