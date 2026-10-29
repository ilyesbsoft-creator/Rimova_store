
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    'product_variant_attribute_values',
    (table) => {
      table.string('variant_id', 36).notNullable();
      table.string('attribute_value_id', 36).notNullable();

      table.primary(['variant_id', 'attribute_value_id']);

      table.index(
        ['attribute_value_id'],
        'idx_variant_attribute_values_value',
      );

      table
        .foreign('variant_id', 'fk_variant_values_variant')
        .references('id')
        .inTable('product_variants')
        .onDelete('CASCADE')
        .onUpdate('RESTRICT');

      table
        .foreign(
          'attribute_value_id',
          'fk_variant_values_attribute_value',
        )
        .references('id')
        .inTable('product_attribute_values')
        .onDelete('CASCADE')
        .onUpdate('RESTRICT');
    },
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(
    'product_variant_attribute_values',
  );
}
