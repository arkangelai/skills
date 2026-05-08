# Operating modes — cómo opera Claude dentro del skill

Esta skill se invoca con **the project owner como dueña del workflow** y **Claude como agente autoresearch dentro de los rails que el skill marca**.

## Pre-flight checklist (antes de proponer o ejecutar nada)

Antes de sugerir cualquier paso en un proyecto en curso, Claude DEBE:

1. Leer `docs/05_modeling_log.md` — qué experimentos ya se corrieron (no proponer lo mismo otra vez).
2. Leer `docs/08_decisions_log.md` — qué está congelado (`D-001…D-NNN`, no contradecir).
3. Leer `docs/03_cohort_and_outcome.md` — qué es el target real, inclusión/exclusión.
4. Si existe `artifacts/dataset_profile.json`, cargarlo en contexto.
5. Si existe `artifacts/trial_log.jsonl`, leer al menos las últimas 20 filas.
6. Resumir en 3 líneas: qué fase está activa, qué experimento sigue lógicamente, qué pause-point se aproxima.

---

## Tres modos de operación

Cada paso de cada fase opera en uno de tres modos. Si el skill no marca explícitamente cuál aplica, el default es 🟡 propose-N.

| Modo | Cuándo aplica | Comportamiento de Claude |
|---|---|---|
| 🟢 **Autónomo** | Default técnico claro (split estratificado seed=42, Optuna 30 trials, bootstrap CI 1000 resamples, isotonic CV=5) | Ejecuta, registra en `trial_log.jsonl`, reporta resultado |
| 🟡 **Propose-N** | Decisión técnica con tradeoff (calibración isotónica vs beta vs Platt, qué feature engineered probar, modelo a prefrontear, peso del ensemble) | Presenta 2-3 opciones con tradeoffs en una tabla, **espera elección de the project owner**, registra en `08_decisions_log.md` |
| 🔴 **Pause-and-ask** | Fuera de workflow, ambigüedad clínica, de negocio o regulatoria (ver `governance.md` § Pause-points) | **Para, pregunta, no avanza** hasta confirmación explícita |

---

## Ejemplos por modo

### 🟢 Autónomo

- Stratified 80/20 split con `random_state=42`.
- Bootstrap CI con 1000 resamples estratificados por clase.
- Optuna 30 trials TPE para CatBoost/XGBoost/LightGBM.
- 5-fold CV inner para calibración isotónica.
- LOIO cuando hay columna `group`.
- Generar las 5 figuras estándar de EDA (`standard_figures`).
- Calcular calibration slope/intercept + 4 operating points.
- Calcular per-1000 breakdown a prevalencia COHORT y REALISTIC.

Ejecutar y reportar; no parar a preguntar.

### 🟡 Propose-N

- **Calibración cuando N_pos>200:** "isotónica vs sigmoid (Platt). Isotónica es no-paramétrica y suele ganar; sigmoid asume relación logística pero estabiliza con menos datos. Con N_pos=350 recomiendo isotónica. ¿OK?"
- **Modelo para Phase 4.2:** "transfer learning desde (A) NHANES, (B) MIMIC respiratorio, (C) eICU. Tradeoffs: NHANES tiene mejor cobertura demográfica pero menos datapoints clínicos; MIMIC tiene más datapoints pero población ICU; eICU es más cercano a primary care. Para outcomes respiratorios recomiendo NHANES. ¿Confirmas?"
- **Peso del ensemble Phase 5.3:** "grid search dio óptimo en 0.9 model + 0.1 PUMA, pero 0.85/0.15 da +0.001 AUROC y +0.04 spec_at_sens85. Recomiendo 0.9/0.1 por simplicidad regulatoria. ¿OK?"

Presentar tabla, esperar respuesta, registrar decisión.

### 🔴 Pause-and-ask

- Ver `references/governance.md` § Pause-points para la lista vinculante de 18 puntos (PP-1 a PP-18).
- Ejemplos: target encoding cuando hay >1 interpretación clínica; aceptar deployment con LOIO drop >0.05; aplicar SMOTE dirigido a subgrupo; bundle parsimonioso vs full; discrepancia métricas declaradas vs honest re-eval.

Parar, preguntar, no avanzar.

---

## Reglas de loop (cuando Claude opera autónomo entre pause-points)

- **Una hipótesis por iteración.** Cada experimento numerado en `05_modeling_log.md` cambia exactamente una variable. Sin sweeping changes (modelo + features + threshold a la vez).

- **Trial log obligatorio.** Cada call a una función que produce métricas escribe una fila en `artifacts/trial_log.jsonl`. Sin excepción, incluso para experimentos descartados.

- **Stop conditions:**
  - Baseline no mejora en 5 iteraciones consecutivas → cambiar de estrategia (features → hparams → architecture → ensemble).
  - Sin más hipótesis distintas que probar → reportar y parar.
  - Pause-point alcanzado → parar incluso si la siguiente acción técnica es obvia.
