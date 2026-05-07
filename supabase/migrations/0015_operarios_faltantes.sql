-- =============================================================================
-- 0015 — Añadir operarios faltantes según lista oficial del cliente (mayo 2026)
-- =============================================================================
-- Lista oficial de operarios:
--   Albert, Andrea, Anna, Gerard, Irene, Josep, Oscar, Pol, Rosalia, Toni
--
-- Comparada con el seed 0002:
--   - Estaban: Toni (admin), Gerard, Pol, Oscar, Albert, Andrea, Rosalia
--   - Faltan: Anna, Irene, Josep
--
-- Inserciones idempotentes: se basan en el nombre. Si en algún momento se han
-- creado manualmente desde el dashboard antes de aplicar esta migración, no
-- se duplicarán.
-- =============================================================================

INSERT INTO profiles (nombre, apellidos, role, activo, puede_operar)
SELECT 'Anna', '', 'tecnico', true, true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE nombre = 'Anna');

INSERT INTO profiles (nombre, apellidos, role, activo, puede_operar)
SELECT 'Irene', '', 'tecnico', true, true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE nombre = 'Irene');

INSERT INTO profiles (nombre, apellidos, role, activo, puede_operar)
SELECT 'Josep', '', 'tecnico', true, true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE nombre = 'Josep');
