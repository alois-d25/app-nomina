'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('nomina_empleados', {
      nomina_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'nominas', key: 'id' },
        onDelete: 'CASCADE'
      },

      empleado_cedula: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'empleados', key: 'cedula' },
        onDelete: 'CASCADE'
      },

      salario_base: Sequelize.DECIMAL(14,2),
      total_ingresos: Sequelize.DECIMAL(14,2),
      total_deducciones: Sequelize.DECIMAL(14,2),
      salario_final_bs: Sequelize.DECIMAL(14,2),
      salario_final_usd: Sequelize.DECIMAL(14,2),

      ...auditColumns(Sequelize)
    });

    await queryInterface.addConstraint('nomina_empleados', {
      fields: ['nomina_id','empleado_cedula'],
      type: 'primary key',
      name: 'pk_nomina_empleado'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('nomina_empleados');
  }
};