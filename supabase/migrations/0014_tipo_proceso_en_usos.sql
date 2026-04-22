-- =============================================================================
-- 0014 — Tipo de proceso por uso (fresado / sinterizado / impresión 3D / ...)
-- =============================================================================
-- Cada uso_equipo ahora registra qué tipo de proceso concreto se está haciendo
-- en la máquina (porque una fresadora puede hacer fresado, férulas, blender;
-- una sinterizadora puede hacer sinterizado o sinterofresado; etc.).
-- Valores según CLAUDE.md del proyecto.
-- =============================================================================

CREATE TYPE tipo_proceso AS ENUM (
  'fresado',
  'sinterizado',
  'sinterofresado',
  'impresion3d',
  'ferulas',
  'blender',
  'otro'
);

-- Nullable para compatibilidad con usos históricos. Las inserciones nuevas lo
-- van a rellenar siempre desde el panel.
ALTER TABLE usos_equipo
  ADD COLUMN tipo_proceso tipo_proceso;
