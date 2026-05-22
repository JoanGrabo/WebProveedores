-- Historial permanente de incidencias (declinaciones de recepción, etc.)

CREATE TABLE `incidencias` (
    `id` VARCHAR(191) NOT NULL,
    `lote_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('DECLINACION_RECEPCION') NOT NULL DEFAULT 'DECLINACION_RECEPCION',
    `nom_proveedor` VARCHAR(255) NOT NULL,
    `num_comanda` VARCHAR(255) NOT NULL,
    `id_linea_comandes` INTEGER NOT NULL,
    `codi_pieza` VARCHAR(255) NULL,
    `codigo_fab` VARCHAR(255) NULL,
    `codigo_conjunto` VARCHAR(255) NULL,
    `OP` VARCHAR(255) NULL,
    `cantidad` INTEGER NULL,
    `comentario` TEXT NOT NULL,
    `registrado_por_id` VARCHAR(191) NULL,
    `registrado_por_nombre` VARCHAR(200) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `incidencias_nom_proveedor_created_at_idx`(`nom_proveedor`, `created_at`),
    INDEX `incidencias_lote_id_idx`(`lote_id`),
    INDEX `incidencias_num_comanda_idx`(`num_comanda`),
    INDEX `incidencias_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
