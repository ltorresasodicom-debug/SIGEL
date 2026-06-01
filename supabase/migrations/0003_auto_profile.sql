-- =============================================================================
-- SIGEL — Auto-perfil al crear usuario en auth (migración 0003)
-- Aditiva sobre 0001_init.sql + 0002_motor_real.sql. NO destructiva.
-- Re-ejecutable (idempotente).
-- Aplicar pegándolo en el SQL Editor del dashboard de Supabase.
--
-- Objetivo: cada inserción en auth.users produce automáticamente una fila
-- en public.profiles con rol = 'ciudadano'. Elimina el paso manual previo.
-- =============================================================================

-- ── 1. Función que crea el perfil (security definer para saltar RLS) ─────────
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      null
    ),
    'ciudadano'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 2. Trigger sobre auth.users (re-ejecutable) ───────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3. Backfill: usuarios pre-existentes sin perfil ──────────────────────────
insert into public.profiles (id, rol)
select u.id, 'ciudadano'
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
