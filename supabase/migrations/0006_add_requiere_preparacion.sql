-- Añadir campo requiere_preparacion a maquinas
-- Sinterizadoras requieren preparación por defecto, fresadoras no
ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS requiere_preparacion boolean NOT NULL DEFAULT true;

-- Fresadoras: desactivar preparación por defecto
UPDATE maquinas SET requiere_preparacion = false WHERE tipo = 'fresadora';

-- Permitir que tecnico_preparacion_id sea NULL en usos_equipo
-- (cuando la máquina no requiere preparación, no se registra quién prepara)
ALTER TABLE usos_equipo
  ALTER COLUMN tecnico_preparacion_id DROP NOT NULL;
