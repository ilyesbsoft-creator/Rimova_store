import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('admin_users', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('username', 100).notNullable();
    table.string('email', 254).notNullable();
    table.string('password_hash', 255).notNullable();

    table.boolean('is_active').notNullable().defaultTo(true);

    table.timestamp('last_login_at').nullable();

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(
        knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      );

    table.unique(['username'], {
      indexName: 'uq_admin_users_username',
    });

    table.unique(['email'], {
      indexName: 'uq_admin_users_email',
    });

    table.index(['is_active'], 'idx_admin_users_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('admin_users');
}