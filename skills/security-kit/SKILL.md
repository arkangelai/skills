---
name: security-kit
description: Answer the prospect's security questionnaire (SIG-Lite, CAIQ, custom) with concrete Arkangel evidence — architecture, data flow, encryption, access control, incident response, pentest results (Hackmetrix), compliance status (ISO27001 / SOC2 / HIPAA). Compartment 7 of the Arkangel sales submarine — the last gate before close.
---

# Security Kit

Compartment 7 of the Arkangel sales submarine. CISOs and AppSec teams kill more deals here than CFOs do. The job: answer their questionnaire with **concrete evidence** — never a vague "yes, it's secure" — and propose remediation plans for any gap, with timelines.

Honesty wins. Inflating answers is the fastest way to lose enterprise healthtech deals.

## When to Use

- Compartment 6 (`legal-kit`) cleared — moving to security review.
- The CISO sent a security questionnaire (SIG-Lite, CAIQ, ISO27001 mapping, custom).
- The owner says "responde el cuestionario seguridad de X" or "qué le mandamos al CISO".

**Do not use** for the legal package (`legal-kit`), the procurement vendor form (`procurement-kit`), or for an internal security audit (use `cso` or similar).

## Inputs

- **Required:** cuestionario recibido (PDF / Excel / portal), datos sensibles que se procesarán (PHI, PII, sensible no-clínico, no sensible).
- **Optional:** vertical del cliente (healthcare, banca, gov), tamaño del equipo de seguridad del cliente, frameworks que privilegian (ISO, SOC2, HIPAA, NIST).

## Procedure

1. **Read the questionnaire end-to-end.** Map cada pregunta a una de las categorías estándar:
   - Arquitectura y data flow
   - Acceso y autenticación
   - Encriptación at-rest y in-transit
   - Datos: residencia, retención, derecho al olvido
   - Sub-procesadores
   - Pruebas de seguridad (pentest, vuln scanning)
   - Incident response
   - Continuidad del negocio / DR
   - Compliance frameworks (SOC2, ISO27001, HIPAA, etc.)
   - Personal (background checks, training, accesos)

2. **Pre-fill arquitectura y data flow.**
   - Stack: Next.js 15 + Vercel (frontend + serverless), Supabase (PostgreSQL + Auth + Storage), Upstash Redis (caché), Stripe (pagos), proveedores LLM (OpenAI, Anthropic, Google, xAI).
   - Aislamiento: cada cliente vive en su propio tenant lógico via RLS de Supabase.
   - Data flow diagram: cliente → CDN → Vercel function → Supabase / LLM provider → respuesta.
   - Adjuntar diagrama actualizado (referencia, no inventar uno nuevo).

3. **Pre-fill acceso y autenticación.**
   - SSO: vía Supabase Auth (Google, Microsoft, custom OIDC).
   - MFA: obligatorio para staff Arkangel; ofrecible al cliente.
   - Audit logs: Supabase Audit Logs + custom application logs con retención 1 año.
   - Principio de menor privilegio: roles definidos en RLS y en `lib/security/`.

4. **Pre-fill encriptación.**
   - At-rest: AES-256 (Supabase / Vercel / S3 backends).
   - In-transit: TLS 1.2+ obligatorio.
   - Secretos: variables de entorno cifradas en Vercel; rotación documentada.
   - Datos sensibles a nivel campo: hash o cifrado application-level cuando aplica (PHI, tokens API).

5. **Pre-fill datos: residencia, retención, derecho al olvido.**
   - Residencia: Supabase actualmente en us-east o eu-central — confirmar con el cliente la región exigida.
   - Retención: por tipo de dato; documento separado si es complejo (típicamente PHI = mientras dure el servicio + 5 años legales LATAM, datos no-PHI = mientras dure el servicio + 1 año).
   - Derecho al olvido: pipeline implementado, tiempo de respuesta < 30 días.
   - Backup: diario, retención 30 días, encriptado.

6. **Pre-fill sub-procesadores.**
   - Lista completa (debe coincidir con la del `legal-kit`):
     - Vercel (hosting / compute) — US/EU
     - Supabase (DB / auth / storage) — US/EU
     - Upstash (Redis caché) — US/EU
     - OpenAI, Anthropic, Google, xAI (LLM providers) — US
     - Stripe (pagos) — US/EU
     - Sentry / observability si aplica
   - Cada uno con su rol, jurisdicción, certificaciones (SOC2 / ISO27001).

7. **Pre-fill pruebas de seguridad.**
   - **Pentest reciente: Hackmetrix Feb 2026.** Resumen de hallazgos + estado de remediación. Disponible NDA-mediante.
   - Vuln scanning continuo en pipeline CI.
   - Dependabot / npm audit en repos.
   - Bug bounty: estado actual (no público / privado / no aplica).

8. **Pre-fill incident response.**
   - Plan IR documentado.
   - Tiempo objetivo notificación al cliente: 72 horas tras detección (alineado a GDPR / Hab. Datos).
   - On-call eng + sec definido.
   - Postmortem público interno tras incidente.

9. **Pre-fill compliance.**
   - ISO27001: estado actual (en proceso / certificado / no aplica) — ser honesto.
   - SOC2: estado actual.
   - HIPAA: technical safeguards implementados, BAA disponible (referencia al `legal-kit`).
   - NIST CSF / CIS Benchmarks: mapeo si el cliente lo pide.

10. **Identificar gaps reales y proponer remediation.**
    - Para cada respuesta donde el control **no está implementado**, marca como **GAP** y propone:
      - Mitigación temporal (qué control compensa hoy).
      - Plan de remediación con fecha objetivo.
      - Si el gap es bloqueante para el cliente, escala internamente antes de enviar.
    - **No se invent** un control que no existe. La industria tiene memoria.

11. **Output structure.**

    ```markdown
    # Security Kit — <Empresa> · <Cuestionario X>

    ## Cuestionario respondido
    <campo a campo, agrupado por categoría>

    ## Anexos
    - Arquitectura diagram (link interno)
    - Pentest summary Hackmetrix Feb 2026
    - Sub-procesador list con jurisdicciones
    - DPA / BAA (referencia al legal-kit)
    - SOC2 / ISO27001 status report

    ## Gaps abiertos y plan de remediación
    - <control faltante → mitigación actual → fecha objetivo>

    ## Escalaciones requeridas
    - <ítems que requieren input de Eng / AppSec antes de cerrar>

    ## Próximo paso
    <call con CISO / sign-off / fecha objetivo>
    ```

12. **Update Attio.**
    - Adjuntar el kit.
    - `pipeline_stage = won` cuando el CISO firme sign-off + contrato (`legal-kit`) esté firmado.

## Pitfalls

- **Síntoma:** se responde "Sí" a controles que no existen. **Causa:** miedo a perder el deal. **Fix:** marca **GAP + plan**. Los CISOs prefieren un gap honesto a un "yes" mentiroso. Mentir te elimina del proveedor list permanentemente.
- **Síntoma:** se omite un sub-procesador (típicamente un LLM provider). **Causa:** se asume que "no procesa datos del cliente". **Fix:** si los prompts del cliente pasan por un LLM provider, ese provider procesa datos del cliente. Listar todos.
- **Síntoma:** SOC2 reclamada como "in progress" por más de 12 meses. **Causa:** prioridad interna. **Fix:** fecha realista o "no aplica todavía". Los CISOs detectan cuando "in progress" es indefinido.
- **Síntoma:** el plan de remediación no tiene owner. **Causa:** se redactó genérico. **Fix:** cada plan tiene owner Arkangel + fecha. Sin owner = sin plan.
- **Síntoma:** el data flow diagram es viejo. **Causa:** no se actualizó tras un cambio de arquitectura. **Fix:** validar con Eng antes de enviar; un diagrama desfasado quema la confianza.
- **Síntoma:** se incluye el reporte de pentest completo sin NDA. **Causa:** apuro. **Fix:** se entrega el **resumen**; el detalle solo bajo NDA específico.

## Verification

- Cada respuesta tiene evidencia concreta (link, fecha, configuración) o está marcada como GAP con plan.
- Los sub-procesadores listados coinciden con los del `legal-kit`.
- El plan de remediación tiene owner + fecha por cada gap.
- Las escalaciones requeridas están explícitamente marcadas.
- El reporte de pentest incluido es resumen, no documento completo (eso bajo NDA).

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`legal-kit`](../legal-kit/) — DPA / BAA referenciados aquí.
- [`procurement-kit`](../procurement-kit/) — el pentest summary también pasa por aquí.
- `docs/solutions/security-issues/hackmetrix-pentest-feb2026-audit.md` (interno) — fuente del pentest summary.
