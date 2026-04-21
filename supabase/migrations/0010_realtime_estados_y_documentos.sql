-- =============================================================================
-- 0010 — Ampliar publicación Realtime a maquina_estados + averia_documentos
-- =============================================================================
-- Sin esto, los INSERT en estas dos tablas (nueva avería reportada, nuevo
-- parte técnico subido) no disparaban eventos de Realtime, así que el panel
-- admin no se refrescaba hasta recargar manualmente.
-- =============================================================================

-- REPLICA IDENTITY FULL (maquina_estados ya lo tenía desde 0004;
-- averia_documentos es de la 0009 así que nunca se configuró)
ALTER TABLE averia_documentos REPLICA IDENTITY FULL;

-- Añadir a la publicación (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'maquina_estados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE maquina_estados;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'averia_documentos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE averia_documentos;
  END IF;
END $$;

-- Sanity check
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
