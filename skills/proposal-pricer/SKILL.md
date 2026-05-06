---
name: proposal-pricer
description: Build a Good/Better/Best price-bracket where each tier represents distinct scope (not the same scope at different prices), anchored to the quantified pain so ROI is defensible. Reads rate-card data passed as input or from a private config file — does not hardcode pricing. Use when building decision-maker-kit or responding to "envíennos propuesta".
---

# Proposal Pricer

The Sandler "money step" done correctly. The job: produce a 3-tier bracket where each tier has **genuinely different scope**, priced to the dolor cuantificado from `pain-quantifier`, with payback explicit per tier.

Bad bracket = same scope, three prices, customer picks the cheap one.
Good bracket = three scopes, each defensible, customer picks the one matching their actual pain.

The skill is a **framework**. Actual rate cards live in a private config file or are passed as input — the skill itself does not hardcode prices.

## When to Use

- Building a `decision-maker-kit` and the bracket needs real numbers.
- Customer says "envíennos propuesta" and we have `pain-quantifier` output.
- A champion needs the bracket to defend internally.
- Renewal time and we need to re-anchor pricing to the dolor del año pasado.

**Do not use** for the dolor side (eso es `pain-quantifier`), for early-stage prospects without quantified pain (sin dolor cuantificado, no hay pricing defensible), or as a generic discount calculator.

## Inputs

- **Required:** dolor cuantificado (output de `pain-quantifier`), customer tier (Starter / Professional / Enterprise), industria, geografía.
- **Required:** rate-card data — pasada como input por el usuario, leída de archivo privado (`~/.arkangel/pricing.json` o similar), o pedida explícitamente. **El skill no inventa precios.**
- **Optional:** producto específico (medsearch, pandora, ambos), volúmenes esperados, condiciones contractuales (term, anticipo).

Si rate-card no está disponible, el skill genera el shape del bracket con `<rango por confirmar>` en cada tier y bloquea la entrega final.

## Procedure

1. **Read pain-quantifier output.** Toma el número **mid** del rango. Sin pain-quantifier output, frena.

2. **Define the 3 tier shapes — distinct scope per tier, not the same scope discounted.**

   La regla: cada tier resuelve un % del dolor diferente. Good resuelve menos, Enterprise resuelve más.

   | Tier | Scope shape | % del dolor que resuelve | Quién típicamente lo elige |
   |---|---|---|---|
   | **Good** | Producto core, 1 caso de uso, 1 sede, soporte estándar | 30–50 % | Equipos pequeños probando con presupuesto limitado |
   | **Better** | Producto core + 2–3 add-ons, 2–4 sedes, soporte avanzado | 60–80 % | Sweet spot enterprise — recomendado por defecto |
   | **Best** | Producto completo, todos los add-ons, todas las sedes, soporte premium + custom | 90–100 % | Cliente con dolor extremo o organización grande |

   Para cada tier, lista explícitamente:
   - Qué incluye.
   - Qué **no** incluye (la regla más importante — sin "no incluye", el cliente asume que sí).
   - Qué add-ons son comprables después.

3. **Apply pricing rules.**

   El precio se computa con dos restricciones, **se aplica la mayor de las dos**:

   - **Cost-plus:** rate-card de Arkangel × volúmenes × margen objetivo. (Datos de la rate-card privada.)
   - **Value-anchored:** porcentaje del dolor cuantificado. Defaults razonables:
     - Good: 5–10 % del dolor anual.
     - Better: 15–25 % del dolor anual.
     - Best: 30–40 % del dolor anual.

   Si value-anchored < cost-plus, el deal no tiene ROI defensible — frena, vuelve a `pain-quantifier` para revalidar el dolor.

4. **Compute payback per tier.**
   - Payback (meses) = (precio anual × 12) / (dolor anual mid resuelto por ese tier).
   - Good típicamente paga en 3–6 meses (resuelve poco, cuesta poco).
   - Better paga en 4–8 meses (sweet spot).
   - Best paga en 6–12 meses (resuelve más pero cuesta más).
   - Si payback > 18 meses, el bracket no es defensible para ese cliente.

5. **Define commercial terms per tier.**
   - Term: 1 año default, 3 años con descuento (ofrecer).
   - Pago: mensual / trimestral / anual con descuento por anual.
   - Términos especiales: anticipos solo en Best, no en Good/Better.
   - SLA: estándar para Good/Better, premium para Best.

6. **Build the recommendation logic.**
   El bracket no se entrega "neutral" — se entrega con una recomendación implícita.
   - Si dolor cuantificado es < 200M COP/año: recomendar Good como punto de entrada.
   - Si dolor cuantificado es 200M–1B COP/año: recomendar Better.
   - Si dolor cuantificado es > 1B COP/año: recomendar Best.
   - El champion necesita saber cuál defender. Sin recomendación, defiende todos y pierde.

7. **Output structure.**

   ```markdown
   # Proposal Pricer — <Empresa>

   ## Anclaje
   - Dolor cuantificado anual (mid): <COP>
   - Tier recomendado: <Good / Better / Best>
   - Razón: <1 frase>

   ## Tier 1 — Good
   - Incluye: <bullets>
   - No incluye: <bullets>
   - Add-ons compra-después: <bullets>
   - Inversión anual: <rango COP>
   - % del dolor resuelto: <30–50 %>
   - Payback: <meses>
   - Term: 1 año (3 años con <X> % descuento)

   ## Tier 2 — Better  ← recomendado
   <misma estructura>

   ## Tier 3 — Best
   <misma estructura>

   ## Reglas de pricing aplicadas
   - Cost-plus: <referencia a rate-card>
   - Value-anchored: <% del dolor>
   - Aplicado: <cuál ganó>

   ## Validaciones
   - Payback < 18 meses para todos los tiers: ✅ / ❌
   - Cada tier tiene scope distinto (no mismo-scope-tres-precios): ✅ / ❌
   - Rate-card disponible (sin <por confirmar>): ✅ / ❌
   ```

8. **Handoff.**
   - Si todas las validaciones pasan, listo para `decision-maker-kit`.
   - Si rate-card faltante, devuelve el shape con `<por confirmar>` y bloquea.
   - Update Attio: notar bracket enviado.

## Pitfalls

- **Síntoma:** los tres tiers son el mismo scope con −20 % / 0 / +50 %. **Causa:** pereza al diseñar scope. **Fix:** la regla es scope distinto. Sin scope distinto, no hay bracket — hay anclaje psicológico que el cliente detecta y desconfía.
- **Síntoma:** el precio se inventa porque rate-card no está disponible. **Causa:** apuro. **Fix:** el skill se niega a producir números sin rate-card. Devuelve `<por confirmar>` y para.
- **Síntoma:** payback de 24+ meses entregado al cliente. **Causa:** dolor sub-cuantificado. **Fix:** payback > 18 meses → revalidar pain-quantifier; el dolor probablemente es mayor de lo que se midió o el scope es muy ancho para el tamaño del cliente.
- **Síntoma:** descuento por volumen aparece como tier "Best" sin más entregables. **Causa:** confusión scope-vs-volumen. **Fix:** descuento por volumen es ortogonal al bracket — va dentro de cada tier, no entre tiers.
- **Síntoma:** el champion entrega el bracket sin recomendación. **Causa:** el skill lo entregó neutral. **Fix:** siempre hay tier recomendado, basado en el dolor. El champion no debe inventarlo.
- **Síntoma:** rate-card pública en repo. **Causa:** se hardcodearon precios. **Fix:** este skill **lee** rate-card de input o archivo privado; nunca la incluye en el SKILL.md.

## Verification

- Cada tier tiene scope distinto, no mismo-scope-discounted.
- "No incluye" está explícito en cada tier.
- Cada tier tiene payback < 18 meses (o el bracket no se entrega).
- Hay tier recomendado con razón.
- Si rate-card no está disponible, el output incluye `<por confirmar>` en cada precio y bloquea entrega.
- El SKILL.md no contiene precios reales — solo % y reglas.

## References

- [`sales-pipeline`](../sales-pipeline/) — submarino completo.
- [`pain-quantifier`](../pain-quantifier/) — provee el dolor anual que ancla el pricing.
- [`decision-maker-kit`](../decision-maker-kit/) — consume el bracket para construir kits por rol.
- [`champion-kit`](../champion-kit/) — recibe el rango "Good/Better/Best" genérico antes de tener el pricing exacto.
