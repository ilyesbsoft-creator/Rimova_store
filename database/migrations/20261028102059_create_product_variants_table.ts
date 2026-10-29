
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('product_variants', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('product_id', 36).notNullable();
    table.string('sku', 100).nullable();

    table.decimal('price', 12, 2).nullable();

    table
      .integer('stock_quantity')
      .unsigned()
      .notNullable()
      .defaultTo(0);

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

    table.unique(['sku'], {
      indexName: 'uq_product_variants_sku',
    });

    table.index(
      ['product_id', 'is_active'],
      'idx_product_variants_product_active',
    );

    table
      .foreign('product_id', 'fk_product_variants_product')
      .references('id')
      .inTable('products')
      .onDelete('CASCADE')
      .onUpdate('RESTRICT');

    table.check(
      'price IS NULL OR price >= 0',
      [],
      'chk_product_variants_price',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_variants');
}
