# 03 — Cohorte y Definición del Desenlace

## 1. Tipo de tarea

<!-- TODO: clasificación binaria cross-sectional o predicción de incidencia. Argumentar por qué. -->

## 2. Inclusión / Exclusión

<!-- TODO: criterios concretos. Si el dataset viene pre-filtrado upstream, decirlo y referenciar el filtro. -->

**Inclusión:**
- ...

**Exclusión:**
- ...

## 3. Definición del desenlace (target)

<!-- TODO: cómo se construyó el label. Si se construyó upstream, replicar la lógica aquí o referenciar. CRITICAL: si el target se construyó a partir de features que ahora están en el dataset, esos features son leakage. -->

## 4. Diagrama CONSORT

<!-- TODO: opcional, exportar a docs/figures/. Mostrar n inicial → n tras inclusión → n tras exclusión → n final. -->

## 5. Ventana de baseline / lookback

<!-- TODO: si aplica (ej. 12 meses). Si el dataset es cross-sectional sin tiempo, decirlo. -->

## 6. Splits

- **Holdout primario:** stratified 80/20 sobre el target, seed=42.
- **Validación cruzada:** StratifiedKFold(5) sobre el train.
- **LOIO (Leave-One-Group-Out):** si existe una columna de agrupamiento (institución, región, EPS), reportar como métrica secundaria.
- **Holdout temporal externo:** TODO si hay datos de fechas posteriores.

## 7. Decisión de prevalencia / class imbalance

<!-- TODO: scale_pos_weight = (1-prev)/prev. Documentar el valor y la regla de no-SMOTE (D-007 de referencia). -->
