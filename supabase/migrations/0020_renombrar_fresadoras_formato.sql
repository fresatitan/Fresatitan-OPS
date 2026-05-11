-- =============================================================================
-- 0020 — Renombrado de fresadoras al formato definitivo del cliente
--
-- Objetivo: unificar el formato de los nombres de fresadoras siguiendo la
-- convención del cliente — primera palabra "Fresadora", luego siglas/modelos
-- en mayúsculas, y el identificador de orden (FANUCn / ZRn / DSn) al final.
--
-- METAL (FANUC): eliminar el prefijo "CM " y juntar el número
-- SECO: añadir "ZR3" a la tercera (que no lo tenía) y normalizar "Zr" → "ZR"
-- HÚMEDO: añadir DS1/DS2 al final, normalizar a formato uniforme
--
-- Lilian (REF-041) queda fuera del cambio porque está retirada del servicio.
-- =============================================================================

-- METAL
update public.maquinas set nombre = 'Fresadora FANUC1' where codigo = 'REF-039';
update public.maquinas set nombre = 'Fresadora FANUC2' where codigo = 'REF-040';
update public.maquinas set nombre = 'Fresadora FANUC3' where codigo = 'REF-066';

-- SECO
update public.maquinas set nombre = 'Fresadora UP3D ZR1'       where codigo = 'REF-030';
update public.maquinas set nombre = 'Fresadora UP P53 ZR2'     where codigo = 'REF-057';
update public.maquinas set nombre = 'Fresadora UP P53 DC ZR3'  where codigo = 'REF-064';

-- HÚMEDO
update public.maquinas set nombre = 'Fresadora BIO1000 DS1'    where codigo = 'REF-042';
update public.maquinas set nombre = 'Fresadora UP3D P42 DS2'   where codigo = 'REF-062';

-- Verificación: lista resultante (solo fresadoras activas)
-- select codigo, nombre, subtipo from public.maquinas where tipo = 'fresadora' and activa order by subtipo, codigo;
