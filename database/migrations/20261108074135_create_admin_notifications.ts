import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("admin_notifications", (table) => {
    table.string("id", 36).primary();

    table.string("type", 50).notNullable();

    table.string("title", 150).notNullable();

    table.text("message").notNullable();

    table.string("entity_type", 50).nullable();

    table.string("entity_id", 36).nullable();

    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index("type", "idx_admin_notifications_type");

    table.index(
      "created_at",
      "idx_admin_notifications_created_at"
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("admin_notifications");
}