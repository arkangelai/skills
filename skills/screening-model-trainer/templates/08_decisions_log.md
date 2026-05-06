# 08 — Bitácora de Decisiones (append-only)

> Registro append-only de cada decisión no trivial. **No se reescriben entradas previas**: si una decisión cambia, se agrega una nueva con la fecha y se referencia la anterior.

## Cómo agregar una entrada

1. Mantener orden cronológico (más reciente al final).
2. Usar identificadores `D-NNN` consecutivos.
3. Estructura: **Decisión → Razón → Aplicación**.
4. **Nunca borrar.** Si cambia, `D-NNN-bis` y referenciar la anterior.

---

## YYYY-MM-DD — Decisiones de alcance iniciales

### D-001 · Horizonte y tipo de tarea

**Decisión:**
**Razón:**
**Aplicación:**

### D-002 · Definición del desenlace

### D-003 · Idioma de documentación

### D-004 · Ubicación del código

### D-005 · Manejo del desbalance: class_weight, NO SMOTE

**Decisión:** desbalance se aborda con `class_weight='balanced'` / `scale_pos_weight` y threshold tuning post-hoc; **no se usa SMOTE** sobre tabular EHR.
**Razón:** SMOTE distorsiona la calibración; los GBMs ya manejan desbalance moderado. La calibración es requisito explícito.
**Aplicación:** documentado en `06_results.md`. SMOTE queda fuera del pipeline.

### D-006 · Validación primaria: holdout estratificado

### D-007 · Faltantes: indicador + manejo nativo, no imputación a mediana

### D-008 · Calibración: isotónica vía CalibratedClassifierCV

### D-009 · Threshold operativo se selecciona según uso clínico (no es único)

**Decisión:** reportar **4 thresholds** según uso clínico, no un solo punto operativo.
**Razón:** la elección depende del costo relativo FN:FP, que depende del uso clínico.
**Aplicación:** documentado en `06_results.md § 8` y `07_model_card.md`. Tabla completa en `results/operating_points_<modelo>.csv`.

### D-010 · Comparación honesta vs modelo desplegado

**Decisión:** si existe modelo desplegado, ejecutar Phase 8 del SKILL.md: replicar inferencia + leakage check + re-train de la misma arquitectura con CV honesta.
**Razón:** una métrica reportada de un modelo desplegado puede estar inflada por contaminación train/test. Verificar antes de creer.
**Aplicación:** ver `06_results.md § 10-11`.
