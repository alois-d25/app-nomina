'use strict';

const auditColumns = require('../helpers/auditColumns');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('titulos_academicos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: { type: Sequelize.TEXT },
      ...auditColumns(Sequelize)
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('titulos_academicos');
  }
};