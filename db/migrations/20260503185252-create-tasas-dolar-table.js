'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tasas_dolar', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      valor: {
        type: Sequelize.DECIMAL(14,2),
        allowNull: false
      },

      fecha: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      fuente: {
        type: Sequelize.ENUM('usuario','api'),
        allowNull: false
      },

      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },

      ...auditColumns(Sequelize)
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tasas_dolar');
  }
};