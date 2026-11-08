import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    "admin_notification_channels",
    (table) => {
      table.string("id", 36).primary();

      table.string("admin_user_id", 36).notNullable();

      table
        .enu("channel", ["telegram"])
        .notNullable();

      table.string("external_id", 100).notNullable();

      table.boolean("is_enabled").notNullable().defaultTo(true);

      table.timestamp("verified_at").nullable();

      table
        .timestamp("created_at")
        .notNullable()
        .defaultTo(knex.fn.now());

      table
        .timestamp("updated_at")
        .notNullable()
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

      table.unique(
        ["admin_user_id", "channel"],
        "uq_admin_channel"
      );

      table.unique(
        ["channel", "external_id"],
        "uq_channel_external"
      );

      table
        .foreign("admin_user_id", "fk_channel_admin")
        .references("id")
        .inTable("admin_users")
        .onDelete("CASCADE");
    }
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(
    "admin_notification_channels"
  );
}