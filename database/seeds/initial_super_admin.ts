
import { randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  const username = process.env.INITIAL_SUPER_ADMIN_USERNAME;
  const email = process.env.INITIAL_SUPER_ADMIN_EMAIL;
  const password = process.env.INITIAL_SUPER_ADMIN_PASSWORD;

  if (!username || !email || !password) {
    throw new Error(
      "Missing initial super admin environment variables.",
    );
  }

  if (password.length < 12) {
    throw new Error(
      "The initial super admin password must be at least 12 characters.",
    );
  }

  // Prevent duplicate creation if a super admin already exists.
  const existing = await knex("admin_users")
    .where({ role: "super_admin" })
    .first("id");

  if (existing) {
    throw new Error(
      "A super admin already exists. No user was created.",
    );
  }

  // Hash the password directly using Argon2id.
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await knex("admin_users").insert({
    id: randomUUID(),
    username,
    email,
    password_hash: passwordHash,
    role: "super_admin",
    is_active: true,
  });
}
