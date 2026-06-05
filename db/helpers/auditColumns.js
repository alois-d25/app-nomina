'use strict';

/**
 * Helper reutilizable para inyectar columnas de auditoría (created_at, updated_at)
 * en las migraciones de Sequelize, alineado con el AuditMixin de SQLAlchemy.
 *
 * Uso en migraciones:
 *   const auditColumns = require('../helpers/auditColumns');
 *   ...auditColumns(Sequelize)
 */
module.exports = function auditColumns(Sequelize) {
  return {
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    },
  };
};
