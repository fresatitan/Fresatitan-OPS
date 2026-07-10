-- =============================================================================
-- 0027 — Código definitivo de la ZONELAB: REF-TITANIO
-- =============================================================================
-- El cliente confirma (julio 2026) que la referencia interna de la
-- sinterizadora ZONELAB CREATE (TI 1) es REF-TITANIO. Sustituye al código
-- provisional REF-CREATE que se usó en la 0024.
-- =============================================================================

UPDATE maquinas SET codigo = 'REF-TITANIO'
WHERE numero_serie = '02A0426002' AND codigo = 'REF-CREATE';

-- Verificación:
-- select codigo, etiqueta, nombre from maquinas where numero_serie = '02A0426002';
