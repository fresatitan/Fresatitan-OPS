-- =============================================================================
-- 0011 — Fix RLS: permitir subida de documentos desde el dashboard admin
-- =============================================================================
-- El dashboard admin usa actualmente el rol `anon` (mismo patrón que el
-- resto de la app: panel anónimo + login "dev" sin sesión Supabase real).
-- Las políticas de la 0009 solo daban permiso a `authenticated` para
-- subir/leer documentos, así que el flujo fallaba con:
--   "new row violates row-level security policy"
--
-- Replicamos el modelo que ya usan las otras tablas (maquinas, usos_equipo,
-- incidencias…): abrir lectura y escritura al rol anon. La seguridad se
-- aplica a nivel de aplicación (el UI de subir solo aparece en rutas admin
-- protegidas por RequireAuth).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- averia_documentos: insert/update/delete para anon
-- -----------------------------------------------------------------------------
CREATE POLICY "Anon insert averia docs"
  ON averia_documentos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon update averia docs"
  ON averia_documentos FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anon delete averia docs"
  ON averia_documentos FOR DELETE
  TO anon
  USING (true);

-- -----------------------------------------------------------------------------
-- storage.objects — bucket averia-documentos: select/insert/delete para anon
-- (mantenemos las de authenticated que ya existían)
-- -----------------------------------------------------------------------------
CREATE POLICY "Anon can read averia files"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'averia-documentos');

CREATE POLICY "Anon can upload averia files"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'averia-documentos');

CREATE POLICY "Anon can delete averia files"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'averia-documentos');
