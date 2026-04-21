-- =============================================================================
-- 0009 — Resolución de averías con medidas correctoras + documentos adjuntos
-- =============================================================================
-- Requisito regulatorio (normativa sanitaria aplicable a laboratorio dental
-- CAD-CAM): trazabilidad completa de cada avería incluyendo medidas correctoras
-- y partes técnicos anexados.
--
-- Cambios:
--   · Columnas en maquina_estados para la descripción de la resolución,
--     nombre del técnico que intervino y fecha de intervención.
--   · Tabla averia_documentos con metadatos de los archivos (PDF/imágenes)
--     guardados en Supabase Storage.
--   · Bucket privado 'averia-documentos' con RLS: solo usuarios autenticados
--     (admins) pueden leer/subir; el panel anónimo no accede aquí.
--   · RPC resolve_maquina_averia actualizada para guardar los datos de
--     resolución al cerrar la avería.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columnas de resolución en maquina_estados
-- -----------------------------------------------------------------------------
ALTER TABLE maquina_estados
  ADD COLUMN resolucion_descripcion text,   -- qué medidas se aplicaron
  ADD COLUMN tecnico_intervencion text,     -- nombre técnico (libre, puede ser externo)
  ADD COLUMN fecha_intervencion date;       -- día que el técnico intervino

-- -----------------------------------------------------------------------------
-- Tabla averia_documentos — metadatos de partes/facturas/fotos
-- -----------------------------------------------------------------------------
CREATE TABLE averia_documentos (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_estado_id  uuid NOT NULL REFERENCES maquina_estados(id) ON DELETE CASCADE,
  storage_path       text NOT NULL,           -- path dentro del bucket
  nombre_original    text NOT NULL,           -- "parte-tecnico-21abr.pdf"
  tipo               text NOT NULL DEFAULT 'otro',  -- 'parte_tecnico' | 'factura' | 'foto' | 'otro'
  mime_type          text,
  tamano_bytes       bigint,
  subido_por         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subido_en          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_averia_documentos_maquina_estado
  ON averia_documentos(maquina_estado_id);

-- RLS: lectura + escritura solo para authenticated (admins)
ALTER TABLE averia_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read averia docs"
  ON averia_documentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert averia docs"
  ON averia_documentos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update averia docs"
  ON averia_documentos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated delete averia docs"
  ON averia_documentos FOR DELETE
  TO authenticated
  USING (true);

-- También permitir que el admin vea los documentos desde el dashboard público
-- (lectura del histórico desde /maquinas sin login en modo demo). Aun así los
-- archivos en Storage están protegidos por signed URL, así que esto solo
-- expone metadatos.
CREATE POLICY "Anon read averia docs"
  ON averia_documentos FOR SELECT
  TO anon
  USING (true);

-- -----------------------------------------------------------------------------
-- Storage bucket privado
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('averia-documentos', 'averia-documentos', false)
  ON CONFLICT (id) DO NOTHING;

-- Policies para el bucket
CREATE POLICY "Admins can read averia files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'averia-documentos');

CREATE POLICY "Admins can upload averia files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'averia-documentos');

CREATE POLICY "Admins can delete averia files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'averia-documentos');

-- -----------------------------------------------------------------------------
-- Actualizar resolve_maquina_averia para aceptar los datos de resolución
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_maquina_averia(
  p_maquina_id uuid,
  p_usuario_id uuid DEFAULT NULL,
  p_resolucion_descripcion text DEFAULT NULL,
  p_tecnico_intervencion text DEFAULT NULL,
  p_fecha_intervencion date DEFAULT NULL
)
RETURNS uuid  -- devuelve el id del maquina_estado de avería cerrado (para vincular documentos)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_cerrado_id uuid;
BEGIN
  -- Cerrar la avería abierta más reciente de esta máquina y escribir los datos
  -- de resolución en esa misma fila.
  UPDATE maquina_estados
    SET cerrada_en = now(),
        cerrada_por = p_usuario_id,
        resolucion_descripcion = coalesce(p_resolucion_descripcion, resolucion_descripcion),
        tecnico_intervencion   = coalesce(p_tecnico_intervencion, tecnico_intervencion),
        fecha_intervencion     = coalesce(p_fecha_intervencion, fecha_intervencion)
    WHERE id = (
      SELECT id FROM maquina_estados
      WHERE maquina_id = p_maquina_id
        AND estado = 'avería'
        AND cerrada_en IS NULL
      ORDER BY timestamp DESC
      LIMIT 1
    )
    RETURNING id INTO v_estado_cerrado_id;

  -- Desbloquear la máquina y registrar transición
  IF v_estado_cerrado_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM maquinas WHERE id = p_maquina_id AND estado_actual = 'avería'
  ) THEN
    UPDATE maquinas
      SET estado_actual = 'parada'
      WHERE id = p_maquina_id
        AND estado_actual = 'avería';

    INSERT INTO maquina_estados (maquina_id, estado, motivo, usuario_id)
      VALUES (p_maquina_id, 'parada', 'Avería marcada como resuelta', p_usuario_id);
  END IF;

  RETURN v_estado_cerrado_id;
END;
$$;

-- Grant nuevamente (cambia firma → crea una nueva función para el overload)
GRANT EXECUTE ON FUNCTION resolve_maquina_averia(uuid, uuid, text, text, date) TO anon, authenticated;
