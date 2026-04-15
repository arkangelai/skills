# Arkangel Skills

Biblioteca compartida de **skills** para los agentes de IA que usamos en Arkangel (Claude Code, Hermes Agent, y cualquier runtime compatible con [agentskills.io](https://agentskills.io)).

La idea es simple: cada vez que alguien resuelve un problema repetible con un agente —una auditoría de EPS, un flujo de revisión clínica, un comando de despliegue, un checklist regulatorio— lo empaqueta como **skill** y lo sube acá. Así el siguiente que lo necesite no parte de cero.

---

## ¿Qué es una skill?

Una skill es una carpeta con instrucciones en lenguaje natural que el agente carga **solo cuando son relevantes**. Formalmente: un `SKILL.md` con frontmatter YAML + markdown, opcionalmente acompañado de scripts, plantillas o referencias.

No es código que se ejecuta a ciegas — es conocimiento procedural que el agente decide cuándo aplicar.

---

## Estructura del repo

```
skills/
├── README.md                   # este archivo
├── CONTRIBUTING.md             # cómo aportar
├── templates/
│   └── skill-template/         # plantilla en blanco, copiala para empezar
│       └── SKILL.md
├── examples/
│   └── eps-audit/              # skill de ejemplo
│       └── SKILL.md
└── <categoria>/                # medical, engineering, ops, research, ...
    └── <nombre-skill>/
        ├── SKILL.md            # requerido
        ├── references/         # docs de apoyo (opcional)
        ├── templates/          # plantillas de salida (opcional)
        ├── scripts/            # helpers ejecutables (opcional)
        └── assets/             # imágenes, datos (opcional)
```

**Convenciones:**
- Nombres en `kebab-case`: `eps-audit`, `clinical-note-reviewer`, `deploy-staging`.
- Agrupa por categoría (`medical/`, `engineering/`, `ops/`, `research/`, `sales/`). Si no encaja, crea una nueva categoría.
- Una skill = una carpeta. No mezcles varias en un solo `SKILL.md`.

---

## Cómo crear una skill en 5 pasos

### 1. Copia la plantilla

```bash
cp -r templates/skill-template medical/mi-skill
```

### 2. Edita `SKILL.md`

El archivo tiene dos partes: **frontmatter YAML** (metadata que el agente lee para decidir si cargarla) y **cuerpo markdown** (las instrucciones).

```markdown
---
name: mi-skill
description: Resumen breve + CUÁNDO usarla. El agente decide cargar la skill leyendo esto, así que sé específico sobre los triggers.
version: 1.0.0
author: tu-nombre@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit]
    category: medical
    requires_toolsets: [terminal]
---

# Mi Skill

## When to Use
Condiciones concretas. Ej: "Cuando el usuario pide auditar una cuenta de EPS en formato RIPS".

## Procedure
1. Paso uno — específico y accionable.
2. Paso dos.
3. Paso tres.

## Pitfalls
- Fallos conocidos y cómo evitarlos.
- Casos borde que pasaron y costaron tiempo.

## Verification
Cómo confirmar que el skill funcionó (output esperado, comandos de validación).
```

### 3. Regla de oro del `description`

El `description` es **lo único** que el agente ve al decidir si cargar la skill. Debe responder:
- **Qué hace** la skill (una frase).
- **Cuándo usarla** (triggers concretos, no vaguedades).

Malo: `"Audit skill"`
Bueno: `"Audita cuentas de cobro de EPS colombianas en formato RIPS contra resolución 2175. Úsala cuando el usuario pide revisar glosas, validar códigos CUPS/CIE-10, o detectar inconsistencias en facturación."`

### 4. Prueba la skill localmente

**Con Claude Code:**
```bash
# Copia la carpeta a tu directorio de skills personal o de proyecto
cp -r medical/mi-skill ~/.claude/skills/
# O para un proyecto: .claude/skills/
```

Luego en Claude Code invocala: `/mi-skill` o simplemente describe la tarea y deja que la cargue sola.

**Con Hermes Agent:**
```bash
cp -r medical/mi-skill ~/.hermes/skills/medical/
hermes chat --toolsets skills -q "usa mi-skill para..."
```

### 5. Abre un PR

```bash
git checkout -b add/mi-skill
git add medical/mi-skill
git commit -m "Add mi-skill: <qué hace en una línea>"
git push origin add/mi-skill
gh pr create --fill
```

Al menos una persona del equipo revisa antes de mergear.

---

## Qué hace una skill **buena**

1. **Trigger claro** — el `description` dice exactamente cuándo usarla.
2. **Procedimiento específico** — pasos accionables, no principios abstractos.
3. **Captura pitfalls reales** — errores que ya cometiste, con la corrección.
4. **Verificable** — una forma concreta de saber si funcionó.
5. **Sin secretos** — claves, tokens, URLs internas van en variables de entorno, no en el `SKILL.md`.

Si necesitas secretos, declaralos en el frontmatter:

```yaml
required_environment_variables:
  - name: EPS_API_KEY
    prompt: API key del conector de EPS
    help: Pídesela a @infraestructura en Slack
    required_for: full functionality
```

---

## Categorías sugeridas

| Categoría | Para qué |
|---|---|
| `medical/` | Auditoría clínica, códigos CUPS/CIE-10, RIPS, guías de práctica, revisión de historia clínica |
| `engineering/` | Despliegues, debugging, code review, migraciones de infra |
| `ops/` | Procesos internos, onboarding, facturación, compliance |
| `research/` | Experimentos, evaluación de modelos, benchmarking |
| `sales/` | Propuestas, demos, seguimiento comercial |

Si algo no encaja, crea la categoría. No sobreingenieres.

---

## Compatibilidad

Las skills de este repo son **portables** entre runtimes porque usan el estándar abierto de [agentskills.io](https://agentskills.io):

- **Claude Code** — usa `name` y `description` del frontmatter; ignora el resto.
- **Hermes Agent** — usa `name`, `description`, `platforms`, `metadata.hermes.*`, `required_environment_variables`.
- **Otros runtimes compatibles** — leen el subset que entiendan.

Escribe para el denominador común: que un humano nuevo en Arkangel pueda leer el `SKILL.md` y entender qué hace y cómo se usa.

---

## Recursos

- [Claude Code skills docs](https://docs.claude.com/en/docs/claude-code/skills)
- [Hermes Agent skills docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [agentskills.io](https://agentskills.io) — hub comunitario, 647+ skills públicas para inspiración

---

## Contacto

Dudas, propuestas de categorías nuevas, o skills que no sabes cómo empaquetar → abre un issue o escribe en `#ai-tooling`.
