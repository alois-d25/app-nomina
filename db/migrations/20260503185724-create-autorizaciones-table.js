'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('autorizaciones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false, unique: true }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('autorizaciones');
  }
};