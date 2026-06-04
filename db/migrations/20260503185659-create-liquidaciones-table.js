'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('liquidaciones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      nomina_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      empleado_cedula: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      fecha_egreso: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      anios_totales: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      monto_total_bs: {
        type: Sequelize.DECIMAL(14,2),
        allowNull: false
      },

      monto_total_usd: {
        type: Sequelize.DECIMAL(14,2),
        allowNull: false
      },

      ...auditColumns(Sequelize)
    });

    await queryInterface.addConstraint('liquidaciones', {
      fields: ['nomina_id','empleado_cedula'],
      type: 'foreign key',
      references: {
        table: 'nomina_empleados',
        fields: ['nomina_id','empleado_cedula']
      },
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('liquidaciones');
  }
};