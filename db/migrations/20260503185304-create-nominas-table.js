'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('nominas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      fecha_pago: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      tasa_dolar_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tasas_dolar', key: 'id' },
        onDelete: 'RESTRICT'
      },

      ...auditColumns(Sequelize)
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('nominas');
  }
};