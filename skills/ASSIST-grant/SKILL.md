---
name: ASSIST-grant
description: Build a complete NIH grant package for any mechanism submitted through the ASSIST portal — R01, R21, R03, SBIR/STTR, PAR, RFA, and related NOFOs. Use when the owner says "write the NIH application", "build the ASSIST package", or "draft the R01/R21/PAR". Covers all sections from Specific Aims through budget, human subjects, DMSP, and portal field mapping.
---

# ASSIST-Grant

`ASSIST-grant` builds the full NIH application package for any mechanism submitted through the ASSIST portal. It was distilled from the PAR-25-110 / PANDORA-MaP R01 build (2026-05) and the PAR-25-096 / SIGNAL-CRC R21 build (2026-05), and encodes the decisions, conventions, and pitfalls from both projects.

---

## Core Principle — PANDORA is Always the Center

**Every grant built with this skill must position PANDORA as the primary scientific tool and contribution.** This is non-negotiable regardless of the NOFO, disease area, or data source.

PANDORA is Arkangel AI's clinical NLP and automated coding engine. It is what Arkangel brings to any NIH project. The grant narrative must make PANDORA the methodological innovation — not a background tool, not a data-processing step buried in the methods, and not replaced by a generic ML model.

**The correct framing in every proposal:**
- **Primary:** PANDORA extracts, structures, and hierarchizes clinical information from existing unstructured EHR text (free text, clinical notes, narratives) — this is the core scientific contribution
- **Secondary (optional):** A predictive model (ML, risk stratification, classification) trained on the PANDORA-enriched dataset demonstrates the clinical utility of what PANDORA extracted — this validates the data, it is not the product

**What this means in practice:**
- Specific Aims must center on what PANDORA does, not on the downstream model
- Significance must establish the problem of "lost" clinical data in unstructured text
- Innovation must highlight PANDORA's NLP capabilities as the novel methodological advance
- A risk stratification or ML model may appear in a downstream Aim as proof-of-concept, but it is never the primary deliverable
- Never propose a generic "machine learning model" as the main innovation — reviewers must understand that PANDORA's NLP pipeline is the advance

---

## Scope and Workflow — Two Gates Before the Full Package

**Two artifacts are produced and reviewed before any other section: (1) a NOFO Objectives & Alignment Brief with an early-lock-in Abstract, and (2) the Specific Aims page. Each is a stop point for the owner.**

This is the correct order:

1. Claude reads the NOFO and the grant folder context
2. Claude produces a **NOFO Objectives & Alignment Brief** (`00_nofo-alignment-brief.md`) — the verbatim NOFO purpose and objective, what the NOFO buys vs. what it does not, mandatory framework references (NIMHD Research Framework, etc.), structural requirements (LATAM PI/MPI, foreign-component rules, clinical-trial status), IC-specific interests, an indication recommendation anchored in PANDORA evidence with a comparison table against alternatives, an Aims-to-NOFO-objectives mapping preview, and an early-lock-in **Project Summary / Abstract** (~500 words). Stops.
3. Owner reviews the alignment brief + abstract and decides: approve indication, redirect, narrow, expand, or change focus
4. Only after explicit owner approval of the indication and abstract, Claude writes the **Specific Aims** (1 page) and stops again
5. Owner reviews the Aims and decides: approve as-is, redirect, narrow, expand, or change focus
6. Only after explicit owner approval of the Aims does Claude write the full package (Research Strategy, Budget, Human Subjects, DMSP, etc.)

**Why two gates:** The indication choice (which disease, which population, which IC home) is upstream of the Aims. If the owner pivots the indication after Aims are written, the Aims become wasted work. The alignment brief is cheap to redirect (one page of NOFO mapping + one abstract paragraph); six pages of Research Strategy is not. The brief also proves to the owner that the writer actually read the NOFO and is responsive to its specific objectives — not generic NIH boilerplate.

**On scope:** Claude may choose the scope. Defaults:
- If the NOFO is disease-specific and narrow → match it: one disease area, one data source, tightly scoped Aims
- If the NOFO is broad (secondary analysis, methods, platforms) → propose a focused angle, not the widest possible framing
- Always explain the scope choice in 1–2 sentences above the Aims draft so the owner can assess it

**Scope examples:**
- *Narrow:* PANDORA applied to one cancer type (e.g., CRC), one EHR corpus, one feature domain (alarm symptoms)
- *Broad:* PANDORA applied across cancer types, multi-site corpus, full feature taxonomy development

---

## When to Use

- The funder is NIH and the submission portal is ASSIST (grants.nih.gov/grants/guide)
- Mechanisms covered: R01, R21, R03, R34, SBIR (R43/R44), STTR (R41/R42), PAR, RFA, PA, and any NOFO requiring an SF424 (R&R) package
- The owner has a grant folder with at least a `sources/` directory containing FOA notes, eligibility, evaluation criteria, and form fields
- `develop-proposal` has already run OR the owner asks to go straight to the NIH-specific package

## Inputs Required Before Starting

Collect these before producing any section — do not draft with gaps, mark them explicitly:

1. **FOA number and type** — PAR-XXXX, RFA-XXXX, PA-XXXX, or plain NOFO number
2. **Mechanism** — R01 / R21 / SBIR / etc. (affects page limits, budget type, section requirements)
3. **Due date and expiration date** — these are different; verify the NOFO is still active before any ASSIST work
4. **Scientific focus** — specific disease, population, intervention, technology; NOT generic platform language
5. **Clinical/research partner** — institution name, country, role (PI site vs. subaward), data access confirmation
6. **Applicant structure** — who applies (U.S. entity? foreign institution?), PI name if known, UEI/eRA Commons ID
7. **Budget ceiling** — total project cost (direct + F&A) or direct cost only; number of years

If any of the above is missing, ask before drafting. Use `[DATO PENDIENTE - requiere input de owner]` for confirmed-unknown items.

## Output Location — Branch + PR, Never Direct to Main

**All grant files are written on a dedicated branch and delivered to the owner via Pull Request. The owner reviews and merges — Claude never merges to main.**

The correct git workflow:

```
# 1. Create a branch named after the grant issue number or NOFO
git checkout -b draft/NNN-grant-name

# 2. Write all files to the correct path in the repo
proposals/YYYY-MM_Grant-Name/
  assist/          ← all ASSIST package files go here
  README.md
  status.md
  sources/

# 3. Commit to the branch as sections are completed
# 4. Open a PR against main when the package is ready for owner review
# 5. Owner reviews, requests changes if needed, and merges
```

**Why a branch + PR:**
- Keeps main clean until the owner explicitly approves the content
- Allows the owner to review diffs section by section before anything lands on main
- Avoids merge conflicts when multiple grants or team members are active simultaneously
- PR comment thread serves as the review record

Never commit grant files directly to main. Never work in `.claude/worktrees/` — those are session-isolated and invisible to the repo.

---

## Outputs

This skill produces a complete package under `proposals/YYYY-MM_Grant-Name/assist/`:

| File | Always required | Conditional |
|---|---|---|
| `00_nofo-alignment-brief.md` | ✅ (Gate 1 — owner reviews before Aims) | — |
| `01_specific-aims.md` | ✅ (Gate 2 — owner reviews before full package) | — |
| `02_research-strategy.md` | ✅ | — |
| `03_abstract.md` | ✅ | — |
| `04_project-narrative.md` | ✅ | — |
| `05_dms-plan.md` | ✅ (required since Jan 2023) | — |
| `06_budget-justification.md` | ✅ | Modular if all years ≤$250K direct; Detailed R&R if any year exceeds or if total-cap mechanics make modular unworkable (see Step 6) |
| `07_human-subjects.md` | ✅ | — |
| `08_facilities.md` | ✅ | — |
| `09_equipment.md` | ✅ | — |
| `10_authentication.md` | ✅ | — |
| `11_form-fields-map.md` | ✅ ASSIST portal field mapping | — |
| `12_references.md` | ✅ | — |
| `13_cover-letter.md` | ✅ | — |
| `14_foreign-justification.md` | — | ✅ if any performance site or significant scientific work is outside the U.S. |
| `15_resource-sharing-plan.md` | ✅ | — |
| `biosketch-template.md` | — | ✅ only if owner does not have a current biosketch; ask first |
| `letters-of-support-template.md` | — | ✅ for foreign subawards and named consultants; ask first |

## Workflow

Produce sections in this order — do not skip ahead; each section depends on the previous:

### Step 0a — NOFO Objectives & Alignment Brief + Indication + Abstract, stop

Before writing any narrative section, produce a structured **NOFO Objectives & Alignment Brief**. This is Gate 1 with the owner. Save it as `assist/00_nofo-alignment-brief.md`.

This step exists because the *indication* (which disease, which population, which IC home) is upstream of the Aims. Locking the indication wrong means rewriting the Aims; locking the Aims wrong means rewriting the package. The brief makes the indication explicit, comparable, and defensible against the actual NOFO objectives — and proves the writer is responsive to the NOFO, not generic.

**Procedure:**

1. Read the full NOFO: eligibility, review criteria, page limits, budget cap, clinical-trial status, participating ICs.
2. Read the grant folder: existing sources/, rules.md, eligibility.md, evaluation-criteria.md, any prior drafts.
3. If the official NIH page is unreachable (NIH returns HTTP 403 to most automated fetchers), use the closest verifiable mirror — `simpler.grants.gov`, university research-funding pages, the predecessor NOFO if reissued — and cite the source. Never paraphrase the NOFO purpose statement; reproduce it verbatim or mark it `[NOFO purpose — verbatim retrieval blocked; closest mirror cited below]`.
4. Write the brief with these required sections, in this order:

   1. **NOFO core purpose** — verbatim from the official funding announcement (or closest official summary, with source cited).
   2. **NOFO core objective** — verbatim from the official text. This is what the NIH wants the research to achieve.
   3. **Types of research the NOFO buys** — list each named category (e.g., clinical epidemiology, validation of measurements, evaluation of policies, healthcare models). Mark which categories PANDORA enters strongly vs. weakly.
   4. **Required framework references** — for NIMHD NOFOs, the NIMHD Research Framework matrix (levels × domains). For NIA, the geroscience or late-life framework. For NCI, the cancer disparities framework. For each level/domain the proposal will touch, name it explicitly so the owner can see the multi-level coverage.
   5. **Structural requirements** — one line per mandatory rule: partner type (e.g., LATAM PI/MPI required), prime applicant type (U.S. entity? foreign org allowed?), clinical-trial status, foreign-component rules, eligibility constraints.
   6. **Participating ICs and their specific interests** — one row per IC, with a one-line description of what that IC funds AND how the proposed indication matches or does not. Name the primary IC for the cover-letter assignment request.
   7. **What the NOFO does NOT fund** — explicit out-of-scope items (e.g., platform deployment grants, clinical trials when the NOFO is "not allowed", foreign-prime applications). This kills early scope drift.
   8. **Indication recommendation** — Claude proposes ONE indication anchored in PANDORA evidence, in a comparison table against 2–3 alternatives across criteria: IC fit, PANDORA evidence available, mechanism strength (how strongly the "lost signal in unstructured text" thesis applies), LATAM partner readiness, disparity magnitude documented in the literature, fit to clinical-trial-allowed/not-allowed constraint. Pick the row that wins on balance; explain in one paragraph.
   9. **Aims-to-NOFO-objectives mapping table** — preview of how each of the 3 future Aims will map to a NOFO objective AND to NIMHD/IC framework levels. This proves the proposal will be *responsive* before any Aims are written.
   10. **Project Summary / Abstract — early-lock-in draft** — ~500 words that capture the indication choice, the central hypothesis, the 3 Aims at headline level, the preliminary evidence (PANDORA benchmarks + Arkangel deployments), and the expected impact. This is the artifact the owner uses to validate direction. The final 30-line NIH abstract (`03_abstract.md`) will be derived from this in Step 1.

Present the brief to the owner with a short note: *"Aquí está el alignment brief con [indicación] como recomendación + abstract v0. ¿Apruebas la indicación y el enfoque, o quieres ajustar antes de que escriba los Specific Aims?"*

**STOP. Do not write Specific Aims until the owner approves the indication and abstract.**

---

### Step 0b — Specific Aims (1 page), stop

(Only after the owner approves the alignment brief and abstract.)

1. Open from the indication and central hypothesis locked in Step 0a — do not re-litigate the indication choice.
2. State the chosen scope in 1–2 sentences before the Aims (narrow vs. broad — see "Scope and Workflow" section above).
3. Write the Specific Aims (1 page — see Step 2 format below).
4. **STOP. Do not write any other section.**

Present the Aims to the owner with a short note: *"Aquí están los Specific Aims con enfoque [X]. ¿Los apruebas o quieres ajustar antes de que escriba el resto del paquete?"*

Wait for explicit owner approval before proceeding to Step 1.

---

### Step 1 — Full package (only after owner approves the Aims)

- Confirm all pending inputs: PI, DUA status, fringe rates, modular vs. detailed budget, applicant structure (for-profit? foreign site? subaward needed?)
- Confirm the NOFO is still active (last due date ≠ expiration date)
- Write all remaining sections in order: Research Strategy → Human Subjects → References → Budget → DMSP → Supporting docs → Cover Letter → Resource Sharing Plan → Foreign Justification (if applicable) → ASSIST field map
- The final `03_abstract.md` (30-line NIH abstract) is derived from the early-lock-in abstract in `00_nofo-alignment-brief.md`, compressed to NIH page limits.
- Commit each section to the branch as it is completed; open the PR when the full package is ready

### Step 2 — Specific Aims (1 page hard limit)
- Opening: significance and unmet need (2–3 sentences max — do not over-explain)
- Long-term goal, objective, central hypothesis (1 paragraph)
- Team and partner roles (1–2 sentences)
- 3 Aims: each with a verb-driven action statement + expected outcome (no variable laundry lists)
- Impact statement (2 sentences)
- Target: 550–620 words. If it exceeds 1 page at standard NIH margins (0.5"), cut.

### Step 3 — Research Strategy (12 pages for R01; 6 for R21)
- Significance: unmet need + why this approach now
- Innovation: what is genuinely new (not rehashed significance)
- Approach: for each Aim — study design → data sources → methods → analysis → timeline milestones → potential problems + alternative approaches
- Team: brief role statement per key person
- Do not exceed the page limit; reviewers score against it

### Step 4 — Human Subjects
- Clinical trial determination (retrospective EHR studies are NOT clinical trials — state explicitly)
- IRB framework: U.S. site (45 CFR 46) + foreign site if applicable (local ethics law + OHRP FWA/reliance)
- Vulnerable population protections (pediatric: Subpart D; pregnant women: Subpart B)
- Privacy and data security (de-identification protocol, DUA if foreign site)
- Inclusion of women, minorities, and children

### Step 5 — References (search required — never fabricate — complete all citations in-session)

**Claude must search PubMed for every factual claim in the Research Strategy before writing this section. All citations must be complete before the file is delivered — no placeholders.**

Rules:
- Use WebSearch with domain `pubmed.ncbi.nlm.nih.gov` or `pmc.ncbi.nlm.nih.gov` to find real papers
- Only include references with a confirmed PMID or DOI from search results
- **Fetch the full PubMed/PMC record for every reference** — authors (first 6 + "et al." if >6), full article title, journal name, year, volume, issue, pages or article number
- **Never deliver a reference file with incomplete citations.** Do not leave `[VERIFY full citation]` placeholders — verify each one in-session before writing the file
- Never invent author names, journal names, years, volumes, or page numbers
- Save as `assist/12_references.md` organized by category (disease context, EHR/NLP methods, data standards, data source consortium, regulatory/policy)
- Add a mapping table at the bottom: which reference supports which claim in which file
- Add a pre-submission checklist at the bottom
- If a claim cannot be backed by a real reference found via search, rewrite it as a softer directional statement — do not invent a citation

This applies to every quantitative or empirical claim in the narrative — percentages, effect sizes, prevalence figures, benchmark performances.

### Step 6 — Budget
- Determine type: **modular** (all years ≤$250K direct, simple justification) vs. **detailed R&R** (any year >$250K, OR when the mechanism has a total-cost cap that makes modular increments unworkable — see note below)
- **Fringe:** apply 30% of salary for all U.S. personnel (FICA + health + dental + disability + retirement). Fringe is a direct cost — it must fit within the annual and total direct-cost caps alongside salary and non-personnel costs
- **F&A (indirect costs):** 26% MTDC de minimis for Arkangel AI LLC (for-profit, no negotiated rate). MTDC excludes equipment >$5K/unit, subaward amounts above $25K/year/subrecipient, patient care, tuition
- **Modular vs. detailed — R21 trap:** R21s often have a hard total direct-cost cap (e.g., $275K over 2 years) with a per-year maximum (e.g., $200K). After adding fringe, each year's direct costs may fall "between modules" (above 5×$25K = $125K but below 6×$25K = $150K). If 6 modules/year × 2 years exceeds the total cap, use **detailed R&R format** — it is always acceptable and avoids the modular arithmetic problem
- For detailed R&R: personnel table (salary + fringe rows per person per year), cost-by-category table (all rubros by year), MTDC calculation, F&A at applicable rate, total project cost (direct + F&A)
- MTDC calculation: state base, list any exclusions, show F&A amount per year and total
- Budget justification narrative: 1 paragraph per category; for personnel, state FTE, role, and salary escalation rationale
- Working backwards from a total cost cap: Direct ≈ Total ÷ 1.26 (for 26% MTDC de minimis)

### Step 7 — DMSP (Data Management and Sharing Plan)
- Required for all NIH applications since January 25, 2023
- 5 sections: (1) data types and formats; (2) tools/software/code; (3) metadata standards; (4) preservation, access, and timelines; (5) oversight
- Target: ≤2 pages; upload as separate PDF in ASSIST
- Include DMS budget line in direct costs (repository fees, storage)

### Step 8 — Research Resource Sharing Plan
- Required if the project produces NLP models, software, biological specimens, or unique datasets
- Covers: pipeline configuration and CRC-specific scripts (Apache 2.0, GitHub), taxonomy and annotation schema (CC BY 4.0, GitHub + Zenodo DOI), analysis code (MIT, GitHub + Zenodo DOI)
- **PANDORA base model weights are proprietary.** Do not release weights as open weights. Instead: make weights available to non-commercial researchers under a Research Use Agreement (RUA) at arkangel.ai/research-access. This is consistent with NIH NGPS §8.2.1 on protecting legitimate commercial interests while sharing resources to the extent practicable
- Separate document from the DMSP; upload as Other Attachment in ASSIST

### Step 9 — Supporting documents
- **Facilities & Other Resources**: prime + subaward site infrastructure; confirm HIS, computing, data security at each site
- **Authentication of Key Resources**: if no biological/chemical resources → explicit "not applicable" statement
- **Timeline**: year-by-year milestones aligned to aims + decision gates; update to match the actual scientific focus

### Step 10 — Cover Letter

Cover letter is **always required** for PAR and RFA submissions; strongly recommended for all others. Write it as `assist/13_cover-letter.md`. Structure:

1. **Header:** Date, addressee (Chief, Scientific Review Branch, relevant IC), application title, PI name, FOA number, mechanism, submission date
2. **Institute assignment request:** Name the IC explicitly (e.g., NCI) and state why it is the correct home for this science
3. **Study section / SEP request:** Request a specific standing study section or a Special Emphasis Panel (SEP) convened for the NOFO. Name the expertise needed (e.g., cancer informatics, EHR data science, health equity)
4. **Clinical trial statement:** Explicitly state whether the project is or is not an NIH-defined clinical trial. For retrospective EHR secondary analyses: "This application does not propose a clinical trial as defined by NIH."
5. **Scientific summary:** 2–3 sentences — what PANDORA does, on what data, to answer what question. Written for a program officer, not a reviewer
6. **Data source statement:** Identify the primary dataset and data access mechanism (DUA, consortium membership, etc.)
7. **Program officer contact:** If pre-submission contact was made, name the PO and confirm fit
8. **Reviewer expertise:** List 2–3 specific expertise domains needed for fair review
9. **Conflicts of interest:** State "no conflicts" or disclose known ones
10. **Closing + signature block:** PI name, degree, title, institution, contact

[DATO PENDIENTE] items in every cover letter: PI name, PO contact name, submission date, any known reviewer conflicts.

### Step 11 — Foreign Justification (when applicable)

Required whenever any significant scientific work is performed outside the U.S., even if the applying entity is a U.S.-registered organization. Write as `assist/14_foreign-justification.md`.

**Arkangel AI standard case:** The applying entity is Arkangel AI LLC (Delaware). The scientific and technical work is performed by the Colombia-based team. This constitutes a foreign component (NIH NGPS §16.3). No subaward to a separate foreign institution is created — all funds flow to the U.S. LLC. Consequences:
- Foreign Justification is required (significant scientific work outside the U.S.)
- No separate OHRP FWA for a foreign institution is required (no foreign institution receives funds)
- Data must remain in a U.S.-hosted, DUA-compliant secure environment; Colombia team accesses remotely via authenticated encrypted connections
- U.S. IRB determination covers all project activities regardless of where Arkangel AI personnel are physically located

Three-part structure:
1. **Scientific necessity** — why the Colombia team is uniquely required (PANDORA architecture, training infrastructure, clinical NLP expertise)
2. **Unique technical environment** — what the Colombia office hosts that cannot be replicated elsewhere (PANDORA production infrastructure, annotated corpora, secure compute)
3. **Institutional expertise** — what the team brings (NLP architecture, multi-system EHR experience, bilingual clinical NLP, health equity orientation)

Also include: compliance statement, data governance (residency, DUA, de-identification), and oversight plan.

### Step 12 — ASSIST portal field mapping (`assist/11_form-fields-map.md`)
- Map every SF424 field to its source file
- Flag all `[DATO PENDIENTE]` items (PI name, AOR, UEI, EIN, fringe/F&A rates confirmed)
- List submission blockers explicitly at the bottom — numbered, with owner action required for each

### Step 13 — Optional sections (ask owner before generating)
- **Biosketch(es)**: PI always required; Senior Key Personnel if designated. Owner may already have current biosketches — ask. If needed, generate a SciENcv scaffold for the Personal Statement only; Sections B–D are populated from SciENcv directly.
- **Letters of Support**: required for foreign subaward sites and named consultants; recommended for all named key personnel at partner institutions. Owner may already have these — ask. If needed, generate signed-letter templates (not final letters).

---

## NIH-Specific Flags — Check Before Every Submission

- [ ] Is the FOA still active? Last new-application due date ≠ expiration date
- [ ] For-profit applicant: is eligibility explicitly stated in the FOA?
- [ ] Foreign component present (scientific work outside U.S.)? Foreign Justification required
- [ ] Foreign institution subaward? Separate R&R Subaward Budget Form + NCAGE code + OHRP FWA/reliance required
- [ ] Human subjects — vulnerable population (pediatric: Subpart D; pregnant women: Subpart B)
- [ ] Clinical trial determination: retrospective EHR = NOT a clinical trial; state explicitly in cover letter and Human Subjects section
- [ ] Modular vs. detailed budget: modular only if ALL years ≤$250K direct AND mechanism's total-cost cap does not create modular arithmetic conflict
- [ ] Fringe (30%) included in direct costs — personnel lines show salary + fringe separately
- [ ] DMSP budget line included in direct costs
- [ ] PI eRA Commons ID registered and linked to the applicant organization
- [ ] AOR (Authorized Organizational Representative) identified — required for ASSIST submission
- [ ] Cover letter written and uploaded
- [ ] PANDORA model weights NOT released as open weights — RUA model used in Resource Sharing Plan
- [ ] Branch created and PR opened — never commit grant files directly to main

---

## Budget Conventions — For-Profit U.S. Entity + Foreign Component

- F&A rate: 26% of MTDC (de minimis, for-profit without negotiated rate)
- Fringe U.S.: 30% (FICA + health + dental + disability + retirement) — confirm with HR
- Fringe Colombia: ~25% (salud 8.5% + pensión 12% + ARL + SENA + ICBF + caja) — confirm with HR
- Budget front-loaded: setup-intensive years (Y1–2) typically carry 55–60% of 5-year costs
- Equipment >$5K/unit: excluded from MTDC; purchase in Y1 only unless scientifically justified in later years
- Subaward: only first $25K/year/subrecipient counts in prime MTDC base
- Headroom: build in 5–8% for salary escalation (NIH allows 2–3%/year); do not spend to the cap
- **R21 budget design:** after adding 30% fringe, personnel costs expand significantly. Design the salary skeleton first (salary × FTE × 1.30 = personnel direct cost), then fit non-personnel within the remaining cap. For a $275K R21: salary + fringe ≈ $219K leaves ~$56K for non-personnel.

## Pitfalls

- Writing Specific Aims before producing a NOFO Objectives & Alignment Brief — the owner cannot validate indication fit from Aims alone, and the brief is Gate 1 of the workflow
- Paraphrasing the NOFO purpose or core objective instead of quoting it verbatim — reviewers test responsiveness against the literal NOFO language; the brief and final narrative must match it
- Skipping the NIMHD Research Framework (or equivalent IC framework) mapping in the alignment brief for NOFOs that explicitly require multilevel/multicomponent frameworks — reviewers downgrade for "single-level" framing
- Starting ASSIST data entry before confirming the FOA is still active — expiration ≠ last due date
- Confusing modular and detailed budget thresholds ($250K is per year, not total project)
- R21 modular trap: 6 modules/year × 2 years may exceed a total direct-cost cap — use detailed R&R in that case
- Forgetting to include fringe (30%) in direct costs — personnel lines must show salary + fringe separately
- Forgetting the separate subaward R&R budget form in ASSIST (it is not part of the prime budget)
- Writing generic variable extraction lists in Specific Aims instead of the scientific question
- Exceeding page limits — ASSIST will reject the upload or reviewers will not read the overage
- Using 26% de minimis when a negotiated rate exists — always ask before assuming de minimis
- Biosketch and letters of support generated before asking the owner if they already have them
- Marking the package ready for ASSIST without completing `assist/11_form-fields-map.md`
- Forgetting DMSP budget line — PhysioNet/Zenodo deposit fees must appear in direct costs
- Delivering a references file with `[VERIFY full citation]` placeholders — citations must be complete before delivery; fetch full records from PubMed in-session
- Forgetting the cover letter — always required for PAR/RFA; always written in Step 10
- Releasing PANDORA model weights as open weights — weights are proprietary; use RUA model
- Committing grant files directly to main — always use a branch and open a PR for owner review

## References

- `skills/scout-grants/SKILL.md`
- `skills/develop-proposal/SKILL.md`
- `skills/develop-budget/SKILL.md`
- `skills/grant-review/SKILL.md`
- `skills/polish-grant/SKILL.md`
- `skills/submit/SKILL.md`
