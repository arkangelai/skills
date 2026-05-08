# Pause-points — 18 puntos donde Claude debe parar y preguntar

Estos son los puntos del workflow donde Claude **DEBE** parar y preguntar antes de avanzar, aunque la siguiente acción técnica sea obvia. La razón: la decisión depende de información clínica, de negocio o regulatoria que no está en los datos.

Si the project owner agrega pause-points específicos al proyecto, van en `docs/08_decisions_log.md` como `D-NNN: pause-point — <descripción>`.

---

## 1. Definir target encoding cuando hay >1 interpretación clínica

Ej. ERC: `Estadio_3+` vs `eGFR<60` vs label clínico textual del EHR. La elección cambia la cohorte positiva drásticamente.

**Para resolver necesitas:** definición clínica del target del cliente, validación con cardio/nefro lead.

---

## 2. Aplicar inclusión/exclusión que reduzca cohorte >10% del N original

Drop de menores de 18, drop de embarazadas, drop de ECC < 1 año, etc. — cada exclusión cambia la población a la que aplica el modelo.

**Para resolver necesitas:** justificación clínica de cada exclusión, confirmación del scope de despliegue.

---

## 3. Drop de features sospechosas de leakage

Phase 1.5 scanner flaguea features con correlación sospechosa al target. Antes de drop, Claude muestra lista, the project owner confirma cuáles drop (algunas pueden ser legítimas con high signal-to-noise).

**Para resolver necesitas:** lista de features flagueadas + correlación + explicación de origen, decisión de the project owner.

---

## 4. Elegir método de calibración cuando N positivo <200

Isotonic regression con n_pos<200 puede sobreajustar. Sigmoid (Platt) es más estable pero asume relación logística.

**Para resolver necesitas:** N positivo en train, preferencia regulatoria/cliente sobre estabilidad vs flexibilidad.

---

## 5. Promover v0.3 sobre v0.2 cuando delta AUROC en zona de bootstrap noise (<0.005)

Hard rule: ganancia <0.005 AUROC es ruido. Si the project owner quiere igual promover v0.3 por otras razones (parsimonia, mejor calibración, mejor en subgrupo crítico), confirmar.

**Para resolver necesitas:** delta AUROC con bootstrap CI, métricas adicionales (Brier, slope, subgroup), justificación no-AUROC para la promoción.

---

## 6. Elegir threshold operativo final

Hard rule: el threshold lo elige el negocio/clínico. Claude presenta tabla con 4 thresholds + per-1000 breakdown y para hasta que el stakeholder elige.

**Para resolver necesitas:** stakeholder selecciona threshold de la tabla, justificación clínica.

---

## 7. Aceptar deployment si LOIO drop >0.05 vs stratified holdout

LOIO drop >0.05 indica que el modelo no generaliza sin recalibración por institución. Drop afecta scope de despliegue.

**Para resolver necesitas:** LOIO AUROC drop por institución, decisión sobre scope ("desplegar solo en X instituciones", "recalibrar al desplegar en cada institución nueva", "no desplegar").

---

## 8. Decidir validación temporal cuando span del dataset >1 año

Cohort effects (cambios de protocolo, COVID, política institucional) pueden requerir temporal holdout además de stratified.

**Para resolver necesitas:** rango temporal del dataset, evento histórico relevante, fecha de corte propuesta para temporal holdout.

---

## 9. Elegir scoring system literario para baseline (Phase 3)

Cuando ≥2 candidatos razonables existen (KFRE vs CKD-EPI vs FIB-4 para CKD; Framingham vs ACC/AHA para HTA; PUMA vs LFQ vs SQ-COPD para COPD). **Phase 4.5 Track C benchmarkea TODOS sistemáticamente** y elige el más complementario.

**Para resolver necesitas:** lista de scores aplicables a la condición, datos para calcular cada uno (algunos requieren features que el dataset puede no tener).

---

## 10. Drop de un grupo entero (sede, región, EPS) cuyo LOIO falla

Decisión de scope de despliegue. Diferente a #7 — aquí decides si el modelo se aplica o no a ese grupo.

**Para resolver necesitas:** LOIO por grupo, decisión cliente sobre el scope final.

---

## 11. Aplicar SMOTE dirigido a un subgrupo (Phase 5 / hard rule #1 exception)

Antes de oversample, presentar evidencia de informational ceiling (≥5 ablations independientes convergiendo) y obtener aprobación.

**Para resolver necesitas:** ≥5 ablation experiments del subgrupo mostrando convergencia, justificación clínica de criticidad del subgrupo, plan de re-fit calibración.

---

## 12. Bundle parsimonioso vs full (Phase 5.6)

Cuando ablation muestra `no_engineered` Δ AUROC <0.01 dentro del bootstrap CI, presentar tabla comparativa con operating-point match implications. NO decidir solo.

**Para resolver necesitas:** comparación full vs parsimonious con bootstrap CI, operating-point implications, preferencia regulatoria/cliente sobre simplicidad vs flexibilidad.

---

## 13. Cambiar el operating point publicado al cliente

Antes de proponer Sens nuevo, COMPUTAR FN-perdidos / 1000 (Phase 6.6) y presentar costo clínico.

**Para resolver necesitas:** Phase 6.6 breakdown TP/FN/TN/FP/1000 a prevalencia COHORT y a prevalencia REALISTIC primary-care, ratio de costos FN:FP del dominio clínico.

---

## 14. Discrepancia entre métricas declaradas del cliente y honest re-evaluation

Cliente declara Sens=85% / Spec=50% pero honest CV da números diferentes. Default conservador:
- Usar cifras del cliente externamente (deck, 1pager, talking points).
- Documentar discrepancia SOLO en `RESULTS.md` y `08_decisions_log.md` (interno).
- La reunión cliente NO es el lugar para surfear errores de modelado del vendor que no son nuestros.

**Para resolver necesitas:** the project owner confirma qué números van externos vs internos.

---

## 15. Ensemble con score externo publicado (Phase 5.7)

Antes de combinar modelo con PUMA/KFRE/FINDRISC en mezcla 90/10, validar complementariedad con grid search de pesos y bootstrap CI sobre el ensemble.

**Para resolver necesitas:** grid search de pesos con métricas (auroc, brier, spec_at_sens85, subgroup), Pearson de score con proba modelo, cliente OK con la complejidad adicional del ensemble.

---

## 16. Adoptar foundation model (TabPFN, etc.) como winner (Phase 4.5 Track A)

Antes de reemplazar GBM tuneado por arquitectura de fundación, validar:
- Latencia clínica <100ms/pred.
- Estabilidad en 5-fold CV.
- Interpretabilidad para regulación (SHAP funciona, etc.).

**Para resolver necesitas:** benchmark TabPFN vs GBM con latencia, stability metrics, plan de interpretabilidad.

---

## 17. Transfer learning de dataset público con harmonización no trivial (Phase 4.5 Track B)

Cuando harmonizar features de NHANES/MIMIC/etc. requiere imputaciones o equivalencias clínicas no triviales (ej. NHANES "smoking_status" categórico vs nuestro `paquetes_anho` numérico), pause obligatorio para validar el mapping con clinical lead.

**Para resolver necesitas:** mapping propuesto feature-by-feature, validación clínica del mapping, alternativa de no usar la feature problemática.

---

## 18. Adoptar modelo combinado en lugar de modelos especializados (Phase 8.5)

**Trigger:** SIEMPRE que se considere reemplazar 2+ modelos especializados (sobre cohortes clínicamente relacionadas — e.g., cohorte con patología metabólica + cohorte con patología cardiovascular, ambas con un mismo desenlace renal) por un único modelo combinado, **independiente del delta promedio**. Aplica tanto si el combinado parece ganar (`+ΔAUROC`), empatar (`±0.01`), o perder (`−ΔAUROC`).

**Por qué el trigger es universal y no condicionado a un delta específico:** hard rule #16 establece que el delta promedio puede esconder pérdidas concentradas. El caso de referencia que motiva este pause-point tuvo `−0.024` AUROC promedio (claramente fuera de cualquier banda `±0.01`) y aún así la decisión binding vino del análisis por subgrupo (`−0.10` en pacientes con la condición controlada). Un trigger condicionado a magnitud de delta excluiría exactamente el escenario donde el pause-point más se necesita.

Antes de proponer adopción del combinado (sin importar el delta promedio):
- (a) Inspeccionar tabla apples-to-apples por cohorte (combinado restringido al split del especializado vs especializado en su propio split).
- (b) Inspeccionar tabla por subgrupo en cada cohorte (sex, age_bin, control de la condición, IMC, etc.).
- (c) Si algún subgrupo clínicamente crítico pierde ≥0.05 AUROC en el combinado → **NO proponer adopción**, mantener especializados, documentar como `D-NNN` con la tabla de pérdidas por subgrupo.
- (d) Si las pérdidas son uniformes (todos los subgrupos en ±0.011 vs especializado), discutir con el project owner el tradeoff (un modelo en producción vs pérdida promedio pequeña).
- (e) Si el combinado parece ganar en promedio: aplica igual el chequeo por subgrupo — un `+0.01` global puede esconder `−0.05` en el subgrupo donde más importa.

**Caso ilustrativo:** combined model con `−0.024 AUROC` promedio (fuera de cualquier banda estrecha de empate) y aparentemente "aceptable" a primera vista. Tabla por subgrupo reveló pérdida concentrada en pacientes con condición controlada (`−0.10`) y obesidad (`−0.06`) — la cohorte donde el cribado más agrega valor. Decisión: mantener especializados.

**Para resolver necesitas:** apples-to-apples per-cohort table + tabla por subgrupo en ambos cohortes + costo operacional estimado de mantener 2 modelos vs 1 + decisión del project owner con la distribución por subgrupo visible.
