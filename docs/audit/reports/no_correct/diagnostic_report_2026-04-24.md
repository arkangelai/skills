# Diagnostic Report: 100% Audit Rejection Rate

**Date:** 2026-04-24
**Author:** Audit Pipeline Diagnostic Session
**Scope:** All test invoices processed through the Salmona medical audit pipeline
**Purpose:** Document root causes and agreed design principles for pipeline calibration. This report is intended for a no-context agent that will implement the fixes in the skills repository.

---

## 1. System Overview

### 1.1 What Salmona Does

Salmona is an AI agent pipeline that audits Colombian medical invoices in the EPS-IPS (health insurance-provider) system. When a hospital (IPS) sends an invoice to an insurance company (EPS), Salmona runs an automated audit to determine whether the invoice should be paid, returned for corrections, or rejected.

### 1.2 Pipeline Architecture

One agent executes four sequential skills as separate tasks:

| Step | Skill | Instrument | Rules | Question Answered |
|------|-------|-----------|-------|-------------------|
| 1 | `medical-invoice-admin-audit` | DAMA-UK | A01-A27 (27 rules) | Is the expediente formally complete and consistent enough to be paid? |
| 2 | `medical-invoice-medical-audit` | PERT-CLIN | M01-M29 (29 rules) | Was what was billed clinically necessary, appropriate, and documented per the GPC? |
| 3 | `medical-invoice-financial-audit` | FIN-CTR | F01-F42 (42 rules) | Does the billed amount match the contract and the applicable tariff manual? Are there fraud indicators? |
| 4 | `medical-invoice-consolidator-audit` | (merge) | N/A | Combine findings, assign causales, determine final verdict |

Each audit skill runs independently. The agent does not see results from other skills while executing one. The consolidator reads all three outputs and produces the final `output.json`.

### 1.3 Skill Repository Location

All skills live in: `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/`

Subdirectories:
- `medical-invoice-admin-audit/` — SKILL.md, checklist_base.json, checklist_base.md, checklist_soat_base.json
- `medical-invoice-medical-audit/` — SKILL.md, checklist_base.json, checklist_base.md, guias-clinicas/
- `medical-invoice-financial-audit/` — SKILL.md, checklist_base.json, checklist_base.md, planes/, tarifarios/
- `medical-invoice-consolidator-audit/` — SKILL.md, output.md
- `medical-invoice-gmail-intake/` — SKILL.md, metadata_input.json, input.md
- `medical-invoice-fix-review/` — SKILL.md
- `medical-invoice-claim-denial-generator/` — SKILL.md
- `medical-invoice-claim-denial-gmail-sender/` — SKILL.md

### 1.4 Reference Data in Skills

**Clinical guidelines** (`medical-invoice-medical-audit/guias-clinicas/`):
- INDEX.md maps CIE-10 prefixes to GPC files (e.g., I48.* -> GPC_arritmias.md)
- 6 GPCs available: hypertension, coronary syndrome, arrhythmias, heart failure, respiratory ICU, obstetric
- If diagnosis has no matching GPC, M04 becomes n/a and the case should escalate

**Tariff sheets** (`medical-invoice-financial-audit/tarifarios/`):
- INDEX.md defines precedence: contract-specific (1) > ISS 2001 (2) > SOAT (3)
- 3 CSV files: tarifario_contrato_eps_2026.csv, tarifario_iss_2001.csv, tarifario_soat_2026.csv
- Columns: CODIGO_CUPS, DESCRIPCION, TARIFA_COP, UNIDAD, MODALIDAD, NOTAS

**Affiliate plans** (`medical-invoice-financial-audit/planes/`):
- INDEX.md routes plan_id (ORO/PLATA/BASICO) to plan file
- 3 plan files with coverages, exclusions, caps, carency periods, copays

### 1.5 Input Structure

The `metadata_input.json` template (from gmail-intake) has 8 fields:
```json
{
  "caso_id": null,
  "fecha_radicacion": null,
  "num_factura": null,
  "prestador_nit": null,
  "prestador_nombre": null,
  "pagador_nit": null,
  "pagador_nombre": null,
  "documentos": []
}
```

The `documentos` field is a **flat string array** of filenames (e.g., `["factura.pdf", "epicrisis.pdf"]`). It does NOT carry document type classification. The gmail-intake skill classifies documents with `doc_type` labels in its own output (`archivos_radicados[].doc_type`), but this classification is NOT written into `metadata_input.json`. The audit skills receive only bare filenames.

### 1.6 Output Structure

The consolidator produces `output.json` with three sections:
- `factura` — invoice header (num_factura, prestador, paciente, diagnostico, total_facturado)
- `hallazgos` — one object per invoiced item with hallazgo (conforme/glosa), capa, severidad, valor_objetado, valor_a_reconocer, confianza, glosa_sugerida
- `resumen` — aggregates: total_facturado, total_aprobado, total_glosado, tasa_objecion, concepto_final, accion_requerida, en_devolucion

### 1.7 Current concepto_final Decision Logic

```
Any critical rule fail, not subsanable          -> "NO_APTA"        accion: "Rechazo"
Any critical rule fail, subsanable with docs    -> "DEVOLUCION"     accion: "Complemento"
tasa_objecion == 0                              -> "APTA"           accion: null
tasa_objecion > 0, only partial glosas          -> "APTA"           accion: "Correccion"
```

Note: `ESCALAR_HUMANO` has been removed from the current model. The output is binary: APTA or NO_APTA, with `en_devolucion` as a sub-flag on NO_APTA.

---

## 2. Test Results: 100% Rejection

### 2.1 Test Data

We tested with invoices from 4 hospitals:

| Hospital | File | Invoices | All NO_APTA? |
|----------|------|----------|-------------|
| Clínica del Country | clinica_del_country.json | 16 | Yes |
| Clínica Marly | clinica_marly.json | 17 | Yes |
| Hospital San José | hospital_san_jose.json | 16 | Yes |
| Hospital ArkangelAI | hospital_arkangelai.json | 5 | Yes |
| Unknown | unknown.json | 1 | Yes |

**Total: 55 invoices. 55 NO_APTA. 0 APTA. 100% rejection rate.**

### 2.2 Most Common Rule Failures (Across All Hospitals)

These rules failed most frequently across the 55 invoices:

| Rule | Name | Layer | Severity | Failures | Root Cause |
|------|------|-------|----------|----------|------------|
| A16 | Historia clínica completa y firmada | Admin | critica | ~50/55 | Agent demands standalone HC file; epicrisis not accepted as equivalent |
| M07 | Orden médica firmada y trazable | Medical | critica | ~52/55 | No file named "orden_medica"; agent doesn't recognize authorization as containing order info |
| M09 | Orden legible y específica | Medical | mayor | ~51/55 | Same as M07 — no standalone medical order document |
| M03 | Motivo de consulta y anamnesis | Medical | critica | ~49/55 | Agent expects HC de ingreso with full anamnesis; epicrisis summary not accepted |
| M23 | Estancia justificada día a día | Medical | critica | ~50/55 | Only admission/discharge dates in epicrisis; no daily evolution notes |
| F01 | Contrato activo al momento de la atención | Financial | critica | ~46/55 | Contract document not in case files; tariff CSV exists in skill reference data but signed contract is not attached |
| A18 | Anexos técnicos y envíos | Admin | mayor | ~40/55 | Agent searches for *.xml and *rips* file patterns; ignores PDF versions |
| F03 | Anexos y otrosíes vigentes aplicados | Financial | mayor | ~43/55 | No contract annexes in case files |
| A17 | Certificado o recibido del usuario | Admin | mayor | ~42/55 | No patient delivery receipt in case files |
| A05 | Derechos vigentes | Admin | critica | ~38/55 | No BDUA certificate or affiliation verification in case files |
| F31 | Consecutivo DIAN válido y continuo | Financial | mayor | ~40/55 | Agent finds format inconsistency in invoice numbering (FV05534 vs FV-2026-05534) |
| M05 | Protocolo institucional alineado | Medical | mayor | ~36/55 | No institutional protocol document in case files |
| A21 | Tarifas conforme contrato | Admin | critica | ~36/55 | No contract document to verify against |
| A19 | Récord de anestesia (si aplica) | Admin | mayor | ~30/55 | No standalone anesthesia record for surgical cases |

### 2.3 Documents Actually Present in Test Cases

Based on the evidence strings in the audit outputs, these files were available to the agent:

**Clínica del Country (first invoice, representative):**
- `factura.txt` / `factura.pdf` — the invoice
- `epicrisis.txt` / `epicrisis.pdf` — discharge summary
- `autorizacion.txt` / `autorizacion.pdf` — EPS authorization
- `nota_quirurgica.txt` / `nota_quirurgica.pdf` — surgical note (when applicable)
- `kardex_medicamentos.txt` — medication kardex
- `consentimiento_informado.txt` — informed consent
- `metadata_input.json` — case metadata
- `tarifario_contrato_eps_2026.csv` — tariff reference (from skill directory)

**Documents NOT present (that the agent demanded):**
- Historia clínica completa (HC de ingreso + evoluciones diarias + examen físico)
- Órdenes médicas firmadas (separate physician orders)
- RIPS files (in any format — XML, JSON, or TXT)
- DIAN invoice XML (factura electrónica XML)
- BDUA/ADRES affiliation certificate
- Daily clinical evolution notes
- EPS-IPS signed contract document
- Contract annexes and otrosíes
- Patient delivery receipt (certificado de recibido)
- Anesthesia record (for surgical cases)
- Standalone diagnostic aid reports (ECG results, lab results separate from epicrisis)

### 2.4 Representative Failure Evidence (Clinica del Country, First Invoice)

**A16 (HC completa y firmada) — FAIL:**
> "El expediente aporta epicrisis.txt, nota_quirurgica.txt, kardex_medicamentos.txt, autorizacion.txt y consentimiento_informado.txt, pero no contiene historia clínica completa con ingreso, evoluciones y..."

The agent acknowledges all the clinical documents present but fails because there's no single "complete clinical history" document. The INFORMATION is partially there across multiple documents but the agent checks for the DOCUMENT.

**M07 (Orden médica firmada y trazable) — FAIL:**
> "Entre los OCR disponibles en text/ no existe orden médica independiente para ablación, ECG o amiodarona; la autorización del pagador (autorizacion.txt l.17-30) no sustituye la orden clínica firmada."

The agent correctly notes that the EPS authorization is not the same as a physician's order. However, in many Colombian hospitals, the authorization document IS the workflow artifact that replaces a standalone order. The agent doesn't know this.

**A18 (Anexos técnicos y envíos) — FAIL:**
> "La carpeta del caso no contiene archivos *.xml ni archivos con patrón *rips*; search_files sobre /root/.hermes/case-store/medical-insurance-audit/cases/RAD-20260329-FV05534 devolvió total_count 0 para *.xml"

The agent literally ran a file search for `*.xml` and `*rips*` glob patterns. The factura.pdf and any RIPS PDF would not match these patterns. This is a direct consequence of the SKILL.md using the label `invoice_xml` which the LLM interprets as a file format requirement.

**F01 (Contrato activo) — FAIL (confianza: 0.31):**
> "metadata_input.json l.2-8 y soportes del caso no incluyen contrato, otrosí ni anexo de vigencia entre Clínica del Country (NIT 860015849-4) y Compensar (NIT 860066919-7)"

The tariff reference data (tarifario_contrato_eps_2026.csv) IS available in the skill directory, proving a contractual relationship exists. But the agent fails because the signed contract PDF is not in the case files. Low confidence (0.31) correctly indicates the agent is uncertain.

### 2.5 Low-Confidence Rules (Anti-Fraud)

Several anti-fraud rules (F32-F42) consistently show very low confidence (0.2-0.4) because they require external database cross-checks that the agent cannot perform:

| Rule | Name | Typical Confidence | Why |
|------|------|-------------------|-----|
| F32 | Unicidad: mismo paciente en múltiples IPS | 0.22 | Requires cross-IPS patient database |
| F33 | No solapamiento de hospitalizaciones | 0.24 | Requires hospitalization history database |
| F34 | Servicios post-mortem | 0.33 | Requires RUAF mortality database |
| F35 | Doble cobro SOAT/EPS/ARL/plan | 0.23 | Requires ADRES cross-payer database |
| F39 | Profesional sin concurrencia imposible | 0.25 | Requires professional schedule database |
| F42 | Patrón recurrente del prestador | 0.21 | Requires provider historical analytics |

These rules are currently marked `n/a` (not fail) in most cases, which is correct. But their low confidence still contributes to the overall uncertainty of the audit.

---

## 3. Root Cause Analysis — Three Layers

### 3.1 Layer 1: Format Rigidity (Naming Bug)

**Problem:** The SKILL.md procedure step says:
> "Load each attachment from the paths listed in `documentos[]` — `invoice_xml`, `rips`, `clinical_history`, `authorization`, `epicrisis`, `operative_note`"

The labels `invoice_xml` and `rips` are **document type identifiers**, not file format requirements. But the LLM agent interprets them literally and:
1. Searches for files with `.xml` extension
2. Searches for files with `rips` in the filename
3. Ignores `factura.pdf` and any RIPS PDF because they don't match these patterns

**Evidence:** The failure string for A18 shows: `"search_files devolvió total_count 0 para *.xml"` — a glob search for XML files, not a content-based document classification.

**Compounding factor:** The `metadata_input.json.documentos` field is a flat `string[]` of filenames. The doc_type classification from gmail-intake (`archivos_radicados[].doc_type`) is NOT preserved in `metadata_input.json`. By the time the audit skills run, the type information is lost.

**Affected rules:** A10, A18, A24 (admin); multiple financial rules that reference `invoice_xml`.

### 3.2 Layer 2: Document Existence vs. Information Availability

**Problem:** The agent checks whether a specific document TYPE exists rather than whether the INFORMATION that document would contain is available anywhere in the uploaded files.

**Examples:**
- **A16 (HC completa):** Agent fails because no standalone "historia_clinica" file exists. But the epicrisis contains admission diagnosis, procedures performed, medications administered, and discharge summary. The nota quirurgica contains the surgical details. The kardex contains medication administration records. Together, these documents provide most of the clinical information that a "complete HC" would contain.
- **M07 (Orden médica):** Agent fails because no file named "orden_medica" exists. But in many Colombian hospital workflows, the EPS authorization IS the workflow artifact that triggers the procedure. The authorization document (autorizacion.txt) contains the approved services, dates, and authorization numbers.
- **M23 (Estancia justificada día a día):** Agent fails because no daily evolution notes exist. But the epicrisis contains admission and discharge dates plus a clinical summary that often implies the daily clinical trajectory.

**Root cause in SKILL.md:** The procedure step lists specific document type names that the agent looks for as files. When those files don't exist, the agent marks the corresponding rules as fail, even when the INFORMATION those rules need exists in other documents.

### 3.3 Layer 3: No Graceful Degradation

**Problem:** Every critical rule failure cascades to NO_APTA. There is no mechanism for:
1. "This information isn't in a standalone document but IS present across other documents" → should be PASS with observation
2. "This information cannot be verified because the required external system is unavailable" → should be N/A or observation, not fail
3. "The document is present in a different format than expected" → should still be evaluated

**Cascade mechanics:**
- A16 (critica) fails → admin audit concepto_final = NO_APTA or DEVOLUCION
- M07 (critica) fails → medical audit concepto_final = NO_APTA or DEVOLUCION
- F01 (critica) fails → financial audit concepto_final = NO_APTA or DEVOLUCION
- Consolidator receives three audit outputs with multiple critica fails → concepto_final = NO_APTA

Even if only ONE critical rule failed across all three layers, the invoice would be rejected. With 5-8 critical rules failing per invoice (all due to missing document types rather than actual violations), every invoice is guaranteed NO_APTA.

---

## 4. The Real-World Context

### 4.1 How Human Auditors Actually Work

In the Colombian EPS-IPS system, three human roles perform the audit:

1. **Administrative auditor:** Reviews documents and dates. Processes hundreds of invoices daily. Checks maybe 10-15 things from muscle memory: dates match, authorization present, NIT lines up, factura has the right number. If those pass, it moves forward.

2. **Medical auditor (doctor):** Looks at the diagnosis, procedures, and medications and asks: "Does this make clinical sense?" About 30 seconds of expert judgment per invoice. They don't apply 29 formal rules — they read the clinical picture.

3. **Financial/billing auditor:** Compares line items against the tariff sheet and checks the math. Looks for obvious discrepancies: wrong tariff, double billing, amounts that don't add up.

### 4.2 Key Insight from the User

> "Hospitals and insurance companies have a lot of differences depending on their company. Some only use the 'epicrisis', others use the complete medical record."

The document set that a hospital sends with an invoice varies by hospital. Some hospitals send 15 documents. Some send 3. The agent must work with whatever it receives, not demand a specific document set.

> "The auditing process is not [maximally strict] because it's a human reviewing system."

Human auditors apply a pragmatic subset of rules based on experience. The agent applies the regulatory maximum (98 rules) with no discretion. This mismatch is the core product problem.

> "A rule should only fail when the agent has EVIDENCE of a violation, not when it lacks evidence to confirm compliance."

This is the design principle that resolves the problem. Absence of evidence is not evidence of a violation. It's an observation.

---

## 5. Agreed Design Principles

These four principles were agreed upon during the diagnostic session and should guide all changes to the skill system.

### Principle 1: Information Over Documents

**Statement:** The agent evaluates whether the INFORMATION required by each rule is present anywhere in the available documents, not whether a specific document TYPE exists.

**Implication:** If an epicrisis contains admission notes, diagnosis, procedures, medications, and discharge summary, the agent should not fail A16 (HC completa) just because there's no standalone "historia_clinica" file. The clinical information is present.

**Implication for SKILL.md:** The procedure steps that say "Load `invoice_xml`, `rips`, `clinical_history`..." must be rewritten to say: "Read all documents in `documentos[]` regardless of filename or format. Classify each document by its CONTENT (what clinical/administrative/financial information it contains), not by its filename or extension."

### Principle 2: Innocent Until Proven Guilty

**Statement:** A rule only results in `fail` when the agent has positive evidence of a violation. When the agent cannot find the information needed to evaluate a rule (because the relevant document isn't present or the information isn't in any available document), the rule becomes an **observation**, not a fail.

**Implication:** The `resultado` field needs a new value or the output structure needs an `observaciones` array separate from `hallazgos`. Rules that the agent cannot verify should be flagged as observations that the human auditor can investigate, but they should NOT trigger the concepto_final cascade.

**Implication for concepto_final logic:**
```
Only rules with resultado="fail" (positive evidence of violation) count toward concepto_final.
Rules with resultado="n/a" or flagged as observations do NOT affect concepto_final.
```

### Principle 3: Evidence Layer (Step 0)

**Statement:** A new "document understanding" skill should run before the three audit skills. It reads all uploaded documents once, extracts structured facts, and produces a `case_evidence.json` that the audit skills consume alongside raw documents.

**What case_evidence.json contains:**
- List of all documents with content classification (invoice, clinical, authorization, administrative, other)
- Extracted structured facts: patient name, document number, NIT, dates (admission, discharge, service, invoice), diagnosis codes (CIE-10), procedures (CUPS codes), medications, authorization numbers, signatures found, provider names
- Cross-document consistency flags: do dates match across documents? Do patient identifiers match? Do CUPS codes in factura match procedures in clinical notes?
- Information availability map: for each audit rule category, does the evidence layer contain the information needed to evaluate it?

**Implication:** The audit skills can ask "does the evidence layer contain admission notes?" instead of "is there a file called historia_clinica?" This enables cross-document reasoning.

### Principle 4: Binary Output with Depth

**Statement:** The output remains binary for metrics: APTA or NO_APTA.

- **APTA:** All rules pass or only observations exist. Observations are readable in the detail view but don't affect the verdict.
- **NO_APTA:** Agent found positive evidence of at least one rule violation. The `en_devolucion` flag indicates whether the issue is fixable (IPS can correct and resubmit) or a hard rejection.

**Implication for metrics:** The dashboard shows three clean numbers:
- Approval rate (APTA / total)
- Devolucion rate (NO_APTA with en_devolucion=true / total)
- Hard rejection rate (NO_APTA with en_devolucion=false / total)

---

## 6. Design Rationale — Why Each Change Is Needed

This section explains the reasoning behind each change. For the exact implementation (current text, replacement text, new files), see **Appendix B**. Do not implement from this section — it is context for understanding the decisions, not an implementation guide.

### 6.1 Changes to All Three Audit Skills (SKILL.md)

**Document loading procedure (affects admin, medical, financial):**

Current (admin SKILL.md, Procedure step 1):
> "Load each attachment from the paths listed in `documentos[]` — `invoice_xml`, `rips`, `clinical_history`, `authorization`, `epicrisis`, `operative_note`"

Must be changed to:
> "Read all files listed in `documentos[]` regardless of filename or extension. Classify each file by its CONTENT to determine what type of document it is. Accept any format: PDF, XML, TXT, JSON, images. The document type labels below indicate what information to look for, not what filename or format to expect:
> - Invoice document: contains factura, NIT, CUPS line items, totals (may be PDF, XML, or text)
> - RIPS data: contains structured billing records, US/AC/AP data (may be PDF, XML, TXT, or JSON)
> - Clinical history: contains admission notes, evolution, physical exam (may be a standalone HC or distributed across epicrisis + nota quirurgica + kardex)
> - Authorization: contains EPS authorization number, approved services, dates
> - Epicrisis: contains clinical summary, diagnosis, procedures, discharge info
> - Operative note: contains surgical procedure details, team, technique"

**Rule evaluation logic (affects all three checklists):**

Current: A rule that cannot find its required document marks `resultado: "fail"`.

Must be changed to:
> "When evaluating a rule:
> 1. Search for the required INFORMATION across ALL available documents, not just one specific document type.
> 2. If the information is found in ANY document → evaluate the rule normally (pass or fail based on the evidence).
> 3. If the information is NOT found in any available document AND there is no evidence of a violation → mark as `resultado: "n/a"` with `observaciones` explaining what information was looked for and not found. This is an observation, not a finding.
> 4. A rule should only result in `resultado: "fail"` when the agent has POSITIVE EVIDENCE of a rule violation (e.g., dates don't match, NIT is wrong, tariff exceeds contract, procedure contradicts diagnosis).
> 5. 'I couldn't find document X' is NEVER sufficient evidence for `resultado: "fail"`. It is an observation."

**Confidence scoring adjustment:**

Current: `confianza < 0.75` on any critical rule forces escalation.

Since ESCALAR_HUMANO is removed, this should be:
> "When `confianza < 0.75` on any rule, the agent should still render a verdict (pass, fail, or n/a) but add an observation noting the low confidence so the human reviewer can prioritize verification."

### 6.2 Changes to Admin Audit Specifically

**A16 (HC completa y firmada):** Should pass if the clinical information required by Res. 1995/1999 can be found across the available documents (epicrisis + nota quirurgica + kardex + consentimiento), even if no single "HC completa" file exists. Fail only if critical clinical information (diagnosis, procedures, dates) is absent from ALL documents.

**A18 (Anexos técnicos y envíos):** Should NOT search for `*.xml` or `*rips*` file patterns. Should evaluate whether the technical information that RIPS/XML would contain is available in any format. If factura.pdf contains the same billing structure data, A18 evaluates that.

**A05 (Derechos vigentes):** When no BDUA certificate or affiliation document is available, this should be `n/a` with an observation, not `fail`. The agent cannot verify affiliation without the certificate or system access. Absence of the certificate is not evidence that the patient lacks coverage.

**A17 (Certificado o recibido del usuario):** Same logic as A05. If not provided, it's an observation, not a violation.

### 6.3 Changes to Medical Audit Specifically

**M07 (Orden médica firmada y trazable):** The agent should recognize that in many Colombian hospital workflows, the EPS authorization document serves as the workflow trigger for procedures. If the authorization contains the approved services with dates and authorization numbers, M07 should evaluate whether that authorization adequately documents the clinical order, not demand a separate "orden_medica" file.

**M03 (Motivo de consulta y anamnesis):** If the epicrisis contains a clinical summary with reason for admission, diagnosis, and symptoms, the agent should evaluate M03 against that content. A full intake anamnesis is ideal but not universally documented as a separate section in all hospitals.

**M23 (Estancia justificada día a día):** If only admission/discharge dates are available (no daily evolution notes), this should be an observation, not a fail. The agent cannot determine whether the stay was unjustified merely from the absence of daily notes.

**M06 (Desviación de guía justificada):** Currently coded as "always escalates." Since ESCALAR_HUMANO is removed, this should: fail if there's positive evidence of GPC deviation without justification, pass if the procedure aligns with GPC, or become an observation if the agent cannot determine alignment due to insufficient clinical documentation.

### 6.4 Changes to Financial Audit Specifically

**F01 (Contrato activo):** The existence of a contract-specific tariff file (tarifario_contrato_eps_2026.csv) in the skill's reference data is itself evidence that a contractual relationship exists between the EPS and IPS. F01 should pass with an observation noting that the signed contract document was not in the case files, rather than failing.

**F03 (Anexos y otrosíes vigentes):** Should be n/a with observation if no contract annexes are provided. Absence of annexes is not evidence that unauthorized annexes were applied.

**F32-F42 (Anti-fraud rules):** Rules that require external database cross-checks (patient history, hospitalization overlaps, mortality records, provider patterns) should be `n/a` with observation when those databases are not accessible. They should only fail when the agent has positive evidence of fraud from the available documents.

### 6.5 Changes to Consolidator

**Input handling:** The consolidator should separate `resultado: "fail"` findings (actual violations) from `resultado: "n/a"` observations when computing concepto_final.

**concepto_final logic update:**
```
Count only resultado="fail" findings toward concepto_final.
Observations (n/a with unverifiable information) are listed in the output but do NOT affect the verdict.

If zero fail findings → APTA (with observations listed separately)
If fail findings exist, all subsanable → NO_APTA with en_devolucion=true
If fail findings exist, any not subsanable → NO_APTA with en_devolucion=false
```

**Output structure update:** Add an `observaciones` array alongside `hallazgos`:
```json
{
  "hallazgos": [ /* only items with resultado="fail" or resultado="conforme" */ ],
  "observaciones": [ /* rules that couldn't be verified — flagged for human review */ ],
  "resumen": { /* concepto_final computed only from hallazgos, not observaciones */ }
}
```

### 6.6 New Skill: Document Understanding (Step 0)

A new skill should be created: `medical-invoice-document-understanding`

**Purpose:** Read all uploaded documents once, extract structured facts, classify documents by content, and produce `case_evidence.json`.

**Output schema (case_evidence.json):**
```json
{
  "meta": {
    "caso_id": "...",
    "fecha_analisis": "...",
    "documentos_analizados": ["factura.pdf", "epicrisis.pdf", "..."],
    "total_documentos": 6
  },
  "clasificacion_documentos": [
    {
      "archivo": "factura.pdf",
      "tipo_detectado": "invoice",
      "formato": "pdf",
      "confianza_clasificacion": 0.98,
      "contenido_resumido": "Factura electrónica FV-2026-05534, NIT 860015849-4, 4 items CUPS"
    }
  ],
  "hechos_extraidos": {
    "paciente": {
      "nombre": "...",
      "documento": "CC ...",
      "fuentes": ["factura.pdf p.1", "epicrisis.pdf p.1"]
    },
    "prestador": {
      "nombre": "Clínica del Country",
      "nit": "860015849-4",
      "fuentes": ["factura.pdf p.1"]
    },
    "pagador": {
      "nombre": "Compensar",
      "nit": "860066919-7",
      "fuentes": ["autorizacion.pdf p.1"]
    },
    "fechas": {
      "atencion": "2026-03-24",
      "ingreso": "2026-03-24",
      "egreso": "2026-03-26",
      "factura": "2026-03-29",
      "autorizacion": "2026-03-22",
      "fuentes_por_fecha": { "...": ["..."] }
    },
    "diagnosticos": [
      { "codigo": "I48.0", "descripcion": "Fibrilación auricular paroxística", "fuentes": ["epicrisis.pdf p.1", "factura.pdf p.1"] }
    ],
    "procedimientos": [
      { "cups": "882501", "descripcion": "Ablación por radiofrecuencia", "fuentes": ["factura.pdf p.1", "nota_quirurgica.pdf p.1"] }
    ],
    "medicamentos": [
      { "nombre": "Amiodarona", "codigo": "M01301", "fuentes": ["kardex_medicamentos.txt", "factura.pdf p.1"] }
    ],
    "autorizaciones": [
      { "numero": "AUT-2026-04412", "servicios_autorizados": ["882501", "S20202", "892100"], "vigencia": "2026-03-22 a 2026-04-22", "fuentes": ["autorizacion.pdf p.1"] }
    ],
    "firmas_encontradas": [
      { "profesional": "Dr. Alejandro Duarte Palacios", "registro": "RETHUS 12345", "documento": "nota_quirurgica.pdf", "tipo": "cirujano" }
    ]
  },
  "disponibilidad_informacion": {
    "identidad_paciente": true,
    "derechos_afiliacion": false,
    "autorizacion_eps": true,
    "historia_clinica_ingreso": false,
    "evolucion_diaria": false,
    "epicrisis": true,
    "nota_quirurgica": true,
    "ordenes_medicas": false,
    "kardex_medicamentos": true,
    "consentimiento_informado": true,
    "record_anestesia": false,
    "rips_estructurado": false,
    "factura_electronica_xml": false,
    "factura_pdf": true,
    "certificado_afiliacion": false,
    "contrato_eps_ips": false,
    "resultados_ayudas_diagnosticas": false
  },
  "consistencia_cruzada": {
    "paciente_coincide": true,
    "fechas_coherentes": true,
    "diagnostico_coherente": true,
    "cups_factura_vs_clinico": true,
    "nit_factura_vs_autorizacion": true,
    "inconsistencias_detectadas": []
  }
}
```

This evidence layer enables the audit skills to:
1. Know what information is available before running rules
2. Cite cross-document evidence (e.g., "diagnosis confirmed in epicrisis.pdf p.1 AND factura.pdf p.1")
3. Correctly mark rules as observations when the required information isn't available
4. Avoid searching for documents by filename/extension

---

## 7. Expected Impact

If these changes are implemented:

**Before (current state):**
- 55/55 invoices → NO_APTA (100% rejection)
- ~5-8 critical rule failures per invoice, mostly from missing document types
- Agent searches for XML files, ignores PDFs
- Every missing document = hard fail

**After (projected):**
- Rules that currently fail due to "document not found" → become observations (~60% of current failures)
- Rules that currently fail due to format mismatch → evaluate correctly against PDFs (~15% of current failures)
- Rules that genuinely find violations → remain as fails (~10-15% of current findings)
- Rules that find no violation → pass (~remaining)
- Projected approval rate: 30-60% APTA (with observations), 20-40% NO_APTA with devolucion, 10-20% hard NO_APTA

These projections assume the test data represents invoices with minor real issues. The exact rates depend on the quality of the hospital documentation.

---

## 8. Implementation Priority

1. **HIGHEST:** Fix format rigidity in all three SKILL.md files (Layer 1). This is a text change in the procedure steps. Unblocks PDF evaluation immediately.
2. **HIGH:** Add the "innocent until proven guilty" rule evaluation logic to all three checklist_base.md files (Layer 2). Changes how resultado is assigned.
3. **HIGH:** Create the document understanding skill (Step 0) with case_evidence.json output.
4. **MEDIUM:** Update consolidator to separate hallazgos from observaciones and recompute concepto_final logic.
5. **MEDIUM:** Update specific rules (A16, M07, M03, M23, F01) with cross-document evaluation guidance.
6. **LOW:** Update metadata_input.json schema to preserve doc_type classification from intake.

---

## 9. Chosen Approach: Evidence Layer + Prompt Fixes (Approach B)

### 9.1 Approaches Considered

**Approach A: Prompt Surgery (Minimal Viable)** — Edit only SKILL.md and checklist_base.md text. No new skills, no schema changes. Completeness: 5/10. Rejected because without a shared evidence layer, each skill still independently guesses at document classification, which is exactly the problem causing the XML/PDF confusion.

**Approach B: Evidence Layer + Prompt Fixes (Chosen)** — Create new Step 0 document understanding skill producing `case_evidence.json`. Update all three SKILL.md files for format-agnostic loading and "innocent until proven guilty" logic. Update consolidator to separate hallazgos from observaciones. Completeness: 9/10.

**Approach C: Configurable Rule Profiles (Deferred)** — Same as B plus per-EPS rule profiles defining which rules are mandatory vs. observation-only. Completeness: 10/10. Deferred because premature without a second EPS client with different standards. Can be layered on top of B later.

### 9.2 Implementation Sequence for Approach B

**Step 1: Create `medical-invoice-document-understanding` skill**
- New directory: `medical-invoice-document-understanding/`
- Files: SKILL.md, output_schema.json
- Reads all documents in the case, extracts structured facts, produces `case_evidence.json`
- Must run BEFORE the three audit skills in the pipeline

**Step 2: Update `medical-invoice-admin-audit/SKILL.md`**
- Rewrite Procedure step 1 (document loading) for format-agnostic content-based classification
- Add instruction to consume `case_evidence.json` from Step 0
- Update rule evaluation logic: fail only on positive evidence of violation; absence = observation
- Specific rule updates: A16, A18, A05, A17 (see Section 6.2)

**Step 3: Update `medical-invoice-admin-audit/checklist_base.md`**
- Add "innocent until proven guilty" evaluation framework
- Update evidence format to support cross-document citations
- Update concepto_final logic to exclude observations

**Step 4: Update `medical-invoice-medical-audit/SKILL.md`**
- Same format-agnostic loading as admin
- Add instruction to consume `case_evidence.json`
- Specific rule updates: M07, M03, M23, M06 (see Section 6.3)

**Step 5: Update `medical-invoice-medical-audit/checklist_base.md`**
- Same "innocent until proven guilty" framework
- Update M06 to not force escalation (ESCALAR_HUMANO removed)

**Step 6: Update `medical-invoice-financial-audit/SKILL.md`**
- Same format-agnostic loading
- Add instruction to consume `case_evidence.json`
- Specific rule updates: F01, F03, F32-F42 (see Section 6.4)

**Step 7: Update `medical-invoice-financial-audit/checklist_base.md`**
- Same framework updates
- Anti-fraud rules default to n/a when external databases unavailable

**Step 8: Update `medical-invoice-consolidator-audit/SKILL.md` and `output.md`**
- Add `observaciones` array to output schema
- Update concepto_final logic: only `resultado="fail"` counts toward verdict
- Update hallazgos to only contain conformes and actual glosas

**Step 9: Test with existing data**
- Re-run the pipeline against the same 55 invoices
- Compare rejection rates before/after
- Verify observations appear correctly in output

---

## Appendix A: File Paths Referenced

### Skills Repository
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-admin-audit/SKILL.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-admin-audit/checklist_base.json`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-admin-audit/checklist_base.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-medical-audit/SKILL.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-medical-audit/checklist_base.json`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-medical-audit/checklist_base.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-medical-audit/guias-clinicas/INDEX.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-financial-audit/SKILL.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-financial-audit/checklist_base.json`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-financial-audit/checklist_base.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-financial-audit/tarifarios/INDEX.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-financial-audit/planes/INDEX.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-consolidator-audit/SKILL.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-consolidator-audit/output.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-gmail-intake/SKILL.md`
- `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/medical-invoice-gmail-intake/metadata_input.json`

### Test Data
- `/Users/arkangelai/conductor/workspaces/salmona-api/kyiv/docs/audit/reports/no_correct/data/clinica_del_country.json` (16 invoices)
- `/Users/arkangelai/conductor/workspaces/salmona-api/kyiv/docs/audit/reports/no_correct/data/clinica_marly.json` (17 invoices)
- `/Users/arkangelai/conductor/workspaces/salmona-api/kyiv/docs/audit/reports/no_correct/data/hospital_san_jose.json` (16 invoices)
- `/Users/arkangelai/conductor/workspaces/salmona-api/kyiv/docs/audit/reports/no_correct/data/hospital_arkangelai.json` (5 invoices)
- `/Users/arkangelai/conductor/workspaces/salmona-api/kyiv/docs/audit/reports/no_correct/data/unknown.json` (1 invoice)

### Process Documentation
- `/Users/arkangelai/conductor/workspaces/salmona-api/kyiv/docs/audit/process_2026-04-24.md`

---

## Appendix B: Implementation Guide — Exact Changes Per File

This appendix provides the exact text that must be changed in each skill file. An implementing agent should read each file, locate the CURRENT text, and replace it with the NEW text. All files are in `/Users/arkangelai/Documents/ArkangelAI/Repos/skills/medical-insurance-audit/`.

---

### B.1 New Skill: `medical-invoice-document-understanding/SKILL.md`

Create this file from scratch at `medical-invoice-document-understanding/SKILL.md`:

```markdown
---
name: medical-invoice-document-understanding
description: Reads all uploaded documents for a medical invoice case, classifies each by content (not filename), extracts structured facts (patient, provider, payer, dates, diagnoses, procedures, medications, signatures, authorizations), checks cross-document consistency, and produces case_evidence.json. This is Step 0 of the audit pipeline — it runs BEFORE the admin, medical, and financial audit skills. Use it when the orchestrator begins audit processing on a new or reprocessed case.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [medical, audit, document-understanding, evidence, colombia, eps]
    category: medical-insurance-audit
    requires_toolsets: [terminal]
---

# medical-invoice-document-understanding

Step 0 of the audit pipeline. Reads all uploaded case documents once, extracts structured facts, and produces `case_evidence.json` for downstream audit skills.

The question it answers: **what information is available in this case, what documents contain it, and are the documents internally consistent?**

## When to Use

- The orchestrator begins audit processing on a queued case (BEFORE admin/medical/financial audit skills).
- A case is reprocessed after the IPS submits additional documents.
- The user asks "re-analyze the documents for case {RAD}".

**Do not use:** if audit skills have already completed and no new documents were added.

## Input Contract

**Template:** same `metadata_input.json` shape — 8 flat fields including `documentos[]` (array of filenames in the working directory).

Reads every file listed in `documentos[]` from the working directory. Also scans the working directory for any files NOT listed in `documentos[]` (in case the intake missed listing some attachments).

## Output Contract

Produces `case_evidence.json` in the working directory. This file is consumed by the three audit skills alongside the raw documents.

### Schema: case_evidence.json

```json
{
  "meta": {
    "caso_id": "RAD-YYYYMMDD-NNNNN",
    "fecha_analisis": "ISO-8601 timestamp",
    "documentos_analizados": ["factura.pdf", "epicrisis.pdf", "..."],
    "total_documentos": 6,
    "agente": "agente-document-understanding-v1"
  },
  "clasificacion_documentos": [
    {
      "archivo": "factura.pdf",
      "tipo_detectado": "invoice | rips | clinical_history | epicrisis | authorization | operative_note | medication_kardex | informed_consent | anesthesia_record | lab_results | diagnostic_aid | contract | other",
      "formato": "pdf | xml | txt | json | image",
      "confianza_clasificacion": 0.98,
      "contenido_resumido": "One-sentence description of what this document contains"
    }
  ],
  "hechos_extraidos": {
    "paciente": {
      "nombre": "string or null",
      "tipo_documento": "CC | TI | CE | PA | null",
      "numero_documento": "string or null",
      "fuentes": ["file p.N where found"]
    },
    "prestador": {
      "nombre": "string or null",
      "nit": "string or null",
      "fuentes": ["file p.N"]
    },
    "pagador": {
      "nombre": "string or null",
      "nit": "string or null",
      "fuentes": ["file p.N"]
    },
    "fechas": {
      "atencion": "YYYY-MM-DD or null",
      "ingreso": "YYYY-MM-DD or null",
      "egreso": "YYYY-MM-DD or null",
      "factura": "YYYY-MM-DD or null",
      "autorizacion": "YYYY-MM-DD or null",
      "radicacion": "YYYY-MM-DD or null",
      "fuentes_por_fecha": {
        "atencion": ["epicrisis.pdf p.1"],
        "ingreso": ["epicrisis.pdf p.1", "factura.pdf p.1"]
      }
    },
    "diagnosticos": [
      {
        "codigo_cie10": "I48.0",
        "descripcion": "Fibrilación auricular paroxística",
        "tipo": "principal | secundario",
        "fuentes": ["epicrisis.pdf p.1", "factura.pdf p.1"]
      }
    ],
    "procedimientos": [
      {
        "codigo_cups": "882501",
        "descripcion": "Ablación por radiofrecuencia de arritmia",
        "fecha": "YYYY-MM-DD or null",
        "profesional": "name or null",
        "registro_profesional": "RETHUS number or null",
        "fuentes": ["nota_quirurgica.pdf p.1", "factura.pdf p.1"]
      }
    ],
    "medicamentos": [
      {
        "nombre": "Amiodarona",
        "codigo_cum": "M01301 or null",
        "dosis": "200 mg or null",
        "via": "IV or null",
        "frecuencia": "c/8h or null",
        "fuentes": ["kardex_medicamentos.txt l.15", "factura.pdf p.1"]
      }
    ],
    "autorizaciones": [
      {
        "numero": "AUT-2026-04412",
        "servicios_autorizados": ["882501", "S20202", "892100"],
        "vigencia_desde": "YYYY-MM-DD or null",
        "vigencia_hasta": "YYYY-MM-DD or null",
        "fuentes": ["autorizacion.pdf p.1"]
      }
    ],
    "firmas_encontradas": [
      {
        "profesional": "Dr. Alejandro Duarte Palacios",
        "registro": "RETHUS 12345 or null",
        "documento": "nota_quirurgica.pdf",
        "tipo": "cirujano | anestesiologo | medico_tratante | enfermero | otro",
        "pagina": "p.2"
      }
    ],
    "factura_items": [
      {
        "item": 1,
        "codigo_cups": "882501",
        "descripcion": "Ablación por radiofrecuencia",
        "cantidad": 1,
        "valor_unitario": 8950000,
        "valor_total": 8950000,
        "fuente": "factura.pdf p.1 l.25"
      }
    ],
    "totales_factura": {
      "total_facturado": 9259800,
      "subtotal": null,
      "descuentos": null,
      "copago_recaudado": null,
      "fuente": "factura.pdf p.1 l.37"
    }
  },
  "disponibilidad_informacion": {
    "identidad_paciente": true,
    "derechos_afiliacion_certificado": false,
    "autorizacion_eps": true,
    "notas_ingreso": false,
    "evolucion_diaria": false,
    "epicrisis": true,
    "nota_quirurgica": true,
    "ordenes_medicas_standalone": false,
    "kardex_medicamentos": true,
    "consentimiento_informado": true,
    "record_anestesia": false,
    "rips_estructurado": false,
    "factura_electronica_xml": false,
    "factura_pdf_o_texto": true,
    "contrato_eps_ips": false,
    "resultados_ayudas_diagnosticas_standalone": false,
    "certificado_recibido_usuario": false
  },
  "consistencia_cruzada": {
    "paciente_coincide_todos_docs": true,
    "fechas_coherentes": true,
    "diagnostico_coherente_factura_vs_clinico": true,
    "cups_factura_vs_procedimientos_clinicos": true,
    "nit_factura_vs_autorizacion": true,
    "inconsistencias_detectadas": [
      {
        "tipo": "fecha | identidad | diagnostico | cups | nit | monto",
        "descripcion": "string describing the inconsistency",
        "documentos_involucrados": ["factura.pdf p.1", "epicrisis.pdf p.1"],
        "severidad": "critica | mayor | menor"
      }
    ]
  }
}
```

### Field Rules

- **`clasificacion_documentos`**: Classify each file by reading its CONTENT, not by its filename or extension. A file named `factura.pdf` might contain an epicrisis if mislabeled. Read the first pages and classify based on what the document actually contains.
- **`hechos_extraidos`**: Extract facts with traceable citations. Every extracted fact must include `fuentes` listing exactly where in which document the fact was found. Use format `"file p.N"` for PDF pages or `"file l.N"` for text file lines.
- **`disponibilidad_informacion`**: Boolean map. `true` means the information IS present somewhere in the available documents (even if distributed across multiple files). `false` means the information was searched for and not found. This map is the primary input for audit skills to determine whether a rule can be evaluated or must become an observation.
- **`consistencia_cruzada`**: Cross-reference key facts across documents. Inconsistencies found here become direct findings for the audit skills (e.g., patient ID mismatch = A04 fail with positive evidence).

## Procedure

1. **Read metadata_input.json** to get `caso_id`, `documentos[]`, and any available metadata.

2. **Scan the working directory** for all readable files. Include files NOT listed in `documentos[]` if they exist.

3. **For each file, classify by content:**
   - Read the first 2-3 pages (PDF) or first 200 lines (text/JSON/XML).
   - Determine `tipo_detectado` based on content signals:
     - **invoice**: contains "factura", NIT, CUPS line items, totals, resolution DIAN
     - **rips**: contains structured US/AC/AP records, or RIPS-format billing data
     - **clinical_history**: contains anamnesis, physical examination, daily evolution notes
     - **epicrisis**: contains discharge summary, admission/discharge dates, clinical trajectory
     - **authorization**: contains authorization number, approved services, EPS approval
     - **operative_note**: contains surgical procedure description, surgical team, technique, anesthesia type
     - **medication_kardex**: contains medication administration records with timestamps
     - **informed_consent**: contains patient consent for procedures
     - **anesthesia_record**: contains anesthesia monitoring, dosing, vitals during procedure
     - **lab_results**: contains laboratory values, imaging reports
     - **diagnostic_aid**: contains ECG results, imaging interpretations
     - **contract**: contains EPS-IPS contractual terms, tariff references
     - **other**: does not match any of the above
   - A file may contain MULTIPLE types of information (e.g., an epicrisis that includes medication lists). Classify by PRIMARY content but note secondary content in `contenido_resumido`.

4. **Extract structured facts** from all documents. For each fact category in `hechos_extraidos`, search ALL documents (not just the "expected" document type). A patient name might appear in the factura, epicrisis, authorization, and operative note — cite all sources.

5. **Build the `disponibilidad_informacion` map.** For each boolean field, determine whether the information exists in ANY document:
   - `notas_ingreso`: true if any document contains admission notes with anamnesis and physical exam (may be part of epicrisis or clinical history)
   - `evolucion_diaria`: true if any document contains day-by-day clinical progression notes
   - `ordenes_medicas_standalone`: true if there's a dedicated physician order document. Note: even if `false`, the authorization document may contain equivalent order information — downstream audit skills will evaluate this.
   - `rips_estructurado`: true if any document contains structured RIPS data in any format (XML, JSON, TXT, or PDF tables)
   - `factura_electronica_xml`: true if there's a DIAN-format XML electronic invoice (not just a PDF)

6. **Run cross-document consistency checks.** Compare key facts across all documents where they appear:
   - Patient identity: name and document number must match across all documents
   - Dates: admission/discharge/service/invoice dates must be chronologically coherent
   - Diagnosis: CIE-10 codes in factura must match clinical documents
   - CUPS: procedures in factura must appear in clinical documentation
   - NIT: provider NIT in factura must match other documents
   - Record inconsistencies in `consistencia_cruzada.inconsistencias_detectadas`

7. **Write `case_evidence.json`** to the working directory. This file is consumed by all three downstream audit skills.

## Pitfalls

- **Symptom:** OCR text is garbled for scanned PDFs. **Fix:** Note low confidence on the classification and flag in `contenido_resumido`: "OCR quality: low — extracted text may be unreliable."
- **Symptom:** A single PDF contains multiple document types (e.g., HC + epicrisis + operative note combined). **Fix:** Classify as the primary type but list all information types found in `contenido_resumido`. Set availability flags for ALL information found, regardless of which file contains it.
- **Symptom:** `documentos[]` is empty but files exist in the working directory. **Fix:** Scan the directory directly; don't rely solely on the `documentos[]` array.

## Verification

- `case_evidence.json` exists in the working directory.
- Every file in the working directory is listed in `clasificacion_documentos`.
- `disponibilidad_informacion` has a boolean value for every field (no nulls).
- Every fact in `hechos_extraidos` has at least one entry in `fuentes`.
- `consistencia_cruzada` has been evaluated (even if no inconsistencies found).
```

---

### B.2 Changes to `medical-invoice-admin-audit/SKILL.md`

**CHANGE 1 — Procedure Step 1 (Document Loading)**

CURRENT TEXT (line ~93-94):
```
1. **Load inputs from the working directory.**
   - Read `metadata_input.json` to get `ips_nit`, `invoice_number`, `service_date`, `patient_document`, `documentos[]`, `cups_principales[]`.
   - Load each attachment from the paths listed in `documentos[]` — `invoice_xml`, `rips`, `clinical_history`, `authorization`, `epicrisis`, `operative_note` (if applicable given the CUPS).
```

REPLACE WITH:
```
1. **Load inputs from the working directory.**
   - Read `metadata_input.json` to get `ips_nit`, `invoice_number`, `service_date`, `patient_document`, `documentos[]`, `cups_principales[]`.
   - Read `case_evidence.json` (produced by the document-understanding skill in Step 0). This file contains:
     - `clasificacion_documentos`: what each file actually contains (classified by content, not filename)
     - `hechos_extraidos`: structured facts extracted from all documents (patient, dates, diagnoses, procedures, medications, signatures)
     - `disponibilidad_informacion`: boolean map of what information is available across all documents
     - `consistencia_cruzada`: cross-document consistency check results
   - Load all files listed in `documentos[]` from the working directory. Accept ANY file format (PDF, XML, TXT, JSON, images). Do NOT search for files by extension or filename pattern. Use `case_evidence.json.clasificacion_documentos` to understand what each file contains.
   - If `case_evidence.json` is not present, fall back to reading all files in `documentos[]` directly and classifying them by content (read first pages, determine document type from content signals, not filename).
```

**CHANGE 2 — Rule Evaluation Logic (resultado assignment)**

CURRENT TEXT (line ~102):
```
   - **`resultado`**: `"pass"` · `"fail"` · `"n/a"` — use `"n/a"` only when the rule structurally does not apply to this service type (e.g. A14 ambulance transport for a case with no transport).
```

REPLACE WITH:
```
   - **`resultado`**: `"pass"` · `"fail"` · `"n/a"`
     - `"pass"` — the information required by this rule was found in the available documents AND it satisfies the rule's criteria.
     - `"fail"` — the agent has POSITIVE EVIDENCE of a rule violation. The required information was found and it contradicts the rule's criteria (e.g., dates don't match, NIT is wrong, signature is missing from a document that should have one, authorization doesn't cover the billed service). A rule MUST NOT be marked `"fail"` simply because a document is absent or information could not be found.
     - `"n/a"` — EITHER the rule structurally does not apply to this service type (e.g. A14 ambulance transport for a case with no transport), OR the information needed to evaluate this rule is not available in any document and there is no evidence of a violation. When using `"n/a"` for missing information, `observaciones` MUST explain what information was searched for, where it was searched, and that no violation was detected. These become readable observations for the human auditor.
     
     **Core principle: innocent until proven guilty.** Absence of a document is not evidence of a violation. It is an observation. Only mark `"fail"` when you have found specific evidence that a rule's criteria are not met.
```

**CHANGE 3 — Concepto Final Logic**

In the SKILL.md `concepto_final` decision logic section, find and replace references to `ESCALAR_HUMANO`:

CURRENT TEXT:
```
- `NO_APTA`: any `critica` rule with `fail` that is not subsanable (e.g. missing HC entirely).
- `DEVOLUCION`: any `critica` rule with `fail` that is subsanable by submitting documents.
- `ESCALAR_HUMANO`: any `critica` rule with `confianza < 0.75`, or ambiguous evidence.
- `APTA`: all applicable rules `pass` and no escalation trigger.
```

REPLACE WITH:
```
- `NO_APTA`: any `critica` rule with `resultado = "fail"` (positive evidence of violation) that is not subsanable.
- `DEVOLUCION`: any `critica` rule with `resultado = "fail"` that is subsanable by the IPS submitting additional documents or corrections.
- `APTA`: all applicable rules have `resultado = "pass"` or `"n/a"`. Rules with `"n/a"` due to missing information are observations — they do NOT prevent an APTA verdict.

Note: `ESCALAR_HUMANO` is no longer a valid concepto_final value. Rules with low confidence (`confianza < 0.75`) should still render a verdict (pass, fail, or n/a) and add an observation noting the low confidence for the human reviewer to prioritize.
```

---

### B.3 Changes to `medical-invoice-admin-audit/checklist_base.md`

**CHANGE 1 — Section §2.3 resultado field definition**

CURRENT TEXT (in the resultado section):
```
#### `resultado`
Valores válidos (strings):
- `"pass"` — la regla se cumple.
- `"fail"` — la regla se incumple. Requiere llenar `glosa_sugerida`.
- `"n/a"` — la regla no aplica al caso (ej. A14 traslado en ambulancia cuando no hubo traslado).
```

REPLACE WITH:
```
#### `resultado`
Valores válidos (strings):
- `"pass"` — la información requerida por la regla fue encontrada en los documentos disponibles Y cumple los criterios de la regla.
- `"fail"` — el agente tiene EVIDENCIA POSITIVA de una violación. La información fue encontrada y contradice los criterios de la regla (ej. fechas no coinciden, NIT incorrecto, firma ausente en un documento que debería tenerla, autorización no cubre el servicio facturado). Una regla NO DEBE marcarse `"fail"` simplemente porque un documento está ausente o la información no se encontró.
- `"n/a"` — la regla no aplica estructuralmente al caso (ej. A14 traslado en ambulancia cuando no hubo traslado), O la información necesaria para evaluar esta regla no está disponible en ningún documento y no hay evidencia de violación. Cuando se usa `"n/a"` por información faltante, `observaciones` DEBE explicar qué información se buscó, dónde se buscó, y que no se detectó violación. Estas se convierten en observaciones legibles para el auditor humano.

**Principio central: inocente hasta que se demuestre lo contrario.** La ausencia de un documento no es evidencia de una violación. Es una observación. Solo marcar `"fail"` cuando se ha encontrado evidencia específica de que los criterios de una regla no se cumplen.

Requiere llenar `glosa_sugerida` SOLO cuando `resultado == "fail"`.
```

**CHANGE 2 — Section §2.3 confianza threshold**

CURRENT TEXT:
```
Umbral operativo: **`confianza < 0.75` en cualquier regla crítica dispara `concepto_final = "ESCALAR_HUMANO"`**.
```

REPLACE WITH:
```
Umbral operativo: cuando `confianza < 0.75` en cualquier regla, el agente debe igualmente emitir un veredicto (`pass`, `fail`, o `n/a`) pero agregar una observación señalando la baja confianza para que el revisor humano priorice la verificación. La baja confianza por sí sola NO cambia el `concepto_final`.
```

**CHANGE 3 — Section §4 concepto_final logic**

CURRENT TEXT:
```
si (existe alguna regla crítica con resultado "fail"):
    si (todas las criticas en fail son subsanables con complemento docs): concepto_final = "DEVOLUCION", accion_requerida = "Complemento"
    sino:                                                                  concepto_final = "NO_APTA",   accion_requerida = "Rechazo"

sino si (alguna regla con confianza < 0.75):                               concepto_final = "ESCALAR_HUMANO", accion_requerida = "Escalar"
```

REPLACE WITH:
```
si (existe alguna regla con resultado "fail" — evidencia positiva de violación):
    si (todas las reglas en fail son subsanables con complemento docs): concepto_final = "DEVOLUCION", accion_requerida = "Complemento"
    sino:                                                                concepto_final = "NO_APTA",   accion_requerida = "Rechazo"

sino (todas las reglas aplicables tienen resultado "pass" o "n/a"):       concepto_final = "APTA", accion_requerida = null

Nota: las reglas con resultado "n/a" por información faltante son observaciones — NO impiden un veredicto APTA. Se listan en la sección de observaciones del output para revisión humana opcional.
```

---

### B.4 Changes to `medical-invoice-medical-audit/SKILL.md`

**CHANGE 1 — Procedure Step 1 (Document Loading)**

CURRENT TEXT (line ~88):
```
1. **Load inputs.**
   Read `metadata_input.json` from the working directory. Load the listed clinical attachments from the paths in `documentos[]`: `clinical_history`, `epicrisis`, `operative_note` (if there is a surgical CUPS), `orden_medica`, `consentimiento_informado`, `administracion_medicamentos`, `interconsultas`.
```

REPLACE WITH:
```
1. **Load inputs.**
   Read `metadata_input.json` from the working directory. Read `case_evidence.json` (produced by Step 0 document-understanding skill) for pre-classified documents and extracted clinical facts.
   
   Load ALL files listed in `documentos[]` regardless of filename or extension. Use `case_evidence.json.clasificacion_documentos` to understand what each file contains. Do NOT search for files by document type name — the same clinical information may appear in an epicrisis, a combined HC PDF, or distributed across multiple documents.
   
   Use `case_evidence.json.disponibilidad_informacion` to determine what clinical information is available before evaluating rules. If information is not available, the corresponding rule becomes an observation (`resultado: "n/a"` with explanatory `observaciones`), not a fail.
   
   If `case_evidence.json` is not present, fall back to reading all files directly and classifying by content.
```

**CHANGE 2 — Rule Evaluation Logic (resultado)**

CURRENT TEXT:
```
   - **`resultado`**: `"pass"` · `"fail"` · `"n/a"` — `"n/a"` only when the rule structurally cannot apply (e.g. M11 operative note for a case with no surgical CUPS).
```

REPLACE WITH:
```
   - **`resultado`**: `"pass"` · `"fail"` · `"n/a"`
     - `"pass"` — the clinical information required by this rule was found and satisfies the criteria.
     - `"fail"` — POSITIVE EVIDENCE of a clinical violation (e.g., procedure contradicts GPC, medication dose is wrong per evidence in the documents, documented clinical trajectory doesn't justify the stay). NEVER mark `"fail"` because a document type is absent.
     - `"n/a"` — the rule structurally does not apply (e.g. M11 for non-surgical CUPS), OR the clinical information needed to evaluate this rule is not available in any document and there is no evidence of a clinical violation. `observaciones` must explain what was searched for and not found.
     
     **Information over documents:** If the epicrisis contains the clinical information that a "complete HC" would contain (admission diagnosis, clinical trajectory, procedures, medications, discharge), evaluate rules against that information. Do not fail a rule because the information comes from an epicrisis instead of a standalone historia clínica document.
```

**CHANGE 3 — M06 and ESCALAR_HUMANO Hard Rules**

CURRENT TEXT:
```
   Two hard rules regardless of confidence:
   - **M06 `fail` always forces `concepto_final = "ESCALAR_HUMANO"`** — GPC deviation without HC justification requires a human medical auditor.
   - **HC OCR failure** → emit a single `conditional` finding and abort all remaining rules → `ESCALAR_HUMANO`.
```

REPLACE WITH:
```
   Special handling:
   - **M06 (GPC deviation):** If the agent finds positive evidence that a procedure deviates from the applicable GPC AND no justification is documented in any available clinical document, mark `resultado = "fail"`. If the agent cannot determine GPC alignment because clinical documentation is insufficient, mark `resultado = "n/a"` with an observation explaining what clinical information would be needed. Do NOT mark `"fail"` solely because the justification document is missing.
   - **HC OCR failure** → emit a single `conditional` finding noting OCR quality issues and evaluate remaining rules with reduced confidence. Do not abort all rules.
```

---

### B.5 Changes to `medical-invoice-financial-audit/SKILL.md`

**CHANGE 1 — Procedure Step 1 (Document Loading)**

CURRENT TEXT (line ~105):
```
1. **Load inputs.**
   Read `metadata_input.json` from the working directory. Load `invoice_xml`, `rips`, `clinical_history` (to validate services actually delivered), and `authorization` from the paths in `documentos[]`.
```

REPLACE WITH:
```
1. **Load inputs.**
   Read `metadata_input.json` from the working directory. Read `case_evidence.json` (produced by Step 0 document-understanding skill) for pre-classified documents, extracted invoice items, and authorization data.
   
   Load ALL files listed in `documentos[]` regardless of filename or extension. Use `case_evidence.json.clasificacion_documentos` to identify the invoice document (may be PDF, XML, or text), RIPS data (may be in any format), and authorization. Do NOT search for `*.xml` or `*rips*` file patterns.
   
   Use `case_evidence.json.factura_items` and `case_evidence.json.totales_factura` as the primary source for invoice line items. Cross-reference with the raw invoice document for verification.
   
   If `case_evidence.json` is not present, fall back to reading all files directly and extracting invoice items from whatever invoice document is available (PDF, XML, or text).
```

**CHANGE 2 — F01 Contrato Rule Guidance**

Add after the procedure step 4 resultado definition:

```
   **Rule-specific guidance for contract and external-system rules:**
   - **F01 (Contrato activo):** The existence of a contract-specific tariff file (`tarifario_contrato_eps_2026.csv`) in the skill's reference data is evidence of a contractual relationship. If the tariff file references the prestador NIT found in the invoice, F01 should `"pass"` with an observation noting that the signed contract document was not in the case files. Only `"fail"` if there is positive evidence that no contract exists (e.g., prestador NIT not found in any tariff reference).
   - **F03 (Anexos y otrosíes):** If no contract annexes are in the case files, mark `"n/a"` with observation. Absence of annexes is not evidence that unauthorized modifications were applied.
   - **F32-F42 (Anti-fraud rules requiring external databases):** When the rule requires cross-referencing external databases (patient history across IPS, hospitalization overlaps, mortality records, provider patterns) and those databases are not accessible, mark `"n/a"` with an observation explaining what cross-check would be needed. Only mark `"fail"` when the agent has positive evidence of fraud from the available documents (e.g., two identical procedures billed on the same date found within the case files).
```

**CHANGE 3 — Anti-Fraud Escalation**

CURRENT TEXT:
```
   Anti-fraud thresholds (F29–F42) per `checklist_base.md §4` and §6:
   - F32–F36 `fail` with `confianza ≥ 0.9` → `concepto_final = "NO_APTA"` + payment block.
   - Any F29–F42 `fail` with `confianza < 0.9` → `concepto_final = "ESCALAR_HUMANO"`.
   - Anti-fraud finding with `valor_glosado > $10.000.000 COP` → always escalate regardless of confidence.
```

REPLACE WITH:
```
   Anti-fraud thresholds (F29–F42):
   - F32–F36 `fail` (with positive evidence) and `confianza ≥ 0.9` → `concepto_final = "NO_APTA"` + payment block.
   - Any F29–F42 `fail` (with positive evidence) and `confianza < 0.9` → `concepto_final = "NO_APTA"` with observation noting low confidence for human verification.
   - Anti-fraud rules that cannot be evaluated due to missing external database access → `resultado = "n/a"` with observation.
   - Anti-fraud finding with `valor_glosado > $10.000.000 COP` → `concepto_final = "NO_APTA"` regardless of confidence.
```

---

### B.6 Changes to `medical-invoice-consolidator-audit/SKILL.md`

**CHANGE 1 — Output Structure**

In the Output Contract section, after the hallazgo values definition, add:

```
**New: `observaciones` array (case-level):**

The output now includes an `observaciones` array alongside `hallazgos`. This array contains rules that could not be evaluated due to missing information (`resultado = "n/a"` where the reason is missing documents or inaccessible external systems, not structural inapplicability).

```json
{
  "hallazgos": [ /* items with hallazgo="conforme" or hallazgo="glosa" — only rules with resultado="pass" or "fail" */ ],
  "observaciones": [
    {
      "regla": "A16",
      "nombre": "Historia clínica completa y firmada",
      "capa": "administrativo",
      "motivo": "No se encontró historia clínica de ingreso completa. La información clínica disponible proviene de epicrisis.pdf y nota_quirurgica.pdf. No se detectó violación.",
      "informacion_buscada": "Notas de ingreso con anamnesis y examen físico completo",
      "documentos_revisados": ["epicrisis.pdf", "nota_quirurgica.pdf", "kardex_medicamentos.txt"],
      "impacto_en_veredicto": "ninguno — observación informativa"
    }
  ],
  "resumen": { /* concepto_final computed ONLY from hallazgos, NOT from observaciones */ }
}
```

Observations do NOT affect `concepto_final`, `total_glosado`, `tasa_objecion`, or any aggregate metric. They are informational items for the human auditor to optionally investigate.
```

**CHANGE 2 — Concepto Final Logic**

CURRENT TEXT (in concepto_final decision logic):
```
1. `NO_APTA` + `accion_requerida: "Rechazo"` — any `critica` rule with `resultado = fail` that is not subsanable by document submission (e.g. missing HC entirely, expired contract, patient not covered on service date).
2. `DEVOLUCION` + `accion_requerida: "Complemento"` — any `critica` rule with `resultado = fail` that is subsanable by the IPS submitting additional documents (e.g. missing authorization, missing operative note).
3. `ESCALAR_HUMANO` + `accion_requerida: "Escalar"` — any `critica` rule with `confianza < 0.75`, OR anti-fraud rules F32–F36 with `confianza < 0.9`.
4. `APTA` + `accion_requerida: null` — all rules pass, `tasa_objecion = 0.0`, no devoluciones.
5. `APTA` + `accion_requerida: "Correccion"` — some glosas exist but all are partial and subsanable (`tasa_objecion > 0` but no critical fails).
```

REPLACE WITH:
```
Count ONLY rules with `resultado = "fail"` (positive evidence of violation) toward the verdict. Rules with `resultado = "n/a"` (including those due to missing information) are listed in `observaciones` and do NOT affect the verdict.

1. `NO_APTA` + `accion_requerida: "Rechazo"` — any rule with `resultado = "fail"` (positive evidence) that is not subsanable (e.g. confirmed expired contract, confirmed patient not covered, confirmed clinical violation without possible correction).
2. `NO_APTA` + `accion_requerida: "Complemento"` + `en_devolucion: true` — any rule with `resultado = "fail"` that is subsanable by the IPS submitting corrections (e.g. wrong tariff applied, fixable billing error, missing signature on a document that IS present).
3. `APTA` + `accion_requerida: null` — all rules have `resultado = "pass"` or `"n/a"`, `tasa_objecion = 0.0`. Observations are listed separately.
4. `APTA` + `accion_requerida: "Correccion"` — some minor glosas exist (non-critical `resultado = "fail"`) but all are partial and subsanable (`tasa_objecion > 0` but no critical fails with positive evidence).

Note: `ESCALAR_HUMANO` is no longer a valid concepto_final. Low-confidence findings are flagged as observations with a note about confidence level.
```

**CHANGE 3 — Procedure Step 2 (Collecting Findings)**

CURRENT TEXT:
```
2. **Collect every finding with `resultado=fail` or `conditional`.**
   Ignore `pass` — they do not produce findings for a glosa.
```

REPLACE WITH:
```
2. **Separate findings from observations.**
   - Collect every rule with `resultado = "fail"` → these become `hallazgos` (actual findings with positive evidence of violation).
   - Collect every rule with `resultado = "n/a"` WHERE the reason is missing information (not structural inapplicability) → these become `observaciones` (items the human auditor can optionally investigate).
   - Rules with `resultado = "pass"` → these become `conforme` items in `hallazgos`.
   - Rules with `resultado = "n/a"` due to structural inapplicability (e.g., A14 ambulance for non-transport case) → omit from both arrays.
```

---

### B.7 Changes to `medical-invoice-consolidator-audit/output.md`

Add the `observaciones` array schema to the output template documentation. The output.json template should include:

```json
{
  "caso_id": "...",
  "factura": { /* unchanged */ },
  "hallazgos": [ /* unchanged — only conforme and glosa items based on resultado="pass" or "fail" */ ],
  "observaciones": [
    {
      "regla": "string — rule ID (e.g. A16, M07, F01)",
      "nombre": "string — rule name",
      "capa": "administrativo | medico | financiero",
      "motivo": "string — why the rule could not be evaluated (specific, citing what was searched)",
      "informacion_buscada": "string — what information the rule needed",
      "documentos_revisados": ["array of filenames that were checked"],
      "impacto_en_veredicto": "ninguno — observación informativa"
    }
  ],
  "resumen_por_capa": { /* unchanged */ },
  "resumen": {
    /* unchanged fields, but concepto_final is now computed ONLY from hallazgos */
    "num_observaciones": "integer — count of observation items",
    /* all other fields unchanged */
  }
}
```

---

### B.8 Pipeline Integration

The audit pipeline task sequence must be updated to include Step 0:

**BEFORE:**
```
queued → admin-audit → medical-audit → financial-audit → consolidator → review/done
```

**AFTER:**
```
queued → document-understanding (Step 0) → admin-audit → medical-audit → financial-audit → consolidator → review/done
```

The orchestrator (or task assignment system) must ensure that `document-understanding` runs first and that its output (`case_evidence.json`) is available in the working directory before the three audit skills execute.

---

### B.9 Summary of All Files Changed

| File | Action | Key Change |
|------|--------|------------|
| `medical-invoice-document-understanding/SKILL.md` | CREATE | New Step 0 skill with case_evidence.json output |
| `medical-invoice-admin-audit/SKILL.md` | EDIT | Format-agnostic loading, evidence layer consumption, innocent-until-proven-guilty |
| `medical-invoice-admin-audit/checklist_base.md` | EDIT | New resultado semantics, remove ESCALAR_HUMANO, update concepto_final logic |
| `medical-invoice-medical-audit/SKILL.md` | EDIT | Format-agnostic loading, evidence layer, M06 no longer forces escalation |
| `medical-invoice-financial-audit/SKILL.md` | EDIT | Format-agnostic loading, evidence layer, F01 contract guidance, anti-fraud n/a path |
| `medical-invoice-consolidator-audit/SKILL.md` | EDIT | Add observaciones array, update concepto_final to exclude observations |
| `medical-invoice-consolidator-audit/output.md` | EDIT | Add observaciones schema to output template |
