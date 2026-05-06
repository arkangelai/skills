# 11 — Deploy spec (Phase 13)

> Spec técnico para el equipo ML/eng del cliente. **No** es para el stakeholder no-ML (ese ve `10_cliente_1pager.md`).

## Modelo

| Campo | Valor |
|---|---|
| **Versión** | <!-- TODO: vN --> |
| **Tipo** | <!-- TODO: ensemble / TabPFN / hybrid ML+rules --> |
| **Fecha de entrenamiento** | <!-- TODO: YYYY-MM-DD --> |
| **n_train** | <!-- TODO --> |
| **Features** | <!-- TODO: N variables, ver `feature_names.json` --> |
| **Threshold default** | <!-- TODO: P>=X.XX para flag screening --> |
| **Artefacto** | <!-- TODO: artifacts/vN_full_cohort.pkl --> |

## Métricas (validación honesta)

| Métrica | Valor | CI 95% | Notas |
|---|---|---|---|
| AUC OOT global | <!-- TODO --> | <!-- TODO --> | <!-- TODO: corte 2025-08-31 --> |
| AUC OOT subpob de uso | <!-- TODO --> | <!-- TODO --> | <!-- TODO: preingreso / periódico --> |
| AUC walkforward (5 ventanas) | <!-- TODO --> | <!-- TODO --> | std entre ventanas |
| Brier (subpob de uso) | <!-- TODO --> | <!-- TODO --> | menor = mejor |
| ECE (subpob de uso) | <!-- TODO --> | <!-- TODO --> | menor = mejor |
| Calibration slope | <!-- TODO --> | — | debe ∈ [0.8, 1.2] |
| **Bucket top fraction_positives** | <!-- TODO --> | <!-- TODO --> | Hard rule 20: ≥0.5 × predicted |

## Bundle de archivos (deployment platform)

| Archivo | Tamaño | SHA-256 | Notas |
|---|---|---|---|
| `model.pkl` | <!-- TODO --> | <!-- TODO --> | dict con `{label, features, model, threshold}` |
| `means.npy` | <!-- TODO --> | <!-- TODO --> | numpy 1-D, orden = features |
| `stds.npy` | <!-- TODO --> | <!-- TODO --> | numpy 1-D, orden = features |
| `background_shap_set.csv` | <!-- TODO --> | <!-- TODO --> | ~100 filas estratificadas, columnas pre-OHE |
| `sucess_io_data.json` | <!-- TODO --> | <!-- TODO --> | esquema I/O |
| `deploy_metadata.json` | <!-- TODO --> | <!-- TODO --> | metadata + Hard rule 20 attestation |

## Contrato I/O

**Input** (`features` keys):
```json
<!-- TODO: pegar contenido de feature_names.json -->
```

**Output:**
```json
{
  "score": 0.0,           // probabilidad calibrada [0, 1]
  "flag": "low|mid|high", // según threshold operativo
  "model_version": "vN"
}
```

## Latencia y recursos esperados

| Métrica | Valor | Notas |
|---|---|---|
| Latencia p50 | <!-- TODO --> | <!-- TODO: ej. 50ms ensemble / 1-2s TabPFN --> |
| Latencia p99 | <!-- TODO --> | <!-- TODO --> |
| RAM en runtime | <!-- TODO --> | <!-- TODO: foundation model puede pegar 400-800MB --> |
| Cold-start | <!-- TODO --> | <!-- TODO: relevante en serverless --> |

## Plan de canary

| Día | Tráfico al modelo nuevo | Acción si OOT collapse |
|---|---|---|
| 0-3 | 1% | Rollback automático si delta AUC > -0.05 vs producción |
| 4-7 | 5% | Revisión manual al final del día |
| 8-14 | 10% | Comparar contra outcomes a 30 días |
| 15+ | 100% si métricas se mantienen | — |

## Plan de rollback

1. <!-- TODO: artefacto previo se mantiene en Storage como `vN-1_full_cohort.pkl`. -->
2. <!-- TODO: switch a vN-1 < 5min (config flag en API gateway). -->
3. <!-- TODO: notificar a project owner + equipo cliente. -->

## Monitoring continuo

| Métrica | Threshold de alerta | Acción |
|---|---|---|
| AUC OOT mensual | <!-- TODO: drop >0.05 vs val --> | Revisión manual |
| Drift de features | <!-- TODO: PSI > 0.2 --> | Re-train candidate |
| Tasa de flag | <!-- TODO: >2× vs val --> | Investigar pre-pre-process |
| Latencia p99 | <!-- TODO --> | Escalar infra |
