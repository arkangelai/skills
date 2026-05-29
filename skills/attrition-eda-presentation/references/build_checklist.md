# Checklist: armar el HTML cliente desde la plantilla

Plantilla viva: `comfama-bios-summary/` (predicciones, N pequeno).
Referencia de estructura: `comfama-employees-client-summary/` (ARQ).

## 1. Clonar la plantilla
- Copiar la fuente (sin `node_modules`/`dist`/`.git`) a `comfama-<empresa>-summary/`.
- `npm install`.

## 2. Quitar Lovable (no es dependencia de runtime)
- `vite.config.ts`: borrar el import de `lovable-tagger` y la linea `mode === "development" && componentTagger()`.
- `package.json`: borrar `lovable-tagger` de devDependencies; renombrar `name`.
- `index.html`: title/description propios; quitar `meta name=author Lovable`, `twitter:site @Lovable` y la `og:image` de gpt-engineer.

## 3. Quitar el LoginGate (entregable de lectura directa)
- `src/App.tsx`: eliminar el wrapper `<LoginGate>...</LoginGate>` y su import.

## 4. Contenido
- `HeroSection.tsx`: titulo "<Empresa> · Analisis de la Encuesta SST" (o "Lectura Temprana de Retencion" si es por predicciones), subtitulo con N + "basado en predicciones del modelo", fecha.
- `SSTAnalysis.tsx`: reemplazar los datos con el `eda.json` de `extract_company_eda.mjs`.

## 5. Estructura de secciones (igual que ARQ)
Resumen -> Arquetipos -> Arquetipos vs Retiro (predicho) -> Perfil de cada Arquetipo ->
Plan de Bienestar -> Recomendaciones -> Variables Numericas -> Variables Categoricas ->
Relacion entre Variables -> Hallazgos Clave -> Hablemos.
Si es grupo/predicciones, antepon: Nota metodologica, Composicion, Nivel de atencion. Cierra con Limitaciones.

## 6. Compilar
- `npm run build:single` -> `dist/index.html` autocontenido.
- Ajustar `scripts/rename-html.mjs` al nombre del cliente.
- Copiar el HTML a `Clients/Comfama/docs/cliente/<empresa>/`.

## 7. Verificar (obligatorio)
- `node verify_render.mjs <ruta-html>`: 0 errores de consola, sin "Acceso restringido", h2 en orden ARQ.
- `grep -i lovable` y `grep gpt-engineer` = 0. Sin PII en el HTML.
