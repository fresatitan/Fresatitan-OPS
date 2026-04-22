-- =============================================================================
-- 0012 — Reportar avería ya NO bloquea la máquina automáticamente
-- =============================================================================
-- Nuevo flujo:
--   · El trabajador reporta → solo se registra el evento en el historial.
--     La máquina mantiene su estado operativo actual (parada/activa).
--   · El admin revisa desde /alertas:
--       - Si confirma CRÍTICA → la máquina se bloquea AHORA (estado → avería).
--       - Si confirma LEVE → la máquina sigue operativa.
--
-- La función confirmar_severidad_averia ya contempla estos dos casos
-- (bloquear al confirmar crítica, desbloquear al confirmar leve), por lo
-- que solo hace falta modificar report_maquina_averia para que no toque
-- maquinas.estado_actual.
-- =============================================================================

CREATE OR REPLACE FUNCTION report_maquina_averia(
  p_maquina_id uuid,
  p_motivo text,
  p_usuario_id uuid DEFAULT NULL,
  p_severidad_propuesta severidad_averia DEFAULT 'critica'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM maquinas WHERE id = p_maquina_id) THEN
    RAISE EXCEPTION 'Máquina % no encontrada', p_maquina_id;
  END IF;

  -- Registrar el evento en el historial pero NO tocar estado_actual.
  -- La máquina se mantiene operativa (parada/activa) hasta que el admin
  -- confirme severidad crítica desde /alertas.
  INSERT INTO maquina_estados (
    maquina_id, estado, motivo, usuario_id,
    severidad, severidad_confirmada_por_admin
  ) VALUES (
    p_maquina_id, 'avería', p_motivo, p_usuario_id,
    p_severidad_propuesta, false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION report_maquina_averia(uuid, text, uuid, severidad_averia) TO anon, authenticated;
