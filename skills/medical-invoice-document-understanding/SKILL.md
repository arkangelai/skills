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
        "descripcion": "Fibrilacion auricular paroxistica",
        "tipo": "principal | secundario",
        "fuentes": ["epicrisis.pdf p.1", "factura.pdf p.1"]
      }
    ],
    "procedimientos": [
      {
        "codigo_cups": "882501",
        "descripcion": "Ablacion por radiofrecuencia de arritmia",
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
        "descripcion": "Ablacion por radiofrecuencia",
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
