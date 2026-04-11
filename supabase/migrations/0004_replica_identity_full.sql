-- =============================================================================
-- 0004 — REPLICA IDENTITY FULL para Realtime + verificación de publicación
-- =============================================================================
-- Supabase Realtime envía los eventos de UPDATE/DELETE leyendo del WAL (Write
-- Ahead Log). Por defecto, Postgres solo escribe en el WAL la PK y las columnas
-- modificadas. Para que el callback del cliente reciba el `old_record` completo
-- (y en algunos casos incluso el `new_record` completo tras triggers),
-- necesitamos `REPLICA IDENTITY FULL` en las tablas que nos interesan.
--
-- Además, re-añadimos las tablas a la publicación `supabase_realtime` por si
-- alguna quedó fuera tras la 0003 (en el do-block con exception las fallas
-- reales quedan silenciadas).
-- =============================================================================

-- REPLICA IDENTITY FULL — fundamental para comparar old vs new en el cliente
alter table maquinas replica identity full;
alter table usos_equipo replica identity full;
alter table incidencias replica identity full;
alter table mantenimientos replica identity full;
alter table maquina_estados replica identity full;

-- Asegurar publicación (idempotente — si ya están no pasa nada)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'maquinas'
  ) then
    alter publication supabase_realtime add table maquinas;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'usos_equipo'
  ) then
    alter publication supabase_realtime add table usos_equipo;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'incidencias'
  ) then
    alter publication supabase_realtime add table incidencias;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mantenimientos'
  ) then
    alter publication supabase_realtime add table mantenimientos;
  end if;
end $$;

-- Sanity check: listar las tablas actualmente en la publicación
-- (el resultado aparece en el output del SQL editor)
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
