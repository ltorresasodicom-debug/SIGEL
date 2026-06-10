-- =============================================================================
-- SIGEL — Gestión de usuarios para administradores (migración 0004)
-- Aditiva sobre 0001–0003. NO destructiva. Re-ejecutable (idempotente).
-- Aplicar pegándolo en el SQL Editor del dashboard de Supabase.
--
-- La RLS por fila se mantiene intacta: el listado de todos los usuarios y el
-- cambio de rol pasan exclusivamente por funciones security definer que
-- verifican que quien llama tiene rol 'admin' (vía public.current_rol, 0002).
-- Así se evita otorgar grants de columna sobre profiles.rol a authenticated,
-- que abriría la puerta a la auto-elevación de privilegios.
-- =============================================================================

-- ── 1. Listado de usuarios (email desde auth.users + perfil) ─────────────────
create or replace function public.admin_listar_usuarios()
  returns table (
    id         uuid,
    email      text,
    nombre     text,
    rol        text,
    gad_id     text,
    created_at timestamptz
  )
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if public.current_rol() is distinct from 'admin' then
    raise exception 'solo admin';
  end if;
  return query
    select u.id, u.email::text, p.nombre, p.rol, p.gad_id, p.created_at
      from auth.users u
      join public.profiles p on p.id = u.id
     order by p.created_at desc;
end;
$$;

-- ── 2. Cambio de rol de cualquier usuario ─────────────────────────────────────
create or replace function public.admin_set_rol(target_id uuid, nuevo_rol text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if public.current_rol() is distinct from 'admin' then
    raise exception 'solo admin';
  end if;
  if nuevo_rol not in ('ciudadano','analista','gad_admin','admin') then
    raise exception 'rol inválido: %', nuevo_rol;
  end if;
  update public.profiles set rol = nuevo_rol where id = target_id;
  if not found then
    raise exception 'usuario sin perfil: %', target_id;
  end if;
end;
$$;

-- ── 3. Privilegios de ejecución ───────────────────────────────────────────────
revoke execute on function public.admin_listar_usuarios()        from public, anon;
revoke execute on function public.admin_set_rol(uuid, text)      from public, anon;
grant  execute on function public.admin_listar_usuarios()        to authenticated;
grant  execute on function public.admin_set_rol(uuid, text)      to authenticated;
