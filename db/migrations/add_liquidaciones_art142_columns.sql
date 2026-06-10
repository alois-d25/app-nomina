-- Migración: Módulo de Liquidaciones Art. 142 LOTTT
-- Agregar columnas de desglose completo a la tabla liquidaciones
-- y reestructurar liquidaciones_prestaciones para soportar múltiples conceptos.

-- ─── 1. Nuevas columnas en liquidaciones ──────────────────────────────────────

ALTER TABLE liquidaciones
    ADD COLUMN IF NOT EXISTS salario_integral_dia DECIMAL(14,4) NULL          COMMENT 'Salario Integral Diario usado en el cálculo',
    ADD COLUMN IF NOT EXISTS escenario_aplicado   VARCHAR(1)    NULL          COMMENT 'A o B (Art. 142 LOTTT)',
    ADD COLUMN IF NOT EXISTS escenario_a_bs        DECIMAL(14,2) NULL         COMMENT 'Monto Escenario A (depósitos + adicionales)',
    ADD COLUMN IF NOT EXISTS escenario_b_bs        DECIMAL(14,2) NULL         COMMENT 'Monto Escenario B (SID × 30 × años)',
    ADD COLUMN IF NOT EXISTS prestaciones_bs       DECIMAL(14,2) NULL         COMMENT 'MAX(A, B)',
    ADD COLUMN IF NOT EXISTS vacaciones_fracc_bs   DECIMAL(14,2) NULL         COMMENT 'Vacaciones fraccionadas desde último aniversario',
    ADD COLUMN IF NOT EXISTS bono_vac_fracc_bs     DECIMAL(14,2) NULL         COMMENT 'Bono vacacional fraccionado',
    ADD COLUMN IF NOT EXISTS utilidades_fracc_bs   DECIMAL(14,2) NULL         COMMENT 'Utilidades fraccionadas del año fiscal',
    ADD COLUMN IF NOT EXISTS salarios_pendientes_bs DECIMAL(14,2) NULL        COMMENT 'Días trabajados en la quincena actual no pagados',
    ADD COLUMN IF NOT EXISTS intereses_bs          DECIMAL(14,2) NULL         COMMENT 'Intereses sobre prestaciones (tasa activa BCV)',
    ADD COLUMN IF NOT EXISTS saldo_deudor_bs       DECIMAL(14,2) NULL DEFAULT 0 COMMENT 'Saldo deudor de préstamos y anticipos',
    ADD COLUMN IF NOT EXISTS monto_neto_bs         DECIMAL(14,2) NULL         COMMENT 'Neto a pagar (bruto - deducciones, mínimo 0)',
    ADD COLUMN IF NOT EXISTS monto_neto_usd        DECIMAL(14,2) NULL;

-- ─── 2. Reestructurar liquidaciones_prestaciones ──────────────────────────────
-- La tabla tenía PK compuesta (liquidacion_id, prestacion_id) con prestacion_id NOT NULL.
-- La nueva versión usa id autoincrement y prestacion_id nullable.

-- Eliminar la tabla antigua y recrearla
DROP TABLE IF EXISTS liquidaciones_prestaciones;

CREATE TABLE liquidaciones_prestaciones (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    liquidacion_id      INT            NOT NULL,
    prestacion_id       INT            NULL,
    concepto            VARCHAR(50)    NULL         COMMENT 'Identificador del concepto: prestaciones_sociales, vacaciones_fraccionadas, etc.',
    cantidad_dias       DECIMAL(7,4)   NULL,
    salario_integral_dia DECIMAL(14,4) NULL,
    monto_total_bs      DECIMAL(14,2)  NOT NULL,
    monto_total_usd     DECIMAL(14,2)  NOT NULL,
    es_deduccion        TINYINT(1)     NOT NULL DEFAULT 0 COMMENT '0=ingreso, 1=deducción',
    observacion         TEXT           NULL,
    created_at          DATETIME       NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME       NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lp_liquidacion FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones(id) ON DELETE CASCADE,
    INDEX idx_lp_liquidacion (liquidacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
