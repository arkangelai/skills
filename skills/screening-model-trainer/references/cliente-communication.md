# Cliente communication — convenciones obligatorias para materiales externos

Estas reglas no son preferencias estilísticas — son guardrails aprendidos de malentendidos en reuniones cliente pasadas. Aplican a TODO material externo (deck HTML, 1-pager, talking points, slides outline, deploy spec).

---

## Variable naming

- Usar **clinical Spanish names**, nunca el column name del modelo. `bmi` → `Índice de Masa Corporal`. `tab_yes` → `Hábito tabáquico`. `paquetes_anho` → `Paquetes-año`. `mmrc` → `Disnea (mMRC)`.
- Para variables binarias en slides: **`existe / no existe`**, NUNCA `sí / no` (matchea convención Hippocrates/EHR).
- Para variables con missingness handling: **`existe / no existe / unknown`** (ej. Hábito tabáquico).
- Para numéricas: incluir **min-max range y units** (`Edad — numérica · 18 – 100 años`).
- Para categóricas: listar **todas las categorías explícitamente** (`Tipo de tabaco — Activo / Pasivo / Ambos / unknown`).
- Cuando muestras diferencias vs producción: listar **solo las nuevas/enriquecidas** del lado del modelo nuevo. NO repetir la base compartida.

---

## Jargon translation table

| ❌ Don't say | ✅ Say instead |
|---|---|
| "calibrado" / "modelo calibrado" | "probabilidad clínica validada" |
| "Brier score" | "qué tan bien las probabilidades coinciden con la realidad" — o droppear la métrica y reemplazar con "validamos que cuando dice 70%, son 70 de cada 100" |
| "operating points" | "modos de uso" / "puntos de operación clínica" |
| "AUROC" | mantener pero acompañar SIEMPRE con explicación: "qué tan bien separa enfermos de sanos en general" |
| "feature engineering" | "extraer relaciones entre variables existentes" |
| "ensemble" | "combinación / mezcla" |
| "operating point match" | "mismo costo operativo" |
| "informational ceiling" | "techo de información en los datos disponibles" |
| "no es calibrado" (sobre deployed) | "el número que entrega no se puede interpretar como porcentaje real — es una puntuación interna que clasifica" |
| "probabilidades reales" | **CONFUSING** — ambos calibrated y uncalibrated outputean 0-1. Usar "probabilidad clínica validada" + siempre acompañar con la explicación "70 de cada 100". |

---

## When cliente-declared metrics differ from honest re-evaluation

🔴 **Pause-point #14.** Si tu honest 80/20 holdout da Spec=42% pero el cliente fue informado Spec=50.5% por el deployed-team, **default conservador**:

- Usar el número del cliente **externamente** (slide deck, 1pager, talking points).
- Documentar la discrepancia SOLO en `RESULTS.md` y `08_decisions_log.md` (interno).
- La reunión cliente NO es el lugar para surfear errores de modelado del vendor que no son nuestros para fix.
- **Confirmar con Laura** antes de publicar cualquiera de los dos sets de números.

---

## SHAP for cliente: aggregate by clinical variable, never by OHE column

Los SHAP posters de producción típicamente muestran "Edad: 41.5", "Tabaco: 49.6" — variables clínicas, no `tab_yes: 0.18`. Cuando comparas tu nuevo modelo SHAP vs producción:

1. Sumar el `|SHAP|` de todas las OHE columns + derived features que pertenecen a la misma variable clínica.
2. Asignar cada engineered feature a UNA primary clinical variable (ej. `age_x_paquetes` → Tabaquismo, `mmrc_x_paquetes` → Disnea).
3. Normalizar a % del total `|SHAP|` del modelo.
4. Mostrar top-9 (matchea typical poster count de producción) para que el side-by-side tenga el mismo row count.

Función helper: `feature_audit.aggregate_shap_by_clinical_variable()` con un mapping project-defined.

---

## "Por qué la spec se mantiene igual" — explicit framing

Cuando las métricas muestran Sens & Spec idénticas a producción con AUROC up, el cliente típicamente pregunta "¿por qué no subió la spec si el modelo es mejor?". **Responder en el slide directamente:**

> "El threshold del nuevo modelo se eligió **específicamente** para reproducir la sensibilidad target del cliente. En ese punto exacto las dos curvas ROC coinciden por construcción. La ganancia AUROC viene de que **TODO EL RESTO de la curva es mejor** — el nuevo modelo da flexibilidad para mover el threshold a otros puntos donde producción no puede llegar."

Este framing evita la apariencia de "no improvement" y convierte el matched operating point de una "weakness" en la value proposition central: **sin costo operativo + AUROC gain for free**.

---

## Resumen del 11-slide deck (orden y propósito)

1. **Cover** — `Ark × Cliente` lockup, project + date + version.
2. **Problem** — por qué cambiar el deployed (≤4 limitaciones numeradas, no más).
3. **Headline** — UN big number (típicamente AUROC delta) + side panel con métricas mantenidas.
4. **Features comparison** — production list (N variables) IZQUIERDA, new model mostrando SOLO las NUEVAS / ENRICHED (M-N) DERECHA. No repetir compartidas.
5. **Variables dictionary** — nombres clínicos español + tipo + range/categorías. `existe / no existe` para binarias, min-max para numéricas, listas categóricas. Marcar NEW con ★.
6. **Metrics comparison** — tabla side-by-side, highlight rows que mejoraron.
7. **Subgroups** — bar chart por demographic split.
8. **SHAP comparison** — agregado por variable clínica (NUNCA por OHE column), en % del total importance.
9. **Architecture** — visual del ensemble (modelo + score externo, ej. 90% / 10%).
10. **Insights** — 3 cards en plain language, una idea por card.
11. **CTA / next steps** — acciones numeradas + bundle path + audit references.

Referencia canónica del HTML deck: `AZ_exps/oculus/docs/cliente/team_presentation/index.html` (proyecto interno).
