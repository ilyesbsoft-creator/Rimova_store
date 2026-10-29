
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('product_attributes', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('product_id', 36).notNullable();
    table.string('name', 100).notNullable();

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(
      ['product_id', 'name'],
      { indexName: 'uq_product_attribute_name' },
    );

    table
      .foreign('product_id', 'fk_product_attributes_product')
      .references('id')
      .inTable('products')
      .onDelete('CASCADE')
      .onUpdate('RESTRICT');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_attributes');
}
