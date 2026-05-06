# Pause-points — 14 puntos donde Claude debe parar y preguntar

Estos son los puntos del workflow donde Claude **DEBE** parar y preguntar antes de avanzar, aunque la siguiente acción técnica sea obvia. La razón: la decisión depende de información de dominio o de negocio que no está en los datos.

Si the project owner agrega pause-points específicos al proyecto, van en `docs/09_decisions_log.md` como `D-NNN: pause-point — <descripción>`.

---

## 1. Definir `RETIRADO` cuando incluye categorías heterogéneas

Despidos, fines de contrato, traslados, jubilaciones, renuncias — todo se etiqueta como `RETIRADO`. Antes de fijar el target binario, confirmar con the project owner qué categorías cuentan y qué no.

**Para resolver necesitas:** lista de motivos de retiro presentes en los datos, criterio del negocio sobre cuáles son "retiro real" vs "transición administrativa".

---

## 2. Aplicar cargo grouping / arquetipos

Cuando los cargos existentes no cubren bien el negocio (ej. agrupar 8 cargos comerciales bajo un arquetipo "comercial"), proponer agrupación es decisión de dominio.

**Para resolver necesitas:** lista de cargos en el cohorte, mapping propuesto, validación de the project owner/cliente sobre los arquetipos.

---

## 3. Validar costos E1/E2

`replacement_cost_per_fn` (costo de no detectar a alguien que se va a retirar) y `vacancy_cost_per_fp` (costo de retener/rechazar a alguien que en realidad iba a quedarse) los confirma the project owner con el cliente. Claude no los inventa.

**Para resolver necesitas:** estimación monetaria del cliente para FN y FP, opcionalmente desglosada por cargo.

---

## 4. Definir subpoblaciones con thresholds distintos

Preingreso vs periódico vs filtro mensual son use cases distintos y pueden necesitar thresholds distintos. Antes de calcular subpop thresholds, confirmar las subpoblaciones del negocio.

**Para resolver necesitas:** definición de cada use case, métrica clínica/operativa que importa en cada uno (sensitivity, specificity, F1, etc.).

---

## 5. Elegir reglas que entran al hybrid scorer y su peso `alpha`

Cuántas reglas + cuánto pesa el negocio sobre ML — depende del apetito del cliente y de la interpretabilidad requerida.

**Para resolver necesitas:** lista de reglas candidatas con su poder discriminativo por subpoblación (de `evaluate_rules_discriminative_power`), preferencia del cliente sobre interpretabilidad vs performance.

---

## 6. Configurar ICL

Número de rondas y threshold de "low quality" — afecta directamente qué labels quedan en train. Default: 5 rondas, threshold dinámico por ronda.

**Para resolver necesitas:** confirmación de que los labels son ruidosos (ej. mezcla de despidos + renuncias bajo `RETIRADO`), tolerancia del negocio a perder labels.

---

## 7. Reformular como multiclass (Phase 5)

Cuando binary AUC se estanca, reformular como NEGATIVE / INTERMEDIATE / POSITIVE cambia la estructura del problema. Antes de cambiarla, confirmar con the project owner.

**Para resolver necesitas:** evidencia de que binary AUC tocó techo (≥3 iteraciones consecutivas sin mejora >0.005), aprobación de the project owner para cambiar el output del modelo.

---

## 8. Aceptar synthetic augmentation (Phase 7)

Hard rule existente: ganancia <0.005 AUC = ruido. Si igual el cliente quiere documentar la augmentación, the project owner confirma.

**Para resolver necesitas:** la magnitud de la ganancia con bootstrap CI, decisión sobre si documentar como negativo o como intento sin lift.

---

## 9. Threshold operativo final

Hard rule: el threshold lo elige el negocio. Claude presenta la tabla con escenarios E1/E2 y subpoblaciones, y para hasta que el stakeholder elige.

**Para resolver necesitas:** cliente/the project owner selecciona threshold de la tabla.

---

## 10. Decidir validación temporal

Cuando el span del dataset > 1 año (cohort effects post-COVID, cambios de política HR), añadir un temporal holdout además del stratified. Antes de hacerlo, confirmar la fecha de corte.

**Para resolver necesitas:** rango temporal del dataset, evento histórico relevante (cambio de política, COVID, reorganización), fecha de corte propuesta.

---

## 11. Drop de un cargo entero / sede entera

Si LOIO falla en un grupo (cargo, sede, EPS) — drop afecta scope de despliegue. Es decisión de negocio, no de modelo.

**Para resolver necesitas:** LOIO AUROC drop por grupo, decisión del cliente sobre si el modelo se aplica o no a ese grupo (ej. "no desplegar para cargos administrativos por ahora").

---

## 12. Probar foundation model (TabPFN) como benchmark — Phase 5.5

Cuando el binary AUC se estanca (≥3 iteraciones sin mejora >0.005) **y** el ensemble muestra cohort indicators en top-5 importance (Hard rule 17) **y** el dataset es chico (<2k filas), TabPFN es candidato natural. Pero cambiar de paradigma (ensemble → foundation model) afecta latencia (50ms → 1-2s), tamaño del artefacto (5MB → 30MB) y deployabilidad — confirmar antes de invertir el ciclo de entrenamiento.

**Para resolver necesitas:** evidencia de techo en binary + sospecha de cohort overfitting; aprobación del project owner sobre tolerancia a la mayor latencia y tamaño en el destino de despliegue (model registry, serverless, API interna).

---

## 13. Drop reglas del hybrid (deploy ML-only) — Hard rule 19

Si `evaluate_rules_discriminative_power(...)` muestra que las reglas **bajan** el AUC del ML en la subpoblación de uso (no solo "no aportan"), el deploy debería ser ML-only. Pero dropear reglas que vienen del playbook histórico del cliente es decisión de negocio — the project owner confirma con cliente antes de cambiar la arquitectura del scorer.

**Para resolver necesitas:** delta AUC con vs sin reglas en la subpob de uso (con bootstrap CI), histórico de cómo se vendieron las reglas al cliente, voluntad del cliente de soltar reglas que llevaba años aplicando.

---

## 14. Definir cortes mensuales para sliding-window OOT — Hard rule 18

Sliding-window OOT (5 cortes, train-on-past / eval-on-future) requiere fijar las fechas de corte. Default razonable: 5 cortes mensuales que cubren los últimos 5 meses con `Fecha_registro` disponible. Pero la cohorte puede tener gaps (vacaciones colectivas, freezes de hiring) o eventos (cambio de política HR, restructuración) que invalidan ciertas ventanas.

**Para resolver necesitas:** rango temporal del dataset, eventos históricos relevantes en el span (cambios de política, freezes, restructuraciones, COVID-19), tamaño mínimo de cohorte por corte (típico ≥100 filas).
