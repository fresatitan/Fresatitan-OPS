-- =============================================================================
-- 0003 — Acceso anónimo para el Panel de Planta + Trigger de sincronización
--        de estado de máquinas + habilitar Realtime
--
-- El Panel (/panel) es PÚBLICO (sin login) porque las tablets del taller se
-- usan sin cuenta. Por eso necesitamos abrir SELECT/INSERT/UPDATE al rol anon
-- en las tablas que el panel toca: maquinas, profiles, usos_equipo, incidencias.
-- Los admin (authenticated) siguen teniendo acceso completo.
--
-- El trigger `update_maquina_estado_from_uso` mantiene maquinas.estado_actual
-- sincronizado con los usos en curso: así la tablet solo escribe en usos_equipo
-- y el dashboard ve el cambio de estado de la máquina en tiempo real.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RLS — abrir lectura/escritura al panel anónimo
-- -----------------------------------------------------------------------------

-- PROFILES: lectura pública (el panel necesita mostrar los nombres de los técnicos)
drop policy if exists profiles_select on profiles;
create policy profiles_select_public on profiles for select using (true);

-- MAQUINAS: lectura pública
drop policy if exists maquinas_select on maquinas;
create policy maquinas_select_public on maquinas for select using (true);

-- USOS_EQUIPO: lectura y escritura pública (tablet anónima)
drop policy if exists usos_select on usos_equipo;
drop policy if exists usos_insert on usos_equipo;
drop policy if exists usos_update on usos_equipo;
drop policy if exists usos_admin_delete on usos_equipo;
create policy usos_select_public on usos_equipo for select using (true);
create policy usos_insert_public on usos_equipo for insert with check (true);
create policy usos_update_public on usos_equipo for update using (true);
create policy usos_admin_delete on usos_equipo for delete using (current_user_role() = 'admin');

-- INCIDENCIAS: lectura pública, insert público (se crean al cerrar un uso)
drop policy if exists incidencias_select on incidencias;
drop policy if exists incidencias_write on incidencias;
create policy incidencias_select_public on incidencias for select using (true);
create policy incidencias_insert_public on incidencias for insert with check (true);

-- MANTENIMIENTOS: lectura pública, escritura solo admin
drop policy if exists mantenimientos_select on mantenimientos;
drop policy if exists mantenimientos_write on mantenimientos;
create policy mantenimientos_select_public on mantenimientos for select using (true);
create policy mantenimientos_admin_write on mantenimientos for all using (
  current_user_role() in ('tecnico', 'supervisor', 'admin')
);

-- MAQUINA_ESTADOS: lectura pública
drop policy if exists estados_select on maquina_estados;
drop policy if exists estados_insert on maquina_estados;
create policy estados_select_public on maquina_estados for select using (true);
create policy estados_insert_public on maquina_estados for insert with check (true);

-- -----------------------------------------------------------------------------
-- Trigger: sincroniza maquinas.estado_actual con los usos en curso
-- -----------------------------------------------------------------------------
-- Cuando se inserta un uso pendiente → la máquina pasa a 'activa'.
-- Cuando un uso pendiente se cierra (resultado <> 'pendiente') → la máquina
-- vuelve a 'parada' (siempre que estuviera en 'activa', para no pisar avería/mant).
--
-- SECURITY DEFINER permite a la función actualizar `maquinas` aunque el rol
-- anon que disparó el insert no tenga permiso directo de UPDATE sobre maquinas.

create or replace function update_maquina_estado_from_uso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.resultado = 'pendiente') then
    update maquinas
      set estado_actual = 'activa'
      where id = new.maquina_id
        and estado_actual = 'parada';
  elsif (tg_op = 'UPDATE' and old.resultado = 'pendiente' and new.resultado <> 'pendiente') then
    update maquinas
      set estado_actual = 'parada'
      where id = new.maquina_id
        and estado_actual = 'activa';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_uso_updates_maquina_estado on usos_equipo;
create trigger trg_uso_updates_maquina_estado
after insert or update on usos_equipo
for each row execute function update_maquina_estado_from_uso();

-- -----------------------------------------------------------------------------
-- Realtime — habilitar replicación en las tablas que el dashboard observa
-- -----------------------------------------------------------------------------
-- Permite que el frontend se suscriba vía supabase.channel().on('postgres_changes', ...)

-- Las siguientes sentencias son idempotentes gracias al bloque exception.
do $$
begin
  alter publication supabase_realtime add table maquinas;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table usos_equipo;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table incidencias;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table mantenimientos;
exception when duplicate_object then null;
end $$;
