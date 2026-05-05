---
name: gpc-minsalud-lookup
description: Locate, retrieve, and cite Colombian Guías de Práctica Clínica (GPC) published by MinSalud and IETS to back clinical decisions, glosas responses, and medical audit arguments. Use it when the user asks "¿qué dice la GPC sobre X?", needs to defend or attack a clinical decision in an EPS-IPS audit, validate a treatment against the standard of care in Colombia, or cite a specific GPC recommendation by number. Equivalent to NICE/NCCN/ADA guideline lookup, but for Colombia.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, colombia, minsalud, gpc, iets, audit, clinical-guidelines, evidence]
    category: medical-research
    requires_toolsets: [terminal, web]
---

# gpc-minsalud-lookup

Wraps the official Colombian clinical guideline catalog — **GPC del Ministerio de Salud y Protección Social**, developed by IETS (Instituto de Evaluación Tecnológica en Salud) — to retrieve recommendations by topic, ID, or clinical condition. The catalog lives at https://gpc.minsalud.gov.co and at https://www.iets.org.co/guias-de-practica-clinica/.

This is the local counterpart to OpenClaw's NICE/NCCN/ADA guideline tools. Unlike them, GPC are the **legally binding standard of care** in Colombia for the conditions they cover — Anexo Técnico de la Resolución 5926/2014 makes adherence enforceable, and audits routinely cite GPC recommendation numbers as the basis for accepting or rejecting a glosa.

## When to Use

- **Defending a glosa response** in `hospital-devolucion-audit` — cite GPC recommendation X.Y.Z as the standard the IPS followed.
- **Attacking clinical pertinence** in `medical-invoice-medical-audit` — show the IPS did NOT follow GPC X recommendation Y.
- The user asks: "¿qué dice la GPC de [condición]?", "¿cuál es la guía colombiana para [tratamiento]?", "give me the recommendation for HTA in adults".
- Auditing a clinical decision — was the diagnostic workup, treatment escalation, or follow-up consistent with the published GPC?
- Building a clinical algorithm or decision tree — GPC algorithms are the canonical Colombian source.
- Drafting a grant or research proposal that needs to position itself relative to current Colombian standard of care.

**Do not use:**
- For US/EU guidelines (NICE, NCCN, ADA, AHA/ACC, ESC, WHO) — different tooling, different evidence-grading systems.
- For pharmacoeconomic studies — IETS publishes those separately under "Evaluaciones de Tecnologías".
- For drug labels (registro INVIMA) — search the INVIMA Vademécum instead.
- When the condition has no published GPC — most rare diseases, many surgical specialties. The skill must declare absence honestly, not invent.

## Procedure

The catalog is small (~80 published GPC). The skill works by **search → fetch → cite**.

### 1. Search the catalog index

The GPC index is published as HTML at https://gpc.minsalud.gov.co. There is no public JSON API, so use `curl + grep` or `WebFetch` against the IETS catalog page:

```bash
curl -sL "https://www.iets.org.co/guias-de-practica-clinica/" \
  -A "Mozilla/5.0 (compatible; ArkangelSkills/1.0; +https://arkangel.ai)" \
  > /tmp/gpc-index.html
```

Then grep for the condition keyword in Spanish (always Spanish — these documents are Spanish-only):

```bash
grep -iE "(diabetes|hipertensión|asma|epoc|preeclampsia)" /tmp/gpc-index.html
```

Keep a local cache at `references/gpc-index.json` (see `references/` in this skill folder once populated) listing each guideline with: `id`, `title`, `version`, `year`, `topic_keywords`, `pdf_url`, `summary_url`.

### 2. Identify the right GPC

Each GPC has a **GPC ID** (e.g. "GPC-2013-13" for hipertensión arterial), a **versión completa** PDF, a **versión para profesionales** (concise), and a **versión para pacientes**. For audit work, always use the **versión completa** — it has the numbered recommendations with evidence grading.

### 3. Fetch the document

```bash
curl -sL "<pdf_url>" -o /tmp/gpc-<id>.pdf
```

Then convert to text using the `markitdown` skill in this same repo:

```bash
markitdown /tmp/gpc-<id>.pdf > /tmp/gpc-<id>.md
```

### 4. Locate the relevant recommendation

Recommendations are numbered hierarchically (e.g. `Recomendación 4.2.1`) and graded by **GRADE**:
- **Strength:** Fuerte a favor / Débil a favor / Débil en contra / Fuerte en contra.
- **Quality of evidence:** Alta / Moderada / Baja / Muy baja.

Search the markdown:

```bash
grep -nE "Recomendación [0-9]+\.[0-9]+" /tmp/gpc-<id>.md
```

Read 5–10 lines around each match to extract the full text + grading.

### 5. Cite back to the upstream skill

Always cite a GPC recommendation in this exact format so downstream consumers (audit reports, glosas, judicial responses) can validate it:

```
GPC <id> (MinSalud/IETS, <year>), Recomendación <number>:
"<full text of the recommendation>"
Fuerza: <fuerte|débil> <a favor|en contra>. Calidad de la evidencia: <alta|moderada|baja|muy baja>.
Fuente: <pdf_url>#page=<n>
```

### 6. When no GPC exists

If the condition has no published Colombian GPC, the skill must:
1. Say so explicitly: "No hay GPC colombiana publicada para [condición] al [date]."
2. Suggest nearest alternatives: a regional consensus document, an Asociación Colombiana de [especialidad] position paper, or a relevant international guideline that has been adopted by Colombian societies.
3. **Never** fabricate a GPC ID or recommendation number.

## Pitfalls

- **Síntoma:** Cited "Recomendación 4.2" but it doesn't exist in the PDF. **Causa:** Different GPC versions renumber recommendations. **Fix:** Always cite with the GPC version/year and verify the recommendation exists by direct text search before quoting it.

- **Síntoma:** Quoted a "GPC" that turns out to be an Asociación Colombiana de [X] consensus, not an official MinSalud GPC. **Causa:** Confusing terminology — "guía" is overloaded. **Fix:** Only documents listed at https://gpc.minsalud.gov.co count as official GPC. Society consensuses are weaker evidence and should be labeled as such.

- **Síntoma:** Recommendation cited has been **superseded** by a newer GPC version. **Causa:** Some GPC have been updated (e.g. HTA 2013 → 2017 update). **Fix:** Always use the most recent published version. Check the IETS catalog for "actualización" entries.

- **Síntoma:** GPC PDF has scanned pages and `markitdown` returns garbage. **Causa:** Older GPC are scanned, not native text. **Fix:** Use `markitdown` with OCR enabled, or use the IETS website's HTML "resumen ejecutivo" view as a fallback.

- **Síntoma:** PDF download blocked / 403. **Causa:** Some IETS endpoints require a `Referer` header. **Fix:** Add `-H "Referer: https://www.iets.org.co/"` to the `curl` call.

- **Síntoma:** Recommendation cited as "Fuerte a favor" but the audit reviewer rejects it. **Causa:** Strength of recommendation ≠ legal mandatoriness. Even strong recommendations have exceptions. **Fix:** Read the **considerations / población diana** section of the recommendation, not just the bullet — patient-specific exclusions matter.

## Verification

- Output expected: a structured citation matching the format in step 5, with a working `pdf_url#page=N` link.
- Validation: open the PDF link in a browser, jump to the cited page, confirm the recommendation text matches.
- Cross-check: the GPC ID resolves at https://gpc.minsalud.gov.co/ → buscador.

## References

- Catalog (MinSalud): https://gpc.minsalud.gov.co
- Catalog (IETS): https://www.iets.org.co/guias-de-practica-clinica/
- GRADE methodology: https://www.gradeworkinggroup.org
- Resolución 5926 de 2014 (mandatoriness of GPC in audits): MinSalud
