-- =============================================================================
-- 0022 — Planes de revisión / mantenimiento programado por máquina
--
-- El cliente quiere poder programar revisiones recurrentes "cada X días/semanas/
-- meses" o "cada X usos". Cada máquina puede tener varios planes (ej. limpieza
-- cada 7 días + revisión eje X cada 100 usos).
--
-- Estrategia:
--   · Una fila por plan en `mantenimiento_planes`
--   · El cómputo de "próxima revisión" se hace en cliente a partir de
--     ultima_ejecucion_* y el intervalo (suma fechas o resta usos pendientes).
--   · El cron de avisos vendrá en una migración futura (V2 con Edge Function).
--   · Al registrar un mantenimiento vinculado al plan, el contador se reinicia
--     automáticamente (trigger).
-- =============================================================================

-- Unidad del intervalo: tiempo (días/semanas/meses) o usos (ciclos completados)
do $$ begin
  create type public.plan_unidad as enum ('dias', 'semanas', 'meses', 'usos');
exception when duplicate_object then null;
end $$;

create table if not exists public.mantenimiento_planes (
  id                          uuid primary key default gen_random_uuid(),
  maquina_id                  uuid not null references public.maquinas(id) on delete cascade,
  nombre                      text not null check (length(trim(nombre)) > 0),
  descripcion                 text,
  unidad                      public.plan_unidad not null,
  cada_n                      integer not null check (cada_n > 0),
  -- Último cumplimiento del plan. Se resetea automáticamente cuando se
  -- registra un mantenimiento vinculado (mantenimientos.plan_id).
  ultima_ejecucion_en         timestamptz,
  ultima_ejecucion_uso_count  integer,  -- snapshot del contador de usos al cumplir
  activo                      boolean not null default true,
  creado_por                  uuid references public.profiles(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_mant_planes_maquina
  on public.mantenimiento_planes(maquina_id) where activo = true;

comment on table public.mantenimiento_planes is
  'Planes de revisión / mantenimiento programado. Una máquina puede tener varios planes activos.';

-- Vinculamos cada mantenimiento (cuando proceda) al plan que satisface
alter table public.mantenimientos
  add column if not exists plan_id uuid references public.mantenimiento_planes(id) on delete set null;

-- Trigger updated_at
create or replace function public.fn_mant_planes_touch_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_mant_planes_touch on public.mantenimiento_planes;
create trigger trg_mant_planes_touch
  before update on public.mantenimiento_planes
  for each row
  execute function public.fn_mant_planes_touch_updated_at();

-- Trigger: al registrar mantenimiento ligado a un plan, resetear el contador del plan
create or replace function public.fn_resetear_plan_al_mantenimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usos_count integer;
begin
  if new.plan_id is null then
    return new;
  end if;

  -- Contar usos cerrados de esa máquina (snapshot)
  select count(*) into v_usos_count
  from public.usos_equipo
  where maquina_id = (select maquina_id from public.mantenimiento_planes where id = new.plan_id)
    and resultado <> 'pendiente';

  update public.mantenimiento_planes
  set ultima_ejecucion_en        = coalesce(new.fecha::timestamptz, now()),
      ultima_ejecucion_uso_count = v_usos_count
  where id = new.plan_id;

  return new;
end;
$$;

drop trigger if exists trg_resetear_plan_al_mant on public.mantenimientos;
create trigger trg_resetear_plan_al_mant
  after insert on public.mantenimientos
  for each row
  execute function public.fn_resetear_plan_al_mantenimiento();

-- Row Level Security
alter table public.mantenimiento_planes enable row level security;

drop policy if exists "mant_planes_select" on public.mantenimiento_planes;
create policy "mant_planes_select"
  on public.mantenimiento_planes for select
  to authenticated, anon
  using (true);

drop policy if exists "mant_planes_insert" on public.mantenimiento_planes;
create policy "mant_planes_insert"
  on public.mantenimiento_planes for insert
  to authenticated, anon
  with check (true);

drop policy if exists "mant_planes_update" on public.mantenimiento_planes;
create policy "mant_planes_update"
  on public.mantenimiento_planes for update
  to authenticated, anon
  using (true);

drop policy if exists "mant_planes_delete" on public.mantenimiento_planes;
create policy "mant_planes_delete"
  on public.mantenimiento_planes for delete
  to authenticated, anon
  using (true);

-- Realtime
alter table public.mantenimiento_planes replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mantenimiento_planes'
  ) then
    alter publication supabase_realtime add table mantenimiento_planes;
  end if;
end $$;
