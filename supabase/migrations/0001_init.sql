-- =============================================================================
-- SIGEL — Esquema inicial (Supabase / PostgreSQL)
-- Aplicar con: supabase db push   (o pegar en el SQL Editor del dashboard).
-- =============================================================================

-- ── Perfiles de usuario (extiende auth.users) ───────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text,
  rol         text not null default 'ciudadano',
  created_at  timestamptz not null default now()
);

-- ── Catálogo de gobiernos locales ───────────────────────────────────────────
create table if not exists public.gads (
  id         text primary key,                 -- slug estable (tipo:provincia:canton)
  tipo       text not null,                    -- MUNICIPAL | PROVINCIAL
  nombre     text not null,
  provincia  text not null,
  canton     text,
  autoridad  text,
  partido    text
);

-- ── Evaluaciones ciudadanas ─────────────────────────────────────────────────
create table if not exists public.evaluaciones (
  id          uuid primary key default gen_random_uuid(),
  gad_id      text not null references public.gads (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,  -- null = anónima
  respuestas  jsonb not null,
  dims        jsonb not null,
  ingel       numeric(5,2) not null,
  nivel       text not null,
  semaforo    text not null,
  iri         numeric(5,2) not null,
  comentario  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_evaluaciones_gad     on public.evaluaciones (gad_id);
create index if not exists idx_evaluaciones_created on public.evaluaciones (created_at desc);

-- ── Indicadores oficiales por GAD (INEC, etc.) ──────────────────────────────
create table if not exists public.indicadores (
  id       uuid primary key default gen_random_uuid(),
  gad_id   text not null references public.gads (id) on delete cascade,
  fuente   text not null,
  anio     int  not null,
  payload  jsonb not null
);
create index if not exists idx_indicadores_gad on public.indicadores (gad_id);

-- ── Snapshots de ranking (analítica longitudinal) ───────────────────────────
create table if not exists public.ranking_snapshots (
  id        uuid primary key default gen_random_uuid(),
  fecha     date not null,
  gad_id    text not null references public.gads (id) on delete cascade,
  ingel     numeric(5,2) not null,
  posicion  int not null
);
create index if not exists idx_ranking_fecha_gad on public.ranking_snapshots (fecha, gad_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.gads              enable row level security;
alter table public.evaluaciones      enable row level security;
alter table public.indicadores       enable row level security;
alter table public.ranking_snapshots enable row level security;

-- Lectura pública de datos de referencia
create policy "gads lectura pública"        on public.gads              for select using (true);
create policy "indicadores lectura pública" on public.indicadores       for select using (true);
create policy "ranking lectura pública"     on public.ranking_snapshots for select using (true);

-- Evaluaciones: lectura pública (agregados); inserción abierta (anónima o autenticada)
create policy "evaluaciones lectura pública" on public.evaluaciones for select using (true);
create policy "evaluaciones inserción"       on public.evaluaciones for insert with check (
  user_id is null or user_id = auth.uid()
);

-- Perfiles: cada usuario gestiona el suyo
create policy "perfil propio lectura"  on public.profiles for select using (auth.uid() = id);
create policy "perfil propio escritura" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
