# Setup de Supabase Auth — FRESATITAN OPS

Esta guía conecta el Panel de Administración a Supabase Auth con los dos
administradores reales (Toni y Roser).

---

## 1. Crear el proyecto Supabase

1. Entra a https://supabase.com y crea un nuevo proyecto (`fresatitan-ops`).
2. Elige región Europa (Frankfurt o Ireland) por latencia y RGPD.
3. Apunta contraseña de la base de datos y URL del proyecto.

---

## 2. Aplicar las migraciones

En el SQL Editor del dashboard de Supabase, ejecuta en orden:

1. `supabase/migrations/0001_fresatitan_ops_schema.sql` — crea tablas, enums, RLS y triggers.
2. `supabase/migrations/0002_seed_fresatitan.sql` — inserta las 12 máquinas y los 8 perfiles reales.

> Alternativamente, con Supabase CLI:
> ```bash
> supabase link --project-ref <ref>
> supabase db push
> ```

---

## 3. Crear los usuarios de autenticación

En el dashboard, **Authentication → Users → Add user → Create new user**, crea:

| Email | Contraseña inicial |
|---|---|
| `toni@fresatitan.com` | (elige una segura, envíasela a Toni) |
| `roser@fresatitan.com` | (elige una segura, envíasela a Roser) |

Marca **"Auto Confirm User"** para evitar el paso de confirmación por email.

---

## 4. Vincular los `auth.users` a los `profiles`

Los perfiles ya existen en la tabla `profiles` (seed del paso 2), pero no tienen
`user_id` asignado. Hay que enlazarlos con los usuarios de `auth.users` que acabas
de crear.

Ejecuta en el SQL Editor:

```sql
-- Vincular Toni
update profiles
set user_id = (select id from auth.users where email = 'toni@fresatitan.com')
where nombre = 'Toni';

-- Vincular Roser
update profiles
set user_id = (select id from auth.users where email = 'roser@fresatitan.com')
where nombre = 'Roser';
```

Verificación:

```sql
select p.nombre, p.role, p.puede_operar, u.email
from profiles p
left join auth.users u on u.id = p.user_id
where p.role = 'admin';
```

Deberías ver:

```
 nombre | role  | puede_operar |          email
--------+-------+--------------+--------------------------
 Toni   | admin | true         | toni@fresatitan.com
 Roser  | admin | false        | roser@fresatitan.com
```

---

## 5. Configurar variables de entorno en la app

1. Copia `.env.example` a `.env.local` en la raíz del proyecto.
2. Rellena los valores desde **Project Settings → API** en Supabase:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

3. Reinicia `npm run dev`. Vite necesita recargar para leer las nuevas env vars.

---

## 6. Probar

1. Ve a `http://localhost:5173/login`.
2. El formulario de email/contraseña ya no aparece deshabilitado.
3. Introduce las credenciales de Toni o Roser → entras al dashboard.
4. Cierra sesión → vuelves a `/login`.
5. `/panel` sigue siendo público y no pide nada.

---

## 7. (Opcional pero recomendado) Política adicional de seguridad

La RLS ya está activa, pero por defecto `auth.users` permite crear usuarios vía
signup desde el frontend. Como solo tú creas los admins manualmente, desactiva
signup público:

**Authentication → Providers → Email → Disable Signup**.

---

## Troubleshooting

- **"Email o contraseña incorrectos"**: comprueba que el usuario existe en
  `auth.users` y está confirmado.
- **"Esta cuenta existe pero no tiene rol de administrador"**: falta el
  `user_id` en la tabla `profiles` o el perfil no tiene `role = 'admin'`.
  Ejecuta la query del paso 4 otra vez.
- **La app sigue en "MODO DESARROLLO"**: las env vars no se han cargado. Asegúrate de
  que el archivo se llama `.env.local` (no `.env.example`) y reinicia el dev server.
- **No puedo acceder a los datos de `profiles` después de loguearme**: revisa las
  policies RLS. La función helper `current_user_role()` requiere que el perfil
  del usuario autenticado esté vinculado correctamente con `auth.users` vía `user_id`.
