# Componentes del Dashboard — SIGEL (CORE UX/UI · Fase 1, sesión 4)

## Objetivo de la sesión
Completar el branding de la plataforma y estabilizar el dashboard principal:
un componente único, limpio y branded, con manejo explícito de estados vacíos.

---

## 1. Revisión de branding

Se revisó header, logo, paleta y nombre de la plataforma. **El branding es
consistente; no se requiere ajuste.**

| Elemento | Estado | Fuente |
|---|---|---|
| **Nombre** | Consistente: `SIGEL` + etiqueta `Ecuador` (header), `SIGEL Ecuador` (footer), `SIGEL Ecuador — Sistema Integral de Gestión y Evaluación Local` (`<title>`). | `MainLayout.tsx`, `index.html` |
| **Logo** | Wordmark tipográfico (sin imagen): `font-display` (Manrope) `font-extrabold tracking-tight`. Coherente entre header y footer. | `MainLayout.tsx:36`, `:69` |
| **Paleta** | Primario `#1e3a8a` (`--color-sigel-primary`), acento `#d97706` (`--color-sigel-accent`). Aplicada vía tokens `@theme`. `theme-color` del HTML = `#1E3A8A` (mismo color). | `tokens.css`, `index.html:11` |
| **Tipografía** | `Inter` (texto) + `Manrope` (display), precargadas en `index.html`. | `index.html:14` |

**Observación menor (sin acción):** el `theme-color` del `<meta>` usa mayúsculas
(`#1E3A8A`) y el token CSS minúsculas (`#1e3a8a`). Es el mismo color; el casing en
un atributo HTML es irrelevante y no produce deriva visual.

> La unificación de la *fuente de color* de scoring (semáforo/nivel/umbrales) sigue
> siendo el ítem **P0-3** del roadmap de auditoría y se aborda en sesión aparte.

---

## 2. Dashboard principal

### `Dashboard` — `src/features/dashboard/Dashboard.tsx`
Panel principal data-driven de SIGEL ("Panorama nacional"). Antes vivía disperso
dentro de `HomePage` (tarjetas de métricas en el hero + sección Top 5 inline); ahora
está **consolidado en un solo componente autónomo** que rellena el shell de feature
que estaba vacío (`features/dashboard`).

- **Props:** ninguna. Es autónomo.
- **Datos:** consume `useSigelData()` (TanStack Query) directamente. No recibe datos
  por props → reutilizable sin acoplar al padre.
- **Composición:** KPIs institucionales (vía `Stat`) + Top 5 nacional (lista de
  enlaces a `/gad/:id` con `Badge` + `SemaforoDot`).
- **Branding/accesibilidad:** `<section aria-labelledby>` con encabezado `<h2>`;
  emoji de estado vacío marcado `aria-hidden`.

#### KPIs mostrados
| KPI | Origen | Notas |
|---|---|---|
| Alcaldías | `stats.municipales` | — |
| Prefecturas | `stats.provinciales` | — |
| INGEL promedio | `stats.promedio.toFixed(1)` | — |
| Dimensiones | `DIMENSIONES.length` | **Derivado** (antes era el literal `8` hardcodeado). |

#### Estados (carga → vacío → error → contenido)
| Estado | Condición | Render |
|---|---|---|
| **Carga** | `isLoading` | `Spinner` (vía `DataBoundary`). |
| **Error** | `error` | Mensaje de error (vía `DataBoundary`). |
| **Vacío** | `data.gads.length === 0` | `Card` con icono, mensaje y enlace para crear la primera evaluación. **No se rompe ni muestra una lista vacía.** |
| **Contenido** | hay GADs | KPIs + Top 5. |

El estado vacío usa guardas seguras (`stats?.…`, `?? '—'`) de modo que el dashboard
**carga sin errores aun con datos vacíos**.

### `HomePage` — `src/pages/HomePage.tsx`
Quedó como página de aterrizaje delgada y declarativa:
1. **Hero** (titular + CTAs `Button`). Ahora en una sola columna; las métricas que
   antes ocupaban la columna derecha se movieron al `Dashboard`.
2. **`<Dashboard />`** (panorama nacional).
3. **Features** (qué se puede hacer).
4. **Metodología** (resumen + dimensiones).

---

## 3. Primitivas del design system usadas por el dashboard
Definidas en `src/components/ui.tsx` (sin cambios en esta sesión):

| Componente | Rol en el dashboard |
|---|---|
| `Card` | Contenedor del estado vacío. |
| `Stat` | Tarjetas de KPI (variante clara, no `invert`). |
| `Badge` | Nivel cualitativo de cada GAD del Top 5. |
| `SemaforoDot` | Indicador verde/amarillo/rojo por GAD. |
| `Spinner` | Estado de carga (dentro de `DataBoundary`). |
| `DataBoundary` | Envoltura carga/error. *(Mejora pendiente: P1-7.)* |

---

## 4. Naturaleza de los datos
Los puntajes por dimensión son **sintéticos por diseño** (derivados de forma
determinista de datos electorales) y están rotulados como tales en
`services/sigel-data.ts` y en la página de Metodología. **No son un placeholder**:
en esta sesión se conservaron intactos (alcance UX/UI; no se tocó lógica de datos ni
scoring). Lo que se eliminó fue el único literal hardcodeado visible que no provenía
del modelo: el `8` de "Dimensiones", ahora derivado de `DIMENSIONES.length`.
