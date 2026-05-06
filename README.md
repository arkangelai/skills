<div align="center">

# Arkangel Skills

[![GitHub Stars](https://img.shields.io/github/stars/arkangelai/skills?style=for-the-badge&logo=github&color=gold)](https://github.com/arkangelai/skills/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/arkangelai/skills?style=for-the-badge&logo=github&color=blue)](https://github.com/arkangelai/skills/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/arkangelai/skills?style=for-the-badge&logo=github)](https://github.com/arkangelai/skills/issues)
[![Skills Count](https://img.shields.io/badge/Skills-48-brightgreen?style=for-the-badge)](./skills)
[![License](https://img.shields.io/badge/License-Internal-purple?style=for-the-badge)](#)
[![Platform](https://img.shields.io/badge/Platform-Claude%20Code%20%7C%20Hermes-orange?style=for-the-badge)](https://skill.sh)

**The Arkangel skill library — battle-tested agent procedures for healthcare, grants, and operations in Colombia.**

*48 curated skills · Medical insurance audit · Clinical operations · Grants pipeline · Sales pipeline · Model training · Clinical reference · Document tooling*

[Catalog](#-skill-catalog) · [Quickstart](#-quickstart) · [Create a skill](#-create-a-skill-in-5-steps) · [Contributing](./CONTRIBUTING.md)

</div>

---

## What Is This?

**Arkangel Skills** is a shared library of **skills** for the AI agents we use across the company — [Claude Code](https://docs.claude.com/en/docs/claude-code/skills), [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), and any runtime compatible with the [skill.sh](https://skill.sh) standard.

Whenever someone solves a repeatable problem with an agent — an EPS audit, a clinical review flow, a grant proposal cycle, a deployment command — they package it as a **skill** and push it here. The next person who needs it doesn't start from scratch.

> Built **for Arkangel** — not OpenClaw, not a generic public collection. The skills here encode our processes, our regulations (Resolución 2275, Anexo 6, GPC MinSalud), our funders, and our internal toolchain.

### Why this library matters

| Without skills | With Arkangel Skills |
|---|---|
| Generic AI responses about Colombian healthcare | Real audits against Anexo 6 causales, RIPS, contracts |
| Manual grant triage and drafting | Scout → propose → review → submit pipeline |
| Each engineer reinvents the same workflow | One canonical procedure, versioned in git |
| CUPS/ICD-10 codes copy-pasted from PDFs | Validated lookups against MinSalud Res. 2706/2025 + CMS FY2026 |
| Glosa responses written from scratch | `hospital-devolucion-audit` defends/accepts item by item |
| Knowledge trapped in someone's head | A `SKILL.md` anyone can read and improve |

---

## What is a skill?

A skill is a folder with natural-language instructions that the agent loads **only when relevant**. Formally: a `SKILL.md` with YAML frontmatter + markdown, optionally accompanied by scripts, templates, or references.

It's not code that runs blindly — it's procedural knowledge the agent decides when to apply.

## 🚀 Quickstart

<details open>
<summary><b>Claude Code</b> — drop in and invoke</summary>

```bash
# Clone the library
git clone https://github.com/arkangelai/skills.git
cd skills

# Install all skills globally for Claude Code
mkdir -p ~/.claude/skills
cp -r skills/* ~/.claude/skills/

# Or install one skill into the current project
mkdir -p .claude/skills
cp -r skills/grant-review .claude/skills/
```

Then in Claude Code: type `/grant-review` (or any other skill), or just describe the task in natural language — the agent loads the skill automatically when the description matches.
</details>

<details>
<summary><b>Hermes Agent</b></summary>

```bash
mkdir -p ~/.hermes/skills
cp -r skills/* ~/.hermes/skills/
hermes chat --toolsets skills -q "use grant-review to check this proposal"
```
</details>

<details>
<summary><b>Other skill.sh runtimes</b></summary>

The skills follow the open [skill.sh](https://skill.sh) standard — copy the folder into whatever path your runtime reads. Each runtime uses whichever subset of the YAML frontmatter it understands; the rest is ignored gracefully.
</details>

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

## 📚 Skill catalog

<table>
<thead>
<tr><th>Category</th><th>Count</th><th>Use this when…</th></tr>
</thead>
<tbody>
<tr>
  <td>🩺 <a href="#-medical-insurance-audit-11-skills">Medical insurance audit</a></td>
  <td align="center"><b>11</b></td>
  <td>Auditing Colombian EPS-IPS medical invoices, reviewing pre-autorizaciones, generating or responding to glosas.</td>
</tr>
<tr>
  <td>🧑‍⚕️ <a href="#-clinical-operations-4-skills">Clinical operations</a></td>
  <td align="center"><b>4</b></td>
  <td>Writing IPS-side clinical reports, simplifying patient documents, looking up GPC MinSalud, or pulling PubMed evidence.</td>
</tr>
<tr>
  <td>🧠 <a href="#-model-training-2-skills">Model training</a></td>
  <td align="center"><b>2</b></td>
  <td>Training calibrated, production-grade ML models — employee attrition (HR/SST) or clinical screening (tabular EHR, TRIPOD+AI).</td>
</tr>
<tr>
  <td>💰 <a href="#-grants-pipeline-8-skills">Grants pipeline</a></td>
  <td align="center"><b>8</b></td>
  <td>Working on a grant proposal — discovery → scoping → drafting → review → submission.</td>
</tr>
<tr>
  <td>🤝 <a href="#-sales-pipeline-17-skills">Sales pipeline</a></td>
  <td align="center"><b>17</b></td>
  <td>Running enterprise healthtech sales — full submarine: ICP scoring, meeting prep, qualifying, pain quantification, stakeholder mapping, kits per compartment, pricing brackets, competitive intel, and deal-health audits.</td>
</tr>
<tr>
  <td>🔎 <a href="#-medical-reference-2-skills">Medical reference</a></td>
  <td align="center"><b>2</b></td>
  <td>Validating CUPS 2026 or ICD-10-CM codes from clinical documents.</td>
</tr>
<tr>
  <td>✍️ <a href="#%EF%B8%8F-writing-1-skill">Writing</a></td>
  <td align="center"><b>1</b></td>
  <td>Sharpening copy, marketing, or pitch text.</td>
</tr>
<tr>
  <td>📦 <a href="#-vendored-from-openclaw-3-skills">Vendored OSS</a></td>
  <td align="center"><b>3</b></td>
  <td>Document-to-Markdown, mermaid diagrams, or extracting medical entities.</td>
</tr>
</tbody>
</table>

> **💡 How to invoke any skill (Claude Code):** type `/skill-name` for a direct trigger, or just describe the task in natural language — the agent loads the skill automatically when the description matches.

---

### 💰 Grants pipeline (8 skills)

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

### 🤝 Sales pipeline (17 skills)

Reference: [`sales-pipeline`](./skills/sales-pipeline/) — the meta-skill that explains the methodology and tells you which skill to invoke at each compartment.

Hybrid Sandler + MEDDIC adapted to enterprise healthtech. The pipeline is a 7-compartment **submarine** — one meeting closes one compartment. Four transversal skills run at any compartment (`sales-pipeline`, `precall-brief`, `postcall-recap`, `deal-health`), one practice skill runs offline (`sales-roleplay`), seven per-compartment skills handle each stage's specific logic, and five framework skills (`icp-match`, `pain-quantifier`, `stakeholder-map`, `proposal-pricer`, `competitive-intel`) get invoked from inside the others as building blocks.

**Workflow**

```
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  7-compartment submarine (see sales-pipeline for full per-compartment    │
   │  guidance and which skill to invoke at each step)                        │
   │                                                                          │
   │  1.qualify-dolor ▶ 2.diagnose-dolor ▶ 3.champion-kit ▶ 4.decision-maker-kit▶│
   │  5.procurement-kit ▶ 6.legal-kit ▶ 7.security-kit                        │
   └──────────────────────────────────────────────────────────────────────────┘
            ▲                     │                      ▲
            │                     ▼                      │
   precall-brief ────▶ (the meeting) ────▶ postcall-recap
            ▲                                            │
            │                                            ▼
       sales-roleplay                              deal-health
       (practice offline)                          (audit anytime)
```

| # | Skill | When to use | How to invoke |
|---|---|---|---|
| 1 | [`sales-pipeline`](./skills/sales-pipeline/) | Pipeline overview, onboarding, deciding "what skill do I run next" | `/sales-pipeline` · "explícame el pipeline" / "qué corro en compartimento N" |
| 2 | [`precall-brief`](./skills/precall-brief/) | Before any sales meeting — produces brief + Up-Front Contract calibrated to the open compartment | `/precall-brief` · "prepara la reunión con X" / "qué tengo que lograr con Y" |
| 3 | [`postcall-recap`](./skills/postcall-recap/) | After any sales meeting with a transcript — recap, Attio update, follow-up email with next UFC | `/postcall-recap` · "qué quedó de la reunión" / "actualiza el deal" |
| 4 | [`deal-health`](./skills/deal-health/) | Auditing a deal or the whole pipeline — what's closed, what's open, stall risk | `/deal-health` · "cómo va el deal con X" / "qué deals están en riesgo" |
| 5 | [`sales-roleplay`](./skills/sales-roleplay/) | Practice a hard meeting (CFO escéptico, CISO paranoico, comité hostil) before doing it live | `/sales-roleplay` · "simulemos al CFO de X" / "practiquemos la reunión" |
| 6 | [`qualify-dolor`](./skills/qualify-dolor/) | Compartment 1 — first meeting qualification: dolor match + presupuesto + DMs | `/qualify-dolor` · "califica este lead" / "vale la pena <empresa>" |
| 7 | [`diagnose-dolor`](./skills/diagnose-dolor/) | Compartment 2 — pain funnel, cuantificación en plata, línea de compra, ROI, champion commit | `/diagnose-dolor` · "corre el pain funnel con <empresa>" / "cuantifica el dolor" |
| 8 | [`champion-kit`](./skills/champion-kit/) | Compartment 3 — deck + one-pager + email vende-por-ti + FAQ for the champion to sell internally | `/champion-kit` · "arma kit para el champion de <empresa>" |
| 9 | [`decision-maker-kit`](./skills/decision-maker-kit/) | Compartment 4 — adapt the kit per role (CFO/CMO/CIO/CISO/COO) + price-bracket Good/Better/Best | `/decision-maker-kit` · "adapta kit para CFO de <empresa>" |
| 10 | [`procurement-kit`](./skills/procurement-kit/) | Compartment 5 — vendor form pre-filled, supports legales/financieros, términos comerciales | `/procurement-kit` · "responde vendor form de <empresa>" |
| 11 | [`legal-kit`](./skills/legal-kit/) | Compartment 6 — MSA + DPA / Hab. Datos / GDPR / HIPAA BAA + SLA annex + redline map | `/legal-kit` · "prepara contrato + DPA para <empresa>" |
| 12 | [`security-kit`](./skills/security-kit/) | Compartment 7 — security questionnaire respondido + arquitectura + pentest evidence + remediation plan | `/security-kit` · "responde cuestionario de seguridad de <empresa>" |
| 13 | [`icp-match`](./skills/icp-match/) | Score 0-10 contra el ICP Arkangel before qualifying — pursue / nurture / pass | `/icp-match` · "es ICP <empresa>?" / "rankea esta lista" |
| 14 | [`pain-quantifier`](./skills/pain-quantifier/) | Convertir dolor a COP/USD con fórmulas por sector + sensitivity analysis | `/pain-quantifier` · "cuantifica el dolor de <empresa>" |
| 15 | [`stakeholder-map`](./skills/stakeholder-map/) | Mapa 2x2 (influencia × support) con plan por persona — champion, blocker, supporter, noise | `/stakeholder-map` · "mapea stakeholders de <empresa>" |
| 16 | [`proposal-pricer`](./skills/proposal-pricer/) | Bracket Good/Better/Best con scope distinto por tier, anclado al dolor + payback per tier | `/proposal-pricer` · "arma propuesta para <empresa>" |
| 17 | [`competitive-intel`](./skills/competitive-intel/) | Brief de competidor + counter-positioning con concesiones honestas + objection handlers | `/competitive-intel` · "qué les digo de <competidor>" |

---

### 🩺 Medical insurance audit (11 skills)

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
| — | [`prior-authorization-review`](./skills/prior-authorization-review/) | Reviewing a pre-autorización request *before* the service is rendered (PBS / MIPRES / contrato) | `/prior-authorization-review` · "should we authorize this medication?" / "review this pre-auth" |

---

### 🧑‍⚕️ Clinical operations (4 skills)

IPS-side and patient-facing tools that complement the audit pipeline. Each one is independently invocable, but they compose well: a clinical report drafted with `clinical-report-writer` is grounded in `gpc-minsalud-lookup` recommendations, backed by `pubmed-search` evidence, and translated for patients via `patient-document-simplifier`.

```
                   ┌─ pubmed-search ──────────┐
                   │  (evidence)              │
                   ▼                          ▼
  gpc-minsalud-lookup ──▶ clinical-report-writer ──▶ patient-document-simplifier
       (standard of care)        (epicrisis,           (plain Spanish,
                                  evolución,            for the patient)
                                  nota operatoria)
```

| Skill | When to use | How to invoke |
|---|---|---|
| [`pubmed-search`](./skills/pubmed-search/) | Need peer-reviewed evidence to back a clinical decision, glosa response, or grant claim | `/pubmed-search` · "find RCTs on bevacizumab in ROP" / "evidence for IV magnesium in asthma" |
| [`gpc-minsalud-lookup`](./skills/gpc-minsalud-lookup/) | Need to cite a Colombian GPC recommendation in an audit, glosa, or clinical decision | `/gpc-minsalud-lookup` · "what does GPC say about HTA?" / "find recommendation for DM2 follow-up" |
| [`clinical-report-writer`](./skills/clinical-report-writer/) | Drafting an epicrisis, evolución, nota operatoria, or interconsulta in Colombian standard format | `/clinical-report-writer` · "write the epicrisis from this case" / "format this discharge summary" |
| [`patient-document-simplifier`](./skills/patient-document-simplifier/) | Translating a glosa, prescription, or discharge summary into plain Spanish for a patient | `/patient-document-simplifier` · "explain this glosa to my patient" / "simplify this discharge summary" |

---

### 🧠 Model training (2 skills)

End-to-end methodologies for training **calibrated, production-grade ML models** distilled from real Arkangel projects. Both skills are siblings — they share the same operating modes (🟢 autónomo / 🟡 propose-N / 🔴 pause-and-ask), one-hypothesis-per-iteration discipline, hard rules, pause-points, and minimum reportable metrics (AUROC + AUPRC + Brier + slope/intercept + ≥4 operating points) — but the domain, costs, and rules differ.

```
                       shared methodology
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
   attrition-model-trainer            screening-model-trainer
       (HR / SST tabular)              (clinical EHR, TRIPOD+AI)
       multiclass + ICL +              foundation models +
       hybrid ML + rules               multi-score benchmark
```

**Both skills package only the methodology** (`SKILL.md` + `references/` + `templates/`) — the project-specific Python implementation lives outside this repo. Drop them into a new `model_training/` folder of the target project, copy the markdown templates to `docs/`, and follow the phases.

| Skill | When to use | How to invoke |
|---|---|---|
| [`attrition-model-trainer`](./skills/attrition-model-trainer/) | Train/refresh an employee **attrition / retention / turnover** model on tabular HR + SST data; need foundation-model benchmark (TabPFN), sliding-window OOT validation, calibration audit, threshold + business-value analysis (E1/E2 cost scenarios), multiclass reformulation, ICL noise handling, or a hybrid ML+rules scorer. | `/attrition-model-trainer` · "entrena un modelo de retiro" / "predice qué empleados van a renunciar" / "refresca el modelo de attrition" |
| [`screening-model-trainer`](./skills/screening-model-trainer/) | Train/refresh a binary **clinical-screening** model (CKD/ERC, COPD/EPOC, DM2, HTA, etc.) on tabular EHR data, conformante con **TRIPOD+AI**, with foundation models (TabPFN), transfer learning (NHANES/MIMIC), multi-score literature benchmark (KFRE/PUMA/FINDRISC), feature audit, LOIO + bootstrap CI, decision-curve analysis, and cliente-facing materials. | `/screening-model-trainer` · "entrena un modelo de tamizaje para CKD" / "refresca el modelo de ERC en diabéticos" |

---

### 🔎 Medical reference (2 skills)

Self-contained CLIs. No workflow — invoke directly when you need to validate a code.

| Skill | When to use | How to invoke |
|---|---|---|
| [`cups-lookup`](./skills/cups-lookup/) | Validate or search a CUPS 2026 procedure code (Colombia, Res. 2706/2025) | `/cups-lookup` · "validate CUPS 871020" / "find CUPS for X" · CLI: `node cups-lookup.js validate 871020` |
| [`icd10-lookup`](./skills/icd10-lookup/) | Validate or search an ICD-10-CM code (CMS FY2026) | `/icd10-lookup` · "validate ICD-10 E11.9" / "find code for diabetes" · CLI: `node icd10-lookup.js validate E11.9` |

---

### ✍️ Writing (1 skill)

| Skill | When to use | How to invoke |
|---|---|---|
| [`copy-writer`](./skills/copy-writer/) | Rewriting marketing, LinkedIn, landing-page, pitch, or email copy | `/copy-writer` · "make this stickier" / "rewrite this" / "this sounds corporate" |

---

### 📦 Vendored from OpenClaw (3 skills)

Imported from [OpenClaw Medical Skills](https://github.com/FreedomIntelligence/OpenClaw-Medical-Skills) under their original licenses. See each skill's `NOTICE.md`.

| Skill | License | When to use | How to invoke |
|---|---|---|---|
| [`markitdown`](./skills/markitdown/) | MIT (Microsoft) | Convert any PDF/DOCX/XLSX/PPTX/audio/image/HTML/EPub to Markdown for LLM processing | `/markitdown` · "convert this PDF to markdown" · CLI: `markitdown file.pdf` |
| [`markdown-mermaid-writing`](./skills/markdown-mermaid-writing/) | Apache-2.0 (Superior Byte Works) | Writing reports, decision records, or pipeline docs that need diagrams (flowcharts, sequence, ER, gantt, etc.) | `/markdown-mermaid-writing` · "write a status report with mermaid diagrams" |
| [`medical-entity-extractor`](./skills/medical-entity-extractor/) | MIT (NAPSTER AI) | Extracting symptoms, medications, lab values, and diagnoses from unstructured patient messages | `/medical-entity-extractor` · "extract entities from this patient message" |

---

## 🛠 Create a skill in 5 steps

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
