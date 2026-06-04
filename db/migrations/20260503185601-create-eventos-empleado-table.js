'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('eventos_empleado', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      nomina_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      empleado_cedula: {
        type: Sequelize.STRING(20),
        allowNull: false
      },

      tipo_evento: {
        type: Sequelize.STRING(50),
        allowNull: false
      },

      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      fecha_fin: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      canx_horas: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      canx_dias: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      monto: {
        type: Sequelize.DECIMAL(14,2),
        allowNull: false
      },

      ...auditColumns(Sequelize)
    });

    await queryInterface.addConstraint('eventos_empleado', {
      fields: ['nomina_id','empleado_cedula'],
      type: 'foreign key',
      name: 'fk_eventos_nomina_empleado',
      references: {
        table: 'nomina_empleados',
        fields: ['nomina_id','empleado_cedula']
      },
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('eventos_empleado');
  }
};