import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("product_images", (table) => {
    table
      .string("image_public_id", 255)
      .nullable()
      .after("image_url");
  });

  await knex.schema.alterTable("categories", (table) => {
    table
      .string("image_public_id", 255)
      .nullable()
      .after("image_url");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("categories", (table) => {
    table.dropColumn("image_public_id");
  });

  await knex.schema.alterTable("product_images", (table) => {
    table.dropColumn("image_public_id");
  });
}