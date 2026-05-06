# Hard rules — 16 reglas no negociables

Estas reglas son vinculantes: Claude no las override aunque el workflow técnico parezca permitirlo. Cada una nace de una lección concreta del proyecto Comfama o de prácticas estándar de ML aplicado.

---

1. **Never SMOTE en tabular HR.** Usar `class_weight` / `scale_pos_weight` + threshold tuning. SMOTE distorsiona la calibración. (Validado en Comfama Phase 1-3: el modelo "funcionaba bien en validación" y se caía al desplegar.)

2. **Si binary AUC se estanca, reformula como multiclass.** Antes de tocar labels. Label-flipping (cambiar la etiqueta de algunas filas) sin validación temporal es antipattern: cambiaste los labels de tu test, no del mundo real.

3. **Synthetic augmentation: ganancias <0.005 AUC = ruido bootstrap.** No la vendas como mejora. Comfama Phase 11 confirmó techo information-theoretic en 0.800 con +0.002 — la ganancia estaba dentro del CI half-width del bootstrap.

4. **Reporta siempre AUROC + AUPRC + Brier + slope/intercept + ≥4 thresholds operativos.** Reportar solo AUC oculta problemas de calibración (un modelo puede tener AUC=0.85 y predicciones completamente off-scale).

5. **Threshold lo elige el negocio**, no el equipo de modelado. Tu trabajo es presentar la tabla con escenarios E1/E2 y subpoblaciones; la decisión es del stakeholder. Si el equipo ML elige por max F1 (que asume FN=FP simétricos) en un dominio donde reemplazar a un empleado cuesta 20× rechazar a un buen candidato, el modelo no se va a usar.

6. **Subpopulation thresholds** cuando el use case difiere por segmento. Preingreso filter (sensitive) vs monitoreo periódico de empleados activos (specific) vs filtro mensual (balanced) — pueden necesitar thresholds distintos. Un solo threshold global tira plata.

7. **Reglas de negocio pueden ser constantes en un subgrupo.** Antes de combinar ML+rules, ejecutar `evaluate_rules_discriminative_power` por subpoblación. Lección Comfama: las 37 reglas no discriminan en preingreso porque depresión/fatiga/cansancio se miden post-ingreso.

8. **Nunca incluyas features que construyeron el target.** Si `RETIRADO` se calculó de `Fecha_retiro` upstream, esa fecha (o derivadas como antigüedad calculada al cierre, salario final, etc.) es leakage. Documentar features descartadas en `04_features.md`.

9. **Documenta en español** para clientes/IPS/EPS-facing; comentarios de código en inglés. Match the convention of the target repo.

10. **Claude propone N opciones, Laura decide.** Para cada decisión 🟡 propose-N, Claude entrega tabla con 2-3 opciones + tradeoffs y NO ejecuta hasta que Laura elige. La elección queda en `09_decisions_log.md`.

11. **Una hipótesis por iteración.** Cada experimento numerado en `05_modeling_log.md` cambia exactamente una variable. Sweeping changes (modelo + features + ICL + threshold a la vez) destruyen atribución — no se sabe cuál de los cuatro cambios dio la ganancia.

12. **Trial log obligatorio.** Cada operación que produce métricas escribe a `artifacts/trial_log.jsonl` vía `tracking.log_trial()`. Sin excepciones, incluso para experimentos descartados — los negativos también informan.

13. **Stop and ask en pause-points.** La lista 🔴 de `references/pause-points.md` es vinculante. Claude no avanza sin confirmación explícita en esos puntos, aunque el workflow técnico lo permita.

14. **Leakage gate antes de modelar.** Phase 1.5 (leakage scanner estadístico) corre obligatoriamente entre Phase 1 y Phase 2, antes de cualquier fit. Documentar features descartadas en `04_features.md`.

15. **Validación temporal cuando span > 1 año.** Si el dataset cubre >365 días (cohort effects post-COVID, cambios de política HR), además del stratified holdout se reporta también un temporal holdout (últimos 6-12 meses como test). Pause-point obligatorio para confirmar el split.

16. **Literature / rule baseline obligatorio.** Phase 3 incluye comparación contra al menos un baseline simple del dominio (ej. "tenure < 6 meses + cargo operativo + salario Q1") o un score HR publicado si aplica. Sin ese baseline, cualquier "ganancia" del modelo no es interpretable contra la práctica actual.
