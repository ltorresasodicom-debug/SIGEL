# Informe de Auditoría UI — SIGEL

> **Dominio:** CORE UX/UI · Fase 1, sesión 1
> **Tipo:** Auditoría de solo lectura — **no se modificó código de la aplicación.**
> **Alcance leído:** `src/components/`, `src/pages/`, `src/layouts/`, `src/features/`, `src/maps/`, `src/styles/`, `src/lib/colores.ts`.

## Objetivo
Auditar el estado actual de los componentes de interfaz: inventario,
clasificación (estable / refactor / incompleto), duplicaciones, inconsistencias
visuales y una **lista priorizada de intervención** que sirva de hoja de ruta
para las siguientes sesiones (un objetivo técnico por sesión).

---

## 1. Inventario de componentes

### Componentes reutilizables reales (`src/components/`)
| Archivo | Exporta | Líneas |
|---|---|---|
| `ui.tsx` | `Card`, `Badge`, `SemaforoDot`, `Stat`, `ProgressBar`, `Spinner`, `DataBoundary` | 124 |
| `LikertScale.tsx` | `LikertScale` (radiogroup 1–5) | 40 |
| `SupabaseStatusBadge.tsx` | `SupabaseStatusBadge` | 25 |
| `SponsorCard.tsx` | `SponsorCard` | 26 |
| `SponsorSection.tsx` | `SponsorSection` | 23 |

### Componentes "ocultos" definidos dentro de páginas (no compartidos)
- `PanelInec` → `src/pages/GadPage.tsx:8`
- `PasoDimension` → `src/pages/EvaluarPage.tsx:314`
- `Navegacion` → `src/pages/CalculadoraPage.tsx:405`

### Cáscaras / scaffolding sin implementación
- `src/features/calculadora/index.ts`, `dashboard/index.ts`, `gad-profile/index.ts`
  → solo exportan una constante `*_FEATURE`. Vacías.
- `src/features/ranking` y `src/features/evaluation` → re-exportan hooks
  (`useRanking`, `useGuardarEvaluacion`) que apuntan a `services/supabase/*` pero
  **ningún page los consume** (las páginas usan `useSigelData` estático y
  `evaluaciones-local`).
- `src/maps/index.ts` → `export const MAPS_READY = false`. La lógica de Leaflet
  vive inline en `MapaPage.tsx`.

---

## 2. Clasificación

### 🟢 Estable (no requiere acción)
- `Card`, `Badge`, `SemaforoDot`, `ProgressBar` (con ARIA), `Spinner` — simples,
  bien tipados, reutilizados de forma consistente.
- `LikertScale` — accesible (`role=radiogroup/radio`, `aria-checked`, target táctil
  ≥44px). Correcto.
- `SupabaseStatusBadge`, `SponsorCard`, `SponsorSection` — recién creados/endurecidos.

### 🟡 Necesita refactor
- **`DataBoundary`** (`ui.tsx:105`): el estado de error **ignora el valor `error`**,
  muestra texto genérico, no ofrece reintento y no usa `role="alert"`. Debería
  surfacing del mensaje + botón "Reintentar" + región live.
- **`Stat`** (`ui.tsx:45`): duplica cadenas de clases con el booleano `invert`.
  Aceptable, pero candidato a tokenizar.
- **`PanelInec`, `PasoDimension`, `Navegacion`**: lógica de presentación atrapada
  en páginas; `Navegacion` y la barra de progreso de pasos se repiten entre
  `EvaluarPage` y `CalculadoraPage` (ver §3).

### 🔴 Incompleto
- `src/features/{calculadora,dashboard,gad-profile}` — declarados "preparada para
  portar" pero vacíos. `dashboard` no tiene nada construido.
- `src/features/{ranking,evaluation}` hooks → Supabase, **cableados pero no usados**
  = migración a medias (la UI sigue en datos estáticos/localStorage).
- `src/maps/index.ts` — `MAPS_READY = false`; el mapa no se ha portado a la capa.

---

## 3. Duplicaciones detectadas (orden de impacto)

1. **Botones (la mayor duplicación).** No existe `<Button>`. El botón primario
   `rounded-lg bg-sigel-accent … text-white … hover:opacity-90` y el secundario
   `rounded-lg border border-slate-300 bg-white … text-slate-600` se repiten ≥8
   veces: `HomePage`, `GadPage:186`, `EvaluarPage:154/283/292/299`,
   `CalculadoraPage:184/392` + `Navegacion`.
2. **Inputs / selects / textarea.** El patrón
   `rounded-lg border border-slate-300 … focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40`
   se repite: `RankingPage` (3×), `EvaluarPage` (2×), `CalculadoraPage` (4×). No hay
   `Input`/`Select`/`Field` compartidos.
3. **Navegación de wizard.** `Navegacion` (`CalculadoraPage:405`) ≈ los botones
   atrás/siguiente inline de `EvaluarPage:379-394`.
4. **Cabecera de progreso de pasos.** `EvaluarPage:335-341` y
   `CalculadoraPage:276-282` son casi idénticas ("Paso X de N" + `ProgressBar`).
5. **Hero de puntaje.** El bloque `text-6xl font-extrabold tabular-nums` + `Badge`
   + `SemaforoDot` aparece en `GadPage:101`, `EvaluarPage:229`, `CalculadoraPage:324`.
6. **Cabecera de página.** `<header><h1 font-display text-3xl … md:text-4xl><p text-lg text-slate-600>`
   se repite en Ranking, Mapa, Metodología, Evaluar, Calculadora → candidato a `PageHeader`.
7. **Color por umbral.** `colorPorIngel` existe en `lib/colores.ts`, pero
   `CalculadoraPage` reinyecta la misma ternaria verde/ámbar/rojo a mano
   (`:330`, `:380`).

---

## 4. Inconsistencias visuales

1. **Fuente de color fragmentada (crítico).** Tres fuentes compiten:
   - `@theme` en `index.css` (`--color-sigel-primary: #1e3a8a`).
   - `lib/colores.ts` (`NIVEL_STYLE`, `SEMAFORO_COLOR`, y `ProgressBar` con default
     hardcodeado `#1E3A8A` — mismo azul, distinta caja/casing).
   - `CalculadoraPage` define **su propia paleta** (`VERDE/INFO/ACC/AMA/ROJ/SLA`,
     `:31-36`) que duplica los hex de `NIVEL_STYLE`.
   - Verdes/ámbar/rojos del semáforo aparecen como literales en ≥4 archivos.
2. **Umbrales incoherentes** para la misma semántica verde/ámbar/rojo:
   - `colorPorIngel`: ≥70 / ≥50.
   - `MapaPage` leyenda: ≥70 / 50–69 / <50 (coincide).
   - `CalculadoraPage` barras de variable: ≥70 / ≥40 (`:380`).
   - `CalculadoraPage` puntaje principal: ≤30 / ≤60 (`:330`).
   → Tres esquemas de umbral distintos.
3. **Tokens de diseño muertos.** `tokens.css` define `--sp-*`, `--r-*`, `--sh-*`
   pero **nadie los usa**; los componentes usan literales Tailwind
   (`rounded-xl`, `shadow-sm`). Tokens sin efecto = ruido.
4. **Deriva de radios.** `Card` `rounded-xl`, botones `rounded-lg`, `SponsorCard`
   `rounded-2xl`, badges `rounded-full`. Sin escala acordada.
5. **Escala tipográfica de títulos inconsistente.** h2 en `HomePage` `text-3xl`,
   en `Metodologia` `text-2xl`, en resultados de `EvaluarPage` sin tamaño explícito.
6. **Iconografía por emoji** (📋📊🗺️🗳️💾🗑️📄) usada como UI; sin sistema de
   íconos, render variable entre plataformas y sin `aria-hidden`/etiqueta uniforme.
7. **Lenguaje de hover dispar.** Primarios `hover:opacity-90`; cards Home
   `hover:-translate-y-1 hover:shadow-lg` vs `SponsorCard` `hover:-translate-y-0.5
   hover:shadow-md`.
8. **Redundancia de contenido.** `MetodologiaPage:89` aún trae el texto "Con el
   apoyo de ASODICOM y Latam Cifras" en prosa, ahora que el footer tiene
   `SponsorSection`.

---

## 5. Lista priorizada de intervención

> Regla del proyecto: **un objetivo técnico por sesión**. Cada ítem ≈ una sesión.

### P0 — Sistema base (alto impacto, bajo riesgo, desbloquea consistencia)
1. `Button` con variantes (`primary`/accent, `secondary`/outline, `ghost`) →
   elimina la duplicación 3.1 y unifica hover.
2. Primitivas de formulario: `Input`, `Select`, `Textarea`, `Field`
   (label + control + error) → duplicación 3.2.
3. Unificar la **fuente de color**: centralizar semáforo/nivel/umbrales en
   `colores.ts` (o `@theme`), borrar la paleta local de `CalculadoraPage`,
   unificar umbrales vía `colorPorIngel` parametrizado → inconsistencias 4.1/4.2.

### P1 — Composición de vistas
4. `PageHeader` (título + subtítulo) → duplicación 3.6.
5. Wizard compartido: `WizardProgress` + `WizardNav` para Evaluar y Calculadora
   → 3.3/3.4.
6. `ScoreHero` (puntaje grande + Badge + SemaforoDot) → 3.5.
7. Mejorar `DataBoundary`: mostrar error real, botón reintentar, `role="alert"`.

### P2 — Higiene y decisiones
8. Tokens de diseño: cablear `--sp/r/sh-*` o eliminarlos (hoy muertos) → 4.3.
9. Estrategia de íconos (p. ej. `lucide-react`) vs emoji, aplicada con ARIA → 4.6.
10. Resolver el limbo de `features/*`: portar (ranking/evaluation → Supabase) o
    eliminar las cáscaras vacías (`dashboard`, `gad-profile`, `calculadora`,
    `maps/index`) para reducir ruido arquitectónico.
11. Quitar la prosa redundante de patrocinadores en `MetodologiaPage:89`.

---

## 6. Recomendación de siguiente sesión
Comenzar por **P0-1 (`Button`)**: es la duplicación de mayor impacto, bajo riesgo
y desbloquea la unificación del lenguaje de interacción. Cualquier decisión
arquitectónica (p. ej. portar vs. borrar `features/*`, elección de librería de
íconos) se consulta antes de implementar.
