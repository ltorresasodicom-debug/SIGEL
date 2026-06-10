# SIGEL — Puesta en marcha del backend Supabase

Guía operativa de **tres acciones manuales** sobre el dashboard de
Supabase para dejar el backend listo: migración del motor real, carga
seed de demo y cuenta(s) de prueba para auth.

Todas las operaciones son **idempotentes**: se pueden re-ejecutar sin
duplicar ni romper el estado.

Pre-requisito: la migración inicial **`0001_init.sql` debe estar
aplicada**. Si no lo está, aplícala primero con el mismo procedimiento
del paso 1.

> **Nota:** una vez aplicada también la migración
> `0003_auto_profile.sql` (ver más abajo), cada nuevo `auth.users` recibe
> automáticamente su fila en `public.profiles` con `rol = 'ciudadano'`.
> El **paso 3B** queda como opcional, solo para *elevar* el rol a
> `analista` / `gad_admin` / `admin`.

---

## Paso 1 · Aplicar `supabase/migrations/0002_motor_real.sql`

**Qué hace:** extiende `public.gads` (`poblacion`, `lat`, `lng`,
`feature_id`), crea las tablas `public.mediciones` y `public.rankings`
con sus índices únicos, agrega la función `public.current_rol()`, activa
RLS y bloquea que un usuario edite su propio `rol`.

1. Entra a <https://supabase.com/dashboard> y abre el proyecto SIGEL.
2. Menú lateral → **SQL Editor** → **+ New query**.
3. Abre `supabase/migrations/0002_motor_real.sql` en tu editor local,
   copia el archivo entero y pégalo en el SQL Editor.
4. Pulsa **Run** (`Ctrl/Cmd + Enter`). Espera `Success. No rows returned`.
5. Verifica con esta query:

   ```sql
   select table_name
     from information_schema.tables
    where table_schema = 'public'
      and table_name in ('mediciones','rankings');
   -- Esperado: 2 filas.

   select column_name
     from information_schema.columns
    where table_schema = 'public' and table_name = 'gads'
      and column_name in ('poblacion','lat','lng','feature_id');
   -- Esperado: 4 filas.

   select proname from pg_proc where proname = 'current_rol';
   -- Esperado: 1 fila.
   ```

**Si falla** con un error tipo `relation "public.gads" does not exist`:
falta aplicar `0001_init.sql`. Aplícala primero con el mismo
procedimiento y vuelve a correr `0002`.

---

## Paso 2 · Aplicar `supabase/seeds/0001_demo.sql`

**Qué hace:** dentro de una sola transacción inserta **244 GADs** en
`public.gads` y **1.952 mediciones** (244 × 8 dimensiones) en
`public.mediciones`. Usa `on conflict do nothing` en ambos inserts:
re-aplicar no duplica.

1. SQL Editor → **+ New query**.
2. Abre `supabase/seeds/0001_demo.sql` localmente (≈270 KB, ≈2 500
   líneas). Copia el contenido completo y pégalo en el SQL Editor.
3. Pulsa **Run**. Tarda 5–20 s.
4. Verifica:

   ```sql
   select count(*) as gads        from public.gads;        -- 244
   select count(*) as mediciones  from public.mediciones;  -- 1952
   select dimension, count(*) from public.mediciones group by 1 order by 1;
   -- 8 filas (una por dimensión), 244 cada una.
   select * from public.mediciones limit 3;
   ```
5. (Opcional) Re-corre el mismo SQL para confirmar idempotencia: los
   conteos no deben cambiar.

**Si falla** con `relation "public.mediciones" does not exist`: el paso
1 no se aplicó. Vuelve al paso 1.

---

## Paso 3 · Crear usuario(s) de prueba en Auth

### A — Crear el usuario en el dashboard

1. Dashboard → **Authentication** → pestaña **Users**.
2. **Add user → Create new user**.
3. Completa:
   - **Email:** un correo real al que tengas acceso.
   - **Password:** ≥ 8 caracteres; anótala.
   - **Auto Confirm User:** **marca la casilla** (evita el flujo de
     confirmación por email para la prueba).
4. **Create user**. Aparece con `Confirmed = ✓`.
5. Verifica:

   ```sql
   select id, email, email_confirmed_at
     from auth.users
    order by created_at desc
    limit 5;
   ```

### A.2 — Registro público desde la app

La app incluye una pestaña **"Crear cuenta"** en `/login` que llama a
`supabase.auth.signUp`. Para que funcione:

1. El provider **Email** debe estar habilitado (Dashboard →
   **Authentication → Sign In / Up**; viene activo por defecto).
2. El toggle **Confirm email** (misma pantalla) decide el flujo:
   - **ON** (default): el usuario recibe un correo y debe confirmarlo
     antes de poder iniciar sesión. Requiere SMTP funcional; el SMTP
     integrado de Supabase tiene límites bajos (≈2 emails/hora).
   - **OFF**: el registro inicia sesión de inmediato — recomendado para
     la demo mientras no haya SMTP propio configurado.
3. El trigger `handle_new_user` (migración 0003) crea automáticamente
   el perfil con `rol = 'ciudadano'` y copia el nombre del formulario.

### B — (Opcional) Elevar el rol en `public.profiles`

Con la migración `0003_auto_profile.sql` aplicada, el perfil ya existe
con `rol = 'ciudadano'`. Para elevar el rol y probar las políticas de
escritura staff-only (`analista` / `admin`) de `0002`, sobrescribe la
fila:

```sql
insert into public.profiles (id, nombre, rol)
select u.id, 'Lenin Torres (admin demo)', 'admin'
  from auth.users u
 where u.email = 'ltorres.asodicom@gmail.com'
on conflict (id) do update
  set rol = excluded.rol, nombre = excluded.nombre;
```

Valores válidos de `rol` (según el `CHECK` de `0002`):
`'ciudadano' | 'analista' | 'gad_admin' | 'admin'`.

Verifica:

```sql
select p.id, u.email, p.rol, p.nombre
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.created_at desc
 limit 5;
```

### C — Probar el login desde la app

1. En local, crea `.env` (a partir de `.env.example`) con:

   ```env
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```

   Los valores están en Dashboard → **Project Settings → API**. Usa la
   clave **`anon` / `public`** — nunca la `service_role` en el front.
2. `npm run dev` → abre `http://localhost:5173` → ve a la pantalla de
   Login.
3. Inicia sesión con el email/contraseña del paso A.
4. Si fijaste `rol = 'admin'` en el paso B, las acciones staff-only
   quedan habilitadas.

---

## Paso 4 · Aplicar `supabase/migrations/0003_auto_profile.sql`

**Qué hace:** instala el trigger `on_auth_user_created` sobre
`auth.users` que dispara `public.handle_new_user()` y crea
automáticamente la fila en `public.profiles` con `rol = 'ciudadano'`.
Incluye un backfill para usuarios pre-existentes sin perfil.
Idempotente.

1. SQL Editor → **+ New query** → pega
   `supabase/migrations/0003_auto_profile.sql` → **Run**.
2. Verifica:

   ```sql
   select proname from pg_proc where proname = 'handle_new_user';
   -- 1 fila.
   select tgname  from pg_trigger where tgname = 'on_auth_user_created';
   -- 1 fila.

   -- ningún auth.users debería quedar sin perfil
   select u.email, p.rol
     from auth.users u
     left join public.profiles p on p.id = u.id
    order by u.created_at desc;
   ```
3. **Prueba end-to-end:** crea un *segundo* usuario desde
   Authentication → Users (Auto-Confirm). Debe aparecer al instante
   con `rol = 'ciudadano'`:

   ```sql
   select u.email, p.rol, p.created_at
     from auth.users u
     join public.profiles p on p.id = u.id
    order by u.created_at desc
    limit 3;
   ```

---

## Estado tras estos cuatro pasos

- Esquema motor real desplegado (`mediciones`, `rankings`, RLS).
- 244 GADs + 1 952 mediciones de demo cargadas.
- Cuenta(s) listas para login real, con rol elevado opcional.
- Auto-creación de perfiles para todo nuevo usuario.

A partir de aquí, el siguiente paso del roadmap es **ranking dinámico
end-to-end** (capacidad B): que `recalcularRankings(periodo)` lea
`public.mediciones`, agregue por dimensión, calcule el INGEL con
`evaluation-engine`, asigne posición y haga upsert a `public.rankings`.
