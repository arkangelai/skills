# Governance — hard rules + pause-points keyed by phase

Esta es la guía vinculante para Claude durante la ejecución del workflow. Consolida lo que antes vivía en `hard-rules.md` + `pause-points.md` y lo organiza por la fase donde aplica.

- **20 hard rules** (vinculantes; Claude no las override).
- **14 pause-points** (Claude debe parar y preguntar antes de avanzar).

Numeración estable: cada item se referencia por su número (`#17`, `PP-12`). Nada se renumera entre versiones del skill — el orden interno es histórico.

---

## Phase index — qué aplica en cada fase

| Phase | Hard rules | Pause-points |
|---|---|---|
| Phase 0 — Project scaffolding | — | — |
| Phase 1 — Data ingestion & cleaning | — | — |
| Phase 1.1 — Leakage gate + cohort-indicator scan | #8, #14, #17 | — |
| Phase 2 — EDA + cohort + arquetipos | — | PP-1, PP-2 |
| Phase 3 — Baseline binary | #1, #16 | — |
| Phase 4 — ICL (noise-robust training) | — | PP-6 |
| Phase 5 — Multiclass reformulation | #2 | PP-7 |
| Phase 5.1 — Foundation model benchmark (TabPFN) | #17 | PP-12 |
| Phase 6 — Optuna-weighted ensemble | — | — |
| Phase 6.1 — Sliding-window OOT validation | #15, #18 | PP-10, PP-14 |
| Phase 7 — Synthetic augmentation (opcional) | #3 | PP-8 |
| Phase 8 — Threshold + business value | #5, #6 | PP-3, PP-4, PP-9 |
| Phase 9 — Hybrid ML + rules (opcional) | #7, #19 | PP-5, PP-13 |
| Phase 10 — Re-train winner on full cohort | — | — |
| Phase 11 — Model card + decisions log + calibration audit | #4, #20 | PP-11 |
| Phase 12 — Deployment packaging | — | — |
| Phase 13 — Client deliverables | #9 + reglas embebidas en `SKILL.md § Phase 13` (todas las métricas en %, SHAP en HTML/CSS, sin jargon, sin email en CTA) | — |

**Universal rules** (aplican en todo el workflow, no específicos a una fase): **#9** (español/inglés convention), **#10** (propose-N decision pattern), **#11** (one hypothesis per iteration), **#12** (trial log), **#13** (stop-at-pause-points).

Si the project owner agrega rules o pause-points específicos al proyecto, van en `docs/09_decisions_log.md` como `D-NNN: pause-point — <descripción>`.

---

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

13. **Stop and ask en pause-points.** La lista 🔴 de pause-points (más abajo en este archivo) es vinculante. Claude no avanza sin confirmación explícita en esos puntos, aunque el workflow técnico lo permita.

14. **Leakage gate antes de modelar.** Phase 1.1 (leakage scanner estadístico) corre obligatoriamente entre Phase 1 y Phase 2, antes de cualquier fit. Documentar features descartadas en `04_features.md`.

15. **Validación temporal cuando span > 1 año.** Si el dataset cubre >365 días (cohort effects post-COVID, cambios de política HR), además del stratified holdout se reporta también un temporal holdout (últimos 6-12 meses como test). Pause-point obligatorio para confirmar el split.

16. **Literature / rule baseline obligatorio.** Phase 3 incluye comparación contra al menos un baseline simple del dominio (ej. "tenure < 6 meses + cargo operativo + salario Q1") o un score HR publicado si aplica. Sin ese baseline, cualquier "ganancia" del modelo no es interpretable contra la práctica actual.

17. **Cohort-indicator features en top-5 importance = bandera roja.** Si una variable que es marca administrativa de la cohorte (`Tipo_*`, `Wave_*`, `Phase_*`, `Source_*`, `Batch_*`, `Modulo_*`, `Cohort_*`) aparece en el top-5 de feature importance del ganador, es señal de cohort overfitting — el modelo se está apoyando en la cohorte, no en atributos del individuo. **Fix:** correr OOT con sliding-window (Hard rule 18) antes de aprobar el ganador; si el AUC OOT colapsa relativo al random CV, el modelo no se despliega. Caso de referencia: un cohort indicator (preingreso vs control) ranqueaba en top-3 con ~11% y ocultaba un colapso OOT de AUC ~0.30 en la subpoblación de uso real.

18. **Sliding-window OOT obligatorio si el dataset tiene timestamp.** Si existe `Fecha_registro` / `Fecha_ingreso` / equivalente, el reporte final incluye OOT con ≥3 cortes mensuales (entrenar en pasado, evaluar en futuro) más bootstrap de delta AUC (1000 reps, CI 95%). Random CV solo no se reporta en `model_card.md`. Caso de referencia: un ensemble reportaba CV AUC ~0.80 pero OOT en la subpoblación de uso era ~0.30 — random CV escondía el colapso por cohort effects durante meses.

19. **Si las reglas degradan el ML en la subpob de uso, dropearlas — no forzar hybrid por inercia.** Hard rule 7 ya pedía auditar reglas; esta extiende: si `evaluate_rules_discriminative_power(...)` muestra que las reglas **bajan** el AUC del ML (no solo "no aportan") en la subpob donde se va a usar el modelo, el deploy es **ML-only**, no hybrid. Documentar en `09_decisions_log.md` como `D-NNN: dropped rules (deploy ML-only)`. Caso de referencia: ensemble + N reglas SST colapsaba a AUC OOT ~0.30 en la subpoblación de uso, mientras que la versión ML-only daba ~0.87.

20. **Top-bucket calibration sanity check obligatorio.** En el modelo final, el bucket de mayor probabilidad debe cumplir `fraction_positives ≥ 0.5 × mean_predicted`. Si el modelo dice "78% probabilidad" pero solo el 5% se retira, la slope < 0.3 está miscalibrada y el modelo no se despliega aunque el AUC sea aceptable — RH no puede priorizar con probabilidades infladas. Reportar bin-level table en `06_results.md` y `08_model_card.md`. Caso de referencia: bucket top decía ~78%, real ~5% (slope 0.18, ECE 14.8%) — modelo recalibrado vía TabPFN: bucket top ~42% predicho, ~37% real (slope 1.32, ECE 5.6%).

---

# Pause-points — 14 puntos donde Claude debe parar y preguntar

Estos son los puntos del workflow donde Claude **DEBE** parar y preguntar antes de avanzar, aunque la siguiente acción técnica sea obvia. La razón: la decisión depende de información de dominio o de negocio que no está en los datos.

---

## PP-1. Definir `RETIRADO` cuando incluye categorías heterogéneas

Despidos, fines de contrato, traslados, jubilaciones, renuncias — todo se etiqueta como `RETIRADO`. Antes de fijar el target binario, confirmar con the project owner qué categorías cuentan y qué no.

**Para resolver necesitas:** lista de motivos de retiro presentes en los datos, criterio del negocio sobre cuáles son "retiro real" vs "transición administrativa".

---

## PP-2. Aplicar cargo grouping / arquetipos

Cuando los cargos existentes no cubren bien el negocio (ej. agrupar 8 cargos comerciales bajo un arquetipo "comercial"), proponer agrupación es decisión de dominio.

**Para resolver necesitas:** lista de cargos en el cohorte, mapping propuesto, validación de the project owner/cliente sobre los arquetipos.

---

## PP-3. Validar costos E1/E2

`replacement_cost_per_fn` (costo de no detectar a alguien que se va a retirar) y `vacancy_cost_per_fp` (costo de retener/rechazar a alguien que en realidad iba a quedarse) los confirma the project owner con el cliente. Claude no los inventa.

**Para resolver necesitas:** estimación monetaria del cliente para FN y FP, opcionalmente desglosada por cargo.

---

## PP-4. Definir subpoblaciones con thresholds distintos

Preingreso vs periódico vs filtro mensual son use cases distintos y pueden necesitar thresholds distintos. Antes de calcular subpop thresholds, confirmar las subpoblaciones del negocio.

**Para resolver necesitas:** definición de cada use case, métrica clínica/operativa que importa en cada uno (sensitivity, specificity, F1, etc.).

---

## PP-5. Elegir reglas que entran al hybrid scorer y su peso `alpha`

Cuántas reglas + cuánto pesa el negocio sobre ML — depende del apetito del cliente y de la interpretabilidad requerida.

**Para resolver necesitas:** lista de reglas candidatas con su poder discriminativo por subpoblación (de `evaluate_rules_discriminative_power`), preferencia del cliente sobre interpretabilidad vs performance.

---

## PP-6. Configurar ICL

Número de rondas y threshold de "low quality" — afecta directamente qué labels quedan en train. Default: 5 rondas, threshold dinámico por ronda.

**Para resolver necesitas:** confirmación de que los labels son ruidosos (ej. mezcla de despidos + renuncias bajo `RETIRADO`), tolerancia del negocio a perder labels.

---

## PP-7. Reformular como multiclass (Phase 5)

Cuando binary AUC se estanca, reformular como NEGATIVE / INTERMEDIATE / POSITIVE cambia la estructura del problema. Antes de cambiarla, confirmar con the project owner.

**Para resolver necesitas:** evidencia de que binary AUC tocó techo (≥3 iteraciones consecutivas sin mejora >0.005), aprobación de the project owner para cambiar el output del modelo.

---

## PP-8. Aceptar synthetic augmentation (Phase 7)

Hard rule existente: ganancia <0.005 AUC = ruido. Si igual el cliente quiere documentar la augmentación, the project owner confirma.

**Para resolver necesitas:** la magnitud de la ganancia con bootstrap CI, decisión sobre si documentar como negativo o como intento sin lift.

---

## PP-9. Threshold operativo final

Hard rule: el threshold lo elige el negocio. Claude presenta la tabla con escenarios E1/E2 y subpoblaciones, y para hasta que el stakeholder elige.

**Para resolver necesitas:** cliente/the project owner selecciona threshold de la tabla.

---

## PP-10. Decidir validación temporal

Cuando el span del dataset > 1 año (cohort effects post-COVID, cambios de política HR), añadir un temporal holdout además del stratified. Antes de hacerlo, confirmar la fecha de corte.

**Para resolver necesitas:** rango temporal del dataset, evento histórico relevante (cambio de política, COVID, reorganización), fecha de corte propuesta.

---

## PP-11. Drop de un cargo entero / sede entera

Si LOIO falla en un grupo (cargo, sede, EPS) — drop afecta scope de despliegue. Es decisión de negocio, no de modelo.

**Para resolver necesitas:** LOIO AUROC drop por grupo, decisión del cliente sobre si el modelo se aplica o no a ese grupo (ej. "no desplegar para cargos administrativos por ahora").

---

## PP-12. Probar foundation model (TabPFN) como benchmark — Phase 5.1

Cuando el binary AUC se estanca (≥3 iteraciones sin mejora >0.005) **y** el ensemble muestra cohort indicators en top-5 importance (Hard rule 17) **y** el dataset es chico (<2k filas), TabPFN es candidato natural. Pero cambiar de paradigma (ensemble → foundation model) afecta latencia (50ms → 1-2s), tamaño del artefacto (5MB → 30MB) y deployabilidad — confirmar antes de invertir el ciclo de entrenamiento.

**Para resolver necesitas:** evidencia de techo en binary + sospecha de cohort overfitting; aprobación del project owner sobre tolerancia a la mayor latencia y tamaño en el destino de despliegue (model registry, serverless, API interna).

---

## PP-13. Drop reglas del hybrid (deploy ML-only) — Hard rule 19

Si `evaluate_rules_discriminative_power(...)` muestra que las reglas **bajan** el AUC del ML en la subpoblación de uso (no solo "no aportan"), el deploy debería ser ML-only. Pero dropear reglas que vienen del playbook histórico del cliente es decisión de negocio — the project owner confirma con cliente antes de cambiar la arquitectura del scorer.

**Para resolver necesitas:** delta AUC con vs sin reglas en la subpob de uso (con bootstrap CI), histórico de cómo se vendieron las reglas al cliente, voluntad del cliente de soltar reglas que llevaba años aplicando.

---

## PP-14. Definir cortes mensuales para sliding-window OOT — Hard rule 18

Sliding-window OOT (5 cortes, train-on-past / eval-on-future) requiere fijar las fechas de corte. Default razonable: 5 cortes mensuales que cubren los últimos 5 meses con `Fecha_registro` disponible. Pero la cohorte puede tener gaps (vacaciones colectivas, freezes de hiring) o eventos (cambio de política HR, restructuración) que invalidan ciertas ventanas.

**Para resolver necesitas:** rango temporal del dataset, eventos históricos relevantes en el span (cambios de política, freezes, restructuraciones, COVID-19), tamaño mínimo de cohorte por corte (típico ≥100 filas).
