import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("admin_users", (table) => {
    table
      .enum("role", ["super_admin", "admin", "manager", "support"])
      .notNullable()
      .defaultTo("admin")
      .after("password_hash");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("admin_users", (table) => {
    table.dropColumn("role");
  });
}