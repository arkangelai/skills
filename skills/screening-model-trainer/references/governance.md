# Governance — hard rules + pause-points keyed by phase

Esta es la guía vinculante para Claude durante la ejecución del workflow. Consolida lo que antes vivía en `hard-rules.md` + `pause-points.md` y lo organiza por la fase donde aplica.

- **16 hard rules** + 1 bonus rule (vinculantes; Claude no las override).
- **18 pause-points** (Claude debe parar y preguntar antes de avanzar).

Numeración estable: cada item se referencia por su número (`#6`, `PP-3`). Nada se renumera entre versiones del skill — el orden interno es histórico.

---

## Phase index — qué aplica en cada fase

| Phase | Hard rules | Pause-points |
|---|---|---|
| Phase 0 — Project scaffolding | — | — |
| Phase 1 — Data ingestion | — | — |
| Phase 1.1 — Probe upstream splits | #5 | — |
| Phase 1.2 — Upstream drop-chain audit | — | — |
| Phase 1.3 — Leakage gate | #6, #12 | PP-3 |
| Phase 2 — EDA + cohort | — | PP-1, PP-2 |
| Phase 3 — Feature engineering | #14 | PP-9 |
| Phase 4 — Baseline + Optuna tuning | #1 | — |
| Phase 4.1 — Foundation models (TabPFN) † | #15 | PP-16 |
| Phase 4.2 — Transfer learning † | — | PP-17 |
| Phase 4.3 — Multi-score literature benchmark † | #14 | PP-9 |
| Phase 5 — Feature search | #4 | PP-5, PP-11 |
| Phase 5.1 — Feature audit | — | — |
| Phase 5.2 — Parsimonious bundle | #16 | PP-12 |
| Phase 5.3 — External scoring ensemble | — | PP-15 |
| Phase 6 — Calibration + thresholds | #3, Bonus | PP-4, PP-6, PP-13 |
| Phase 6.1 — Bootstrap CI | Bonus | — |
| Phase 6.2 — Per-1000 patients | — | PP-13 |
| Phase 7 — Validation: LOIO + subgroups + DCA | #13, #16 | PP-7, PP-8, PP-10 |
| Phase 7.1 — Nested CV | — | — |
| Phase 8 — Comparison vs deployed | #2, #5 | PP-14 |
| Phase 8.1 — Combined-vs-specialized cohort | #16 | PP-18 |
| Phase 9 — Re-train on full cohort | #2 (excepción explícita: este es el artefacto separado que #2 permite) | — |
| Phase 10 — Model card + decisions log | #7 | — |
| Phase 11 — Model-registry packaging | — | — |
| Phase 12 — Cliente-facing materials | #7 + reglas en `cliente-communication.md` (jargon, SHAP, framing, 11-slide deck) | — |

† **Phases 4.1 / 4.2 / 4.3** son tracks paralelos e independientes (no secuenciales) — correr los que apliquen al proyecto en cualquier orden.

**Universal rules** (aplican en todo el workflow, no específicos a una fase): **#7** (español/inglés convention), **#8** (propose-N decision pattern), **#9** (one hypothesis per iteration), **#10** (trial log), **#11** (stop-at-pause-points).

Si the project owner agrega rules o pause-points específicos al proyecto, van en `docs/08_decisions_log.md` como `D-NNN: pause-point — <descripción>`.

---

# Hard rules — 16 reglas no negociables

Estas reglas son vinculantes: Claude no las override aunque el workflow técnico parezca permitirlo. Cada una nace de incidentes reales en producción y de prácticas estándar de ML clínico aplicado.

---

1. **Never SMOTE the whole cohort en tabular EHR.** Usar `class_weight` / `scale_pos_weight`. Razón: distorsiona calibración, validado empíricamente.
   **Exception — targeted subgroup SMOTE:** cuando un solo subgrupo tiene informational ceiling (validado por 5+ ablations independientes convergiendo al mismo AUROC) AND ese subgrupo es clínicamente crítico, oversample SOLO ese subgrupo para matchear el positive count del subgrupo dominante, RE-FIT calibración sobre augmented set (caso de referencia: subgrupo demográfico crítico con techo informational + ensemble con score publicado). **Pause-point 🔴** antes de aplicar — el project owner aprueba.

2. **Never train on the holdout.** Si entrenas sobre full cohort, ese es un artefacto SEPARADO (Phase 9), no el que evalúas.

3. **Never report only AUROC.** Siempre incluir AUPRC, Brier, calibration slope/intercept, y al menos 4 operating points. AUROC sola oculta problemas de calibración (un modelo puede tener AUROC=0.85 y predicciones completamente off-scale).

4. **Never claim feature search win <0.005 AUROC como "improvement"** sin flaguear que está dentro del bootstrap noise. Con n_test típico (<2000), el CI half-width es ≥0.01.

5. **Never accept AUROC del deployed at face value.** Correr honest CV check (Phase 8) antes de creerlo. Si Phase 1.1 da `test.csv` upstream, preferirlo como holdout.

6. **Never include features que construyeron el target.** Si `ERC` se computó de creatinina/eGFR/ACR upstream, esas features son leakage y se excluyen.

7. **Document en español para IPS/EPS-facing projects, English para code comments.** Match the existing convention in the target repo.

8. **Claude propone N opciones, the project owner decide.** Para cada decisión 🟡 propose-N, Claude entrega tabla con 2-3 opciones + tradeoffs y NO ejecuta hasta que el project owner elige. La elección queda en `08_decisions_log.md`.

9. **Una hipótesis por iteración.** Cada experimento numerado en `05_modeling_log.md` cambia exactamente una variable. Sweeping changes (modelo + features + threshold a la vez) destruyen atribución.

10. **Trial log obligatorio.** Cada operación que produce métricas escribe a `artifacts/trial_log.jsonl` vía `tracking.log_trial()`. Sin excepciones, incluso para experimentos descartados.

11. **Stop and ask en pause-points.** La lista 🔴 de pause-points (más abajo en este archivo) es vinculante. Claude no avanza sin confirmación explícita en esos puntos, aunque el workflow técnico lo permita.

12. **Leakage gate antes de modelar.** Phase 1.3 corre obligatoriamente entre Phase 1 y Phase 2, antes de cualquier fit. Documentar features descartadas en `04_features.md`.

13. **Validación temporal cuando span > 1 año.** Si `df['date'].max() - df['date'].min() > 365` días, además del stratified holdout se reporta también temporal holdout (últimos 6-12 meses como test). Pause-point obligatorio.

14. **Literature baseline obligatorio.** Phase 3 incluye comparación contra ≥1 scoring system publicado para el outcome (KFRE, FINDRISC, Framingham, etc.). Sin ese baseline, cualquier "ganancia" del modelo no es clínicamente interpretable.
   **Cuando ≥2 scores publicados existen para la condición:** Phase 4.3 hace benchmark sistemático de TODOS antes de elegir uno para Phase 5.3 ensemble. Documentar también los scores descartados — regulators y cliente preguntan "¿por qué este y no aquel?".

15. **Foundation model exploration mandatory para n<5,000.** Phase 4.1 corre TabPFN (o equivalente) ANTES de Phase 5 feature search. Si el foundation model no se prueba, no se puede afirmar que el GBM tuneado es la mejor arquitectura — queda como hipótesis no validada.

16. **Nunca recomendar una variante en base al delta promedio cuando existe tabla por subgrupo.** Si dos variantes (e.g., modelo nuevo vs desplegado, full vs parsimonious, combined vs specialized) tienen ΔAUROC promedio pequeño pero la tabla por subgrupo está disponible, leer la distribución completa antes de proponer. Una pérdida concentrada ≥0.05 AUROC en un subgrupo clínicamente crítico (enfermedad controlada, comorbilidad, edad avanzada) override el promedio. El project owner ve la distribución por subgrupo antes de aprobar; el headline NO es el promedio si la varianza por subgrupo es alta.
   **Caso de referencia:** modelo combinado multi-cohorte (Phase 8.1) con −0.024 AUROC promedio se rechazó al inspeccionar subgrupos: pérdida concentrada de −0.10 en pacientes con condición controlada y −0.06 en obesidad. La cohorte hermana se preservó uniformemente, pero la concentración en subgrupos críticos fue deal-breaker.

---

### Bonus rule (operacional, pero igualmente vinculante)

**Always report bootstrap CI alongside point estimates.** AUROC=0.71 means little without CI95%=[0.65, 0.77]. Min 1,000 stratified resamples. Aplica a Phase 6 reporting y Phase 8 vs-deployed comparisons.

---

# Pause-points — 18 puntos donde Claude debe parar y preguntar

Estos son los puntos del workflow donde Claude **DEBE** parar y preguntar antes de avanzar, aunque la siguiente acción técnica sea obvia. La razón: la decisión depende de información clínica, de negocio o regulatoria que no está en los datos.

---

## PP-1. Definir target encoding cuando hay >1 interpretación clínica

Ej. ERC: `Estadio_3+` vs `eGFR<60` vs label clínico textual del EHR. La elección cambia la cohorte positiva drásticamente.

**Para resolver necesitas:** definición clínica del target del cliente, validación con cardio/nefro lead.

---

## PP-2. Aplicar inclusión/exclusión que reduzca cohorte >10% del N original

Drop de menores de 18, drop de embarazadas, drop de ECC < 1 año, etc. — cada exclusión cambia la población a la que aplica el modelo.

**Para resolver necesitas:** justificación clínica de cada exclusión, confirmación del scope de despliegue.

---

## PP-3. Drop de features sospechosas de leakage

Phase 1.3 scanner flaguea features con correlación sospechosa al target. Antes de drop, Claude muestra lista, the project owner confirma cuáles drop (algunas pueden ser legítimas con high signal-to-noise).

**Para resolver necesitas:** lista de features flagueadas + correlación + explicación de origen, decisión de the project owner.

---

## PP-4. Elegir método de calibración cuando N positivo <200

Isotonic regression con n_pos<200 puede sobreajustar. Sigmoid (Platt) es más estable pero asume relación logística.

**Para resolver necesitas:** N positivo en train, preferencia regulatoria/cliente sobre estabilidad vs flexibilidad.

---

## PP-5. Promover v0.3 sobre v0.2 cuando delta AUROC en zona de bootstrap noise (<0.005)

Hard rule: ganancia <0.005 AUROC es ruido. Si the project owner quiere igual promover v0.3 por otras razones (parsimonia, mejor calibración, mejor en subgrupo crítico), confirmar.

**Para resolver necesitas:** delta AUROC con bootstrap CI, métricas adicionales (Brier, slope, subgroup), justificación no-AUROC para la promoción.

---

## PP-6. Elegir threshold operativo final

Hard rule: el threshold lo elige el negocio/clínico. Claude presenta tabla con 4 thresholds + per-1000 breakdown y para hasta que el stakeholder elige.

**Para resolver necesitas:** stakeholder selecciona threshold de la tabla, justificación clínica.

---

## PP-7. Aceptar deployment si LOIO drop >0.05 vs stratified holdout

LOIO drop >0.05 indica que el modelo no generaliza sin recalibración por institución. Drop afecta scope de despliegue.

**Para resolver necesitas:** LOIO AUROC drop por institución, decisión sobre scope ("desplegar solo en X instituciones", "recalibrar al desplegar en cada institución nueva", "no desplegar").

---

## PP-8. Decidir validación temporal cuando span del dataset >1 año

Cohort effects (cambios de protocolo, COVID, política institucional) pueden requerir temporal holdout además de stratified.

**Para resolver necesitas:** rango temporal del dataset, evento histórico relevante, fecha de corte propuesta para temporal holdout.

---

## PP-9. Elegir scoring system literario para baseline (Phase 3)

Cuando ≥2 candidatos razonables existen (KFRE vs CKD-EPI vs FIB-4 para CKD; Framingham vs ACC/AHA para HTA; PUMA vs LFQ vs SQ-COPD para COPD). **Phase 4.3 benchmarkea TODOS sistemáticamente** y elige el más complementario.

**Para resolver necesitas:** lista de scores aplicables a la condición, datos para calcular cada uno (algunos requieren features que el dataset puede no tener).

---

## PP-10. Drop de un grupo entero (sede, región, EPS) cuyo LOIO falla

Decisión de scope de despliegue. Diferente a PP-7 — aquí decides si el modelo se aplica o no a ese grupo.

**Para resolver necesitas:** LOIO por grupo, decisión cliente sobre el scope final.

---

## PP-11. Aplicar SMOTE dirigido a un subgrupo (Phase 5 / hard rule #1 exception)

Antes de oversample, presentar evidencia de informational ceiling (≥5 ablations independientes convergiendo) y obtener aprobación.

**Para resolver necesitas:** ≥5 ablation experiments del subgrupo mostrando convergencia, justificación clínica de criticidad del subgrupo, plan de re-fit calibración.

---

## PP-12. Bundle parsimonioso vs full (Phase 5.2)

Cuando ablation muestra `no_engineered` Δ AUROC <0.01 dentro del bootstrap CI, presentar tabla comparativa con operating-point match implications. NO decidir solo.

**Para resolver necesitas:** comparación full vs parsimonious con bootstrap CI, operating-point implications, preferencia regulatoria/cliente sobre simplicidad vs flexibilidad.

---

## PP-13. Cambiar el operating point publicado al cliente

Antes de proponer Sens nuevo, COMPUTAR FN-perdidos / 1000 (Phase 6.2) y presentar costo clínico.

**Para resolver necesitas:** Phase 6.2 breakdown TP/FN/TN/FP/1000 a prevalencia COHORT y a prevalencia REALISTIC primary-care, ratio de costos FN:FP del dominio clínico.

---

## PP-14. Discrepancia entre métricas declaradas del cliente y honest re-evaluation

Cliente declara Sens=85% / Spec=50% pero honest CV da números diferentes. Default conservador:
- Usar cifras del cliente externamente (deck, 1pager, talking points).
- Documentar discrepancia SOLO en `RESULTS.md` y `08_decisions_log.md` (interno).
- La reunión cliente NO es el lugar para surfear errores de modelado del vendor que no son nuestros.

**Para resolver necesitas:** the project owner confirma qué números van externos vs internos.

---

## PP-15. Ensemble con score externo publicado (Phase 5.3)

Antes de combinar modelo con PUMA/KFRE/FINDRISC en mezcla 90/10, validar complementariedad con grid search de pesos y bootstrap CI sobre el ensemble.

**Para resolver necesitas:** grid search de pesos con métricas (auroc, brier, spec_at_sens85, subgroup), Pearson de score con proba modelo, cliente OK con la complejidad adicional del ensemble.

---

## PP-16. Adoptar foundation model (TabPFN, etc.) como winner (Phase 4.1)

Antes de reemplazar GBM tuneado por arquitectura de fundación, validar:
- Latencia clínica <100ms/pred.
- Estabilidad en 5-fold CV.
- Interpretabilidad para regulación (SHAP funciona, etc.).

**Para resolver necesitas:** benchmark TabPFN vs GBM con latencia, stability metrics, plan de interpretabilidad.

---

## PP-17. Transfer learning de dataset público con harmonización no trivial (Phase 4.2)

Cuando harmonizar features de NHANES/MIMIC/etc. requiere imputaciones o equivalencias clínicas no triviales (ej. NHANES "smoking_status" categórico vs nuestro `paquetes_anho` numérico), pause obligatorio para validar el mapping con clinical lead.

**Para resolver necesitas:** mapping propuesto feature-by-feature, validación clínica del mapping, alternativa de no usar la feature problemática.

---

## PP-18. Adoptar modelo combinado en lugar de modelos especializados (Phase 8.1)

**Trigger:** SIEMPRE que se considere reemplazar 2+ modelos especializados (sobre cohortes clínicamente relacionadas — e.g., cohorte con patología metabólica + cohorte con patología cardiovascular, ambas con un mismo desenlace renal) por un único modelo combinado, **independiente del delta promedio** (ganar, empatar o perder en promedio). Aplicación directa de hard rule #16 — ver allí el caso de referencia.

Antes de proponer adopción del combinado (sin importar el delta promedio):
- (a) Inspeccionar tabla apples-to-apples por cohorte (combinado restringido al split del especializado vs especializado en su propio split).
- (b) Inspeccionar tabla por subgrupo en cada cohorte (sex, age_bin, control de la condición, IMC, etc.).
- (c) Si algún subgrupo clínicamente crítico pierde ≥0.05 AUROC en el combinado → **NO proponer adopción**, mantener especializados, documentar como `D-NNN` con la tabla de pérdidas por subgrupo.
- (d) Si las pérdidas son uniformes (todos los subgrupos en ±0.011 vs especializado), discutir con el project owner el tradeoff (un modelo en producción vs pérdida promedio pequeña).
- (e) Si el combinado parece ganar en promedio: aplica igual el chequeo por subgrupo — un `+0.01` global puede esconder `−0.05` en el subgrupo donde más importa.

**Para resolver necesitas:** apples-to-apples per-cohort table + tabla por subgrupo en ambos cohortes + costo operacional estimado de mantener 2 modelos vs 1 + decisión del project owner con la distribución por subgrupo visible.
