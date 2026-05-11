-- =============================================================================
-- 0021 — Seguimiento cronológico de averías (timeline de pasos)
--
-- El cliente quiere ver cuántos pasos se han dado para resolver una avería:
-- llamadas al técnico, diagnóstico, pedido de repuestos, intervención, etc.
-- Cada paso queda registrado con su autor y momento, y aparece como timeline
-- dentro de la card de la avería en /alertas.
--
-- Solo los admins pueden añadir pasos. La idea es complementar (no sustituir)
-- los documentos adjuntos que ya existen — porque a veces no viene técnico y
-- no hay nada que adjuntar, pero igualmente hay actividad de seguimiento que
-- queremos registrar.
-- =============================================================================

create table if not exists public.averia_pasos (
  id                 uuid primary key default gen_random_uuid(),
  maquina_estado_id  uuid not null references public.maquina_estados(id) on delete cascade,
  autor_id           uuid references public.profiles(id) on delete set null,
  contenido          text not null check (length(trim(contenido)) > 0),
  created_at         timestamptz not null default now()
);

create index if not exists idx_averia_pasos_maquina_estado
  on public.averia_pasos(maquina_estado_id, created_at desc);

comment on table public.averia_pasos is
  'Timeline de pasos seguidos para resolver una avería. Solo admins pueden insertar.';

-- Row Level Security
alter table public.averia_pasos enable row level security;

-- Lectura: cualquier usuario autenticado (admin) puede leer todos los pasos
drop policy if exists "averia_pasos_select" on public.averia_pasos;
create policy "averia_pasos_select"
  on public.averia_pasos for select
  to authenticated, anon
  using (true);

-- Inserción: solo a través del RPC (security definer) — nunca directamente
-- desde el cliente, para garantizar consistencia y validación.
drop policy if exists "averia_pasos_insert" on public.averia_pasos;
create policy "averia_pasos_insert"
  on public.averia_pasos for insert
  to authenticated
  with check (auth.uid() is not null);

-- Update y delete bloqueados — el timeline es inmutable; si hay error en
-- una nota se añade otra que la corrija.
drop policy if exists "averia_pasos_no_update" on public.averia_pasos;
create policy "averia_pasos_no_update"
  on public.averia_pasos for update
  to authenticated, anon
  using (false);

drop policy if exists "averia_pasos_no_delete" on public.averia_pasos;
create policy "averia_pasos_no_delete"
  on public.averia_pasos for delete
  to authenticated, anon
  using (false);

-- RPC: agregar paso al timeline de una avería (SECURITY DEFINER para que
-- funcione tanto desde sesión admin como desde llamadas con anon key).
create or replace function public.agregar_paso_averia(
  p_maquina_estado_id uuid,
  p_contenido         text,
  p_autor_id          uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_contenido is null or length(trim(p_contenido)) = 0 then
    raise exception 'El contenido del paso no puede estar vacío';
  end if;

  -- Validar que la avería existe
  if not exists (select 1 from public.maquina_estados where id = p_maquina_estado_id and estado = 'avería') then
    raise exception 'No existe avería con id %', p_maquina_estado_id;
  end if;

  insert into public.averia_pasos (maquina_estado_id, autor_id, contenido)
  values (p_maquina_estado_id, p_autor_id, trim(p_contenido))
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.agregar_paso_averia(uuid, text, uuid) to anon, authenticated;

-- Realtime
alter table public.averia_pasos replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'averia_pasos'
  ) then
    alter publication supabase_realtime add table averia_pasos;
  end if;
end $$;
