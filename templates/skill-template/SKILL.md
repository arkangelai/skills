---
name: skill-template
description: Reemplaza esto. Describe QUÉ hace la skill y CUÁNDO usarla con triggers concretos — esta línea es lo único que el agente ve al decidir cargarla.
version: 0.1.0
author: tu-nombre@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [tag1, tag2]
    category: cambiar-categoria
    requires_toolsets: [terminal]
# Descomenta si la skill necesita secretos:
# required_environment_variables:
#   - name: MI_API_KEY
#     prompt: API key para el servicio X
#     help: Pídesela a @infraestructura en Slack
#     required_for: full functionality
---

# Nombre de la Skill

Explica en 1-2 párrafos qué hace la skill y por qué existe. Contexto, no instrucciones.

## When to Use

Lista de disparadores concretos. Piensa: "¿qué estaría diciendo el usuario cuando esta skill es la respuesta correcta?"

- Cuando el usuario pide X.
- Cuando aparece el error Y.
- Cuando se está preparando Z.

**No uses:** cuando sea útil, para ayudar con temas generales, cuando corresponda.

## Procedure

Pasos numerados, específicos, accionables. Incluye comandos, rutas, nombres de archivo exactos.

1. **Paso uno** — Qué hacer. Comando de ejemplo:
   ```bash
   comando --flag valor
   ```

2. **Paso dos** — Qué hacer. Si implica leer un archivo, di cuál:
   `path/al/archivo.ext`

3. **Paso tres** — Qué hacer.

## Pitfalls

Errores reales que alguien ya cometió (tú o alguien más). Captura el aprendizaje.

- **Síntoma:** qué se ve cuando falla. **Causa:** por qué pasa. **Fix:** qué hacer.
- **Síntoma:** ... **Causa:** ... **Fix:** ...

## Verification

Cómo confirmar objetivamente que la skill funcionó. Evita "debería funcionar".

- Output esperado: `...`
- Comando de validación: `...`
- Señal de éxito en el sistema objetivo: `...`

## References

Links opcionales a docs, PRs, issues, o archivos en `references/` que respaldan la skill.
