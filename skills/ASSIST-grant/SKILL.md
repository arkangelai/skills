---
name: ASSIST-grant
description: Build a complete NIH grant package for any mechanism submitted through the ASSIST portal — R01, R21, R03, SBIR/STTR, PAR, RFA, and related NOFOs. Use when the owner says "write the NIH application", "build the ASSIST package", or "draft the R01/R21/PAR". Covers all sections from Specific Aims through budget, human subjects, DMSP, and portal field mapping.
---

# ASSIST-Grant

`ASSIST-grant` builds the full NIH application package for any mechanism submitted through the ASSIST portal. It was distilled from the PAR-25-110 / PANDORA-MaP R01 build (2026-05) and encodes the decisions, conventions, and pitfalls from that project.

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

## Outputs

This skill produces a complete `drafts/` package in the grant folder:

| File | Always required | Conditional |
|---|---|---|
| `proposal-vN.md` | ✅ Specific Aims + Research Strategy + Human Subjects + Abstract + Project Narrative | — |
| `budget-vN.md` | ✅ | Modular if all years ≤$250K direct; Detailed R&R if any year exceeds |
| `dmsp-v1.md` | ✅ (required since Jan 2023) | — |
| `research-resource-sharing-v1.md` | ✅ | — |
| `timeline-v1.md` | ✅ | — |
| `facilities-v1.md` | ✅ | — |
| `authentication-v1.md` | ✅ | — |
| `cover-letter-v1.md` | ✅ | — |
| `sources/form-fields.md` | ✅ ASSIST portal field mapping | — |
| `sources/references-vN.md` | ✅ | — |
| `foreign-justification-v1.md` | — | ✅ if any performance site is outside the U.S. |
| `biosketch-template-v1.md` | — | ✅ only if owner does not have a current biosketch; ask first |
| `letters-of-support-template-v1.md` | — | ✅ for foreign subawards and named consultants; ask first |

## Workflow

Produce sections in this order — do not skip ahead; each section depends on the previous:

### Step 1 — Read and orient
- Read the full FOA: eligibility, review criteria, special requirements, page limits, budget caps
- Confirm the NOFO is still active (check last new-application due date vs. expiration date — they differ)
- Write a bootstrap note: what this FOA funds, the strongest angle for this team, top 3 review criteria, biggest risks
- Confirm applicant structure (for-profit? foreign site? subaward needed?)

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

### Step 5 — References
- Organize by category (disease context, methods, data standards, regulatory/policy)
- Mark all `[VERIFY]` until PMIDs are confirmed — do not fabricate citations
- No page limit; does not count toward Research Strategy

### Step 6 — Budget
- Determine type: **modular** (all years ≤$250K direct, simple justification) vs. **detailed R&R** (any year >$250K — required tables)
- For detailed R&R: personnel table (person-months by role by year), cost-by-category table (all rubros by year), MTDC calculation, F&A at applicable rate, budget justification narrative (1 paragraph per category)
- For for-profit U.S. entity without negotiated rate: use 26% MTDC de minimis
- MTDC excludes: equipment >$5K/unit; subaward amounts above $25K/year/subrecipient; patient care; tuition
- Subaward: requires separate R&R budget form in ASSIST; include indirect costs within subaward total
- Working backwards from a total cost cap: Direct ≈ Total ÷ 1.23 (for 26% MTDC de minimis)

### Step 7 — DMSP (Data Management and Sharing Plan)
- Required for all NIH applications since January 25, 2023
- 5 sections: (1) data types and formats; (2) tools/software/code; (3) metadata standards; (4) preservation, access, and timelines; (5) oversight
- Target: ≤2 pages; upload as separate PDF in ASSIST
- Include DMS budget line in direct costs (repository fees, storage)

### Step 8 — Research Resource Sharing Plan
- Required if the project produces NLP models, software, biological specimens, or unique datasets
- Covers: software/model release (GitHub + HuggingFace or equivalent), annotation schema, analysis code and reproducibility package
- Separate document from the DMSP; upload as Other Attachment in ASSIST

### Step 9 — Supporting documents
- **Facilities & Other Resources**: prime + subaward site infrastructure; confirm HIS, computing, data security at each site
- **Authentication of Key Resources**: if no biological/chemical resources → explicit "not applicable" statement
- **Timeline**: year-by-year milestones aligned to aims + decision gates; update to match the actual scientific focus
- **Cover Letter**: institute assignment request, study section request, foreign institution notice, program officer name

### Step 10 — ASSIST portal field mapping (`sources/form-fields.md`)
- Map every SF424 field to its source file
- Flag all `[PENDING]` items (PI name, AOR, UEI, NCAGE for foreign subaward, fringe/F&A rates)
- List submission blockers explicitly at the bottom

### Step 11 — Optional sections (ask owner before generating)
- **Biosketch(es)**: PI always required; Senior Key Personnel if designated. Owner may already have current biosketches — ask. If needed, generate a SciENcv scaffold for the Personal Statement only; Sections B–D are populated from SciENcv directly.
- **Letters of Support**: required for foreign subaward sites and named consultants; recommended for all named key personnel at partner institutions. Owner may already have these — ask. If needed, generate signed-letter templates (not final letters).

## NIH-Specific Flags — Check Before Every Submission

- [ ] Is the FOA still active? Last new-application due date ≠ expiration date
- [ ] For-profit applicant: is eligibility explicitly stated in the FOA?
- [ ] Foreign performance site: Foreign Justification required; FWA or reliance agreement path identified
- [ ] Human subjects — vulnerable population (pediatric: Subpart D; pregnant women: Subpart B)
- [ ] Clinical trial determination: retrospective EHR = NOT a clinical trial; state explicitly
- [ ] Modular vs. detailed budget: modular only if ALL years ≤$250K direct
- [ ] DMSP budget line included in direct costs
- [ ] NCAGE code for any foreign subaward recipient
- [ ] PI eRA Commons ID registered and linked to the applicant organization
- [ ] AOR (Authorized Organizational Representative) identified — required for ASSIST submission

## Budget Conventions — For-Profit U.S. Entity + Foreign Subaward

- F&A rate: 26% of MTDC (de minimis, for-profit without negotiated rate)
- Fringe U.S.: ~30% (FICA + health + dental + disability + retirement) — confirm with HR
- Fringe Colombia: ~25% (salud 8.5% + pensión 12% + ARL + SENA + ICBF + caja) — confirm with HR
- Budget front-loaded: setup-intensive years (Y1–2) typically carry 55–60% of 5-year costs
- Equipment >$5K/unit: excluded from MTDC; purchase in Y1 only unless scientifically justified in later years
- Subaward: only first $25K/year/subrecipient counts in prime MTDC base
- Headroom: build in 5–8% for salary escalation (NIH allows 2–3%/year); do not spend to the cap

## Foreign Justification (if applicable)

Required whenever any performance site is outside the U.S. Three-part structure:
1. **Scientific necessity** — unique population, epidemiology, or data not available in the U.S.
2. **Unique data/documentation environment** — what exists at the foreign site that enables the science
3. **Institutional expertise** — what the foreign team brings that the U.S. team cannot replicate

Also include: compliance statement (local ethics law + OHRP alignment), data governance (DUA, de-identification protocol, data residency), and oversight plan.

## Pitfalls

- Starting ASSIST data entry before confirming the FOA is still active — expiration ≠ last due date
- Confusing modular and detailed budget thresholds ($250K is per year, not total project)
- Forgetting the separate subaward R&R budget form in ASSIST (it is not part of the prime budget)
- Writing generic variable extraction lists in Specific Aims instead of the scientific question
- Exceeding page limits — ASSIST will reject the upload or reviewers will not read the overage
- Using 26% de minimis when a negotiated rate exists — always ask before assuming de minimis
- Biosketch and letters of support generated before asking the owner if they already have them
- Marking the package ready for ASSIST without completing `sources/form-fields.md`
- Forgetting DMSP budget line — PhysioNet/Zenodo deposit fees must appear in direct costs

## References

- `skills/scout-grants/SKILL.md`
- `skills/develop-proposal/SKILL.md`
- `skills/develop-budget/SKILL.md`
- `skills/grant-review/SKILL.md`
- `skills/polish-grant/SKILL.md`
- `skills/submit/SKILL.md`
