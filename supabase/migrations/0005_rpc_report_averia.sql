-- =============================================================================
-- 0005 — RPC functions para reportar/resolver averías desde el panel público
-- =============================================================================
-- El Panel de Planta (/panel) es público (sin login) y necesita poder cambiar
-- el estado de una máquina a 'avería' + registrar el motivo en el historial.
-- Las RLS bloquean UPDATE directo desde el rol anon, así que encapsulamos ambas
-- operaciones en una función SECURITY DEFINER que corre como postgres y hace
-- bypass de RLS de forma controlada (solo actualiza el campo estado_actual).
--
-- Igualmente una función para marcar como resuelta una avería (se usa desde
-- /alertas por los admins).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- report_maquina_averia — llamada por anon desde el /panel
-- -----------------------------------------------------------------------------
create or replace function report_maquina_averia(
  p_maquina_id uuid,
  p_motivo text,
  p_usuario_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Actualizar estado de la máquina (bypasa RLS por SECURITY DEFINER)
  update maquinas
    set estado_actual = 'avería'
    where id = p_maquina_id;

  if not found then
    raise exception 'Máquina % no encontrada', p_maquina_id;
  end if;

  -- 2. Registrar en el historial el cambio de estado con el motivo
  insert into maquina_estados (maquina_id, estado, motivo, usuario_id)
    values (p_maquina_id, 'avería', p_motivo, p_usuario_id);
end;
$$;

grant execute on function report_maquina_averia(uuid, text, uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- resolve_maquina_averia — llamada por admin desde /alertas
-- -----------------------------------------------------------------------------
create or replace function resolve_maquina_averia(
  p_maquina_id uuid,
  p_usuario_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update maquinas
    set estado_actual = 'parada'
    where id = p_maquina_id
      and estado_actual = 'avería';

  if not found then
    -- Ya no estaba en avería, no hay nada que hacer
    return;
  end if;

  insert into maquina_estados (maquina_id, estado, motivo, usuario_id)
    values (p_maquina_id, 'parada', 'Avería marcada como resuelta', p_usuario_id);
end;
$$;

grant execute on function resolve_maquina_averia(uuid, uuid) to anon, authenticated;
