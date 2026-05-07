-- =============================================================================
-- 0019 — Tipo de incidencia (avería) categorizado en cierres KO
-- =============================================================================
-- El cliente quiere que al cerrar un uso con problema, el operario primero
-- seleccione la categoría de avería (de un desplegable filtrado por sub-familia
-- de máquina) y después amplíe con texto libre obligatorio.
--
-- La columna `tipo` es texto libre porque las categorías cambian fácilmente y
-- son distintas según sub-familia. La UI controla qué valores aceptar.
-- =============================================================================

ALTER TABLE incidencias
  ADD COLUMN IF NOT EXISTS tipo text;
