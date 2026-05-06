# 14 — Team presentation HTML (Phase 13)

> Convención de scaffold para `docs/cliente/team_presentation/index.html`. **No** es un template inline; es la lista mínima de bloques + componentes a producir + archivos a copiar de un patrón de referencia.

## Producto a entregar

- `docs/cliente/team_presentation/index.html` — un único archivo HTML self-contained con CSS inline y deck navegable (←/→).
- Sin assets externos excepto Google Fonts (Archivo + JetBrains Mono).
- Sin imágenes PNG salvo logos del cliente / Arkangel.

## Scaffold mínimo

```
docs/cliente/team_presentation/
├── index.html        # único archivo público
└── README.md         # nota interna: cómo abrir, dónde editar, cómo regenerar
```

## Componentes obligatorios (CSS classes que deben existir)

| Clase | Componente | Slide típica |
|---|---|---|
| `.deck`, `.slide`, `.slide.active` | container + slide framework | infraestructura |
| `.cover` | layout especial slide 1 | slide 1 |
| `.lockup`, `.ark-mark` | branding header | todas |
| `.eyebrow`, `.title` | typography | todas (excepto cover) |
| `.duo-grid`, `.stat-card.prod-card`, `.stat-card.new-card` | comparación 1-on-1 | slide 4 |
| `.insight-grid`, `.insight-card` | 3 cards en row | slide 3, 5 |
| `.shap-grid`, `.shap-col.prod-col`, `.shap-col.new-col`, `.shap-row`, `.shap-row .feat .bar-bg .bar .val` | SHAP / variables / calibración | slide 6, 9 |
| `table.cmp` con `.metric .num.prod .num.new .delta .highlight` | tabla métricas | slide 10 |
| `.cta-block`, `.cta-list` | pedidos numerados | slide 11 |
| `.problem-list`, `.pl-num`, `.pl-text` | diagnóstico | slide 2 |
| `.nav` con `.counter`, prev/next buttons | navegación | global |
| `.progress` | barra de progreso top | global |

## Brand kit

| Variable CSS | Default Arkangel | Cliente custom |
|---|---|---|
| `--orange` | `#ff5924` | <!-- TODO: si cliente tiene primario, override --> |
| `--ink` | `#0A0A0A` | mantener |
| `--bg` | `#FAFAF7` | mantener |
| `--prod` | `#6B7280` | mantener (modelo actual = gris) |
| `--rule` | `#E8E6E1` | mantener |

## Reglas de contenido vinculantes

1. **Todas las métricas en %.** AUC → %. Brier → %. Diferencias en pp.
2. **SHAP / feature importance en `.shap-grid`**, no como `<img>`.
3. **Tablas en `table.cmp`**, no como `<img>`.
4. **Variables traducidas a plain-Spanish** en el atributo `.feat` de cada `.shap-row`.
5. **Sin email / contacto** en slide de cierre por default.
6. **Sin jargon ML:** prohibidos en el HTML cliente — `foundation model`, `ensemble`, `Optuna`, `Brier`, `ECE`, `slope`, `intercept`, `walk-forward`, `bootstrap`, `AUC`, `SHAP`. Traducir todo a lenguaje accionable.
7. **Highlight de cohort indicator** si aplica: la fila del cohort indicator en el modelo actual lleva `class="shap-row flag"` (color naranja + estrella ★) para marcar que es bandera roja.
8. **Highlight de bucket roto** en slide calibración: la fila del bucket donde el actual dice 78% y solo 5% se va lleva fondo `rgba(177, 42, 26, 0.06)` (red-soft) — visual cue del problema.

## Patrón de referencia interno

Copiar HTML completo de un proyecto previo y adaptar contenido. Los componentes ya están testeados en producción.

> **Nota:** los proyectos de referencia internos no son públicos. Pedir al project owner el path del proyecto más reciente con Phase 13 deck completo.

## Smoke test

Antes de mandar al cliente, verificar:

- [ ] Todas las métricas en %, ningún `0.78` suelto.
- [ ] Ningún `<img src=".../*.png">` excepto logos.
- [ ] Variables en plain-Spanish, no nombres de columna del dataset.
- [ ] Slide de cierre sin email/contacto (a menos que el project owner confirme).
- [ ] Navegación ←/→ + Home/End funcional.
- [ ] Renderiza correctamente en Chrome y Safari (probar en zoom 100% / 150% / 200%).
- [ ] Responsive: en 1100px de ancho los `.shap-grid` y `.duo-grid` colapsan a 1 columna.
- [ ] Brand colors del cliente respetados (si aplica).
