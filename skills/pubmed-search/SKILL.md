---
name: pubmed-search
description: Search PubMed (NCBI) for biomedical literature to support medical audits, clinical decisions, GPC compliance arguments, and grant proposals. Use it when the user asks to find papers, look up evidence for a treatment, validate a clinical claim, search for systematic reviews or RCTs on a topic, or back a glosa response with peer-reviewed sources. Returns structured citations (PMID, title, authors, journal, year, abstract, DOI) without scraping.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, research, evidence, pubmed, ncbi, audit, clinical]
    category: medical-research
    requires_toolsets: [terminal]
# Optional. Anonymous calls are rate-limited to 3 req/s. With an API key: 10 req/s.
# required_environment_variables:
#   - name: NCBI_API_KEY
#     prompt: NCBI E-utilities API key (free, get one at https://www.ncbi.nlm.nih.gov/account/)
#     help: Solicítala en https://www.ncbi.nlm.nih.gov/account/ → API Key Management
#     required_for: higher rate limits (10 req/s vs 3 req/s)
---

# pubmed-search

Wraps the NCBI **E-utilities** REST API to search PubMed and retrieve structured citations. No scraping, no third-party libraries — just `curl` against the official endpoints documented at https://www.ncbi.nlm.nih.gov/books/NBK25500/.

The skill exists because every other Arkangel skill that touches medicine eventually needs to ground a recommendation in literature: a glosa needs an RCT to defend a clinical decision, a grant needs to cite prior work, a medical audit needs to check whether a treatment has Cochrane support.

## When to Use

- The user asks to **find papers** on a topic ("studies on metformina + nefroprotección", "RCTs on bevacizumab in retinopathy of prematurity").
- The user wants to **back a clinical decision** with peer-reviewed evidence ("is there evidence for IV magnesium in severe asthma?").
- An upstream skill (`medical-invoice-medical-audit`, `hospital-devolucion-audit`, `grant-review`) needs **citations** to defend or attack a clinical claim.
- The user asks for **systematic reviews / meta-analyses** on a specific question.
- The user pastes a **PMID** or DOI and wants the full citation + abstract.
- The user is drafting a grant and needs **prior-art** in a specific area.

**Do not use:**
- For preprints (bioRxiv, medRxiv) — out of scope; PubMed indexes peer-reviewed only.
- For full-text retrieval — PubMed returns abstracts; use the publisher link or PMC for open-access full text.
- For Spanish-only journals not indexed in MEDLINE — search SciELO or LILACS instead.
- For very recent papers (< 2 weeks) — indexing lag means they may not be findable yet.

## Procedure

E-utilities has two relevant endpoints. Always use them in this order: `esearch` → `esummary`/`efetch`.

### 1. Search → get PMIDs

```bash
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" \
  --data-urlencode "db=pubmed" \
  --data-urlencode "term=metformin AND diabetic nephropathy AND (randomized controlled trial[pt])" \
  --data-urlencode "retmax=20" \
  --data-urlencode "retmode=json" \
  --data-urlencode "sort=relevance" \
  ${NCBI_API_KEY:+--data-urlencode "api_key=$NCBI_API_KEY"}
```

Returns `esearchresult.idlist` — an array of PMIDs.

### 2. Fetch citations (titles, authors, journal, year, DOI)

```bash
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi" \
  --data-urlencode "db=pubmed" \
  --data-urlencode "id=$(echo $PMIDS | tr ' ' ',')" \
  --data-urlencode "retmode=json" \
  ${NCBI_API_KEY:+--data-urlencode "api_key=$NCBI_API_KEY"}
```

For each PMID, the response contains `title`, `authors[]`, `fulljournalname`, `pubdate`, `elocationid` (DOI/PII), `articleids[]`.

### 3. Fetch abstracts (when needed)

```bash
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi" \
  --data-urlencode "db=pubmed" \
  --data-urlencode "id=$PMIDS_COMMA_SEPARATED" \
  --data-urlencode "rettype=abstract" \
  --data-urlencode "retmode=text" \
  ${NCBI_API_KEY:+--data-urlencode "api_key=$NCBI_API_KEY"}
```

### 4. Build the query — use PubMed field tags

The single biggest leverage point is writing a good `term`. Use bracketed field tags:

| Tag | Example | What it filters |
|---|---|---|
| `[ti]` | `bevacizumab[ti]` | Word in title |
| `[ti/ab]` | `glosa[ti/ab]` | Title or abstract |
| `[mh]` | `Diabetes Mellitus, Type 2[mh]` | MeSH term (controlled vocab) |
| `[pt]` | `randomized controlled trial[pt]` | Publication type |
| `[dp]` | `2020:2026[dp]` | Date published range |
| `[la]` | `english[la]` | Language |
| `[au]` | `Smith J[au]` | Author |

Combine with `AND` / `OR` / `NOT` (uppercase). Wrap multi-word phrases in quotes.

**Good query:**
```
("retinopathy of prematurity"[mh] OR ROP[ti/ab]) AND bevacizumab[ti/ab] AND 2018:2026[dp] AND english[la]
```

**Bad query:** `bevacizumab in babies` — no field tags, no MeSH, vague.

### 5. Default output format (cite back to the user)

For every result the agent presents, format as:

```
[1] Author1, Author2, et al. Title. Journal. Year;Volume(Issue):pages. PMID: 12345678. doi:10.xxx/yyy
```

When defending a clinical decision in a glosa or audit, prefer in this order: **Cochrane reviews → systematic reviews → RCTs → cohort studies → case series**. Filter accordingly with `[pt]`.

### 6. Save citations for downstream use

Write retrieved citations to `references.json` in the calling skill's working directory so `grant-review`, `hospital-devolucion-audit`, or `medical-invoice-medical-audit` can include them in their final outputs.

## Pitfalls

- **Síntoma:** `esearchresult.count = 0`. **Causa:** Over-restrictive query (too many `AND`, narrow `[dp]`, wrong MeSH). **Fix:** Drop one constraint at a time. Try without `[mh]` first — MeSH curation lags 6–12 months for recent papers.

- **Síntoma:** HTTP 429 / "API rate limit exceeded". **Causa:** > 3 req/s without an API key. **Fix:** Set `NCBI_API_KEY` (free), or `sleep 0.4` between calls.

- **Síntoma:** Abstract returned as `[Abstract not available]`. **Causa:** Some entries (letters, editorials, very old papers) have no abstract. **Fix:** Check `pubtype` from `esummary` and skip non-research types when summarizing for clinical evidence.

- **Síntoma:** Results dominated by review articles when an RCT was wanted. **Causa:** Default `sort=relevance` favors heavily-cited reviews. **Fix:** Add `randomized controlled trial[pt]` and switch `sort=date` if recency matters.

- **Síntoma:** Retrieved a paper from a predatory journal. **Causa:** PubMed indexes some questionable journals via PubMed Central. **Fix:** Filter `[medline]` (`medline[sb]`) — only MEDLINE-indexed journals pass NLM quality review. Or check the journal in DOAJ / Beall's list before citing.

- **Síntoma:** Spanish/Portuguese paper missing. **Causa:** Many LATAM journals are not in MEDLINE. **Fix:** Acknowledge the gap and check SciELO (https://search.scielo.org) manually — out of scope for this skill.

## Verification

- Output expected: a JSON array of citations, each with `pmid`, `title`, `authors`, `journal`, `year`, `doi`, `abstract` (when requested).
- Validation command:
  ```bash
  curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cancer&retmax=1&retmode=json" | jq '.esearchresult.idlist | length'
  ```
  Should print `1`.
- Sanity check on every citation: the URL `https://pubmed.ncbi.nlm.nih.gov/<pmid>/` resolves with HTTP 200.

## References

- E-utilities reference: https://www.ncbi.nlm.nih.gov/books/NBK25500/
- PubMed search field tags: https://pubmed.ncbi.nlm.nih.gov/help/#search-tags
- MeSH browser: https://www.ncbi.nlm.nih.gov/mesh
- API key registration: https://www.ncbi.nlm.nih.gov/account/
