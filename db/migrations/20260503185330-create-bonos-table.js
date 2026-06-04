'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bonos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      nomina_id: { type: Sequelize.INTEGER, allowNull: false },
      empleado_cedula: { type: Sequelize.STRING(20), allowNull: false },

      nombre: Sequelize.STRING(100),
      monto: { type: Sequelize.DECIMAL(14,2), allowNull: false },
      es_porcentaje: { type: Sequelize.BOOLEAN, allowNull: false },

      descripcion: Sequelize.TEXT,

      observacion: Sequelize.TEXT,

      tipo_pago: {
        type: Sequelize.ENUM('unico','quincenal','mensual'),
        allowNull: false
      },

      ...auditColumns(Sequelize)
    });

    await queryInterface.addConstraint('bonos', {
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
    await queryInterface.dropTable('bonos');
  }
};