-- Motivo de declinación (admin → proveedor). Ejecutar si la tabla ya existe sin este campo.
ALTER TABLE `lineas_comandes_estado`
  ADD COLUMN `comentario_declinacion` TEXT NULL AFTER `recibido_at`;
