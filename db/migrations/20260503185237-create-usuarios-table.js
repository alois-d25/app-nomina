'use strict';
const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      nombre: { type: Sequelize.STRING(100), allowNull: false },

      email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },

      password: { type: Sequelize.STRING(255), allowNull: false },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },

      empleado_cedula: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
        references: { model: 'empleados', key: 'cedula' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },

      ...auditColumns(Sequelize)
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  }
};