# Índice de tarifarios

Ruteo para el sub-agente financiero: dado el contrato vigente y el servicio facturado, elige el tarifario aplicable en este orden estricto de precedencia.

## Orden de precedencia

```
1. tarifario_contrato_eps_2026.csv   ← SIEMPRE primero
2. tarifario_iss_2001.csv             ← fallback cuando el contrato lo referencia (cláusula tarifaria)
3. tarifario_soat_2026.csv            ← piso legal para lo no contratado (con autorización)
```

### Regla 1 — contrato vigente (primero)

El tarifario negociado con la IPS prevalece sobre cualquier otro manual. Es la fuente única de verdad para todo CUPS que aparezca listado. Si el CUPS está → tomar su `TARIFA_COP` y validar contra factura.

### Regla 2 — ISS 2001 actualizado (fallback contractual)

Aplica **sólo** si:
- El contrato marco tiene una cláusula tipo "Los servicios no tabulados en el Anexo Tarifario se liquidarán según el Manual ISS 2001 actualizado con IPC vigente".
- El CUPS está ausente del tarifario del contrato pero presente en ISS 2001.

El agente debe documentar en `observaciones` de F07: *"CUPS X ausente del anexo contractual; aplicada tarifa ISS 2001 por cláusula Y.Z del contrato marco"*.

### Regla 3 — SOAT 2026 (piso legal)

Aplica cuando:
- El pagador real del evento es SOAT/ADRES (el sub-agente administrativo ya habrá seleccionado el checklist_soat).
- O cuando el contrato marco, cláusula 5.2 o equivalente, autoriza liquidar al 100 % SOAT lo no contratado **con autorización previa escrita del pagador**.

En este último caso la autorización es un requisito formal: sin autorización → glosa por causal 4 (autorización) incluso si la tarifa SOAT es correcta.

## Tabla de decisión rápida

| Caso | Tarifario a usar | Reglas FIN-CTR involucradas |
|---|---|---|
| CUPS contratado, pagador EPS | `tarifario_contrato_eps_2026.csv` | F07, F08, F13 |
| CUPS no contratado, contrato remite a ISS 2001 | `tarifario_iss_2001.csv` | F07, F13 + observación |
| CUPS no contratado, servicio autorizado por el pagador | `tarifario_soat_2026.csv` | F07, F13, F18 |
| Pagador real es SOAT/ADRES | `tarifario_soat_2026.csv` | `checklist_soat_base.json` entero (S01–S21) |

## Esquema común de los CSV

| Columna | Tipo | Significado |
|---|---|---|
| `CODIGO_CUPS` | string | Código CUPS/CUM/CUR del servicio. |
| `DESCRIPCION` | string | Descripción breve. |
| `TARIFA_COP` | int | Tarifa unitaria en pesos colombianos. |
| `UNIDAD` | string | Unidad de cobro (`consulta`, `dia`, `evento`, `estudio`, `unidad`, `vial`, etc.). |
| `MODALIDAD` | string | `evento` · `paquete` · `capita` · `pgp`. |
| `NOTAS` | string | Condiciones, requisitos, exclusiones. |

## Cobertura cardiológica del tarifario contratado

Para respaldar el caso demostrativo de hospitalización por patología cardiológica, `tarifario_contrato_eps_2026.csv` incluye CUPS específicos:

- **Estudios de función cardíaca:** ecocardiograma transtorácico/transesofágico/stress, prueba de esfuerzo ± SPECT, Holter 24/48h, MAPA, ECG.
- **Procedimientos invasivos:** cateterismo derecho/izquierdo, coronariografía, angioplastia ± stent convencional/farmacoactivo.
- **Dispositivos:** implante de marcapasos uni/bicameral, CDI, stents coronarios, válvulas.
- **Biomarcadores:** BNP, NT-proBNP, troponina I ultra-sensible, dímero D.
- **Medicamentos cardiovasculares:** IECA/ARA-II, betabloqueadores, estatinas, antiplaquetarios, iSGLT2, amiodarona, nitroglicerina, diuréticos, sacubitril-valsartán (no-PBS MIPRES).
- **Paquetes:** cirugía cardíaca valvular, bypass coronario, SCA con ICP + stent.

## Cómo comparar tarifas (para F13 / F14)

```
diferencia_absoluta = tarifa_facturada - tarifa_referencia
diferencia_pct      = diferencia_absoluta / tarifa_referencia × 100

si diferencia_pct > +2 %  → probable sobrecobro → glosa causal 2
si diferencia_pct < -2 %  → sub-facturación (raro; verificar error del prestador)
si |diferencia_pct| ≤ 2 % → pass (tolerancia de redondeo del liquidador)
```

Recargos (F14) deben aplicarse sobre la tarifa base y documentarse explícitamente:
- Nocturno (20:00–06:00): +25 %
- Festivo: +30 %
- Urgencia: +10 %
- Especialista subespecializado: según tabla del manual aplicable.

## Extensibilidad

Para añadir un nuevo tarifario (p.ej. acuerdo bilateral con red especializada):
1. Crear `tarifario_<nombre>_<año>.csv` con el mismo esquema.
2. Añadir a este INDEX en el orden de precedencia apropiado.
3. Si introduce modalidades nuevas (p.ej. valor-basado, por outcome), documentarlo en `facturacion/checklist.md`.
