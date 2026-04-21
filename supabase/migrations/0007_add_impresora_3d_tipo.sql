-- Añadir 'impresora_3d' al enum tipo_maquina
-- El cliente ahora opera tres familias: fresadoras, sinterizadoras e impresoras 3D.
-- ALTER TYPE ... ADD VALUE no se puede ejecutar dentro de una transacción implícita
-- si el enum ya está en uso en columnas existentes, por eso usamos IF NOT EXISTS.

ALTER TYPE tipo_maquina ADD VALUE IF NOT EXISTS 'impresora_3d';
