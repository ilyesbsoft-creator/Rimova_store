
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('product_attribute_values', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('attribute_id', 36).notNullable();
    table.string('value', 150).notNullable();

    table.unique(
      ['attribute_id', 'value'],
      { indexName: 'uq_attribute_value' },
    );

    table
      .foreign('attribute_id', 'fk_attribute_values_attribute')
      .references('id')
      .inTable('product_attributes')
      .onDelete('CASCADE')
      .onUpdate('RESTRICT');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_attribute_values');
}
