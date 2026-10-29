
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('delivery_companies', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('name', 150).notNullable();
    table.string('phone', 30).nullable();
    table.string('website_url', 2048).nullable();

    table.boolean('is_active').notNullable().defaultTo(false);

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

    table.index(
      ['is_active', 'name'],
      'idx_delivery_companies_active',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('delivery_companies');
}
