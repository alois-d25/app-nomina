'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rol_autorizaciones', {
      rol_id: {
        type: Sequelize.INTEGER,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE'
      },
      autorizacion_id: {
        type: Sequelize.INTEGER,
        references: { model: 'autorizaciones', key: 'id' },
        onDelete: 'CASCADE'
      }
    });

    await queryInterface.addConstraint('rol_autorizaciones', {
      fields: ['rol_id','autorizacion_id'],
      type: 'primary key',
      name: 'pk_rol_autorizaciones'
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('rol_autorizaciones');
  }
};