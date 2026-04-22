-- =============================================================================
-- 0013 — Registro de preparaciones (limpieza/acondicionamiento) por máquina
-- =============================================================================
-- El admin quiere poder ver de un vistazo si una máquina ha sido preparada
-- (limpieza, acondicionamiento) y por quién. Es un evento puntual, simple,
-- que no cambia el estado de la máquina ni arranca ningún uso. Se considera
-- "vigente" solo si fue HOY.
-- =============================================================================

CREATE TABLE preparaciones (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id      uuid NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  trabajador_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  fecha           date NOT NULL DEFAULT current_date,
  hora            time NOT NULL DEFAULT (current_timestamp at time zone 'Europe/Madrid')::time,
  observaciones   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Consulta típica: "última preparación de la máquina X"
CREATE INDEX idx_preparaciones_maquina_fecha
  ON preparaciones(maquina_id, fecha DESC, hora DESC);

-- RLS — mismo modelo que el resto de tablas del panel
ALTER TABLE preparaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read preparaciones"
  ON preparaciones FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon insert preparaciones"
  ON preparaciones FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Auth read preparaciones"
  ON preparaciones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth insert preparaciones"
  ON preparaciones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Realtime — REPLICA IDENTITY FULL + añadir a la publicación
ALTER TABLE preparaciones REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'preparaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE preparaciones;
  END IF;
END $$;
