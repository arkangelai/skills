# Hard rules — 20 reglas no negociables

Estas reglas son vinculantes: Claude no las override aunque el workflow técnico parezca permitirlo. Cada una nace de incidentes reales en producción y de prácticas estándar de ML aplicado.

---

1. **Never SMOTE en tabular HR.** Usar `class_weight` / `scale_pos_weight` + threshold tuning. SMOTE distorsiona la calibración. (Patrón observado: el modelo "funciona bien en validación" y se cae al desplegar.)

2. **Si binary AUC se estanca, reformula como multiclass.** Antes de tocar labels. Label-flipping (cambiar la etiqueta de algunas filas) sin validación temporal es antipattern: cambiaste los labels de tu test, no del mundo real.

3. **Synthetic augmentation: ganancias <0.005 AUC = ruido bootstrap.** No la vendas como mejora. Caso de referencia: ganancia +0.002 estaba dentro del CI half-width del bootstrap — no era señal real.

4. **Reporta siempre AUROC + AUPRC + Brier + slope/intercept + ≥4 thresholds operativos.** Reportar solo AUC oculta problemas de calibración (un modelo puede tener AUC=0.85 y predicciones completamente off-scale).

5. **Threshold lo elige el negocio**, no el equipo de modelado. Tu trabajo es presentar la tabla con escenarios E1/E2 y subpoblaciones; la decisión es del stakeholder. Si el equipo ML elige por max F1 (que asume FN=FP simétricos) en un dominio donde reemplazar a un empleado cuesta 20× rechazar a un buen candidato, el modelo no se va a usar.

6. **Subpopulation thresholds** cuando el use case difiere por segmento. Preingreso filter (sensitive) vs monitoreo periódico de empleados activos (specific) vs filtro mensual (balanced) — pueden necesitar thresholds distintos. Un solo threshold global tira plata.

7. **Reglas de negocio pueden ser constantes en un subgrupo.** Antes de combinar ML+rules, ejecutar `evaluate_rules_discriminative_power` por subpoblación. Patrón típico: reglas SST (depresión, fatiga, cansancio) no discriminan en candidatos de preingreso porque se miden post-ingreso.

8. **Nunca incluyas features que construyeron el target.** Si `RETIRADO` se calculó de `Fecha_retiro` upstream, esa fecha (o derivadas como antigüedad calculada al cierre, salario final, etc.) es leakage. Documentar features descartadas en `04_features.md`.

9. **Documenta en español** para clientes/IPS/EPS-facing; comentarios de código en inglés. Match the convention of the target repo.

10. **Claude propone N opciones, the project owner decide.** Para cada decisión 🟡 propose-N, Claude entrega tabla con 2-3 opciones + tradeoffs y NO ejecuta hasta que the project owner elige. La elección queda en `09_decisions_log.md`.

11. **Una hipótesis por iteración.** Cada experimento numerado en `05_modeling_log.md` cambia exactamente una variable. Sweeping changes (modelo + features + ICL + threshold a la vez) destruyen atribución — no se sabe cuál de los cuatro cambios dio la ganancia.

12. **Trial log obligatorio.** Cada operación que produce métricas escribe a `artifacts/trial_log.jsonl` vía `tracking.log_trial()`. Sin excepciones, incluso para experimentos descartados — los negativos también informan.

13. **Stop and ask en pause-points.** La lista 🔴 de `references/pause-points.md` es vinculante. Claude no avanza sin confirmación explícita en esos puntos, aunque el workflow técnico lo permita.

14. **Leakage gate antes de modelar.** Phase 1.5 (leakage scanner estadístico) corre obligatoriamente entre Phase 1 y Phase 2, antes de cualquier fit. Documentar features descartadas en `04_features.md`.

15. **Validación temporal cuando span > 1 año.** Si el dataset cubre >365 días (cohort effects post-COVID, cambios de política HR), además del stratified holdout se reporta también un temporal holdout (últimos 6-12 meses como test). Pause-point obligatorio para confirmar el split.

16. **Literature / rule baseline obligatorio.** Phase 3 incluye comparación contra al menos un baseline simple del dominio (ej. "tenure < 6 meses + cargo operativo + salario Q1") o un score HR publicado si aplica. Sin ese baseline, cualquier "ganancia" del modelo no es interpretable contra la práctica actual.

17. **Cohort-indicator features en top-5 importance = bandera roja.** Si una variable que es marca administrativa de la cohorte (`Tipo_*`, `Wave_*`, `Phase_*`, `Source_*`, `Batch_*`, `Modulo_*`, `Cohort_*`) aparece en el top-5 de feature importance del ganador, es señal de cohort overfitting — el modelo se está apoyando en la cohorte, no en atributos del individuo. **Fix:** correr OOT con sliding-window (Hard rule 18) antes de aprobar el ganador; si el AUC OOT colapsa relativo al random CV, el modelo no se despliega. Caso de referencia: un cohort indicator (preingreso vs control) ranqueaba en top-3 con ~11% y ocultaba un colapso OOT de AUC ~0.30 en la subpoblación de uso real.

18. **Sliding-window OOT obligatorio si el dataset tiene timestamp.** Si existe `Fecha_registro` / `Fecha_ingreso` / equivalente, el reporte final incluye OOT con ≥3 cortes mensuales (entrenar en pasado, evaluar en futuro) más bootstrap de delta AUC (1000 reps, CI 95%). Random CV solo no se reporta en `model_card.md`. Caso de referencia: un ensemble reportaba CV AUC ~0.80 pero OOT en la subpoblación de uso era ~0.30 — random CV escondía el colapso por cohort effects durante meses.

19. **Si las reglas degradan el ML en la subpob de uso, dropearlas — no forzar hybrid por inercia.** Hard rule 7 ya pedía auditar reglas; esta extiende: si `evaluate_rules_discriminative_power(...)` muestra que las reglas **bajan** el AUC del ML (no solo "no aportan") en la subpob donde se va a usar el modelo, el deploy es **ML-only**, no hybrid. Documentar en `09_decisions_log.md` como `D-NNN: dropped rules (deploy ML-only)`. Caso de referencia: ensemble + N reglas SST colapsaba a AUC OOT ~0.30 en la subpoblación de uso, mientras que la versión ML-only daba ~0.87.

20. **Top-bucket calibration sanity check obligatorio.** En el modelo final, el bucket de mayor probabilidad debe cumplir `fraction_positives ≥ 0.5 × mean_predicted`. Si el modelo dice "78% probabilidad" pero solo el 5% se retira, la slope < 0.3 está miscalibrada y el modelo no se despliega aunque el AUC sea aceptable — RH no puede priorizar con probabilidades infladas. Reportar bin-level table en `06_results.md` y `08_model_card.md`. Caso de referencia: bucket top decía ~78%, real ~5% (slope 0.18, ECE 14.8%) — modelo recalibrado vía TabPFN: bucket top ~42% predicho, ~37% real (slope 1.32, ECE 5.6%).
