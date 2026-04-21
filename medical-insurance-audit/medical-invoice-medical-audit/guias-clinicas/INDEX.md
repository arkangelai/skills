# Corpus de guías de práctica clínica (GPC)

Este índice mapea **diagnóstico principal CIE-10 → archivo GPC**. El sub-agente médico lo consulta para poblar `meta.gpc_aplicada` antes de evaluar las reglas M04, M06, M10, M14, M19, M22 del checklist.

## Algoritmo de selección

1. Extraer diagnóstico principal del radicado (campo `diagnostico_principal` del RIPS o epicrisis).
2. Buscar el código CIE-10 en la tabla abajo. Se acepta coincidencia por prefijo de 3 caracteres (ej. `I50.01` → `I50.*`).
3. Si hay match único → cargar el archivo GPC correspondiente.
4. Si no hay match → `meta.gpc_aplicada = null`, M04 queda `"n/a"` con observación explicativa, y se escala a humano (§5 de `checklist_base.md`).
5. Si hay múltiples GPCs aplicables (comorbilidades), priorizar la del diagnóstico principal y mencionar las adicionales en `observaciones` de M02.

## Tabla CIE-10 → GPC

| Rango CIE-10 | Descripción | Archivo |
|---|---|---|
| I10 – I15 | Enfermedades hipertensivas | [GPC_hipertension_arterial.md](GPC_hipertension_arterial.md) |
| I20 – I25 | Cardiopatía isquémica / síndrome coronario agudo | [GPC_sindrome_coronario_agudo.md](GPC_sindrome_coronario_agudo.md) |
| I47 – I49 | Arritmias cardíacas | [GPC_arritmias.md](GPC_arritmias.md) |
| I50 | Insuficiencia cardíaca | [GPC_falla_cardiaca.md](GPC_falla_cardiaca.md) |
| J12 – J18, J80, J96 | Neumonía grave, SDRA, insuficiencia respiratoria | [GPC_uci_respiratoria.md](GPC_uci_respiratoria.md) |
| O14 – O15, O72 | Preeclampsia / eclampsia, hemorragia posparto | [GPC_obstetricia_hospitalizacion.md](GPC_obstetricia_hospitalizacion.md) |

## Extensibilidad

Para agregar una nueva patología:
1. Crear `GPC_<nombre>.md` siguiendo la plantilla de 10 secciones (ver cualquier GPC existente).
2. Añadir fila en esta tabla con su rango CIE-10.
3. Validar que la GPC cita la fuente oficial (MinSalud, sociedad científica, AHA/ACC, etc.) y la versión vigente.

## Plantilla de 10 secciones (estándar del corpus)

1. Patología y CIE-10 cubiertos
2. Criterios diagnósticos
3. Criterios de hospitalización
4. Estudios iniciales esperados
5. Esquema de manejo farmacológico (PBS / no PBS)
6. Duración esperada de estancia
7. Criterios de egreso
8. Interconsultas esperadas
9. Banderas rojas (justifican UCI o procedimientos mayores)
10. Referencias
