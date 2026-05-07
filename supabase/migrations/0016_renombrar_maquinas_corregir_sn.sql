-- =============================================================================
-- 0016 — Renombrar máquinas y corregir números de serie según lista oficial
-- =============================================================================
-- Cambios pedidos por el cliente (Configuració OPS, mayo 2026):
--
-- 1. REF-062: renombrar de "Fresadora UP3D Disilicato" a "Fresadora DS UP3D P42"
--    (sigue siendo una fresadora HÚMEDO, sub-familia "Ds 2")
--
-- 2. REF-046 (Trumpf 3D Laser): el SN era 'S0711Q0182' (mismo que REF-045 por
--    error). El correcto es 'S0711Q069'.
--
-- 3. Sismas intercambiadas (cliente confirma que en el seed están al revés):
--      - REF-048 ahora es "Sinterizadora SISMA 2 MYSINT" SN 'LS0005866'
--        (antes nombre "Sisma 1", SN 'LS005865')
--      - REF-049 ahora es "Sinterizadora SISMA 1 MYSINT" SN 'LS0008790'
--        (antes nombre "Sisma 2", SN 'LS0008790' — el SN ya era correcto)
-- =============================================================================

-- 1. Renombrar REF-062
UPDATE maquinas
   SET nombre = 'Fresadora DS UP3D P42'
 WHERE codigo = 'REF-062';

-- 2. Corregir SN de REF-046
UPDATE maquinas
   SET numero_serie = 'S0711Q069'
 WHERE codigo = 'REF-046';

-- 3a. REF-048 → Sisma 2 MYSINT
UPDATE maquinas
   SET nombre = 'Sinterizadora SISMA 2 MYSINT',
       numero_serie = 'LS0005866'
 WHERE codigo = 'REF-048';

-- 3b. REF-049 → Sisma 1 MYSINT (el SN ya es el correcto)
UPDATE maquinas
   SET nombre = 'Sinterizadora SISMA 1 MYSINT'
 WHERE codigo = 'REF-049';
