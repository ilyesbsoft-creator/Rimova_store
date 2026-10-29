
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('wilayas', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('code', 10).notNullable();
    table.string('name', 100).notNullable();

    table.boolean('is_active').notNullable().defaultTo(true);

    table.unique(['code'], {
      indexName: 'uq_wilayas_code',
    });

    table.index(
      ['is_active', 'name'],
      'idx_wilayas_active_name',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('wilayas');
}
