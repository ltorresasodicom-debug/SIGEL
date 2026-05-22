# SIGEL Ecuador

Plataforma ciudadana de evaluación de gobiernos locales del Ecuador: rankings,
scoring institucional (INGEL) y evaluación participativa.

> **Migración en curso.** Esta rama contiene la nueva arquitectura
> **React + TypeScript + Vite + Supabase** (cimientos). El sitio estático
> anterior sigue disponible en la rama `main` (GitHub Pages) hasta el corte a
> producción en Vercel.

## Stack

- **React 18 + TypeScript 5 + Vite 5** — SPA con TypeScript estricto.
- **TailwindCSS v4** — estilos y design tokens.
- **React Router** — enrutamiento.
- **TanStack Query** — fetching, caché y sincronización.
- **Zustand** — estado global ligero.
- **Framer Motion** + **Lucide React** — animación e iconografía.
- **Supabase** — autenticación y persistencia (PostgreSQL).

## Puesta en marcha

```bash
npm install
cp .env.example .env      # completar con las credenciales de Supabase
npm run dev               # servidor de desarrollo
npm run build             # build de producción (tsc + vite)
npm run lint              # ESLint
```

## Arquitectura por capas

```
src/
  app/                Raíz, proveedores y rutas
  pages/              Componentes de ruta
  layouts/            Marcos de página (MainLayout)
  features/           Módulos de negocio (ranking, evaluation, dashboard, ...)
  components/         UI compartida
  evaluation-engine/  Motor de scoring INGEL — PURO (sin React ni Supabase)
  services/           Persistencia (Supabase) y APIs externas
  analytics/          Analítica territorial y longitudinal
  maps/               Componentes de mapa
  stores/             Estado global (Zustand)
  hooks/              Hooks reutilizables
  lib/                Cliente Supabase, query client, utilidades
  types/              Tipos compartidos y de base de datos
  styles/             Entrada Tailwind y design tokens
```

**Regla de dependencias:** UI → lógica de negocio (`features/*/hooks`, `stores`,
`hooks`) → `services` / `evaluation-engine` → `lib`. El `evaluation-engine` no
importa React ni Supabase: es puro y testeable. No se permiten imports "hacia
arriba" de capa.

Capas: **UI** (`pages`, `components`, `layouts`, `styles`) · **lógica de
negocio** (`features/*/hooks`, `stores`) · **motor de scoring**
(`evaluation-engine`) · **persistencia** (`services/supabase`, `lib/supabase`) ·
**analítica** (`analytics`).

## Base de datos

El esquema vive en `supabase/migrations/`. Aplicarlo con la CLI de Supabase
(`supabase db push`) o desde el SQL Editor del dashboard. Las credenciales se
configuran vía variables de entorno (`.env` local; Vercel en producción).

## Datos

Los datasets de referencia (electoral, indicadores INEC, geometrías) están en
`public/data/`. Los scripts ETL (Python) y sus fuentes están en `scripts/`.

## Despliegue

Vercel detecta Vite automáticamente (`vercel.json` incluido). Cargar
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en las variables de entorno del
proyecto.
