'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cestaticket', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      nomina_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      empleado_cedula: {
        type: Sequelize.STRING(20),
        allowNull: false
      },

      inasistencias: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },

      monto: {
        type: Sequelize.DECIMAL(14,2),
        allowNull: false
      },

      observacion: Sequelize.TEXT,

      fecha_pago: {
        type: Sequelize.ENUM('quincenal','mensual'),
        allowNull: false
      },

      ...auditColumns(Sequelize)
    });

    await queryInterface.addConstraint('cestaticket', {
      fields: ['nomina_id','empleado_cedula'],
      type: 'foreign key',
      name: 'fk_cestaticket_nomina_empleado',
      references: {
        table: 'nomina_empleados',
        fields: ['nomina_id','empleado_cedula']
      },
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cestaticket');
  }
};