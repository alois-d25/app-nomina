'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuario_roles', {
      usuario_id: {
        type: Sequelize.INTEGER,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE'
      },
      rol_id: {
        type: Sequelize.INTEGER,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE'
      },
    });

    await queryInterface.addConstraint('usuario_roles', {
      fields: ['usuario_id','rol_id'],
      type: 'primary key',
      name: 'pk_usuario_roles'
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('usuario_roles');
  }
};