-- ============================================================
-- Migration: add formula_calculo to deducciones
-- Adds automatic legal formula support (IVSS, SPF, LPH, FAOV)
-- Run this script once against the database.
-- ============================================================

-- Step 1: Expand the nombre ENUM to include Spf, Faov, Beca Escolar
--         (Faob kept for backward compatibility, Faov added as correct term)
ALTER TABLE deducciones
  MODIFY COLUMN nombre ENUM(
    'Ivss',
    'Lph',
    'Spf',
    'Faov',
    'Anticipos',
    'Uniforme',
    'Inscripcion',
    'Prestamo Personal',
    'Inasistencias',
    'Beca Escolar'
  ) NOT NULL;

-- Step 2: Add the formula_calculo column
ALTER TABLE deducciones
  ADD COLUMN formula_calculo ENUM('manual','ivss','spf','lph','faov')
    NOT NULL DEFAULT 'manual'
    AFTER nombre;

-- Step 3: Auto-assign formulas to any existing deducciones by type
--         so legacy records get the correct formula automatically.
UPDATE deducciones SET formula_calculo = 'ivss'  WHERE nombre = 'Ivss';
UPDATE deducciones SET formula_calculo = 'lph'   WHERE nombre = 'Lph';
UPDATE deducciones SET formula_calculo = 'faov'  WHERE nombre = 'Faov';

-- Step 4 (optional): Rename old 'Faob' records to 'Faov' if any exist
UPDATE deducciones SET nombre = 'Faov', formula_calculo = 'faov' WHERE nombre = 'Faob';

-- Note: SPF records did not exist before this migration.
-- Create them manually via the admin panel or via seeder.
-- ============================================================
