-- =============================================================================
-- 0017 — Alta de máquinas nuevas según lista oficial del cliente (mayo 2026)
-- =============================================================================
-- 4 nuevas máquinas:
--   · REF-066 — Fresadora CM FANUC 3 (METAL, requiere lanzamiento)
--   · REF-064 — Fresadora UP P53 DC (SECO)
--   · REF-063 — Impresora PROZEN SONIC XL 4K
--   · REF-067 — Impresora MIICRAFT
--
-- Inserciones idempotentes (NOT EXISTS por código). Si en algún momento se han
-- creado manualmente desde el dashboard antes de aplicar esta migración, no
-- se duplicarán.
--
-- Convenciones por familia:
--   · Fresadoras METAL (Fanuc, Biomill): requiere_lanzamiento = true
--   · Fresadoras SECO/HÚMEDO (UP3D, P53): requiere_lanzamiento = false
--   · Impresoras 3D y sinterizadoras: requiere_lanzamiento = false
--   · requiere_preparacion: solo true para sinterizadoras (resto false)
-- =============================================================================

-- 1. REF-066 — Fresadora CM FANUC 3 (METAL)
INSERT INTO maquinas (codigo, nombre, tipo, numero_serie, ubicacion, estado_actual, requiere_preparacion, requiere_lanzamiento, activa)
SELECT 'REF-066', 'Fresadora CM FANUC 3', 'fresadora', 'P246AG322', 'Zona CNC', 'parada', false, true, true
WHERE NOT EXISTS (SELECT 1 FROM maquinas WHERE codigo = 'REF-066');

-- 2. REF-064 — Fresadora UP P53 DC (SECO)
INSERT INTO maquinas (codigo, nombre, tipo, numero_serie, ubicacion, estado_actual, requiere_preparacion, requiere_lanzamiento, activa)
SELECT 'REF-064', 'Fresadora UP P53 DC', 'fresadora', '20244497', 'Zona CAD-CAM', 'parada', false, false, true
WHERE NOT EXISTS (SELECT 1 FROM maquinas WHERE codigo = 'REF-064');

-- 3. REF-063 — Impresora PROZEN SONIC XL 4K
INSERT INTO maquinas (codigo, nombre, tipo, numero_serie, ubicacion, estado_actual, requiere_preparacion, requiere_lanzamiento, activa)
SELECT 'REF-063', 'Impresora PROZEN SONIC XL 4K', 'impresora_3d', 'LCSXFT11003', 'Zona Impresión 3D', 'parada', false, false, true
WHERE NOT EXISTS (SELECT 1 FROM maquinas WHERE codigo = 'REF-063');

-- 4. REF-067 — Impresora MIICRAFT
INSERT INTO maquinas (codigo, nombre, tipo, numero_serie, ubicacion, estado_actual, requiere_preparacion, requiere_lanzamiento, activa)
SELECT 'REF-067', 'Impresora MIICRAFT', 'impresora_3d', 'LM300G003', 'Zona Impresión 3D', 'parada', false, false, true
WHERE NOT EXISTS (SELECT 1 FROM maquinas WHERE codigo = 'REF-067');
