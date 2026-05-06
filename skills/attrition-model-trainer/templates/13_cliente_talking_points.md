# 13 — Talking points (Phase 13)

> Guión interno del presenter. Números exactos por slide + respuestas a FAQ probables del stakeholder. **No** se comparte con el cliente — sirve para que quien presenta tenga seguridad en cada número.

## Slide 1 — Cover

- Titular: "<!-- TODO: detectamos N veces más de los retiros reales -->"
- Sub: "<!-- TODO: el modelo actual encuentra 17 de cada 100; el nuevo encuentra 78 — sobre los mismos candidatos, las mismas variables -->"
- Si pregunta "¿qué tan robusto es este número?" → "<!-- TODO: validado en 5 cortes mensuales independientes y 1.000 repeticiones bootstrap, P(mejora real) = X% -->"

## Slide 2 — Problema

Datos exactos para los 4 puntos:

1. **Detección baja:** <!-- TODO: 17 / 100 retiros detectados con threshold operacional actual -->
2. **Reglas no aplican en preingreso:** <!-- TODO: % de candidatos preingreso con respuesta = 0 a "depresión / fatiga / cansancio" -->
3. **Probabilidades infladas:** <!-- TODO: bucket top dice X%, real Y% (incidente con miscalibración severa) -->
4. **OOT collapse:** <!-- TODO: AUC CV 0.798 → OOT preingreso 0.306 -->

## Slide 4 — Big number

- 17 viene de: <!-- TODO: artefacto / cohorte / threshold -->
- 78 viene de: <!-- TODO: artefacto / cohorte / threshold (mismo de comparación) -->
- Si pregunta "¿por qué tan grande la diferencia?" → "<!-- TODO: el modelo actual estaba sobre-aprendiendo de un indicador de cohorte y miscalibrando las probabilidades. El nuevo no tiene ese problema. -->"

## Slide 6 — Variables

Top 5 modelo actual: <!-- TODO -->
Top 5 modelo nuevo: <!-- TODO -->

Punto clave si hay cohort indicator: "<!-- TODO: 'Momento de evaluación' es el 3er peso más alto en el modelo actual — pero es marca administrativa, no atributo del candidato. Es señal de que el ensemble se apoyaba en la cohorte. El nuevo le da menos del 5%. -->"

## Slide 7 — Consistencia mensual

- Modelo actual va: <!-- TODO: 64% → 65% → 67% → 62% → 60% (se queda parado o empeora) -->
- Modelo nuevo va: <!-- TODO: 65% → 61% → 77% → 79% → 81% (mejora con más datos) -->
- "Esto significa que el nuevo modelo se va volviendo más exacto solo, sin re-diseñarlo. Solo re-entrenarlo cada mes."

## Slide 9 — Calibración

- Bucket top modelo actual: dice <!-- TODO: 78% -->, real <!-- TODO: 5.3% -->. Slope <!-- TODO: 0.18 -->.
- Bucket top modelo nuevo: dice <!-- TODO: 42% -->, real <!-- TODO: 37% -->. Slope <!-- TODO: 1.32 -->.
- Si pregunta qué es "calibración" → "que el número que da el modelo se parezca al porcentaje real que se va. Sirve para priorizar."

## Slide 10 — Tabla métricas

Todas en %. Si pregunta por alguna métrica específica:

- "AUC" → "capacidad de distinguir retiros — un 80% significa que en una pareja al azar (uno que se va, uno que se queda), el modelo le pone más score al que se va el 80% del tiempo".
- "Brier" → "error promedio entre la probabilidad que dice el modelo y lo que realmente pasó. Más bajo es mejor".
- "ECE" → "qué tan inflado o subestimado está el modelo en promedio. 0% es perfecto".

## Slide 11 — Pedidos

Razones detrás de cada pedido:

1. **Aprobar el switch:** <!-- TODO: por qué ahora -->
2. **Modo screening default:** <!-- TODO: tradeoff carga RH vs detección -->
3. **Quitar reglas / hybrid:** <!-- TODO: si aplica, datos de auditoría OOT que prueban que las reglas hurt -->
4. **Outcomes mensuales:** <!-- TODO: para validar que el modelo se mantiene -->
5. **10% control:** <!-- TODO: justificar como contrafáctico para detectar drift -->
6. **Canary 14d:** <!-- TODO: rollback < 5min, threshold de alerta -->

## FAQ probables

| Pregunta | Respuesta corta |
|---|---|
| <!-- TODO: ¿Y si el modelo nuevo se equivoca con un buen candidato? --> | <!-- TODO: contratamos el 10% marcado para tener grupo de control + threshold ajustable --> |
| <!-- TODO: ¿Por qué no usaron el modelo actual con más datos? --> | <!-- TODO: el modelo actual estaba miscalibrado y over-fitting cohort, agregar datos no soluciona eso --> |
| <!-- TODO: ¿Qué pasa si cambia el perfil de candidatos? --> | <!-- TODO: re-entrenamiento mensual + monitoring de drift --> |
| <!-- TODO: ¿Esto reemplaza la entrevista? --> | NO. El modelo es señal de tamizaje, la decisión queda en RH. |
| <!-- TODO: ¿Hay sesgo por edad / género? --> | <!-- TODO: análisis de subgrupos en el model card; si hay disparidad documentada, mencionar mitigation --> |
| <!-- TODO: ¿Cuánto cuesta operar el modelo? --> | <!-- TODO: latencia X / RAM Y / costo cómputo Z --> |
