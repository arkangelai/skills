# Cómo contribuir

1. Clona el repo y crea una rama: `git checkout -b add/<nombre-skill>`.
2. Copia `templates/skill-template/` a `<categoria>/<nombre-skill>/`.
3. Edita `SKILL.md`. Respeta las secciones: `When to Use`, `Procedure`, `Pitfalls`, `Verification`.
4. Prueba la skill con el runtime que uses (Claude Code o Hermes). Ver README.
5. Commit con mensaje claro: `Add <nombre-skill>: <qué hace en una línea>`.
6. Abre un PR con `gh pr create --fill`. Una persona del equipo revisa.

## Qué revisamos en el PR

- El `description` dice **qué hace** y **cuándo usarla** con triggers concretos.
- Los pasos del `Procedure` son accionables, no abstractos.
- `Pitfalls` captura errores reales, no hipotéticos.
- `Verification` es objetiva.
- No hay secretos hardcoded (claves, tokens, URLs internas, PHI, datos de pacientes).
- Nombre en `kebab-case`, ubicación correcta por categoría.

## Actualizar una skill existente

Mismo flujo, pero:
- Incrementa `version` en el frontmatter (`1.0.0` → `1.0.1` para fixes, `1.1.0` para mejoras, `2.0.0` para cambios incompatibles).
- Menciona el cambio en el PR: qué pitfall nuevo agregaste, qué paso cambió, etc.

## Borrar una skill

Si una skill quedó obsoleta, abre un PR que la elimine y explica por qué en el mensaje del commit. Si la reemplaza otra, enlaza a la nueva.
