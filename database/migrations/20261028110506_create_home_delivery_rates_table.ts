
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('home_delivery_rates', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('delivery_company_id', 36).notNullable();
    table.string('commune_id', 36).notNullable();

    table.decimal('price', 12, 2).notNullable();

    table.boolean('is_active').notNullable().defaultTo(true);

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(
        knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      );

    table.unique(
      ['delivery_company_id', 'commune_id'],
      { indexName: 'uq_home_rate_company_commune' },
    );

    table
      .foreign('delivery_company_id', 'fk_home_rates_company')
      .references('id')
      .inTable('delivery_companies')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    table
      .foreign('commune_id', 'fk_home_rates_commune')
      .references('id')
      .inTable('communes')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    table.check(
      'price >= 0',
      [],
      'chk_home_rates_price',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('home_delivery_rates');
}
