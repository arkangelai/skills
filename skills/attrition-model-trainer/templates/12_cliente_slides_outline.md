# 12 — Slides outline (Phase 13)

> Outline de 10-12 slides para el deck cliente. Estructura del **patrón oculus** validada en proyectos previos. **Vinculante:** todas las métricas en %; SHAP / tablas en HTML/CSS no PNG.

## Estructura

| # | Slide | Tipo de visual | Contenido clave |
|---|---|---|---|
| 1 | **Cover** | Title + big text | <!-- TODO: titular accionable + sub. Ej: "Detectamos N veces más de los retiros reales" --> |
| 2 | **Problema** | Card list (4 puntos) + side-card | <!-- TODO: por qué cambiar — modelo actual no entrega lo prometido --> |
| 3 | **Metodología** | 3 insight cards | <!-- TODO: cómo evaluamos un modelo nuevo (entrenar pasado, evaluar futuro / bootstrap / ventanas deslizantes) --> |
| 4 | **Big number — comparación** | Duo stat cards | <!-- TODO: "17 vs 78" — mismos candidatos, mismo flujo, N veces más detección --> |
| 5 | **Por qué funciona** | 3 insight cards | <!-- TODO: 3 razones (foundation pre-trained / componente removido / probabilidades reales) — sin jargon --> |
| 6 | **Variables — antes vs ahora** | `.shap-grid` (2 columnas, 10 barras c/u) | <!-- TODO: top 10 features de cada modelo, % pesos. Highlight cohort indicator si aplica. --> |
| 7 | **Consistencia mensual** | HTML table con bars (5 cortes) | <!-- TODO: AUC % por corte, modelo actual vs nuevo, columna delta --> |
| 8 | **Modos de operación** | 3 cards (recomendado + 2 alternativas) | <!-- TODO: Screening / Confianza alta / Auditoría con % marcado y % detectado --> |
| 9 | **Calibración** | `.shap-grid` (2 columnas, buckets predicho vs real) | <!-- TODO: tabla bin-level con barras paralelas. Highlight bucket roto del modelo actual. --> |
| 10 | **Métricas — antes vs ahora** | `table.cmp` (8 filas, 4 columnas) | <!-- TODO: todas las métricas en %, columna delta en pp --> |
| 11 | **Pedidos** | CTA list (6 numerados) + side-card | <!-- TODO: aprobar switch / modo screening / quitar reglas / outcomes mensuales / 10% control / canary 14d --> |
| 12 | **Cierre** | Lede + footnote | <!-- TODO: "Detectamos N veces más sobre los mismos datos. Listos cuando ustedes lo estén." Sin email. --> |

## Reglas vinculantes

- **Todas las métricas en %:** AUC 0.78 → 78%. Brier 0.055 → 5.5%. Diferencias en "puntos porcentuales (pp)".
- **SHAP / feature importance** en `.shap-grid` HTML/CSS, **no como imagen PNG**.
- **Tablas** en `table.cmp`, **no como imagen**.
- **Variables** en plain-Spanish: `Tipo_examen` → "Momento de evaluación". Mapping debe estar en un dict reutilizable.
- **Sin jargon:** prohibidos en slides cliente — `foundation model`, `ensemble`, `Optuna`, `Brier`, `ECE`, `slope`, `intercept`, `walk-forward`, `bootstrap`, `AUC` (traducir a "de cada 100 retiros, cuántos detecta").
- **Sin email / contacto** en slide de cierre por default. Solo agregar si project owner/cliente lo piden explícitamente.
- **Brand kit** del cliente (no usar Arkangel orange si el cliente tiene otro color primario; preguntar).

## Patrones HTML CSS de referencia

> Reutilizar el HTML/CSS del deck más reciente con Phase 13 completa que tenga el equipo. Los componentes ya están testeados; pedir a la persona que conduce el proyecto el path del deck de referencia para copy-paste.

Los componentes reusables (copy-paste):

| Componente | Clase CSS | Uso |
|---|---|---|
| Big stat duo | `.duo-grid` + `.stat-card` | slide 4 |
| 3 insight cards | `.insight-grid` + `.insight-card` | slide 3, 5 |
| SHAP comparison | `.shap-grid` + `.shap-col` + `.shap-row` | slide 6, 9 |
| Comparison table | `table.cmp` con `.metric .num.prod .num.new .delta` | slide 10 |
| CTA list numbered | `.cta-block` + `.cta-list` | slide 11 |
| Problem list | `.problem-list` + `.pl-num` + `.pl-text` | slide 2 |
