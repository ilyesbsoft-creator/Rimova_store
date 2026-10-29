
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('communes', (table) => {
    table.string('id', 36).primary().notNullable();

    table.string('wilaya_id', 36).notNullable();
    table.string('code', 20).nullable();
    table.string('name', 120).notNullable();

    table.boolean('is_active').notNullable().defaultTo(true);

    table.unique(['code'], {
      indexName: 'uq_communes_code',
    });

    table.index(
      ['wilaya_id', 'is_active', 'name'],
      'idx_communes_wilaya_active',
    );

    table
      .foreign('wilaya_id', 'fk_communes_wilaya')
      .references('id')
      .inTable('wilayas')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('communes');
}
