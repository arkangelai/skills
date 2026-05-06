# 10 — 1-pager cliente (Phase 13)

> Resumen ejecutivo de 1 página para stakeholder no-ML. **Vinculante:** todas las métricas en %; sin jargon (foundation model, ensemble, Brier, ECE, slope, AUC).

# <!-- TODO: Cliente --> — Modelo de retiro temprano (1-pager)

**Fecha:** <!-- TODO: YYYY-MM-DD --> · **Versión:** <!-- TODO: vN (winner) --> · **Cohorte:** <!-- TODO: descripción + n + corte temporal -->

---

## Qué entrega el modelo

<!-- TODO: 1 párrafo plano. Ej: "Un puntaje de probabilidad de retiro temprano del candidato, calculado con las mismas N variables que ya se capturan en el formulario. Se usa en preingreso para apoyar al equipo de RH a flagear candidatos con alto riesgo antes de la contratación." -->

- **Para qué sirve:** <!-- TODO: priorizar candidatos para revisión adicional en RH. -->
- **Para qué NO sirve:** <!-- TODO: no reemplaza la entrevista ni decide la contratación. Es una señal complementaria. -->

## Qué cambió respecto al modelo actual

| | Modelo actual (en producción) | Modelo nuevo (recomendado) |
|---|---|---|
| **De cada 100 retiros reales, cuántos detecta** | <!-- TODO: 17 --> | <!-- TODO: 78 --> |
| Confiabilidad de las probabilidades | <!-- TODO: "Dice 70% pero realmente 30%" --> | <!-- TODO: "Dice 70% y realmente 70%" --> |
| <!-- TODO: regla / componente removido --> | <!-- TODO: descripción de problema --> | <!-- TODO: **Eliminadas — no aportan en preingreso** --> |
| Variables capturadas | <!-- TODO: Las mismas N --> | <!-- TODO: Las mismas N --> |
| Re-entrenamiento | <!-- TODO: Manual / esporádico --> | <!-- TODO: Mensual / automatizado --> |

## Variables que pesan en cada modelo (top 5)

| # | Modelo actual | Peso | Modelo nuevo | Peso |
|---|---|---:|---|---:|
| 1 | <!-- TODO --> | <!-- TODO: %% --> | <!-- TODO --> | <!-- TODO: %% --> |
| 2 | <!-- TODO --> | <!-- TODO: %% --> | <!-- TODO --> | <!-- TODO: %% --> |
| 3 | <!-- TODO --> | <!-- TODO: %% --> | <!-- TODO --> | <!-- TODO: %% --> |
| 4 | <!-- TODO --> | <!-- TODO: %% --> | <!-- TODO --> | <!-- TODO: %% --> |
| 5 | <!-- TODO --> | <!-- TODO: %% --> | <!-- TODO --> | <!-- TODO: %% --> |

> <!-- TODO opcional: si el modelo actual tenía un cohort indicator en top-5, mencionarlo aquí en plain language como bandera roja resuelta. Ej: "El modelo actual le da el 3er peso más alto a 'momento de evaluación' — una marca administrativa, no un atributo del candidato. El modelo nuevo le da menos del 5%." -->

## Cómo se valida

| Validación | Resultado |
|---|---|
| <!-- TODO: 5 cortes mensuales (entrenar en pasado, evaluar en futuro) --> | <!-- TODO: El modelo nuevo gana en los 5 cortes --> |
| <!-- TODO: 5 ventanas deslizantes --> | <!-- TODO: Consistencia confirmada --> |
| Bootstrap 1.000 repeticiones | <!-- TODO: Probabilidad de que la mejora sea suerte: <1% --> |
| Calibración de probabilidades | <!-- TODO: Las probabilidades son interpretables --> |

## Tres modos de operación

| Modo | % de candidatos marcados | De cada 100 retiros, cuántos detecta | Cuándo usar |
|---|---|---|---|
| **<!-- TODO: Screening (default) -->** | <!-- TODO: 23% --> | <!-- TODO: 78 --> | <!-- TODO: Tamizaje activo --> |
| <!-- TODO: Confianza alta --> | <!-- TODO: 12% --> | <!-- TODO: 56 --> | <!-- TODO: Capacidad limitada de revisión --> |
| <!-- TODO: Auditoría --> | <!-- TODO: 5% --> | <!-- TODO: 33 --> | <!-- TODO: Reportes ejecutivos --> |

## Limitaciones honestas

1. <!-- TODO: latencia operacional si aplica -->
2. <!-- TODO: tamaño del modelo si aplica -->
3. <!-- TODO: cohorte limitada / sesgos conocidos -->

## Lo que recomendamos

1. <!-- TODO: Aprobar el switch del modelo actual al nuevo. -->
2. <!-- TODO: Modo screening (default) en preingreso. -->
3. <!-- TODO: Eliminar el componente reglas / hybrid si aplica. -->
4. <!-- TODO: Compartir mensualmente los outcomes para validación continua. -->
5. <!-- TODO: Acordar contratar el X% de candidatos marcados como alto riesgo (grupo de control). -->
6. <!-- TODO: Pilot canary 14 días (10% del tráfico al nuevo). -->

---

*Auditoría técnica completa: <!-- TODO: N secciones, M cortes mensuales, 1.000 repeticiones de bootstrap, validación de calibración -->. Reproducible y disponible bajo solicitud.*
