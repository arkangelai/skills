# Hard rules — 15 reglas no negociables

Estas reglas son vinculantes: Claude no las override aunque el workflow técnico parezca permitirlo. Cada una nace de incidentes reales en producción y de prácticas estándar de ML clínico aplicado.

---

1. **Never SMOTE the whole cohort en tabular EHR.** Usar `class_weight` / `scale_pos_weight`. Razón: distorsiona calibración, validado empíricamente.
   **Exception — targeted subgroup SMOTE:** cuando un solo subgrupo tiene informational ceiling (validado por 5+ ablations independientes convergiendo al mismo AUROC) AND ese subgrupo es clínicamente crítico, oversample SOLO ese subgrupo para matchear el positive count del subgrupo dominante, RE-FIT calibración sobre augmented set (caso de referencia: subgrupo demográfico crítico con techo informational + ensemble con score publicado). **Pause-point 🔴** antes de aplicar — el project owner aprueba.

2. **Never train on the holdout.** Si entrenas sobre full cohort, ese es un artefacto SEPARADO (Phase 9), no el que evalúas.

3. **Never report only AUROC.** Siempre incluir AUPRC, Brier, calibration slope/intercept, y al menos 4 operating points. AUROC sola oculta problemas de calibración (un modelo puede tener AUROC=0.85 y predicciones completamente off-scale).

4. **Never claim feature search win <0.005 AUROC como "improvement"** sin flaguear que está dentro del bootstrap noise. Con n_test típico (<2000), el CI half-width es ≥0.01.

5. **Never accept AUROC del deployed at face value.** Correr honest CV check (Phase 8) antes de creerlo. Si Phase 1b da `test.csv` upstream, preferirlo como holdout.

6. **Never include features que construyeron el target.** Si `ERC` se computó de creatinina/eGFR/ACR upstream, esas features son leakage y se excluyen.

7. **Document en español para IPS/EPS-facing projects, English para code comments.** Match the existing convention in the target repo.

8. **Claude propone N opciones, the project owner decide.** Para cada decisión 🟡 propose-N, Claude entrega tabla con 2-3 opciones + tradeoffs y NO ejecuta hasta que el project owner elige. La elección queda en `08_decisions_log.md`.

9. **Una hipótesis por iteración.** Cada experimento numerado en `05_modeling_log.md` cambia exactamente una variable. Sweeping changes (modelo + features + threshold a la vez) destruyen atribución.

10. **Trial log obligatorio.** Cada operación que produce métricas escribe a `artifacts/trial_log.jsonl` vía `tracking.log_trial()`. Sin excepciones, incluso para experimentos descartados.

11. **Stop and ask en pause-points.** La lista 🔴 de `references/pause-points.md` es vinculante. Claude no avanza sin confirmación explícita en esos puntos, aunque el workflow técnico lo permita.

12. **Leakage gate antes de modelar.** Phase 1.5 corre obligatoriamente entre Phase 1 y Phase 2, antes de cualquier fit. Documentar features descartadas en `04_features.md`.

13. **Validación temporal cuando span > 1 año.** Si `df['date'].max() - df['date'].min() > 365` días, además del stratified holdout se reporta también temporal holdout (últimos 6-12 meses como test). Pause-point obligatorio.

14. **Literature baseline obligatorio.** Phase 3 incluye comparación contra ≥1 scoring system publicado para el outcome (KFRE, FINDRISC, Framingham, etc.). Sin ese baseline, cualquier "ganancia" del modelo no es clínicamente interpretable.
   **Cuando ≥2 scores publicados existen para la condición:** Phase 4.5 Track C hace benchmark sistemático de TODOS antes de elegir uno para Phase 5.7 ensemble. Documentar también los scores descartados — regulators y cliente preguntan "¿por qué este y no aquel?".

15. **Foundation model exploration mandatory para n<5,000.** Phase 4.5 Track A corre TabPFN (o equivalente) ANTES de Phase 5 feature search. Si el foundation model no se prueba, no se puede afirmar que el GBM tuneado es la mejor arquitectura — queda como hipótesis no validada.

---

### Bonus rule (operacional, pero igualmente vinculante)

**Always report bootstrap CI alongside point estimates.** AUROC=0.71 means little without CI95%=[0.65, 0.77]. Min 1,000 stratified resamples. Aplica a Phase 6 reporting y Phase 8 vs-deployed comparisons.
