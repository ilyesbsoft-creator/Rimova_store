
import { randomUUID } from "node:crypto";
import db from "../../database/knex";
import type { Knex } from "knex";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type AdminRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "support";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  is_active: number | boolean;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AdminSession {
  id: string;
  admin_user_id: string;
  token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  created_at: Date | string;
  last_seen_at: Date | string | null;
}

export interface AdminSessionWithAdmin {
  session_id: string;
  admin_user_id: string;
  token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  session_created_at: Date | string;
  last_seen_at: Date | string | null;

  admin_id: string;
  username: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  is_active: number | boolean;
  last_login_at: Date | string | null;
  admin_created_at: Date | string;
  admin_updated_at: Date | string;
}

export interface CreateAdminInput {
  username: string;
  email: string;
  password_hash: string;
  role?: AdminRole;
  is_active?: boolean;
}

export interface UpdateAdminInput {
  username?: string;
  email?: string;
  role?: AdminRole;
  is_active?: boolean;
}

export interface ListAdminsFilters {
  search?: string;
  role?: AdminRole;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateAdminSessionInput {
  admin_user_id: string;
  token_hash: string;
  expires_at: Date;
}

/* -------------------------------------------------------------------------- */
/*                              Admin Users                                   */
/* -------------------------------------------------------------------------- */

/**
 * Find an administrator by ID.
 * Includes password_hash; use only in trusted backend code.
 */
export async function findAdminById(
  id: string,
  trx?: Knex.Transaction,
): Promise<AdminUser | undefined> {
  return (trx ?? db)<AdminUser>("admin_users")
    .where({ id })
    .first();
}

/**
 * Find an administrator by email.
 * Includes password_hash for password verification in the service.
 */
export async function findAdminByEmail(
  email: string,
  trx?: Knex.Transaction,
): Promise<AdminUser | undefined> {
  return (trx ?? db)<AdminUser>("admin_users")
    .where({ email: email.trim() })
    .first();
}

/**
 * Find an administrator by username.
 */
export async function findAdminByUsername(
  username: string,
  trx?: Knex.Transaction,
): Promise<AdminUser | undefined> {
  return (trx ?? db)<AdminUser>("admin_users")
    .where({ username: username.trim() })
    .first();
}

/**
 * Find an administrator by email or username.
 * Useful if the login form supports both.
 */
export async function findAdminByEmailOrUsername(
  identifier: string,
  trx?: Knex.Transaction,
): Promise<AdminUser | undefined> {
  const value = identifier.trim();

  return (trx ?? db)<AdminUser>("admin_users")
    .where("email", value)
    .orWhere("username", value)
    .first();
}

/**
 * Create an administrator.
 * The password must already be hashed by the service.
 */
export async function createAdmin(
  input: CreateAdminInput,
  trx?: Knex.Transaction,
): Promise<AdminUser> {
  const id = randomUUID();

  const query = trx ?? db;

  await query("admin_users").insert({
    id,
    username: input.username.trim(),
    email: input.email.trim(),
    password_hash: input.password_hash,
    role: input.role ?? "admin",
    is_active: input.is_active ?? true,
  });

  const admin = await findAdminById(id, trx);

  if (!admin) {
    throw new Error("Failed to retrieve the created administrator.");
  }

  return admin;
}

/**
 * Update basic administrator details.
 */
export async function updateAdmin(
  id: string,
  input: UpdateAdminInput,
  trx?: Knex.Transaction,
): Promise<AdminUser | undefined> {
  const updates: Record<string, unknown> = {};

  if (input.username !== undefined) {
    updates.username = input.username.trim();
  }

  if (input.email !== undefined) {
    updates.email = input.email.trim();
  }

  if (input.role !== undefined) {
    updates.role = input.role;
  }

  if (input.is_active !== undefined) {
    updates.is_active = input.is_active;
  }

  if (Object.keys(updates).length === 0) {
    return findAdminById(id, trx);
  }

  await (trx ?? db)("admin_users")
    .where({ id })
    .update(updates);

  return findAdminById(id, trx);
}

/**
 * Update the administrator's password hash.
 */
export async function updateAdminPasswordHash(
  id: string,
  passwordHash: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const affectedRows = await (trx ?? db)("admin_users")
    .where({ id })
    .update({
      password_hash: passwordHash,
    });

  return affectedRows > 0;
}

/**
 * Enable or disable an administrator.
 */
export async function setAdminActive(
  id: string,
  isActive: boolean,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const affectedRows = await (trx ?? db)("admin_users")
    .where({ id })
    .update({
      is_active: isActive,
    });

  return affectedRows > 0;
}

/**
 * Update last_login_at after successful authentication.
 */
export async function updateAdminLastLogin(
  id: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const affectedRows = await (trx ?? db)("admin_users")
    .where({ id })
    .update({
      last_login_at: (trx ?? db).fn.now(),
    });

  return affectedRows > 0;
}

/**
 * Delete an administrator.
 * Related sessions are deleted by ON DELETE CASCADE.
 */
export async function deleteAdmin(
  id: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const affectedRows = await (trx ?? db)("admin_users")
    .where({ id })
    .delete();

  return affectedRows > 0;
}

/**
 * List administrators with optional filters and pagination.
 */
export async function listAdmins(
  filters: ListAdminsFilters = {},
  trx?: Knex.Transaction,
): Promise<AdminUser[]> {
  const query = (trx ?? db)<AdminUser>("admin_users")
    .select("*")
    .orderBy("created_at", "desc");

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;

    query.where((builder) => {
      builder
        .where("username", "like", search)
        .orWhere("email", "like", search);
    });
  }

  if (filters.role !== undefined) {
    query.where("role", filters.role);
  }

  if (filters.is_active !== undefined) {
    query.where("is_active", filters.is_active);
  }

  if (filters.limit !== undefined) {
    query.limit(Math.max(1, Math.min(filters.limit, 100)));
  }

  if (filters.offset !== undefined) {
    query.offset(Math.max(0, filters.offset));
  }

  return query;
}

/**
 * Count administrators matching the supplied filters.
 */
export async function countAdmins(
  filters: Pick<ListAdminsFilters, "search" | "role" | "is_active"> = {},
  trx?: Knex.Transaction,
): Promise<number> {
  const query = (trx ?? db)("admin_users").count({ total: "*" });

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;

    query.where((builder) => {
      builder
        .where("username", "like", search)
        .orWhere("email", "like", search);
    });
  }

  if (filters.role !== undefined) {
    query.where("role", filters.role);
  }

  if (filters.is_active !== undefined) {
    query.where("is_active", filters.is_active);
  }

  const result = await query.first<{ total: number | string }>();

  return Number(result?.total ?? 0);
}

/* -------------------------------------------------------------------------- */
/*                               Admin Sessions                               */
/* -------------------------------------------------------------------------- */

/**
 * Create a session.
 * token_hash must be calculated by the authentication service.
 */
export async function createAdminSession(
  input: CreateAdminSessionInput,
  trx?: Knex.Transaction,
): Promise<AdminSession> {
  const id = randomUUID();

  await (trx ?? db)("admin_sessions").insert({
    id,
    admin_user_id: input.admin_user_id,
    token_hash: input.token_hash,
    expires_at: input.expires_at,
  });

  const session = await findAdminSessionById(id, trx);

  if (!session) {
    throw new Error("Failed to retrieve the created admin session.");
  }

  return session;
}

/**
 * Find a session using the hash of the cookie token.
 */
export async function findAdminSessionByTokenHash(
  tokenHash: string,
  trx?: Knex.Transaction,
): Promise<AdminSession | undefined> {
  return (trx ?? db)<AdminSession>("admin_sessions")
    .where({ token_hash: tokenHash })
    .first();
}

/**
 * Find a session by its ID.
 */
export async function findAdminSessionById(
  id: string,
  trx?: Knex.Transaction,
): Promise<AdminSession | undefined> {
  return (trx ?? db)<AdminSession>("admin_sessions")
    .where({ id })
    .first();
}

/**
 * Find a session and its administrator in one query.
 * Useful for authentication middleware.
 */
export async function findAdminSessionWithAdminByTokenHash(
  tokenHash: string,
  trx?: Knex.Transaction,
): Promise<AdminSessionWithAdmin | undefined> {
  return (trx ?? db)("admin_sessions as s")
    .join("admin_users as u", "u.id", "s.admin_user_id")
    .select(
      "s.id as session_id",
      "s.admin_user_id",
      "s.token_hash",
      "s.expires_at",
      "s.revoked_at",
      "s.created_at as session_created_at",
      "s.last_seen_at",
      "u.id as admin_id",
      "u.username",
      "u.email",
      "u.password_hash",
      "u.role",
      "u.is_active",
      "u.last_login_at",
      "u.created_at as admin_created_at",
      "u.updated_at as admin_updated_at",
    )
    .where("s.token_hash", tokenHash)
    .first() as Promise<AdminSessionWithAdmin | undefined>;
}

/**
 * List sessions belonging to an administrator.
 */
export async function listAdminSessions(
  adminUserId: string,
  trx?: Knex.Transaction,
): Promise<AdminSession[]> {
  return (trx ?? db)<AdminSession>("admin_sessions")
    .where({ admin_user_id: adminUserId })
    .orderBy("created_at", "desc");
}

/**
 * List sessions that have not been revoked and have not expired.
 */
export async function listActiveAdminSessions(
  adminUserId: string,
  trx?: Knex.Transaction,
): Promise<AdminSession[]> {
  return (trx ?? db)<AdminSession>("admin_sessions")
    .where({ admin_user_id: adminUserId })
    .whereNull("revoked_at")
    .where("expires_at", ">", (trx ?? db).fn.now())
    .orderBy("created_at", "desc");
}

/**
 * Update last_seen_at.
 */
export async function updateAdminSessionLastSeen(
  sessionId: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const query = trx ?? db;

  const affectedRows = await query("admin_sessions")
    .where({ id: sessionId })
    .whereNull("revoked_at")
    .where("expires_at", ">", query.fn.now())
    .update({
      last_seen_at: query.fn.now(),
    });

  return affectedRows > 0;
}

/**
 * Revoke one session by its ID.
 */
export async function revokeAdminSession(
  sessionId: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const query = trx ?? db;

  const affectedRows = await query("admin_sessions")
    .where({ id: sessionId })
    .whereNull("revoked_at")
    .update({
      revoked_at: query.fn.now(),
    });

  return affectedRows > 0;
}

/**
 * Revoke a session using the hash of the cookie token.
 */
export async function revokeAdminSessionByTokenHash(
  tokenHash: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const query = trx ?? db;

  const affectedRows = await query("admin_sessions")
    .where({ token_hash: tokenHash })
    .whereNull("revoked_at")
    .update({
      revoked_at: query.fn.now(),
    });

  return affectedRows > 0;
}

/**
 * Revoke all sessions belonging to an administrator.
 * Useful after a password change or account security event.
 */
export async function revokeAllAdminSessions(
  adminUserId: string,
  trx?: Knex.Transaction,
): Promise<number> {
  const query = trx ?? db;

  return query("admin_sessions")
    .where({ admin_user_id: adminUserId })
    .whereNull("revoked_at")
    .update({
      revoked_at: query.fn.now(),
    });
}

/**
 * Revoke every session for an administrator except the current session.
 */
export async function revokeOtherAdminSessions(
  adminUserId: string,
  currentSessionId: string,
  trx?: Knex.Transaction,
): Promise<number> {
  const query = trx ?? db;

  return query("admin_sessions")
    .where({ admin_user_id: adminUserId })
    .whereNot({ id: currentSessionId })
    .whereNull("revoked_at")
    .update({
      revoked_at: query.fn.now(),
    });
}

/**
 * Remove expired sessions.
 * Can be called periodically by a scheduled cleanup task.
 */
export async function deleteExpiredAdminSessions(
  trx?: Knex.Transaction,
): Promise<number> {
  return (trx ?? db)("admin_sessions")
    .where("expires_at", "<=", (trx ?? db).fn.now())
    .delete();
}

/**
 * Remove sessions revoked before a specified date.
 * Useful for database cleanup.
 */
export async function deleteRevokedAdminSessionsBefore(
  date: Date,
  trx?: Knex.Transaction,
): Promise<number> {
  return (trx ?? db)("admin_sessions")
    .whereNotNull("revoked_at")
    .where("revoked_at", "<", date)
    .delete();
}
