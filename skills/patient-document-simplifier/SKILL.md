---
name: patient-document-simplifier
description: Translates Colombian medical documents (glosas, EOBs / facturas, prescripciones, recetas MIPRES, resúmenes de egreso, exámenes de laboratorio, comunicados de pre-autorización, fallos médicos) into clear, dignified, plain Spanish for patients. Use it when the user asks to "explain this to a patient", "simplify this medical letter", "what does this glosa mean for me", "translate this discharge summary into something my mom can understand". Output is patient-facing — second person, sin jerga, no medical advice, no diagnosis.
version: 1.0.0
author: claudio@arkangel.ai
platforms: [macos, linux]
metadata:
  hermes:
    tags: [patient-communication, plain-language, glosa, prescription, discharge, colombia, accessibility]
    category: communication
    requires_toolsets: [terminal]
---

# patient-document-simplifier

Takes any Colombian medical document and produces a patient-facing version: short, plain Spanish, no jargon, no condescension. Inspired by `patiently-ai` from OpenClaw, but specialized for the documents Colombian patients actually receive — which are dense, regulatory, and intimidating.

The skill never adds diagnosis, prognosis, or treatment advice. It only **translates what the document already says**. If the document is unclear about a medical fact, the skill states "el documento no aclara X" — it does not invent.

## When to Use

- The user pastes a **glosa** (claim denial) addressed to a patient and asks "what does this mean for me?".
- The user shares a **resumen de egreso** / epicrisis / discharge summary and asks for a plain-language version.
- The user shares a **prescripción** or **MIPRES** and asks how to take the medication.
- The user shares **resultados de laboratorio** and asks what they mean (without giving diagnosis).
- The user shares a **comunicado de pre-autorización** (negación o autorización) and asks for the next step.
- The user shares a **fallo de tutela** in salud and asks what they're entitled to.
- A nonprofit or social worker is helping a low-literacy patient navigate their EPS.

**Do not use:**
- For documents that are already plain — don't simplify a 3-line message into 6 bullet points.
- For documents written in another language — translate first (out of scope) then simplify.
- To replace a doctor's explanation of diagnosis or prognosis. The skill is explicitly **not** giving medical advice.
- For pediatric documents addressed to children directly (different tone calibration; out of scope).

## Procedure

### 1. Read the source — extract structure, then meaning

Identify the document type before simplifying:

| Type | Telltale signs | Key sections to preserve |
|---|---|---|
| Glosa | "GLOSA", "DEVOLUCIÓN", "Causal: …" | Service denied, reason in plain words, deadline to appeal |
| Epicrisis / resumen egreso | "RESUMEN DE HOSPITALIZACIÓN", "DIAGNÓSTICO DE EGRESO" | Why admitted, what was done, medications at home, follow-up appointments, warning signs |
| Prescripción | "Rp:", "MIPRES", dosage scheme | Medication name + presentation, dose + frequency, duration, with/without food, side effects to watch |
| Resultados laboratorio | Reference ranges, LOINC codes | Each test name, value, whether in range — without diagnosing |
| Pre-autorización | "AUTORIZACIÓN", "NEGACIÓN", causal | Decision, what's covered, next step (where to go, deadline) |
| Tutela | "TUTELA", "FALLO", "AMPARA" | What was ordered, deadline, who must comply |

### 2. Apply the simplification rules

**Voice & person:**
- Address the patient directly: "Tu/su examen muestra…" (use **usted** by default — more respectful in Colombian healthcare; only switch to **tú** if the requester explicitly asks).
- Active voice. "El médico le ordenó X" instead of "Se ordenó X al paciente".
- Short sentences. Average ≤ 18 words.

**Vocabulary:**
- Replace jargon with everyday Spanish. Keep the technical term **once** in parentheses if relevant for follow-up:
  - *"hipertensión arterial"* → "presión alta (hipertensión arterial)"
  - *"hemoglobina glicosilada"* → "examen de azúcar en sangre de los últimos 3 meses (hemoglobina glicosilada)"
  - *"glosa"* → "rechazo de la cuenta por parte de su EPS (esto se llama 'glosa')"
- Numbers: write digits, not Spanish words ("3 días", not "tres días"). Add units always.
- Times: avoid "c/8h" — write "una toma cada 8 horas, así: 6 a.m., 2 p.m. y 10 p.m.".

**Structure:**
- Lead with the bottom line: "**Resultado:** lo que necesitas saber primero."
- Then a short body of 3–6 bullet points.
- End with a "**Qué hacer ahora**" action list (next 3 concrete steps).
- For glosas / negaciones, always include "**Cómo apelar**" with the deadline and the EPS contact channel.

**Tone — what NOT to do:**
- Don't add reassurance the document doesn't contain ("no te preocupes, todo va a estar bien").
- Don't add scary warnings the document doesn't contain.
- Don't infantilize ("¡muy bien hecho por preguntar!").
- Don't translate cultural or religious context — keep neutral.

### 3. Always include a disclaimer

At the bottom, append exactly:

> *Esta es una explicación en lenguaje simple del documento que recibiste. No reemplaza la opinión de tu médico/a. Si tienes dudas sobre tu diagnóstico, tratamiento o cómo tomar un medicamento, llama a tu EPS o pide cita con tu médico/a tratante.*

### 4. Output format

Always Markdown. Default sections:

```markdown
## Resultado

[1 sentence with the bottom line in plain Spanish]

## Qué dice tu documento

- [Bullet 1]
- [Bullet 2]
- [Bullet 3]

## Qué hacer ahora

1. [Action 1]
2. [Action 2]
3. [Action 3]

[Disclaimer]
```

For a glosa add a section `## Cómo apelar`. For a prescription add a section `## Cómo tomar el medicamento`. For lab results add a section `## Qué significan tus resultados` with each value on a separate line ("✓ dentro del rango normal" / "↑ por encima del rango normal" / "↓ por debajo del rango normal" — without giving diagnosis).

### 5. Privacy

Strip patient-identifying numbers (cédula, número de afiliación, dirección) from any output that will be saved or shared as a sample. Keep them only in the live response to the actual patient.

## Pitfalls

- **Síntoma:** El paciente entiende mal y suspende la medicación. **Causa:** Simplificación demasiado agresiva removió la advertencia de "no suspender sin consultar". **Fix:** Para medicamentos crónicos (HTA, DM, anticoagulantes, antiepilépticos, antirretrovirales, inmunosupresores), siempre incluir literal: "no dejes de tomar este medicamento sin hablar primero con tu médico, aunque te sientas mejor".

- **Síntoma:** Inventaste un dato que no estaba en el documento. **Causa:** Inferiste para "ayudar al paciente". **Fix:** Si el documento no dice algo, dilo: "tu documento no especifica X — pregúntale a tu médico/a". No inventes.

- **Síntoma:** Tono condescendiente. **Causa:** Asumiste baja escolaridad. **Fix:** Lenguaje simple ≠ lenguaje infantil. La regla es "lo que tu vecina entendería si te encuentras con ella en la tienda", no "como hablarías con un niño".

- **Síntoma:** El paciente perdió el plazo de apelación. **Causa:** El plazo estaba al final del documento original y no lo destacaste. **Fix:** Para todo documento con plazo (glosa, negación, tutela), el plazo va en el "Resultado" arriba — no escondido al final.

- **Síntoma:** El paciente pensó que tenía cáncer al leer la simplificación. **Causa:** Tradujiste "neoplasia" como "cáncer" sin matiz. **Fix:** Algunas palabras médicas son ambiguas — "neoplasia" puede ser benigna; "lesión" no implica cáncer. Mantén la palabra técnica con paréntesis cuando la traducción literal pueda asustar de más.

- **Síntoma:** Faltó información de contacto para reclamar. **Causa:** Asumiste que el paciente sabe el canal. **Fix:** Para cada acción que requiera contactar EPS/IPS, sugiere la línea 018000 de la EPS (todas las EPS tienen una; si no la tienes, pídela como dato de entrada).

- **Síntoma:** El paciente es analfabeta. **Causa:** El skill produce texto. **Fix:** Marcar el output como "para leer en voz alta al paciente" — frases más cortas, más pausas (puntos, no comas), menos negaciones encadenadas.

## Verification

- Output expected: Markdown patient-facing document with the structure in step 4.
- Readability check: Spanish Flesch-Huerta score ≥ 70 (most paragraphs scoring "fácil"). Run `style` or `textstat` if available, or sanity-check by reading aloud.
- Word count target: typical glosa or epicrisis simplified to ≤ 350 words.
- Hallucination check: every fact in the output must be traceable to a sentence in the source. If you can't point to it, remove it.
- Disclaimer present verbatim at the bottom.

## References

- Plain language guidelines (HHS, adapted): https://www.plainlanguage.gov
- Lenguaje claro en salud — Universidad de los Andes: https://lenguajeclaro.uniandes.edu.co
- Sister skill: `medical-entity-extractor` (extract structured data first, then simplify the prose).
