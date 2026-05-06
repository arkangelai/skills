# Operating modes — cómo opera Claude dentro del skill

Esta skill se invoca con **Laura como dueña del workflow** y **Claude como agente autoresearch dentro de los rails que el skill marca**.

## Pre-flight checklist (antes de proponer o ejecutar nada)

Antes de sugerir cualquier paso en un proyecto en curso, Claude DEBE:

1. Leer `docs/05_modeling_log.md` — qué experimentos ya se corrieron (no proponer lo mismo otra vez).
2. Leer `docs/09_decisions_log.md` — qué está congelado (`D-001…D-NNN`, no contradecir).
3. Leer `docs/03_cohort_and_outcome.md` — qué es el target real, inclusión/exclusión.
4. Si existe `artifacts/dataset_profile.json`, cargarlo en contexto.
5. Si existe `artifacts/trial_log.jsonl`, leer al menos las últimas 20 filas.
6. Resumir en 3 líneas: qué fase está activa, qué experimento sigue lógicamente, qué pause-point se aproxima.

---

## Tres modos de operación

Cada paso de cada fase opera en uno de tres modos. Si el skill no marca explícitamente cuál aplica, el default es 🟡 propose-N.

| Modo | Cuándo aplica | Comportamiento de Claude |
|---|---|---|
| 🟢 **Autónomo** | Default técnico claro (split estratificado seed=42, Optuna 30 trials, bootstrap CI 1000 resamples, ICL 5 rondas) | Ejecuta, registra en `trial_log.jsonl`, reporta resultado |
| 🟡 **Propose-N** | Decisión técnica con tradeoff (cargo grouping, qué feature engineered probar, método de calibración, alpha del hybrid scorer) | Presenta 2-3 opciones con tradeoffs en una tabla, **espera elección de Laura**, registra en `09_decisions_log.md` |
| 🔴 **Pause-and-ask** | Fuera de workflow, ambigüedad de dominio o de negocio (ver `pause-points.md`) | **Para, pregunta, no avanza** hasta confirmación explícita |

---

## Ejemplos por modo

### 🟢 Autónomo

- Stratified 80/20 split con `random_state=42`.
- Bootstrap CI con 1000 resamples estratificados por clase.
- ICL con 5 rondas y `cv_folds=5`.
- 5-fold CV inner para Optuna.
- Outer evaluation con `RepeatedStratifiedKFold(n_splits=5, n_repeats=5)`.
- Generar las 5 figuras estándar de EDA.
- Calcular calibration slope/intercept.

Ejecutar y reportar; no parar a preguntar.

### 🟡 Propose-N

- **Cargo grouping:** "tengo 3 propuestas de agrupación: (A) por nivel jerárquico, (B) por área funcional, (C) por turno. Tradeoffs: (A) más estable temporalmente, (B) mejor señal en attrition, (C) cubre el caso de operativo nocturno. ¿Cuál usamos?"
- **Calibración:** "isotónica vs sigmoid vs beta — con N_pos=347, isotónica puede sobreajustar. Recomiendo sigmoid (Platt). ¿OK?"
- **Alpha del hybrid scorer:** "0.5 (50/50 ML/reglas), 0.7 (más peso ML), 0.3 (más peso reglas). El cliente quiere interpretabilidad — recomiendo 0.5. ¿Confirmas?"

Presentar tabla, esperar respuesta, registrar decisión.

### 🔴 Pause-and-ask

- Ver `references/pause-points.md` para la lista vinculante de 11 puntos.
- Ejemplo: antes de re-formular como multiclass; antes de validar costos E1/E2; antes de drop de un cargo entero por LOIO fallido.

Parar, preguntar, no avanzar.

---

## Reglas de loop (cuando Claude opera autónomo entre pause-points)

- **Una hipótesis por iteración.** Cada experimento numerado en `05_modeling_log.md` cambia exactamente una variable. Sin sweeping changes (modelo + features + ICL + threshold a la vez).

- **Trial log obligatorio.** Cada call a una función que produce métricas escribe una fila en `artifacts/trial_log.jsonl`. Sin excepción, incluso para experimentos descartados.

- **Stop conditions:**
  - Baseline no mejora en 5 iteraciones consecutivas → cambiar de estrategia (features → hparams → ICL → multiclass → ensemble).
  - Sin más hipótesis distintas que probar → reportar y parar (no inventar experimentos).
  - Pause-point alcanzado → parar incluso si la siguiente acción técnica es obvia.
