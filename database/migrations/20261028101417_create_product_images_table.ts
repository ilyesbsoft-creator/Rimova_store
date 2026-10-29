
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('product_images', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('product_id', 36).notNullable();

    table.string('image_url', 2048).notNullable();
    table.string('alt_text', 255).nullable();

    table
      .integer('sort_order')
      .unsigned()
      .notNullable()
      .defaultTo(0);

    table.boolean('is_primary').notNullable().defaultTo(false);

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(
      ['product_id', 'sort_order'],
      'idx_product_images_product_order',
    );

    table
      .foreign('product_id', 'fk_product_images_product')
      .references('id')
      .inTable('products')
      .onDelete('CASCADE')
      .onUpdate('RESTRICT');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_images');
}
