-- =============================================================================
-- 0024 — Etiquetas de planta + alta ZONELAB TI 1 + lanzamiento solo sinterizadoras
-- =============================================================================
-- Cambios acordados en la reunión con Roser (julio 2026):
--
--   1. `maquinas.etiqueta`: identificador corto de planta (F 1, Zr 2, SINT 4,
--      TI 1, Imp 1…). Cada máquina física llevará un cartel con esta etiqueta,
--      así que en la vista del trabajador debe verse GRANDE y clara.
--
--   2. Alta de la sinterizadora nueva: ZONELAB (línea CREATE), etiqueta TI 1,
--      s/n 02A0426002. Las sinterizadoras pasan de 5 a 6.
--      ⚠ El cliente no le ha asignado nº de referencia interno (las demás son
--      045-049); usamos 'REF-CREATE' provisionalmente — confirmar con Roser.
--
--   3. "¿Quién lanza?" desaparece de todas las máquinas MENOS las
--      sinterizadoras (antes lo tenían las fresadoras METAL/FANUC).
-- =============================================================================

-- 1. Columna etiqueta -------------------------------------------------------
ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS etiqueta text;

-- Backfill según el documento oficial del cliente (julio 2026)
-- FRESADORAS METAL
UPDATE maquinas SET etiqueta = 'F 1'    WHERE codigo = 'REF-039';
UPDATE maquinas SET etiqueta = 'F 2'    WHERE codigo = 'REF-040';
UPDATE maquinas SET etiqueta = 'F 3'    WHERE codigo = 'REF-066';
-- FRESADORAS SECO
UPDATE maquinas SET etiqueta = 'Zr 1'   WHERE codigo = 'REF-030';
UPDATE maquinas SET etiqueta = 'Zr 2'   WHERE codigo = 'REF-057';
UPDATE maquinas SET etiqueta = 'Zr 3'   WHERE codigo = 'REF-064';
-- FRESADORAS HÚMEDO
UPDATE maquinas SET etiqueta = 'Ds 1'   WHERE codigo = 'REF-042';
UPDATE maquinas SET etiqueta = 'Ds 2'   WHERE codigo = 'REF-062';
-- SINTERIZADORAS
UPDATE maquinas SET etiqueta = 'SINT 1' WHERE codigo = 'REF-045';
UPDATE maquinas SET etiqueta = 'SINT 2' WHERE codigo = 'REF-046';
UPDATE maquinas SET etiqueta = 'SINT 3' WHERE codigo = 'REF-047';
UPDATE maquinas SET etiqueta = 'SINT 4' WHERE codigo = 'REF-048';
UPDATE maquinas SET etiqueta = 'SINT 5' WHERE codigo = 'REF-049';
-- IMPRESORAS 3D
UPDATE maquinas SET etiqueta = 'Imp 1'  WHERE codigo = 'REF-063';
UPDATE maquinas SET etiqueta = 'Imp 2'  WHERE codigo = 'REF-067';

-- 2. Alta ZONELAB TI 1 (idempotente) ---------------------------------------
INSERT INTO maquinas (codigo, nombre, tipo, numero_serie, ubicacion, estado_actual, requiere_preparacion, requiere_lanzamiento, activa, etiqueta)
SELECT 'REF-CREATE', 'Sinterizadora ZONELAB CREATE', 'sinterizadora', '02A0426002', 'Zona Sinter.', 'parada', true, true, true, 'TI 1'
WHERE NOT EXISTS (SELECT 1 FROM maquinas WHERE numero_serie = '02A0426002');

-- 3. Lanzamiento solo en sinterizadoras -------------------------------------
UPDATE maquinas SET requiere_lanzamiento = (tipo = 'sinterizadora');

-- Verificación:
-- select codigo, etiqueta, nombre, tipo, requiere_lanzamiento from maquinas where activa order by tipo, etiqueta;
