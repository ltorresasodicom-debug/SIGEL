# SIGEL — Diagnóstico general y hoja de ruta

_Última actualización: 2026-09-09. Documento vivo; actualizar al cerrar cada
frente._

Estado del proyecto de cara a las **elecciones de autoridades locales de
noviembre 2026** y al objetivo de sustituir datos sintéticos por fuentes
oficiales.

## 1. Procedencia de datos por vista (real vs sintético)

Todo el dataset base parte de `public/data/electoral.json` (autoridades
electas en las **seccionales 2023**, vigentes hasta noviembre 2026) y calcula
puntajes **sintéticos** por dimensión con un hash FNV del nombre
(`syntheticDimensionScores`, `src/services/sigel-data.ts:74-87`). Sobre esa
base se superponen datos reales cuando existen.

| Vista | Fuente | Estado |
|---|---|---|
| Top 5 home (`Dashboard.tsx`) | `public.rankings` + fallback sintético | **Real** |
| Ranking (`RankingPage.tsx`) | `public.rankings` + fallback | **Real** |
| Histórico de ficha (`GadPage`) | `public.rankings` | **Real** |
| Paneles INEC/DPE de la ficha | JSON `public/data/*_2024.json` | **Real** cuando existe |
| **Mapa coroplético** (`MapaPage.tsx`) | `public.rankings` + fallback | **Real** (esta sesión) |
| Perfil por dimensión de la ficha | `gad.dims` sintético | ⚠️ Sintético |
| Índices complementarios de la ficha | derivados sintéticos | ⚠️ Sintético |

El motor de ranking (`src/services/rankings/compute.ts:30-44`) promedia
`valor_norm` por GAD × dimensión desde `public.mediciones`, sin acoplarse a
indicadores concretos: cada fuente nueva entra al promedio al recalcular.

## 2. Cobertura de datos reales

| Nivel de GAD | Con datos reales DPE | Total | Notas |
|---|---|---|---|
| Municipal (cantones) | 141 | 221 | gaps abajo |
| **Provincial (prefecturas)** | 0 → pipeline listo | 23 | ingesta habilitada esta sesión |

Gaps municipales (`data/sources/dpe_csv/_errores.log`, `gad_rucs.csv`):
- 8 con HTTP 404 en diciembre (reintentables en meses alternos).
- ~11 no corridos / CSV vacío.
- ~61 cantones que nunca aparecieron en el catastro DPE (no publican Núm. 6).
- 4 outliers de ejecución >150% (p.ej. cant-121 8177%) — auditar el CSV
  fuente; probable columna mal mapeada, no sobreejecución real.

**Hallazgo clave:** el POST `/presupuesto {ruc:null}` del API de la Defensoría
del Pueblo (DPE) devuelve **todas** las instituciones; solo filtrábamos
municipios. La **misma API sirve para prefecturas** — no hace falta una fuente
nueva, solo el matcher provincial (implementado esta sesión).

## 3. Deuda de "temporada electoral"

No hay config central de año/período; los literales están dispersos:
- `PERIODO_TOP='2024'` (`Dashboard.tsx:19`), `PERIODO_MAPA='2024'`
  (`MapaPage.tsx`), `PERIODO_FALLBACK='2024'` (`RankingPage.tsx:13`).
- "% en elecciones 2023" (`GadPage.tsx`), "Indicadores oficiales 2024".
- Rutas `*_2024.json` (`sigel-data.ts:243-244`).

`electoral.json` refleja autoridades 2023 y **no se toca hasta después de
noviembre** (cambiarlo ahora falsea la app y recalcula los scores sintéticos
derivados). Tras la elección: actualizar `electoral.json` + centralizar la
config.

## 4. La calculadora de intención de voto

`src/pages/CalculadoraPage.tsx` es hoy un **simulador genérico
autocontenido**: 13 preguntas Likert → suma ponderada → "índice de intención
de voto" (%) + segmento de votante. **No persiste nada** ("tus respuestas no
salen de tu navegador") ni consume datos externos.

Objetivo del usuario: convertirla en un **producto de datos** — recolectar la
intención de voto ciudadana hacia los candidatos de noviembre 2026 y agregarla
en una base de datos consultable. Ver Roadmap §1. **Es el único item atado al
calendario electoral** (~2 meses); debería estar recolectando antes de la
elección.

## 5. Roadmap priorizado

1. **Calculadora → producto de datos (SIGUIENTE, deadline nov 2026).**
   Tabla `public.intencion_voto` (candidato, cargo, territorio, índice,
   segmento, respuestas jsonb, demografía, timestamp) con RLS de inserción
   pública; `insert` al finalizar la calculadora; panel agregado por
   candidato/cargo/territorio con avisos de sesgo y privacidad. Sanear el
   modelo (offset `+0.09`, paleta duplicada — `docs/auditoria-ui.md:102-109`).
2. **Perfil por dimensión de la ficha con datos reales** — reutilizar
   `aplicarRankingReal` (`src/services/rankings/aplicar-real.ts`) leyendo
   `scores_por_dimension` con fallback.
3. **Exprimir cobertura municipal** — reintentar los 8 con 404, correr meses
   alternos, auditar outliers.
4. **Config central de temporada electoral** — un módulo con año/período por
   defecto y etiquetas; post-noviembre actualizar `electoral.json`.

## 6. Hecho en esta sesión (2026-09-09)

- **Prefecturas vía DPE:** matcher provincial en `scripts/fetch_dpe.py`
  (`extraer_provincia`, `es_gad_provincial`, `match_provincia`,
  `cargar_indice_provincial`, `PROVINCIA_ALIASES`) + flag
  `catastro --tipo {municipal,provincial,ambos}`. Validado offline: las 23
  provincias emparejan a `prov-N` en 3 plantillas de nombre, sin colisión con
  municipios. `build_seed_dpe_finanzas.py` ahora emite también `prov-*`.
  `attachFinanzasDpe` (`sigel-data.ts`) recorre todos los GAD → la ficha de
  una prefectura muestra el panel de ejecución presupuestaria.
- **Mapa con datos reales:** `MapaPage` colorea por el INGEL real de
  `public.rankings` (helper `aplicarRankingReal`, con fallback sintético y
  badge de fuente). El Top 5 de la home ya era real; las prefecturas entran
  solas al recalcular.
- Pendiente operativo del usuario (requiere red): correr
  `catastro --tipo ambos`, `presupuesto`, `csv`, `npm run seed:dpe:finanzas`,
  reaplicar el seed 0005 y recalcular el ranking 2024.
