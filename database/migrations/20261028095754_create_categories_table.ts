
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categories', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('name', 150).notNullable();
    table.string('slug', 180).notNullable();
    table.unique(['slug'], {
      indexName: 'uq_categories_slug',
    });

    table.text('description').nullable();
    table.string('image_url', 2048).nullable();

    table.boolean('is_active').notNullable().defaultTo(true);

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
      'idx_categories_active_name',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('categories');
}
