# 08 — Model Card

> Estilo Mitchell et al. 2019. Este es el documento que ven auditoría / cliente / comité ético.

## Detalles del modelo

| Campo | Valor |
|---|---|
| **Nombre** | <!-- TODO: <Cliente>Attrition vN --> |
| **Tipo** | <!-- TODO: Clasificación binaria / multiclass derivado a binaria / hybrid --> |
| **Fecha de entrenamiento** | <!-- TODO --> |
| **Datos** | <!-- TODO: dataset path, n, tasa de retiro --> |
| **Artefacto** | <!-- TODO: artifacts/vN_full_cohort.pkl --> |
| **Hiperparámetros** | <!-- TODO --> |
| **Equipo** | <!-- TODO --> |
| **Contacto** | <!-- TODO --> |
| **Reproducibilidad** | seed=42 en todo el pipeline |

## Uso previsto

- **Caso primario:** <!-- TODO: filtro de preingreso / triaje de retención / alerta de riesgo --> 
- **Usuarios:** <!-- TODO: HR / managers / business partners --> 
- **Decisiones que respalda:** <!-- TODO -->

### 🚫 Fuera de alcance

- <!-- TODO: decisiones autónomas de despido / no contratación sin revisión humana -->
- <!-- TODO: poblaciones distintas a la cohorte de entrenamiento (sede / país / industria) -->
- <!-- TODO: predicción individual de causas de retiro (el modelo predice quién, no por qué) -->

## Datos de entrenamiento

<!-- TODO: cohorte, n, tasa de retiro, distribución demográfica (sexo, edad, cargo, sede). -->

## Features

- **Set base (n=N):** <!-- TODO --> 
- **Set extendido si aplica:** <!-- TODO --> 
- **Excluidas por leakage:** <!-- TODO -->

## Output

<!-- TODO: probabilidad calibrada P(retiro=1 | features) ∈ [0, 1] o risk_score derivado de multiclass. -->

### Thresholds operativos por uso de negocio

> Detalle completo en `07_threshold_and_business_value.md`.

| Threshold | Use case | Precision esperada | Recall esperada | Flagged % |
|---|---|---|---|---|
| <!-- TODO --> | | | | |

## Desempeño global

<!-- TODO: AUROC, AUPRC, Brier, calibración en holdout. IC 95% por bootstrap. -->

## Desempeño por subgrupo

<!-- TODO: paridad por sexo, edad, tipo de contrato, sede. Marcar Δ>0.05 como limitación. -->

## Validación LOIO

<!-- TODO: si hay grupos (sedes, empresas), reportar AUROC dejando uno afuera. -->

## Limitaciones conocidas

- <!-- TODO: cohorte limitada en tamaño / temporalidad -->
- <!-- TODO: features faltantes (ej. exit interviews, satisfacción de manager) -->
- <!-- TODO: posibles correlaciones causales engañosas -->
- <!-- TODO: techo information-theoretic (si aplica) -->

## Consideraciones éticas

- **Equidad:** <!-- TODO: análisis de paridad por género / edad / cargo. ¿Hay segmentos donde el modelo es sistemáticamente peor? --> 
- **Privacidad:** <!-- TODO: qué features se procesan, anonimización, retención. --> 
- **Beneficios y daños potenciales:** <!-- TODO: ej. uso del modelo para discriminar en contratación es un riesgo explícito. --> 
- **Mitigaciones:** <!-- TODO: human-in-the-loop, revisión periódica de equidad, mecanismo de apelación. --> 

## Recomendaciones de uso

1. **Recalibrar antes de desplegar** en una cohorte distinta (otra sede, otra empresa, otro país).
2. **Reportar drift mensualmente**; re-entrenar si AUROC cae >0.05.
3. **Usar como apoyo**, nunca como decisión autónoma.
4. **Threshold lo decide el negocio**, no el equipo de ML — ver `07_threshold_and_business_value.md`.
5. <!-- TODO: project-specific -->

## Detalles técnicos de despliegue

- **Latencia objetivo:** <!-- TODO -->
- **Tamaño del artefacto:** <!-- TODO -->
- **Dependencias:** <!-- TODO -->
- **Inferencia:** cargar `<artifact>.pkl`, alimentar X de N columnas en orden definido por `data/processed/feature_names.json`.
- **Re-entrenamiento:** <!-- TODO: cadencia, dueño, criterio de trigger -->
