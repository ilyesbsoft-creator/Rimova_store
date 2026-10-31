import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("admin_sessions", (table) => {
    table
      .string("id", 36)
      .notNullable()
      .primary();

    table
      .string("admin_user_id", 36)
      .notNullable();

    table
      .specificType("token_hash", "CHAR(64)")
      .notNullable()
      .unique("uq_admin_sessions_token_hash");

    table.dateTime("expires_at").notNullable();

    table.dateTime("revoked_at").nullable().defaultTo(null);

    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    table.timestamp("last_seen_at").nullable().defaultTo(null);

    table.index(
      ["admin_user_id"],
      "idx_admin_sessions_admin_user_id"
    );

    table.index(
      ["expires_at"],
      "idx_admin_sessions_expires_at"
    );

    table
      .foreign("admin_user_id", "fk_admin_sessions_admin_user")
      .references("id")
      .inTable("admin_users")
      .onDelete("CASCADE");
  });

  await knex.raw(`
    ALTER TABLE \`admin_sessions\`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci
    ENGINE = InnoDB
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("admin_sessions");
}