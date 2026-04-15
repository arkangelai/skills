# Arkangel Skills

Shared library of **skills** for the AI agents we use at Arkangel (Claude Code, Hermes Agent, and any runtime compatible with [agentskills.io](https://agentskills.io)).

The idea is simple: whenever someone solves a repeatable problem with an agent — an EPS audit, a clinical review flow, a deployment command, a regulatory checklist — they package it as a **skill** and push it here. That way the next person who needs it doesn't start from scratch.

---

## What is a skill?

A skill is a folder with natural-language instructions that the agent loads **only when relevant**. Formally: a `SKILL.md` with YAML frontmatter + markdown, optionally accompanied by scripts, templates, or references.

It's not code that runs blindly — it's procedural knowledge the agent decides when to apply.

---

## Repo structure

```
skills/
├── README.md                   # this file
├── CONTRIBUTING.md             # how to contribute
├── templates/
│   └── skill-template/         # blank template, copy it to start
│       └── SKILL.md
├── examples/
│   └── eps-audit/              # example skill
│       └── SKILL.md
└── <category>/                 # medical, engineering, ops, research, ...
    └── <skill-name>/
        ├── SKILL.md            # required
        ├── references/         # supporting docs (optional)
        ├── templates/          # output templates (optional)
        ├── scripts/            # executable helpers (optional)
        └── assets/             # images, data (optional)
```

**Conventions:**
- Names in `kebab-case`: `eps-audit`, `clinical-note-reviewer`, `deploy-staging`.
- Group by category (`medical/`, `engineering/`, `ops/`, `research/`, `sales/`). If it doesn't fit, create a new category.
- One skill = one folder. Don't mix several in a single `SKILL.md`.

---

## How to create a skill in 5 steps

### 1. Copy the template

```bash
cp -r templates/skill-template medical/my-skill
```

### 2. Edit `SKILL.md`

The file has two parts: **YAML frontmatter** (metadata the agent reads to decide whether to load it) and **markdown body** (the instructions).

```markdown
---
name: my-skill
description: Brief summary + WHEN to use it. The agent decides to load the skill by reading this, so be specific about the triggers.
version: 1.0.0
author: your-name@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit]
    category: medical
    requires_toolsets: [terminal]
---

# My Skill

## When to Use
Concrete conditions. Ex: "When the user asks to audit an EPS account in RIPS format".

## Procedure
1. Step one — specific and actionable.
2. Step two.
3. Step three.

## Pitfalls
- Known failures and how to avoid them.
- Edge cases that happened and cost time.

## Verification
How to confirm the skill worked (expected output, validation commands).
```

### 3. Golden rule of `description`

The `description` is **the only thing** the agent sees when deciding whether to load the skill. It must answer:
- **What** the skill does (one sentence).
- **When to use it** (concrete triggers, no vagueness).

Bad: `"Audit skill"`
Good: `"Audits Colombian EPS billing accounts in RIPS format against resolution 2175. Use it when the user asks to review glosas, validate CUPS/CIE-10 codes, or detect billing inconsistencies."`

### 4. Test the skill locally

**With Claude Code:**
```bash
# Copy the folder to your personal or project skills directory
cp -r medical/my-skill ~/.claude/skills/
# Or for a project: .claude/skills/
```

Then invoke it from Claude Code: `/my-skill` or simply describe the task and let it load on its own.

**With Hermes Agent:**
```bash
cp -r medical/my-skill ~/.hermes/skills/medical/
hermes chat --toolsets skills -q "use my-skill to..."
```

### 5. Open a PR

```bash
git checkout -b add/my-skill
git add medical/my-skill
git commit -m "Add my-skill: <what it does in one line>"
git push origin add/my-skill
gh pr create --fill
```

At least one teammate reviews before merging.

---

## What makes a **good** skill

1. **Clear trigger** — the `description` says exactly when to use it.
2. **Specific procedure** — actionable steps, not abstract principles.
3. **Captures real pitfalls** — mistakes you've already made, with the fix.
4. **Verifiable** — a concrete way to know if it worked.
5. **No secrets** — keys, tokens, internal URLs go in environment variables, not in the `SKILL.md`.

If you need secrets, declare them in the frontmatter:

```yaml
required_environment_variables:
  - name: EPS_API_KEY
    prompt: API key for the EPS connector
    help: Ask @infrastructure on Slack
    required_for: full functionality
```

---

## Suggested categories

| Category | For what |
|---|---|
| `medical/` | Clinical audit, CUPS/CIE-10 codes, RIPS, practice guidelines, medical record review |
| `engineering/` | Deployments, debugging, code review, infra migrations |
| `ops/` | Internal processes, onboarding, billing, compliance |
| `research/` | Experiments, model evaluation, benchmarking |
| `sales/` | Proposals, demos, commercial follow-up |

If something doesn't fit, create the category. Don't over-engineer.

---

## Compatibility

The skills in this repo are **portable** across runtimes because they use the open standard from [agentskills.io](https://agentskills.io):

- **Claude Code** — uses `name` and `description` from the frontmatter; ignores the rest.
- **Hermes Agent** — uses `name`, `description`, `platforms`, `metadata.hermes.*`, `required_environment_variables`.
- **Other compatible runtimes** — read whatever subset they understand.

Write for the common denominator: any human new to Arkangel should be able to read the `SKILL.md` and understand what it does and how to use it.

---

## Resources

- [Claude Code skills docs](https://docs.claude.com/en/docs/claude-code/skills)
- [Hermes Agent skills docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [agentskills.io](https://agentskills.io) — community hub, 647+ public skills for inspiration

---

## Contact

Questions, proposals for new categories, or skills you're not sure how to package → open an issue or write in `#ai-tooling`.
