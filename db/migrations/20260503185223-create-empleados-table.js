'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('empleados', {
      cedula: {
        type: Sequelize.STRING(20),
        primaryKey: true
      },

      email: { type: Sequelize.STRING(150), allowNull: false },
      anios_experiencia: { type: Sequelize.INTEGER, allowNull: false },

      tipo_empleado: {
        type: Sequelize.ENUM('servicios','administrativo','docente'),
        allowNull: false
      },

      activo: { type: Sequelize.BOOLEAN, allowNull: false },

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

      fecha_ingreso: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      salario_base: {
        type: Sequelize.DECIMAL(14,2),
        allowNull: false
      },

      ...auditColumns(Sequelize)
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('empleados');
  }
};