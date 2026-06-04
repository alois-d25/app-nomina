'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reglas_escalafon', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      nivel_escalafon_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'niveles_escalafon', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },

      titulo_academico_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'titulos_academicos', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },

      anios_min: { type: Sequelize.INTEGER, allowNull: false },
      anios_max: { type: Sequelize.INTEGER, allowNull: false },

      salario_base: {
        type: Sequelize.DECIMAL(14,2),
        allowNull: false
      },

      activa: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },

      ...auditColumns(Sequelize)
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reglas_escalafon');
  }
};