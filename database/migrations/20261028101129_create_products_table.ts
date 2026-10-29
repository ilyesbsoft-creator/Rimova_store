
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('products', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('category_id', 36).notNullable();

    table.string('name', 200).notNullable();
    table.string('slug', 220).notNullable();

    table.text('description').nullable();

    table.decimal('price', 12, 2).notNullable();

    table
      .integer('stock_quantity')
      .unsigned()
      .notNullable()
      .defaultTo(0);

    table.string('sku', 100).nullable();

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

    table.unique(['slug'], {
      indexName: 'uq_products_slug',
    });

    table.unique(['sku'], {
      indexName: 'uq_products_sku',
    });

    table.index(
      ['category_id', 'is_active'],
      'idx_products_category_active',
    );

    table.index(
      ['is_active', 'created_at'],
      'idx_products_active_created',
    );

    table
      .foreign('category_id', 'fk_products_category')
      .references('id')
      .inTable('categories')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    table.check(
      'price >= 0',
      [],
      'chk_products_price',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('products');
}
