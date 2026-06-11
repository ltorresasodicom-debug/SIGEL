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
3. **URL de redirección tras confirmar el email** (Dashboard →
   **Authentication → URL Configuration**). El link del correo manda
   al usuario al **Site URL** salvo que la app pase un
   `emailRedirectTo` (que ya hace `signUpWithEmail`, hacia
   `${origin}/login`). Para que esa redirección no falle:
   - **Site URL:** la URL principal del despliegue (p. ej.
     `https://sigel.example.com` en producción, o
     `http://localhost:5173` para desarrollo local con `npm run dev`).
   - **Redirect URLs:** lista blanca; **añade aquí cada URL desde la
     que se pueda registrar la gente**: producción, previews de Vercel,
     y `http://localhost:5173`. Si el link del correo lleva a un puerto
     que no tiene la app sirviendo (típico: `localhost:3000`), corrige
     estas dos opciones — el Site URL antiguo es la causa.
4. El trigger `handle_new_user` (migración 0003) crea automáticamente
   el perfil con `rol = 'ciudadano'` y copia el nombre del formulario.
   Esto es por diseño: el auto-registro nunca puede elegir su rol (eso
   sería auto-escalación de privilegios). Para promover un ciudadano a
   `analista` / `gad_admin` / `admin`, usa el panel `/admin` (ver paso 5)
   o el SQL del paso 3B.

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

## Paso 5 · Aplicar `supabase/migrations/0004_admin_usuarios.sql`

**Qué hace:** instala dos funciones `security definer` que sustentan el
panel `/admin` de la app: `admin_listar_usuarios()` (lista email +
perfil de todos los usuarios) y `admin_set_rol(target_id, nuevo_rol)`
(cambia roles). Ambas rechazan con `solo admin` si quien llama no tiene
`rol = 'admin'`. Idempotente.

1. SQL Editor → **+ New query** → pega
   `supabase/migrations/0004_admin_usuarios.sql` → **Run**.
2. Verifica:

   ```sql
   select proname from pg_proc where proname like 'admin_%';
   -- 2 filas: admin_listar_usuarios, admin_set_rol.
   ```
3. **Prueba end-to-end:** inicia sesión en la app con tu usuario admin →
   aparece el botón **Admin** en el header → la tabla lista todos los
   usuarios y permite cambiar roles. Con un usuario `ciudadano`, la
   página muestra "Acceso restringido" y la DB rechaza los RPC.

---

## Paso 6 · (Opcional) Segundo período: seed 2025 + recálculo

Activa la analítica longitudinal con un segundo período de mediciones.

1. SQL Editor → **+ New query** → pega
   `supabase/seeds/0002_demo_2025.sql` → **Run** (mismo procedimiento
   que el paso 2; idempotente).
2. Verifica:

   ```sql
   select fuente, count(*) from public.mediciones group by 1 order by 1;
   -- SIGEL demo v1 → 1952  ·  SIGEL demo v2 → 1952
   ```
3. En la app, con tu usuario staff: `/ranking` → campo **"Período a
   recalcular"** → escribe `2025` → **Recalcular**. La página salta al
   período 2025 y el selector de período muestra ambos años.
4. Verifica:

   ```sql
   select periodo, count(*) from public.rankings group by 1 order by 1;
   -- 2024 → 244  ·  2025 → 244
   ```
5. El histórico por GAD (ficha de cada GAD) ahora muestra la evolución
   2024 → 2025.

> El recálculo filtra las mediciones por el año calendario del período
> (`2025` → fechas entre 2025-01-01 y 2025-12-31), así los períodos no
> se mezclan entre sí.

---

## Paso 7 · (Opcional) Datos reales: INEC GADM 2024 (GIRS + APA)

Sustituye/complementa los valores sintéticos de la dimensión `servicios`
del período 2024 con índices reales del INEC (Gestión Integral de
Residuos Sólidos + Agua Potable y Alcantarillado), una medición real
por dataset y cantón (440 filas en total).

1. **Si necesitas regenerar el SQL desde el JSON fuente** (ya commiteado):
   `npm run seed:inec`. Produce `supabase/seeds/0003_indicadores_reales_inec.sql`.
2. SQL Editor → **+ New query** → pega ese archivo → **Run**. Idempotente.
3. Verifica:

   ```sql
   select fuente, count(*) from public.mediciones group by 1 order by 1;
   -- SIGEL demo v1 → 1952  ·  INEC GADM 2024 → 440  (·  SIGEL demo v2 si aplicaste el paso 6)

   select indicador, count(*), round(avg(valor),1) as promedio
     from public.mediciones where fuente = 'INEC GADM 2024'
    group by 1;
   -- inec_girs_2024_indice → 220 cantones  ·  inec_apa_2024_indice → 220 cantones
   ```
4. **Recalcula el ranking 2024** desde `/ranking` (botón staff). Los
   índices reales entran al promedio de `servicios` junto a la fila demo;
   las posiciones se actualizan. Cobertura actual: solo cantones (220
   con datos reales · provincias siguen 100% demo en `servicios`).

> **Por qué este patrón:** cada fuente real (INEC, Contraloría, AME,
> Fiscalía) se suma como mediciones nuevas con su propio `(indicador,
> fuente, fecha)`. La clave natural única evita duplicados, y el promedio
> por dimensión del motor de ranking las combina automáticamente al
> recalcular. No hay que tocar código de la app.

---

## Paso 8 · (Opcional) Datos reales: INEC → dimensión `finanzas`

Primera capa real en `finanzas`: índice de **sostenibilidad financiera
del servicio de residuos** (0–100) por cantón, desde el módulo
financiero del CSV INEC GIRS 2024. Metodología: media de tres banderas
binarias — `MSF=1` (servicio financieramente sostenible), `SUBSIDIO=0`
(opera sin subsidio municipal), `RDES=1` (recaudación destinada al
servicio). 221 cantones, cobertura 100% del CSV.

1. (Regenerar si hace falta: `npm run seed:inec:finanzas`.)
2. SQL Editor → **+ New query** → pega
   `supabase/seeds/0004_finanzas_reales_inec.sql` → **Run**. Idempotente.
3. Verifica:

   ```sql
   select indicador, count(*), round(avg(valor),1) as promedio
     from public.mediciones where fuente = 'INEC GADM 2024'
    group by 1 order by 1;
   -- finanzas: inec_girs_2024_sostenibilidad_financiera → 221 filas
   -- servicios: inec_girs/apa_2024_indice → 220 c/u (paso 7)
   ```
4. Recalcula el ranking 2024 desde `/ranking` (staff). El índice real
   entra al promedio de `finanzas` junto al valor demo.

> Alcance: proxy acotado al servicio GIRS — no mide ejecución
> presupuestaria global (pendiente: API Defensoría del Pueblo /
> eSIGEF) ni calidad del gasto (Contraloría).

---

## Estado tras estos pasos

- Esquema motor real desplegado (`mediciones`, `rankings`, RLS).
- 244 GADs + 1 952 mediciones de demo cargadas (×2 si aplicaste 2025).
- Cuenta(s) listas para login real, con rol elevado opcional.
- Auto-creación de perfiles para todo nuevo usuario.
- Panel `/admin` operativo para gestionar roles sin SQL manual.
- Ranking multi-período con selector y analítica longitudinal por GAD.
- Primera capa de indicadores reales (INEC) ingresada en `servicios`.

A partir de aquí, el siguiente paso del roadmap es **ranking dinámico
end-to-end** (capacidad B): que `recalcularRankings(periodo)` lea
`public.mediciones`, agregue por dimensión, calcule el INGEL con
`evaluation-engine`, asigne posición y haga upsert a `public.rankings`.
