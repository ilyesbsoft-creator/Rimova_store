import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("delivery_offices", (table) => {
    table.string("external_office_id", 100).nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("delivery_offices", (table) => {
    table.dropColumn("external_office_id");
  });
}