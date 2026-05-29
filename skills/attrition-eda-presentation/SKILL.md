---
name: attrition-eda-presentation
description: Produce a client-ready EDA presentation (self-contained HTML) for a single company or company-group from the Comfama employee-retention model's PREDICTIONS (no true labels), mirroring the ARQUITECTURA Y CONCRETO deliverable. Use when asked to build, refresh, or recreate the retention EDA / client presentation for a specific company or grupo empresarial from existing predictions (e.g. "haz el EDA de Grupo BIOS", "presentación de retención para CONTEGRAL", "recrea este análisis para la empresa X"). NOT for training a model (use attrition-model-trainer) — this consumes predictions already in Supabase.
version: 1.0.0
author: laura.bellon@arkangel.ai
platforms: [macos, linux, windows]
metadata:
  hermes:
    tags: [eda, attrition, retention, presentation, client-deliverable, predictions, supabase, comfama]
    category: analysis-presentation
    requires_toolsets: [terminal]
---

# attrition-eda-presentation

Recrea, para cualquier empresa o **grupo empresarial**, el EDA cliente de retención
en el mismo estilo que el entregable de **ARQUITECTURA Y CONCRETO**, pero a partir
de las **predicciones del modelo** que ya viven en Supabase (no hay etiquetas reales
de retiro). Salida: un **HTML autocontenido** (React + recharts compilado con
`vite-plugin-singlefile`), sin dependencias de Lovable y sin puerta de acceso.

Contraparte de `attrition-model-trainer` (que ENTRENA el modelo). Esta skill solo
**consume** las predicciones existentes y produce el entregable visual.

## Referencias canónicas (en `Repositorios/`)

- **Estructura/diseño de referencia:** `comfama-employees-client-summary/` (ARQ, con true labels, 1.008 empleados). Su `src/components/SSTAnalysis.tsx` define el ORDEN de secciones a calcar.
- **Implementación de ejemplo (predicciones, N pequeño):** `comfama-bios-summary/` (Grupo BIOS, 14 empleados). Es la plantilla viva de esta skill.
- **Datos:** tabla `predictions` de Supabase, proyecto `comfama-employee-retention`. Credenciales en `comfama-employee-retention/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `COMFAMA_PROJECT_NAME`).
- **Catálogo de empresas + aliases:** `comfama-employee-retention/src/data/companies.ts` (nombre canónico + NIT) y `src/lib/companyNormalize.ts` (lógica de normalización).
- **Scripts reutilizables:** `references/extract_company_eda.mjs` (extrae+agrega) y `references/verify_render.mjs` (verifica el render). Cópialos al repo del entregable y edita el `GROUP`.

## When to Use

- "Haz/recrea el EDA de retención para <empresa o grupo>" sobre predicciones existentes.
- "Genera la presentación cliente para <empresa>" en el estilo de ARQUITECTURA Y CONCRETO.
- Refrescar un entregable cuando entraron más encuestas (re-extraer → actualizar snapshot → recompilar).

**No usar:** para entrenar/refrescar el modelo (usa `attrition-model-trainer`); para datos que no sean del proyecto `comfama-employee-retention`.

## Procedure

### Fase 0 — Definir el scope (empresa o grupo)
- Si es **grupo**, lista los `company_name` canónicos + NIT (revísalos en `companies.ts`). Ej. Grupo BIOS = `CONTEGRAL`, `ALIMENTOS FINCA`, `SERVICIOS GRUPO BIOS`, `COMERCIAL + BIOS`.
- Normaliza para el match: NFD, quitar diacríticos, trim, **quitar puntos/espacios al final**, uppercase, **conservar `+`** (ej. "COMERCIAL + BIOS"). Match por NIT primero, luego por nombre normalizado.
- Aliases que existan en el catálogo pero **no tengan predicciones se reportan como `0`, nunca se excluyen**.

### Fase 1 — Extraer + agregar (read-only)
- Copia `references/extract_company_eda.mjs` a `comfama-employee-retention/scripts/diagnostics/`, edita el set `GROUP`, y córrelo (`node ...`). Lee `.env.local` de ese repo.
- **CRÍTICO: excluye el tráfico de prueba interno** — filas cuyo `user_id` termina en `@arkangel.ai`. Reporta cuántas excluiste (cambia el N real).
- Produce: composición por empresa (activos vs. en riesgo **predichos**), arquetipo×label, perfil por arquetipo, numéricas (media/mediana/cuartiles/buckets + split por label predicho), categóricas (distribución + tasa de retiro predicho por categoría), correlaciones, y el perfil de los casos predichos RETIRADO.

### Fase 2 — Framing (no negociable)
- **No hay true labels** ⇒ todo es "predicho". Nunca presentes tasas como hechos: "retiro predicho", "predichos activos / predichos en riesgo de retiro".
- **N pequeño** ⇒ lectura **exploratoria**, no concluyente. Box-plots, correlaciones y perfil-por-arquetipo con N<~30 son frágiles: etiquétalos "orientativos". Si una categoría tiene 1 caso, dilo (ej. "50% = 1 persona").

### Fase 3 — Armar el entregable
- Copia `comfama-bios-summary/` (o `comfama-employees-client-summary/`) a `comfama-<empresa>-summary/` (sin `node_modules`/`dist`). `npm install`.
- **Quita Lovable:** borra `lovable-tagger` de `vite.config.ts` (import + uso) y de `package.json`; limpia `index.html` (title/description propios, sin `author=Lovable`, sin la `og:image` de gpt-engineer). No hay dependencia de runtime de Lovable.
- **Quita el LoginGate:** en `src/App.tsx` elimina el wrapper `<LoginGate>` (y su import). Si no, el HTML abre en "Acceso restringido".
- Edita `HeroSection.tsx`: título, subtítulo (N + "basado en predicciones del modelo"), fecha.
- Reemplaza los datos en `SSTAnalysis.tsx` con los agregados de la Fase 1.

### Fase 4 — Estructura de secciones (calcar ARQ exactamente)
Orden obligatorio (mismo que `comfama-employees-client-summary`):
1. Resumen · 2. Arquetipos · 3. Arquetipos vs. retiro (predicho) · 4. Perfil de cada arquetipo · 5. **Plan de bienestar por arquetipo** · 6. **Recomendaciones** (generales + subsección por arquetipo) · 7. Variables numéricas · 8. Variables categóricas · 9. Relación entre variables · 10. Hallazgos clave · 11. Hablemos (contacto).
- **Plan de bienestar y Recomendaciones van ANTES de las variables**, no después.
- Para grupos / predicciones, antepón secciones de contexto: **Nota metodológica** (fuente, sin true labels, N), **Composición del grupo** (activos vs. en riesgo predichos por empresa, incluyendo aliases en 0), **Nivel de atención** (semáforo del modelo explicado en lenguaje llano: bajo/medio/alto — NO uses la jerga "zona AMARILLA"). Cierra con **Limitaciones**.

### Fase 5 — Convenciones de UI (reusa `AnalysisCharts.tsx`)
- **Selectores de botones (pills)** para elegir variable, tanto en numéricas como en categóricas.
- Numéricas: tabs `Distribución` / `Cajas y bigotes` / `Predichos Activos vs. Retirados en riesgo predichos`, con fila Promedio/Mediana/Activos(pred.)/En riesgo(pred.).
- Categóricas: tabs `Distribución` / `Tasa de retiro` (la 2ª solo si hay cruce con label).
- **Un insight de una frase debajo de cada gráfico**, en tono de analista (dato concreto + lectura), **sin muletillas de IA** ("se puede observar que", "es importante notar", "en resumen").

### Fase 6 — Compilar
- `npm run build:single` → `dist/index.html` autocontenido (lo renombra `rename-html.mjs`; ajústalo al nombre del cliente). Copia el HTML a `Clients/Comfama/docs/cliente/<empresa>/`.

### Fase 7 — Verificar el render (obligatorio)
- Corre `references/verify_render.mjs` (puppeteer headless) sobre el HTML final. **grep sobre el bundle NO prueba que renderice** — un LoginGate o un error de runtime ocultan todo.
- Debe dar: **0 errores de consola**, sin "Acceso restringido", y los `h2` en el **mismo orden que ARQ**.

## Pitfalls

- **Predicciones ≠ datos de entrenamiento.** El EDA rico de ARQ (1.008, true labels) salió del dataset de training; un EDA por-empresa sobre predicciones es N pequeño y "predicho". No copies las cifras de ARQ.
- **Olvidar excluir `@arkangel.ai`.** Tráfico de prueba interno infla el N (en BIOS: 20 crudo → 14 neto). Siempre fíltralo y reporta cuántas filas quitaste.
- **"Aparece en el grep" ≠ "se renderiza".** Verifica SIEMPRE con render headless; un error en un chart nuevo o el LoginGate dejan la página casi vacía con 0 errores aparentes.
- **El LoginGate heredado de la plantilla** bloquea el HTML ("Acceso restringido"). Quítalo para entregables de lectura directa.
- **Lovable no es dependencia de runtime** — es solo herramienta de autoría + plugin de dev + meta tags. Quitarlo no rompe nada.
- **Orden de secciones.** Plan de bienestar + Recomendaciones van antes de variables (como ARQ), no al final.
- **Caché del navegador con `file://`.** Al revisar, abre en incógnito o `Ctrl+Shift+R`; si no, ves la versión vieja y crees que faltan secciones.
- **Aliases sin datos** se reportan como `0`, no se omiten.
- **`?print=1`** salta el gate PERO oculta el ContactSection ("Hablemos") por diseño (modo PDF/slides).
- **Privacidad:** el HTML solo lleva agregados, nunca PII (cédula, nombre, correo). Nunca mezcles otras empresas.

## Verification

- Render headless (`verify_render.mjs`): **0 errores de consola**, sin "Acceso restringido", `h2` en el orden de ARQ (Resumen → Arquetipos → Arquetipos vs Retiro → Perfil → Plan de Bienestar → Recomendaciones → Variables Numéricas → Variables Categóricas → Relación → Hallazgos → Hablemos).
- N neto = N crudo − filas `@arkangel.ai` (documentado).
- Aliases con 0 predicciones aparecen como `0` en Composición.
- Sin restos de Lovable (`grep -i lovable` y `gpt-engineer` = 0) y sin PII en el HTML.
- Todo el lenguaje de outcome dice "predicho/predicción", no afirma retiros reales.
