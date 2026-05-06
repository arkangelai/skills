# 07 — Model Card

> Estilo Mitchell et al. 2019.

## Detalles del modelo

| Campo | Valor |
|---|---|
| **Nombre** | <!-- TODO: ProyectoCondition vN --> |
| **Tipo** | <!-- TODO: Clasificación binaria — CatBoost calibrado con isotónica --> |
| **Fecha de entrenamiento** | <!-- TODO --> |
| **Datos** | <!-- TODO: dataset path, n, prevalencia --> |
| **Artefacto** | <!-- TODO: artifacts/<modelo>.pkl --> |
| **Hiperparámetros** | <!-- TODO --> |
| **Equipo** | <!-- TODO --> |
| **Contacto** | <!-- TODO --> |
| **Reproducibilidad** | seed=42 en todo el pipeline |

## Uso previsto

- **Caso primario:** <!-- TODO: estratificación / triaje / etc. -->
- **Usuarios:** <!-- TODO -->
- **Decisiones que respalda:** <!-- TODO -->

### 🚫 Fuera de alcance

- <!-- TODO: predicción de incidencia futura si es cross-sectional -->
- <!-- TODO: poblaciones distintas a la cohorte de entrenamiento -->
- <!-- TODO: decisión clínica autónoma — siempre apoyo, no reemplazo -->
- <!-- TODO: pacientes <18 si no están en el dataset -->

## Datos de entrenamiento

<!-- TODO: cohorte, n, prevalencia, distribución demográfica. -->

## Features

<!-- TODO: lista del set base + (si aplica) set v0.3 winner. -->

## Output

Probabilidad calibrada `P(target=1 | features) ∈ [0, 1]`.

### Thresholds operativos por uso clínico

<!-- TODO: tabla de 4 thresholds — el equipo clínico escoge según costo FN:FP. -->

## Desempeño global

<!-- TODO: AUROC, AUPRC, Brier, calibración, sens@spec en holdout. -->

## Desempeño por subgrupos

<!-- TODO: paridad por sexo, edad, institución. Marcar Δ>0.05 como limitación. -->

## Validación LOIO

<!-- TODO: si aplica. -->

## Limitaciones conocidas

<!-- TODO: cohorte limitada / features faltantes / posibles correlaciones causales engañosas / temporal vs cross-sectional / sex-skew. -->

## Consideraciones éticas

- **Equidad:**
- **Privacidad:**
- **Beneficios y daños potenciales:**

## Recomendaciones de uso

1. Recalibrar antes de desplegar en una cohorte distinta.
2. Reportar drift mensualmente; re-entrenar si AUROC cae >0.05.
3. Usar como apoyo, no de decisión autónoma.
4. <!-- TODO: project-specific -->

## Detalles técnicos de despliegue

- **Latencia:**
- **Tamaño:**
- **Dependencias:**
- **Inferencia:** cargar `<artifact>.pkl`, alimentar X de N columnas en orden definido por `data/processed/feature_names.json`.
- **Re-entrenamiento:**
