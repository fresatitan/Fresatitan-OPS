-- =============================================================================
-- 0025 — Subtipo también para sinterizadoras: Cr-Co / Titanio
-- =============================================================================
-- El catálogo oficial de averías del cliente (julio 2026) distingue entre
-- sinterizadoras de Cr-Co (aportación de N2) y de titanio (aportación de Ar),
-- así que el subtipo deja de ser exclusivo de fresadoras.
--
-- Reutilizamos el enum `subtipo_fresadora` añadiendo los dos valores nuevos
-- (renombrar un enum en uso no aporta nada y rompería clientes desplegados).
--
-- ⚠ IMPORTANTE: ejecutar esta migración en una ejecución SEPARADA de la 0026.
--   PostgreSQL no permite usar un valor de enum nuevo en la misma transacción
--   en la que se añade, y el SQL Editor ejecuta cada script como una única
--   transacción.
-- =============================================================================

ALTER TYPE subtipo_fresadora ADD VALUE IF NOT EXISTS 'cr_co';
ALTER TYPE subtipo_fresadora ADD VALUE IF NOT EXISTS 'titanio';
