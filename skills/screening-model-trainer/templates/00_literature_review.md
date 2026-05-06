# 00 — Revisión de Literatura

> Anclaje del proyecto a la evidencia publicada y al estándar TRIPOD+AI.

## 1. Pregunta clínica

<!-- TODO: 1-2 frases. Condición a predecir, población, horizonte (cross-sectional o incidente a N años). -->

## 2. Estudios de referencia

<!-- TODO: tabla con cohorte, mejor modelo, métrica clave. Mínimo 5 papers comparables. -->

| Paper | Cohorte | Mejor modelo | Métrica clave |
|---|---|---|---|
| | | | |

## 3. Métricas objetivo (ancladas a la literatura)

<!-- TODO: traducir los rangos de la literatura al estándar del proyecto. -->

| Métrica | Aceptable | Fuerte | Referencia |
|---|---|---|---|
| AUROC | | | |
| AUPRC | | | |
| Brier | | | |
| Calibration slope / intercept | 0.9–1.1 / ±0.1 | 0.95–1.05 / ±0.05 | TRIPOD+AI |
| Sensibilidad @ 90% especificidad | | | |

Para despliegue clínico, **calibración + análisis de curva de decisión (DCA)** priman sobre AUROC.

## 4. Checklist TRIPOD+AI (Collins et al., BMJ 2024)

<!-- TODO: confirmar que el plan cubre los 27 ítems. Marcar los pendientes. -->

- [ ] Población claramente definida
- [ ] Outcome operacionalizado
- [ ] Variables predictoras descritas
- [ ] Manejo de missing documentado
- [ ] Estrategia de splits explicada (temporal o externo, no aleatorio)
- [ ] Tamaño de muestra justificado
- [ ] Métricas de discriminación + calibración + utilidad clínica
- [ ] Análisis por subgrupos
- [ ] Reporte de fairness / equidad
- [ ] Limitaciones explícitas
- [ ] Disponibilidad del modelo + datos
- [ ] (...)

## 5. Pitfalls a evitar

<!-- TODO: lecciones de la literatura — leakage, calibración rota, splits aleatorios, AUROC sin AUPRC, etc. -->

- ...
