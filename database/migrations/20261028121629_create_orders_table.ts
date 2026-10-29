import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('orders', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('order_number', 40).notNullable();

    table.string('customer_first_name', 100).notNullable();
    table.string('customer_last_name', 100).notNullable();
    table.string('customer_phone', 30).notNullable();

    table.string('wilaya_id', 36).notNullable();
    table.string('commune_id', 36).notNullable();

    table.string('delivery_company_id', 36).notNullable();

    table
      .enu('delivery_method', ['HOME', 'OFFICE'])
      .notNullable();

    table.string('delivery_office_id', 36).nullable();

    table.string('delivery_address', 500).nullable();

    table.decimal('delivery_fee', 12, 2).notNullable();
    table.decimal('subtotal', 12, 2).notNullable();
    table.decimal('total_amount', 12, 2).notNullable();

    table
      .enu('status', [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'RETURNED',
      ])
      .notNullable()
      .defaultTo('PENDING');

    table.text('customer_note').nullable();

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

    // Unique constraint
    table.unique(['order_number'], {
      indexName: 'uq_orders_order_number',
    });

    // Indexes
    table.index(
      ['status', 'created_at'],
      'idx_orders_status_created',
    );

    table.index(
      ['created_at'],
      'idx_orders_created',
    );

    table.index(
      ['customer_phone', 'created_at'],
      'idx_orders_phone_created',
    );

    table.index(
      ['commune_id', 'created_at'],
      'idx_orders_commune_created',
    );

    table.index(
      ['delivery_company_id', 'status'],
      'idx_orders_company_status',
    );

    // Foreign keys
    table
      .foreign('wilaya_id', 'fk_orders_wilaya')
      .references('id')
      .inTable('wilayas')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    table
      .foreign('commune_id', 'fk_orders_commune')
      .references('id')
      .inTable('communes')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    table
      .foreign('delivery_company_id', 'fk_orders_delivery_company')
      .references('id')
      .inTable('delivery_companies')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    table
      .foreign('delivery_office_id', 'fk_orders_delivery_office')
      .references('id')
      .inTable('delivery_offices')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    // Check: amounts
    table.check(
      [
        'delivery_fee >= 0',
        'subtotal >= 0',
        'total_amount >= 0',
        'total_amount = subtotal + delivery_fee',
      ].join(' AND '),
      [],
      'chk_orders_amounts',
    );

    // Check: delivery details
    table.check(
      `(
        (
          delivery_method = 'HOME'
          AND delivery_address IS NOT NULL
          AND delivery_office_id IS NULL
        )
        OR
        (
          delivery_method = 'OFFICE'
          AND delivery_office_id IS NOT NULL
        )
      )`,
      [],
      'chk_orders_delivery_details',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('orders');
}