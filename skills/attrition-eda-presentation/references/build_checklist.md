# Checklist: agregar una empresa al repo base multi-empresa

Repo base: `comfama-employees-client-summary/` (un HTML por empresa).
Patrón de estructura: empresa `arquitectura-concreto` (true labels).
Patrón por predicciones: empresa `grupo-bios` (N pequeno, sin etiquetas reales).

## 1. Datos
- Copia `extract_company_eda.mjs` a `comfama-employee-retention/scripts/diagnostics/`, edita `GROUP`, corre `node ... > eda.json`.
- **Excluye `@arkangel.ai`** (trafico de prueba). Aliases sin datos = 0 (no excluir).

## 2. Modulo de empresa (no se clona un repo nuevo)
- Crea `src/companies/<slug>/Analysis.tsx` copiando el de la empresa mas parecida
  (`grupo-bios` si es por predicciones, `arquitectura-concreto` si hay true labels).
  Reemplaza los datos con `eda.json`.
- Registra en `src/companies/registry.tsx`:
  `"<slug>": { slug, hero: { titlePre, titleAccent, subtitle, date }, Analysis }`.
- Lovable y LoginGate ya estan fuera de la base — no repetir.

## 3. Estructura de secciones (igual que ARQ)
Resumen -> Arquetipos -> Arquetipos vs Retiro -> Perfil de cada Arquetipo ->
Plan de Bienestar -> Recomendaciones -> Variables Numericas -> Variables Categoricas ->
Relacion entre Variables -> Hallazgos Clave -> Hablemos.
Si es por predicciones: antepon Nota metodologica, Composicion, Nivel de atencion;
cierra con Limitaciones; incluye alertas "Arquetipos a vigilar".

## 4. Compilar (un HTML por empresa)
- `COMPANY=<slug> npm run build:single` -> `dist/<slug>.html`.
- Vite vacia `dist/` en cada build: copia el HTML a `Clients/Comfama/docs/cliente/<empresa>/`
  ANTES de compilar otra empresa.

## 5. Verificar (obligatorio)
- `node verify_render.mjs <ruta-html>`: 0 errores de consola, sin "Acceso restringido",
  h2 en orden ARQ.
- `grep -i lovable` y `grep gpt-engineer` = 0. Sin PII en el HTML.
