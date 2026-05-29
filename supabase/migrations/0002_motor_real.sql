-- =============================================================================
-- SIGEL — Motor real: mediciones objetivas + ranking dinámico (migración 0002)
-- Aditiva sobre 0001_init.sql. NO destructiva. Re-ejecutable (idempotente).
-- Aplicar con: supabase db push   (o pegar en el SQL Editor del dashboard).
-- Requiere que 0001_init.sql ya esté aplicada (tablas base + políticas).
-- =============================================================================

-- ── 1. Extender el catálogo territorial (gads) ───────────────────────────────
alter table public.gads add column if not exists poblacion   integer;
alter table public.gads add column if not exists lat         numeric(9,6);
alter table public.gads add column if not exists lng         numeric(9,6);
alter table public.gads add column if not exists feature_id  text;   -- join al geojson
create index if not exists idx_gads_provincia on public.gads (provincia);

-- ── 2. Mediciones objetivas por cantón (reemplazan los scores sintéticos) ─────
--    Formato "tidy": una fila por (gad, dimensión, indicador, fecha, fuente).
create table if not exists public.mediciones (
  id          uuid primary key default gen_random_uuid(),
  gad_id      text  not null references public.gads (id) on delete cascade,
  dimension   text  not null,            -- DimensionCodigo (ver CHECK)
  indicador   text  not null,            -- código/nombre del indicador concreto
  valor       numeric    not null,       -- valor crudo del indicador
  unidad      text,                      -- '%', 'USD', 'índice 0–100', …
  valor_norm  numeric(5,2),              -- normalizado 0–100 para scoring (opcional)
  fuente      text  not null,            -- 'INEC 2024', 'Contraloría', …
  fecha       date  not null,            -- fecha de observación
  created_at  timestamptz not null default now(),
  constraint chk_mediciones_dimension check (dimension in (
    'transparencia','finanzas','servicios','desarrollo',
    'gestion_institucional','participacion','legitimidad','innovacion'
  )),
  constraint chk_mediciones_norm check (valor_norm is null or valor_norm between 0 and 100)
);
-- Idempotencia de ingesta + accesos frecuentes
create unique index if not exists uq_mediciones_natural
  on public.mediciones (gad_id, dimension, indicador, fecha, fuente);
create index if not exists idx_mediciones_gad on public.mediciones (gad_id);
create index if not exists idx_mediciones_dim on public.mediciones (dimension);

-- ── 3. Ranking dinámico con desglose por dimensión y período ──────────────────
create table if not exists public.rankings (
  id                    uuid primary key default gen_random_uuid(),
  gad_id                text not null references public.gads (id) on delete cascade,
  periodo               text not null,            -- '2024', '2024-Q4', '2025-05'
  score_total           numeric(5,2) not null,    -- INGEL 0–100
  scores_por_dimension  jsonb not null,           -- { "transparencia": 72.5, … }
  nivel                 text not null,            -- Nivel
  semaforo              text not null,            -- Semaforo
  posicion              integer,                  -- ranking nacional del período
  created_at            timestamptz not null default now(),
  constraint chk_rankings_score    check (score_total between 0 and 100),
  constraint chk_rankings_nivel    check (nivel in ('EXCELENTE','ALTO','MEDIO','BAJO','CRITICO')),
  constraint chk_rankings_semaforo check (semaforo in ('VERDE','AMARILLO','ROJO'))
);
create unique index if not exists uq_rankings_gad_periodo on public.rankings (gad_id, periodo);
create index if not exists idx_rankings_periodo_pos on public.rankings (periodo, posicion);
-- Nota: public.ranking_snapshots (0001) se conserva como legacy hasta migrar
-- src/services/supabase/rankings.ts a 'rankings'. Se elimina en una migración futura.

-- ── 4. Vínculo territorial del usuario (profiles ≈ usuarios) ──────────────────
alter table public.profiles add column if not exists gad_id text
  references public.gads (id) on delete set null;            -- canton_id si aplica
alter table public.profiles drop constraint if exists chk_profiles_rol;
alter table public.profiles add constraint chk_profiles_rol
  check (rol in ('ciudadano','analista','gad_admin','admin'));

-- ── 5. Helper de rol para RLS ─────────────────────────────────────────────────
create or replace function public.current_rol()
  returns text language sql stable security definer set search_path = public as $$
  select rol from public.profiles where id = auth.uid()
$$;

-- ── 6. Row Level Security ─────────────────────────────────────────────────────
alter table public.mediciones enable row level security;
alter table public.rankings   enable row level security;

-- Lectura pública (datos de referencia agregados)
drop policy if exists "mediciones lectura pública" on public.mediciones;
create policy "mediciones lectura pública" on public.mediciones for select using (true);
drop policy if exists "rankings lectura pública" on public.rankings;
create policy "rankings lectura pública"   on public.rankings   for select using (true);

-- Escritura solo para staff (analista/admin). El ETL server-side usa service_role
-- (bypassa RLS), por lo que estas políticas cubren edición desde la app autenticada.
drop policy if exists "mediciones escritura staff" on public.mediciones;
create policy "mediciones escritura staff" on public.mediciones for all to authenticated
  using (public.current_rol() in ('analista','admin'))
  with check (public.current_rol() in ('analista','admin'));
drop policy if exists "rankings escritura staff" on public.rankings;
create policy "rankings escritura staff" on public.rankings for all to authenticated
  using (public.current_rol() in ('analista','admin'))
  with check (public.current_rol() in ('analista','admin'));

-- ── 7. Endurecimiento: el usuario NO puede auto-editar su rol ─────────────────
-- (RLS no filtra columnas; se usan privilegios a nivel de columna.)
revoke update on public.profiles from authenticated;
grant  update (nombre, gad_id) on public.profiles to authenticated;
