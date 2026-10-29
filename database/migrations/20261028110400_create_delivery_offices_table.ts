
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('delivery_offices', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('delivery_company_id', 36).notNullable();
    table.string('commune_id', 36).notNullable();

    table.string('name', 150).notNullable();
    table.string('address', 500).notNullable();
    table.string('phone', 30).nullable();

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
      ['delivery_company_id', 'commune_id', 'is_active'],
      'idx_delivery_offices_company_commune',
    );

    table
      .foreign('delivery_company_id', 'fk_delivery_offices_company')
      .references('id')
      .inTable('delivery_companies')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');

    table
      .foreign('commune_id', 'fk_delivery_offices_commune')
      .references('id')
      .inTable('communes')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('delivery_offices');
}
