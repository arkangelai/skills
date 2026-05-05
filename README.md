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

| Category | Count | Use this when… |
|---|---|---|
| [Grants pipeline](#grants-pipeline-8-skills) | 8 | Working on a grant proposal — discovery → scoping → drafting → review → submission. |
| [Medical insurance audit](#medical-insurance-audit-10-skills) | 10 | Auditing Colombian EPS-IPS medical invoices, generating glosas, or responding to glosas. |
| [Medical reference](#medical-reference-2-skills) | 2 | Validating CUPS or ICD-10 codes from clinical documents. |
| [Writing](#writing-1-skill) | 1 | Sharpening copy, marketing, or pitch text. |
| [Vendored OSS](#vendored-from-openclaw-3-skills) | 3 | Document-to-Markdown, mermaid diagrams, or extracting medical entities. |

> **How to invoke any skill (Claude Code):** type `/skill-name` for a direct trigger, or just describe the task in natural language — the agent loads the skill automatically when the description matches.

---

### Grants pipeline (8 skills)

Reference doc: [`GRANTS.md`](./GRANTS.md).

**Workflow**

```
  1.scout-grants ─▶ 2.chrome-navigate ─▶ 3.develop-proposal ─▶ 4.develop-timeline ─▶ 5.develop-budget
                                                                                              │
                                                                                              ▼
                          8.submit ◀── 7.polish-grant ◀── 6.grant-review ◀───────────────────┘
```

| # | Skill | When to use | How to invoke |
|---|---|---|---|
| 1 | [`scout-grants`](./skills/scout-grants/) | Triaging new grant calls; deciding go/no-go | `/scout-grants` · "find grants for X" / "is this call worth pursuing?" |
| 2 | [`chrome-navigate`](./skills/chrome-navigate/) | After scout says go — extract rules, eligibility, form fields from the funder portal | `/chrome-navigate` · "extract rules from this grant portal" |
| 3 | [`develop-proposal`](./skills/develop-proposal/) | Owner says "write the first draft" | `/develop-proposal` · "write the first draft of this proposal" |
| 4 | [`develop-timeline`](./skills/develop-timeline/) | Methods exist; need a feasible execution timeline | `/develop-timeline` · "build the project timeline" |
| 5 | [`develop-budget`](./skills/develop-budget/) | Methods + timeline exist; need numbers to match | `/develop-budget` · "build the budget for this proposal" |
| 6 | [`grant-review`](./skills/grant-review/) | Draft + timeline + budget exist; need quality gate | `/grant-review` · "review this grant" / "is this ready?" |
| 7 | [`polish-grant`](./skills/polish-grant/) | PR has review/owner comments to address | `/polish-grant` · "address the review comments" |
| 8 | [`submit`](./skills/submit/) | Final draft approved; ready to close the cycle | `/submit` · "prepare submission" / "close this grant cycle" |

---

### Medical insurance audit (10 skills)

Reference doc: [`AUDIT.md`](./AUDIT.md). The pipeline has three flows; the diagram below shows the most common one (Flow 1: EPS audits an IPS invoice).

**Workflow — Flow 1 (EPS audita factura IPS)**

```
  Phase 1 (intake)
    medical-invoice-gmail-intake ─▶ enqueues case

  Phase 2 (audit core, sequential)
    medical-invoice-document-understanding (Step 0)
        │
        ├─▶ medical-invoice-admin-audit
        ├─▶ medical-invoice-medical-audit
        └─▶ medical-invoice-financial-audit
                    │
                    ▼
        medical-invoice-consolidator-audit ─▶ output.json
                    │
                    ▼ (if human review needed)
        medical-invoice-fix-review

  Phase 3 (claim denial, on demand)
    medical-invoice-claim-denial-generator ─▶ glosa.pdf
        │
        ▼
    medical-invoice-claim-denial-gmail-sender ─▶ delivered to IPS
```

**Independent flow — IPS responds to a glosa:** [`hospital-devolucion-audit`](./skills/hospital-devolucion-audit/) (does not interact with the pipeline above).

| # | Skill | When to use | How to invoke |
|---|---|---|---|
| 1 | [`medical-invoice-gmail-intake`](./skills/medical-invoice-gmail-intake/) | A new invoice arrives by email and needs to enter the audit queue | `/medical-invoice-gmail-intake` · "process invoices from inbox" |
| 2 | [`medical-invoice-document-understanding`](./skills/medical-invoice-document-understanding/) | Step 0 of the audit — read all case documents and produce `case_evidence.json` | `/medical-invoice-document-understanding` · "extract evidence from this case" |
| 3 | [`medical-invoice-admin-audit`](./skills/medical-invoice-admin-audit/) | Audit identity, RIPS, authorizations, timeliness (~27 rules) | `/medical-invoice-admin-audit` · "audit the administrative side" |
| 4 | [`medical-invoice-medical-audit`](./skills/medical-invoice-medical-audit/) | Audit clinical pertinence vs. MinSalud GPC (~29 rules) | `/medical-invoice-medical-audit` · "audit the clinical pertinence" |
| 5 | [`medical-invoice-financial-audit`](./skills/medical-invoice-financial-audit/) | Audit contract, tariff, and anti-fraud (~42 + 14 rules) | `/medical-invoice-financial-audit` · "audit the financial side" |
| 6 | [`medical-invoice-consolidator-audit`](./skills/medical-invoice-consolidator-audit/) | The 3 audits ran; merge findings + assign Anexo 6 causales | `/medical-invoice-consolidator-audit` · "consolidate the audits" |
| 7 | [`medical-invoice-fix-review`](./skills/medical-invoice-fix-review/) | A human auditor left comments to apply | `/medical-invoice-fix-review` · "apply review comments" |
| 8 | [`medical-invoice-claim-denial-generator`](./skills/medical-invoice-claim-denial-generator/) | Case is `auto-denial` or `claim-denial-ready` — generate the glosa PDF | `/medical-invoice-claim-denial-generator` · "generate the glosa PDF" |
| 9 | [`medical-invoice-claim-denial-gmail-sender`](./skills/medical-invoice-claim-denial-gmail-sender/) | Glosa PDF is approved — send it to the IPS by email | `/medical-invoice-claim-denial-gmail-sender` · "send the glosa to the IPS" |
| — | [`hospital-devolucion-audit`](./skills/hospital-devolucion-audit/) | An IPS receives a glosa and needs to defend/accept/reradicate item by item | `/hospital-devolucion-audit` · "respond to this glosa" |

---

### Medical reference (2 skills)

Self-contained CLIs. No workflow — invoke directly when you need to validate a code.

| Skill | When to use | How to invoke |
|---|---|---|
| [`cups-lookup`](./skills/cups-lookup/) | Validate or search a CUPS 2026 procedure code (Colombia, Res. 2706/2025) | `/cups-lookup` · "validate CUPS 871020" / "find CUPS for X" · CLI: `node cups-lookup.js validate 871020` |
| [`icd10-lookup`](./skills/icd10-lookup/) | Validate or search an ICD-10-CM code (CMS FY2026) | `/icd10-lookup` · "validate ICD-10 E11.9" / "find code for diabetes" · CLI: `node icd10-lookup.js validate E11.9` |

---

### Writing (1 skill)

| Skill | When to use | How to invoke |
|---|---|---|
| [`copy-writer`](./skills/copy-writer/) | Rewriting marketing, LinkedIn, landing-page, pitch, or email copy | `/copy-writer` · "make this stickier" / "rewrite this" / "this sounds corporate" |

---

### Vendored from OpenClaw (3 skills)

Imported from [OpenClaw Medical Skills](https://github.com/FreedomIntelligence/OpenClaw-Medical-Skills) under their original licenses. See each skill's `NOTICE.md`.

| Skill | License | When to use | How to invoke |
|---|---|---|---|
| [`markitdown`](./skills/markitdown/) | MIT (Microsoft) | Convert any PDF/DOCX/XLSX/PPTX/audio/image/HTML/EPub to Markdown for LLM processing | `/markitdown` · "convert this PDF to markdown" · CLI: `markitdown file.pdf` |
| [`markdown-mermaid-writing`](./skills/markdown-mermaid-writing/) | Apache-2.0 (Superior Byte Works) | Writing reports, decision records, or pipeline docs that need diagrams (flowcharts, sequence, ER, gantt, etc.) | `/markdown-mermaid-writing` · "write a status report with mermaid diagrams" |
| [`medical-entity-extractor`](./skills/medical-entity-extractor/) | MIT (NAPSTER AI) | Extracting symptoms, medications, lab values, and diagnoses from unstructured patient messages | `/medical-entity-extractor` · "extract entities from this patient message" |

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
