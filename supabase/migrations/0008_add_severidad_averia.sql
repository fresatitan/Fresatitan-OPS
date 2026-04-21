-- =============================================================================
-- 0008 — Severidad en averías (crítica / leve) + revisión por admin
-- =============================================================================
-- El trabajador "propone" al reportar (opcional, default crítica). El admin es
-- siempre quien toma la decisión final desde /alertas.
--
-- Reglas:
--   · Reportar desde panel → siempre bloquea máquina (fail-safe), severidad
--     arranca con la propuesta del trabajador y severidad_confirmada_por_admin
--     queda en false.
--   · Admin confirma como LEVE → máquina se desbloquea (estado → parada) pero
--     la fila de avería sigue abierta (cerrada_en = NULL) para que aparezca
--     en /alertas como alerta leve pendiente de resolución.
--   · Admin confirma como CRÍTICA → la máquina sigue bloqueada.
--   · Admin marca como resuelta → se rellena cerrada_en + cerrada_por. Si la
--     máquina aún estaba en avería, se desbloquea.
-- =============================================================================

-- Enum
CREATE TYPE severidad_averia AS ENUM ('critica', 'leve');

-- Columnas nuevas en maquina_estados (solo se usan en filas con estado='avería')
ALTER TABLE maquina_estados
  ADD COLUMN severidad severidad_averia,
  ADD COLUMN severidad_confirmada_por_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN cerrada_en timestamptz,
  ADD COLUMN cerrada_por uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Backfill: averías preexistentes se consideran crítica + ya confirmada
-- (porque su comportamiento histórico equivale a "crítica" — bloqueaban máquina)
UPDATE maquina_estados
  SET severidad = 'critica',
      severidad_confirmada_por_admin = true
  WHERE estado = 'avería' AND severidad IS NULL;

-- Backfill: averías de máquinas que hoy NO están en avería → se consideran cerradas
-- (el admin ya las resolvió en su día, aunque el campo no existiera)
UPDATE maquina_estados me
  SET cerrada_en = me.timestamp
  WHERE me.estado = 'avería'
    AND me.cerrada_en IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM maquinas m
      WHERE m.id = me.maquina_id AND m.estado_actual = 'avería'
    );

-- Índice para la consulta típica de /alertas: "averías abiertas"
CREATE INDEX IF NOT EXISTS idx_maquina_estados_averias_abiertas
  ON maquina_estados(maquina_id, timestamp DESC)
  WHERE estado = 'avería' AND cerrada_en IS NULL;

-- -----------------------------------------------------------------------------
-- report_maquina_averia — trabajador reporta desde panel público
-- Cambio vs 0005: acepta severidad propuesta; siempre bloquea (fail-safe)
-- -----------------------------------------------------------------------------
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
  UPDATE maquinas
    SET estado_actual = 'avería'
    WHERE id = p_maquina_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Máquina % no encontrada', p_maquina_id;
  END IF;

  INSERT INTO maquina_estados (
    maquina_id, estado, motivo, usuario_id,
    severidad, severidad_confirmada_por_admin
  )
  VALUES (
    p_maquina_id, 'avería', p_motivo, p_usuario_id,
    p_severidad_propuesta, false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION report_maquina_averia(uuid, text, uuid, severidad_averia) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- confirmar_severidad_averia — admin fija la severidad final
-- Si severidad_final = 'leve', la máquina se DESBLOQUEA.
-- La fila de avería permanece abierta (cerrada_en = NULL) para seguir visible
-- en /alertas hasta que el admin pulse "Marcar como resuelta".
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirmar_severidad_averia(
  p_maquina_estado_id uuid,
  p_severidad_final severidad_averia,
  p_admin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_maquina_id uuid;
BEGIN
  UPDATE maquina_estados
    SET severidad = p_severidad_final,
        severidad_confirmada_por_admin = true
    WHERE id = p_maquina_estado_id
      AND estado = 'avería'
      AND cerrada_en IS NULL
    RETURNING maquina_id INTO v_maquina_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avería % no encontrada o ya cerrada', p_maquina_estado_id;
  END IF;

  IF p_severidad_final = 'leve' THEN
    -- Desbloquear máquina si estaba bloqueada
    UPDATE maquinas
      SET estado_actual = 'parada'
      WHERE id = v_maquina_id AND estado_actual = 'avería';
  ELSE
    -- Re-bloquear si estaba desbloqueada (caso: se había confirmado leve y ahora
    -- admin la escala a crítica)
    UPDATE maquinas
      SET estado_actual = 'avería'
      WHERE id = v_maquina_id AND estado_actual != 'avería';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION confirmar_severidad_averia(uuid, severidad_averia, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- resolve_maquina_averia — admin cierra definitivamente todas las averías abiertas
-- Cambio vs 0005: ahora rellena cerrada_en + cerrada_por en la(s) fila(s) abiertas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_maquina_averia(
  p_maquina_id uuid,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cerradas int;
BEGIN
  -- Cerrar todas las averías abiertas de esta máquina
  UPDATE maquina_estados
    SET cerrada_en = now(),
        cerrada_por = p_usuario_id
    WHERE maquina_id = p_maquina_id
      AND estado = 'avería'
      AND cerrada_en IS NULL;

  GET DIAGNOSTICS v_cerradas = ROW_COUNT;

  -- Si había averías abiertas O la máquina estaba bloqueada, desbloquearla y
  -- registrar la transición en el historial
  IF v_cerradas > 0 OR EXISTS (
    SELECT 1 FROM maquinas WHERE id = p_maquina_id AND estado_actual = 'avería'
  ) THEN
    UPDATE maquinas
      SET estado_actual = 'parada'
      WHERE id = p_maquina_id
        AND estado_actual = 'avería';

    INSERT INTO maquina_estados (maquina_id, estado, motivo, usuario_id)
      VALUES (p_maquina_id, 'parada', 'Avería marcada como resuelta', p_usuario_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_maquina_averia(uuid, uuid) TO anon, authenticated;
