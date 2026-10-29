import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('order_items', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('order_id', 36).notNullable();

    table.string('product_id', 36).nullable();
    table.string('product_variant_id', 36).nullable();

    table.string('product_name', 200).notNullable();
    table.string('product_sku', 100).nullable();

    table.integer('quantity').unsigned().notNullable();

    table.decimal('unit_price', 12, 2).notNullable();

    // Generated column
    table.specificType(
      'line_total',
      'DECIMAL(14, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED',
    );

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index(['order_id'], 'idx_order_items_order');
    table.index(['product_id'], 'idx_order_items_product');
    table.index(['product_variant_id'], 'idx_order_items_variant');

    // Foreign keys
    table
      .foreign('order_id', 'fk_order_items_order')
      .references('id')
      .inTable('orders')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    table
      .foreign('product_id', 'fk_order_items_product')
      .references('id')
      .inTable('products')
      .onDelete('SET NULL')
      .onUpdate('RESTRICT');

    table
      .foreign('product_variant_id', 'fk_order_items_variant')
      .references('id')
      .inTable('product_variants')
      .onDelete('SET NULL')
      .onUpdate('RESTRICT');

    // Check constraints
    table.check(
      'quantity > 0',
      [],
      'chk_order_items_quantity',
    );

    table.check(
      'unit_price >= 0',
      [],
      'chk_order_items_unit_price',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('order_items');
}