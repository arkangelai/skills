# 09 — Bitácora de Decisiones (append-only)

> Registro append-only de cada decisión no trivial. **No se reescriben entradas previas**: si una decisión cambia, se agrega una nueva con la fecha y se referencia la anterior.

## Cómo agregar una entrada

1. Mantener orden cronológico (más reciente al final).
2. Usar identificadores `D-NNN` consecutivos.
3. Estructura: **Decisión → Razón → Aplicación**.
4. **Nunca borrar.** Si cambia, `D-NNN-bis` y referenciar la anterior.

---

## YYYY-MM-DD — Decisiones de alcance iniciales

### D-001 · Definición operativa de "retiro"

**Decisión:**
**Razón:**
**Aplicación:**

### D-002 · Cohorte y ventana de observación

### D-003 · Idioma de documentación

### D-004 · Ubicación del código y artefactos

### D-005 · Manejo del desbalance: class_weight, NO SMOTE

**Decisión:** desbalance se aborda con `class_weight='balanced'` / `scale_pos_weight` y threshold tuning post-hoc; **no se usa SMOTE** sobre tabular HR.
**Razón:** SMOTE distorsiona la calibración; los GBMs ya manejan desbalance moderado. La calibración es requisito para hacer business-value analysis honesto.
**Aplicación:** `06_results.md` no tiene experimentos con SMOTE.

### D-006 · Validación primaria: holdout estratificado seed=42

### D-007 · Faltantes: indicador binario + manejo nativo del GBM, no imputación a mediana

### D-008 · Calibración: isotónica vía CalibratedClassifierCV(cv=5)

### D-009 · Threshold lo elige el negocio, no el equipo de modelado

**Decisión:** reportar barrido completo + escenarios E1/E2 en `07_threshold_and_business_value.md`. La decisión final del threshold es del stakeholder.
**Razón:** la elección depende del costo relativo FN:FP, que depende del use case. No es decisión técnica.
**Aplicación:** workshop con el stakeholder antes de empaquetar el modelo final.

### D-010 · ¿Multiclass reformulation? (Phase 5)

**Decisión:** <!-- TODO: si/no, basado en si binary AUC se estancó. -->
**Razón:** label-flipping sin validación temporal es antipattern. Si binary se estanca, multiclass es la salida sin tocar labels.
**Aplicación:** ver `05_modeling_log.md § E7`.

### D-011 · Synthetic augmentation: ¿se usa?

**Decisión:** <!-- TODO. Por defecto, no — implementaciones de referencia muestran ganancia marginal <0.005 AUC. -->
**Razón:** ganancias <0.005 AUC son ruido de bootstrap.
**Aplicación:** documentar el experimento en `05_modeling_log.md § E9` aunque no se use.

### D-012 · Hybrid ML+rules: ¿se combina con reglas de negocio?

**Decisión:** <!-- TODO: si/no, alpha si aplica. -->
**Razón:** si el cliente tiene reglas explícitas que quiere preservar, se combinan. Antes de combinar: correr `evaluate_rules_discriminative_power` por subpoblación — algunas reglas pueden ser constantes en un subgrupo.
**Aplicación:** ver `results/hybrid_analysis.md` si aplica.

### D-013 · Subpopulation thresholds

**Decisión:** <!-- TODO: si/no — depende de si los use cases difieren por segmento. -->
**Razón:** preingreso filter (alta precisión, baja recall) y monitoreo periódico (alta recall, baja precisión) tienen necesidades opuestas.
**Aplicación:** `07_threshold_and_business_value.md § Subpopulation thresholds`.
