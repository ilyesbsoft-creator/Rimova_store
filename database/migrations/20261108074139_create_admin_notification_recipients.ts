import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    "admin_notification_recipients",
    (table) => {
      table.string("id", 36).primary();

      table.string("notification_id", 36).notNullable();

      table.string("admin_user_id", 36).notNullable();

      table.timestamp("read_at").nullable();

      table
        .timestamp("created_at")
        .notNullable()
        .defaultTo(knex.fn.now());

      table.unique(
        ["notification_id", "admin_user_id"],
        "uq_notification_recipient"
      );

      table.index(
        ["admin_user_id", "read_at"],
        "idx_recipient_admin_read"
      );

      table
        .foreign("notification_id", "fk_recipient_notification")
        .references("id")
        .inTable("admin_notifications")
        .onDelete("CASCADE");

      table
        .foreign("admin_user_id", "fk_recipient_admin")
        .references("id")
        .inTable("admin_users")
        .onDelete("CASCADE");
    }
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(
    "admin_notification_recipients"
  );
}