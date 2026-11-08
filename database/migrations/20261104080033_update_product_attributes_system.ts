import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Create global_attributes
  await knex.schema.createTable("global_attributes", (table) => {
    table.string("id", 36).primary();
    table.string("name", 100).notNullable().unique();
    table.string("type", 30).notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  // 2. Modify product_attributes
  await knex.schema.alterTable("product_attributes", (table) => {
    table.dropForeign(["product_id"], "fk_product_attributes_product");

    table.dropUnique(
      ["product_id", "name"],
      "uq_product_attribute_name"
    );

    table.dropColumn("name");

    table.string("global_attribute_id", 36).notNullable();

    table.unique(
      ["product_id", "global_attribute_id"],
      "uq_product_global_attribute"
    );

    table
      .foreign("global_attribute_id", "fk_product_attributes_global")
      .references("id")
      .inTable("global_attributes")
      .onUpdate("RESTRICT")
      .onDelete("RESTRICT");

    table
      .foreign("product_id", "fk_product_attributes_product")
      .references("id")
      .inTable("products")
      .onUpdate("RESTRICT")
      .onDelete("CASCADE");
  });

  // 3. Modify product_attribute_values
  await knex.schema.alterTable("product_attribute_values", (table) => {
    table.dropForeign(
      ["attribute_id"],
      "fk_attribute_values_attribute"
    );

    table.dropUnique(
      ["attribute_id", "value"],
      "uq_attribute_value"
    );

    table.renameColumn("attribute_id", "product_attribute_id");

    table.string("color_code", 7).nullable();

    table.unique(
      ["product_attribute_id", "value"],
      "uq_attribute_value"
    );

    table
      .foreign(
        "product_attribute_id",
        "fk_attribute_values_product_attribute"
      )
      .references("id")
      .inTable("product_attributes")
      .onUpdate("RESTRICT")
      .onDelete("CASCADE");
  });

  // 4. Add image_url to product_variants
  await knex.schema.alterTable("product_variants", (table) => {
    table.string("image_url", 2048).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  // 1. Restore product_variants
  await knex.schema.alterTable("product_variants", (table) => {
    table.dropColumn("image_url");
  });

  // 2. Restore product_attribute_values
  await knex.schema.alterTable("product_attribute_values", (table) => {
    table.dropForeign(
      ["product_attribute_id"],
      "fk_attribute_values_product_attribute"
    );

    table.dropUnique(
      ["product_attribute_id", "value"],
      "uq_attribute_value"
    );

    table.dropColumn("color_code");

    table.renameColumn("product_attribute_id", "attribute_id");
  });

  await knex.schema.alterTable("product_attribute_values", (table) => {
    table.unique(
      ["attribute_id", "value"],
      "uq_attribute_value"
    );

    table
      .foreign("attribute_id", "fk_attribute_values_attribute")
      .references("id")
      .inTable("product_attributes")
      .onUpdate("RESTRICT")
      .onDelete("CASCADE");
  });

  // 3. Restore product_attributes
  await knex.schema.alterTable("product_attributes", (table) => {
    table.dropForeign(
      ["global_attribute_id"],
      "fk_product_attributes_global"
    );

    table.dropUnique(
      ["product_id", "global_attribute_id"],
      "uq_product_global_attribute"
    );

    table.dropForeign(
      ["product_id"],
      "fk_product_attributes_product"
    );

    table.dropColumn("global_attribute_id");

    table.string("name", 100).notNullable();

    table.unique(
      ["product_id", "name"],
      "uq_product_attribute_name"
    );

    table
      .foreign("product_id", "fk_product_attributes_product")
      .references("id")
      .inTable("products")
      .onUpdate("RESTRICT")
      .onDelete("CASCADE");
  });

  // 4. Drop global_attributes
  await knex.schema.dropTable("global_attributes");
}