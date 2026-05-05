# Arkangel Skills

Shared library of **skills** for the AI agents we use at Arkangel (Claude Code, Hermes Agent, and any runtime compatible with [skill.sh](https://skill.sh)).

The idea is simple: whenever someone solves a repeatable problem with an agent — an EPS audit, a clinical review flow, a deployment command, a regulatory checklist — they package it as a **skill** and push it here. That way the next person who needs it doesn't start from scratch.

---

## What is a skill?

A skill is a folder with natural-language instructions that the agent loads **only when relevant**. Formally: a `SKILL.md` with YAML frontmatter + markdown, optionally accompanied by scripts, templates, or references.

It's not code that runs blindly — it's procedural knowledge the agent decides when to apply.

---

## Repo structure

All skills live flat under `skills/`. Group them in your head by reading the `description`, not by folder.

```
albuquerque-v3/
├── README.md             # this file
├── CONTRIBUTING.md       # how to contribute
├── GRANTS.md             # grants pipeline reference
├── AUDIT.md              # medical insurance audit pipeline reference
├── scripts/              # shared scripts (optional)
├── templates/
│   └── skill-template/   # blank template, copy it to start
└── skills/               # all skills, one folder each
    └── <skill-name>/
        ├── SKILL.md      # required
        ├── references/   # supporting docs (optional)
        ├── templates/    # output templates (optional)
        ├── scripts/      # executable helpers (optional)
        └── assets/       # images, data (optional)
```

**Conventions:**
- Names in `kebab-case`: `clinical-note-reviewer`, `deploy-staging`, `grant-review`.
- One skill = one folder. Don't mix several in a single `SKILL.md`.
- Pipelines (e.g. grants, audit) keep a top-level reference doc (`GRANTS.md`, `AUDIT.md`) describing how the skills compose.

---

## Skill catalog

### Grants pipeline — see [`GRANTS.md`](./GRANTS.md)

| Skill | Purpose |
|---|---|
| `scout-grants` | Discover, screen, and brief grant opportunities. |
| `chrome-navigate` | Browser-driven enrichment and form-fill for grant portals. |
| `develop-proposal` | Write the first strong pass of the proposal. |
| `develop-budget` | Build and justify the budget by standard categories. |
| `develop-timeline` | Build a feasible project timeline. |
| `grant-review` | Pre-submit review with weighted scoring and v2 rewrite. |
| `polish-grant` | Apply review/owner feedback into a clean follow-up version. |
| `submit` | Verify approved source of truth and close the cycle after submission. |

### Medical insurance audit (Colombia EPS-IPS) — see [`AUDIT.md`](./AUDIT.md)

| Skill | Purpose |
|---|---|
| `medical-invoice-gmail-intake` | Watch Gmail and enqueue invoice cases for audit. |
| `medical-invoice-document-understanding` | Step 0 — extract structured evidence from case documents. |
| `medical-invoice-admin-audit` | Administrative audit (DAMA-UK, ~27 rules). |
| `medical-invoice-medical-audit` | Clinical-pertinence audit (PERT-CLIN, ~29 rules). |
| `medical-invoice-financial-audit` | Tariff and anti-fraud audit (FIN-CTR, ~42 rules + 14 fraud). |
| `medical-invoice-consolidator-audit` | Merge findings, assign Anexo 6 causales, decide concepto_final. |
| `medical-invoice-fix-review` | Apply human auditor edits to the consolidated output. |
| `medical-invoice-claim-denial-generator` | Produce the formal glosa PDF (versioned). |
| `medical-invoice-claim-denial-gmail-sender` | Send the final glosa via Gmail with delivery log. |
| `hospital-devolucion-audit` | IPS-side: build per-item argumentation to respond to a glosa. |

### Medical reference

| Skill | Purpose |
|---|---|
| `cups-lookup` | Local CLI for the Colombian CUPS 2026 catalog (Res. 2706/2025). |
| `icd10-lookup` | Local CLI for the CMS ICD-10-CM FY2026 diagnosis code set. |

### Writing

| Skill | Purpose |
|---|---|
| `copy-writer` | Improves copy using "Made to Stick" SUCCESs principles. |

### Vendored from OpenClaw (third-party, OSS)

These were imported from [OpenClaw Medical Skills](https://github.com/FreedomIntelligence/OpenClaw-Medical-Skills) under their original licenses. See each skill's `NOTICE.md`.

| Skill | License | Purpose |
|---|---|---|
| `markitdown` | MIT (Microsoft) | Convert PDFs/DOCX/XLSX/audio/images to Markdown for LLM-friendly processing. |
| `markdown-mermaid-writing` | Apache-2.0 (Superior Byte Works) | Standard for writing markdown reports with embedded Mermaid diagrams. |
| `medical-entity-extractor` | MIT (NAPSTER AI) | Extract symptoms, medications, lab values, and diagnoses from patient messages. |

---

## How to create a skill in 5 steps

### 1. Copy the template

```bash
cp -r templates/skill-template skills/my-skill
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
cp -r skills/my-skill ~/.claude/skills/
# Or for a project: .claude/skills/
```

Then invoke it from Claude Code: `/my-skill` or simply describe the task and let it load on its own.

**With Hermes Agent:**
```bash
cp -r skills/my-skill ~/.hermes/skills/
hermes chat --toolsets skills -q "use my-skill to..."
```

### 5. Open a PR

```bash
git checkout -b add/my-skill
git add skills/my-skill
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

## Importing third-party skills

When importing a skill from an external source (OpenClaw, other agent repos):

1. **Verify the license.** Only import skills with an explicit permissive license (MIT, Apache-2.0, BSD, etc.). Skills without a LICENSE file or with "All Rights Reserved" / proprietary headers should not be copied — re-implement the concept from scratch instead.
2. **Preserve attribution.** Keep the original LICENSE file, copyright header, and any author/source metadata.
3. **Add a `NOTICE.md`** in the skill folder documenting source URL, license, and import date.
4. **Don't modify on import.** Land the import as-is, then adapt in a follow-up commit so reviewers can see what changed vs. upstream.

---

## Compatibility

The skills in this repo are **portable** across runtimes because they follow the open standard from [skill.sh](https://skill.sh):

- **Claude Code** — uses `name` and `description` from the frontmatter; ignores the rest.
- **Hermes Agent** — uses `name`, `description`, `platforms`, `metadata.hermes.*`, `required_environment_variables`.
- **Other compatible runtimes** — read whatever subset they understand.

Write for the common denominator: any human new to Arkangel should be able to read the `SKILL.md` and understand what it does and how to use it.

---

## Resources

- [Claude Code skills docs](https://docs.claude.com/en/docs/claude-code/skills)
- [Hermes Agent skills docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [skill.sh](https://skill.sh) — open standard for portable agent skills

---

## Contact

Questions, proposals for new skills, or skills you're not sure how to package → open an issue or write in `#ai-tooling`.
