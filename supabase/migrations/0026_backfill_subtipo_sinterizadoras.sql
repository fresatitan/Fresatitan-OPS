-- =============================================================================
-- 0026 — Backfill de subtipo en sinterizadoras (requiere 0025 aplicada ANTES,
--        en una ejecución separada)
-- =============================================================================
-- · SINT 1-5 (TRUMPF y SISMA) → cr_co   (aportación de N2)
-- · TI 1 (ZONELAB CREATE)     → titanio (aportación de Ar)
-- =============================================================================

UPDATE maquinas SET subtipo = 'cr_co'
WHERE tipo = 'sinterizadora' AND codigo IN ('REF-045','REF-046','REF-047','REF-048','REF-049');

UPDATE maquinas SET subtipo = 'titanio'
WHERE tipo = 'sinterizadora' AND numero_serie = '02A0426002';

-- Verificación:
-- select codigo, etiqueta, nombre, subtipo from maquinas where tipo = 'sinterizadora' order by etiqueta;
