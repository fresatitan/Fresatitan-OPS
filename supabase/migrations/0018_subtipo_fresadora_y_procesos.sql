-- =============================================================================
-- 0018 — Sub-familia en fresadoras + nuevos procesos por sub-familia
-- =============================================================================
-- El cliente diferencia las fresadoras en tres sub-familias (METAL / SECO /
-- HÚMEDO) y cada una con su propio listado de procesos disponibles.
-- También revisa los procesos de sinterizadoras e impresoras 3D.
--
-- Cambios:
--   · Nuevo enum `subtipo_fresadora` (metal / seco / humedo)
--   · Columna `subtipo` en maquinas (nullable, solo aplica a fresadoras)
--   · Backfill de las fresadoras existentes según mapping del cliente
--   · Nuevos valores añadidos al enum `tipo_proceso`:
--       titanio, cr_co, circonio, pmma, disilicato, composite,
--       cr_co_rigido, cr_co_flexible
--     Los antiguos (fresado, sinterizado, sinterofresado, impresion3d,
--     ferulas, blender, otro) NO se borran — se mantienen para no romper
--     los usos históricos. Pero la UI ya no los ofrecerá como opciones nuevas.
-- =============================================================================

-- 1. Enum subtipo_fresadora
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subtipo_fresadora') THEN
    CREATE TYPE subtipo_fresadora AS ENUM ('metal', 'seco', 'humedo');
  END IF;
END $$;

-- 2. Columna subtipo en maquinas
ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS subtipo subtipo_fresadora;

-- 3. Backfill — solo fresadoras
UPDATE maquinas SET subtipo = 'metal'   WHERE codigo IN ('REF-039','REF-040','REF-066','REF-041');
UPDATE maquinas SET subtipo = 'seco'    WHERE codigo IN ('REF-030','REF-057','REF-064');
UPDATE maquinas SET subtipo = 'humedo'  WHERE codigo IN ('REF-042','REF-062');

-- 4. Nuevos valores en el enum tipo_proceso (idempotente con IF NOT EXISTS)
ALTER TYPE tipo_proceso ADD VALUE IF NOT EXISTS 'titanio';
ALTER TYPE tipo_proceso ADD VALUE IF NOT EXISTS 'cr_co';
ALTER TYPE tipo_proceso ADD VALUE IF NOT EXISTS 'circonio';
ALTER TYPE tipo_proceso ADD VALUE IF NOT EXISTS 'pmma';
ALTER TYPE tipo_proceso ADD VALUE IF NOT EXISTS 'disilicato';
ALTER TYPE tipo_proceso ADD VALUE IF NOT EXISTS 'composite';
ALTER TYPE tipo_proceso ADD VALUE IF NOT EXISTS 'cr_co_rigido';
ALTER TYPE tipo_proceso ADD VALUE IF NOT EXISTS 'cr_co_flexible';
