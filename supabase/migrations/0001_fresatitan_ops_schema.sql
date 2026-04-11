-- =============================================================================
-- FRESATITAN OPS — Schema inicial (2026)
-- Modelo basado en los registros reales del laboratorio:
--   - "uso_equipo": una tanda de trabajo en una máquina (preparación → acabado)
--   - Algunas máquinas (Fanuc, Lilian, Biomill) requieren un técnico de lanzamiento
--     (en catalán "punxat") adicional al técnico de preparación.
--   - Cada uso puede generar 0..N incidencias.
-- =============================================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================
create type rol_usuario as enum ('operario', 'supervisor', 'tecnico', 'admin');
create type estado_maquina as enum ('activa', 'parada', 'avería', 'mantenimiento', 'inactiva');
create type tipo_maquina as enum ('fresadora', 'sinterizadora');
create type resultado_uso as enum ('ok', 'ko', 'pendiente');
create type tipo_mantenimiento as enum ('preventivo', 'correctivo', 'predictivo');

-- =============================================================================
-- PROFILES
-- =============================================================================
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references auth.users(id) on delete cascade,
  nombre text not null,
  apellidos text not null,
  role rol_usuario not null default 'tecnico',
  activo boolean not null default true,
  -- true = puede ser seleccionado como técnico de prep/lanzamiento/acabado en un uso.
  -- Los admin puros de supervisión (ej. Roser) van con false: solo ven el dashboard.
  puede_operar boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles(role) where activo = true;

-- =============================================================================
-- MAQUINAS
-- =============================================================================
create table maquinas (
  id uuid primary key default uuid_generate_v4(),
  codigo text unique not null,                 -- ej. REF-039
  nombre text not null,                        -- ej. Fresadora Fanuc 1
  tipo tipo_maquina not null,
  numero_serie text,
  descripcion text,
  ubicacion text,
  estado_actual estado_maquina not null default 'parada',
  requiere_lanzamiento boolean not null default false, -- si usa el rol "punxat/lanzamiento"
  activa boolean not null default true,        -- false = retirada del servicio
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_maquinas_estado on maquinas(estado_actual);
create index idx_maquinas_activa on maquinas(activa);

-- =============================================================================
-- HISTORIAL DE ESTADOS DE MÁQUINAS
-- =============================================================================
create table maquina_estados (
  id uuid primary key default uuid_generate_v4(),
  maquina_id uuid not null references maquinas(id) on delete cascade,
  estado estado_maquina not null,
  motivo text,
  usuario_id uuid references profiles(id),
  timestamp timestamptz not null default now()
);

create index idx_maquina_estados_maquina on maquina_estados(maquina_id, timestamp desc);

-- =============================================================================
-- USOS DE EQUIPO (registro real del laboratorio)
-- Cada fila = una tanda de trabajo sobre la máquina.
-- =============================================================================
create table usos_equipo (
  id uuid primary key default uuid_generate_v4(),
  maquina_id uuid not null references maquinas(id) on delete restrict,

  fecha date not null default current_date,
  hora_preparacion time not null,
  tecnico_preparacion_id uuid not null references profiles(id),

  -- Solo aplica si maquina.requiere_lanzamiento = true
  tecnico_lanzamiento_id uuid references profiles(id),

  -- Pueden estar vacíos mientras el uso está en curso
  hora_acabado time,
  tecnico_acabado_id uuid references profiles(id),

  resultado resultado_uso not null default 'pendiente',
  observaciones text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Si está finalizado, hora_acabado y tecnico_acabado_id deben estar presentes
  constraint chk_uso_finalizado check (
    resultado = 'pendiente'
    or (hora_acabado is not null and tecnico_acabado_id is not null)
  )
);

create index idx_usos_maquina_fecha on usos_equipo(maquina_id, fecha desc);
create index idx_usos_pendientes on usos_equipo(maquina_id) where resultado = 'pendiente';
create index idx_usos_tecnico_prep on usos_equipo(tecnico_preparacion_id, fecha desc);

-- Validación: si máquina requiere lanzamiento, el campo no puede ser null
create or replace function validate_uso_lanzamiento()
returns trigger as $$
declare
  requiere boolean;
begin
  select requiere_lanzamiento into requiere from maquinas where id = new.maquina_id;
  if requiere and new.tecnico_lanzamiento_id is null then
    raise exception 'Esta máquina requiere un técnico de lanzamiento';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_uso_lanzamiento
before insert or update on usos_equipo
for each row execute function validate_uso_lanzamiento();

-- =============================================================================
-- INCIDENCIAS (0..N por uso)
-- =============================================================================
create table incidencias (
  id uuid primary key default uuid_generate_v4(),
  uso_id uuid not null references usos_equipo(id) on delete cascade,
  descripcion text not null,
  created_at timestamptz not null default now()
);

create index idx_incidencias_uso on incidencias(uso_id);

-- =============================================================================
-- MANTENIMIENTOS
-- Derivado del "Registre manteniment i calibrat". Muchos campos opcionales
-- porque los históricos a veces vienen incompletos.
-- =============================================================================
create table mantenimientos (
  id uuid primary key default uuid_generate_v4(),
  maquina_id uuid not null references maquinas(id) on delete restrict,
  fecha date not null default current_date,
  tipo tipo_mantenimiento not null default 'preventivo',
  accion_realizada text not null,
  resultado text,
  persona_encargada_id uuid references profiles(id),
  persona_verificadora_id uuid references profiles(id),
  validado boolean not null default false,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_mantenimientos_maquina on mantenimientos(maquina_id, fecha desc);

-- =============================================================================
-- ALERTAS
-- =============================================================================
create table alertas (
  id uuid primary key default uuid_generate_v4(),
  maquina_id uuid references maquinas(id) on delete cascade,
  tipo text not null,
  mensaje text not null,
  leida boolean not null default false,
  destinatario_role rol_usuario,
  created_at timestamptz not null default now()
);

create index idx_alertas_no_leidas on alertas(leida, created_at desc) where leida = false;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table profiles enable row level security;
alter table maquinas enable row level security;
alter table maquina_estados enable row level security;
alter table usos_equipo enable row level security;
alter table incidencias enable row level security;
alter table mantenimientos enable row level security;
alter table alertas enable row level security;

-- Helper: role del usuario actual
create or replace function current_user_role() returns rol_usuario as $$
  select role from profiles where user_id = auth.uid() limit 1;
$$ language sql stable security definer;

-- PROFILES: cualquier autenticado puede leer, solo admin puede modificar
create policy profiles_select on profiles for select using (auth.role() = 'authenticated');
create policy profiles_admin_all on profiles for all using (current_user_role() = 'admin');

-- MAQUINAS: lectura para todos, escritura solo admin
create policy maquinas_select on maquinas for select using (auth.role() = 'authenticated');
create policy maquinas_admin_all on maquinas for all using (current_user_role() = 'admin');

-- USOS_EQUIPO: lectura para todos, insert/update para técnicos y admin
create policy usos_select on usos_equipo for select using (auth.role() = 'authenticated');
create policy usos_insert on usos_equipo for insert with check (
  current_user_role() in ('tecnico', 'supervisor', 'admin')
);
create policy usos_update on usos_equipo for update using (
  current_user_role() in ('tecnico', 'supervisor', 'admin')
);
create policy usos_admin_delete on usos_equipo for delete using (current_user_role() = 'admin');

-- INCIDENCIAS: misma lógica que usos
create policy incidencias_select on incidencias for select using (auth.role() = 'authenticated');
create policy incidencias_write on incidencias for all using (
  current_user_role() in ('tecnico', 'supervisor', 'admin')
);

-- MANTENIMIENTOS: idem
create policy mantenimientos_select on mantenimientos for select using (auth.role() = 'authenticated');
create policy mantenimientos_write on mantenimientos for all using (
  current_user_role() in ('tecnico', 'supervisor', 'admin')
);

-- MAQUINA_ESTADOS: solo lectura para autenticados, escritura vía trigger/admin
create policy estados_select on maquina_estados for select using (auth.role() = 'authenticated');
create policy estados_insert on maquina_estados for insert with check (
  current_user_role() in ('tecnico', 'supervisor', 'admin')
);

-- ALERTAS: lectura para autenticados
create policy alertas_select on alertas for select using (auth.role() = 'authenticated');
create policy alertas_write on alertas for all using (current_user_role() in ('supervisor', 'admin'));

-- =============================================================================
-- UPDATED_AT triggers
-- =============================================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_maquinas_updated_at before update on maquinas
  for each row execute function set_updated_at();
create trigger trg_usos_updated_at before update on usos_equipo
  for each row execute function set_updated_at();
create trigger trg_mantenimientos_updated_at before update on mantenimientos
  for each row execute function set_updated_at();
