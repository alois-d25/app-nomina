'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auditorias', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },

      tabla_afectada: { type: Sequelize.STRING(100), allowNull: false },
      registro_id: { type: Sequelize.STRING(100), allowNull: false },

      accion: {
        type: Sequelize.ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT'),
        allowNull: false
      },

      valor_anterior: Sequelize.TEXT,
      valor_nuevo: Sequelize.TEXT,

      fecha: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },

      ip_usuario: Sequelize.STRING(45),
      observacion: Sequelize.TEXT
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auditorias');
  }
};