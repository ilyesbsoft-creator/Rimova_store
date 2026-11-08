
import * as adminAuthRepository from "./adminAuth.repository";

import {
  generateSessionToken,
  hashSessionToken,
  hashPassword,
  verifyPassword,
} from "./adminAuth.utils";

import type {
  AdminRole,
  AdminUser,
  AdminSession,
} from "./adminAuth.repository";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 401,
    public readonly code = "ADMIN_AUTH_ERROR",
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export interface AdminPublicProfile {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AdminLoginResult {
  admin: AdminPublicProfile;
  sessionToken: string;
  session: AdminSession;
}

export interface AuthenticatedAdmin {
  admin: AdminPublicProfile;
  session: {
    id: string;
    expires_at: Date | string;
    created_at: Date | string;
    last_seen_at: Date | string | null;
  };
}

export interface AdminListInput {
  search?: string;
  role?: AdminRole;
  isActive?: boolean;
  page: number;
  limit: number;
  sortBy?:
    | "username"
    | "email"
    | "role"
    | "created_at"
    | "last_login_at";
  sortOrder?: "asc" | "desc";
}

export interface AdminListResult {
  admins: AdminPublicProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAdminAccountInput {
  username: string;
  email: string;
  password: string;
  role?: AdminRole;
}

export interface UpdateAdminAccountInput {
  username?: string;
  email?: string;
  role?: AdminRole;
}

/* -------------------------------------------------------------------------- */
/*                               Configuration                                */
/* -------------------------------------------------------------------------- */

const NORMAL_SESSION_HOURS = 12;
const REMEMBERED_SESSION_DAYS = 30;

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

/* -------------------------------------------------------------------------- */
/*                              Internal Helpers                              */
/* -------------------------------------------------------------------------- */

function toPublicAdmin(admin: AdminUser): AdminPublicProfile {
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    is_active: Boolean(admin.is_active),
    last_login_at: admin.last_login_at,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
  };
}

function createSessionExpiration(rememberMe: boolean): Date {
  const expiresAt = new Date();

  if (rememberMe) {
    expiresAt.setDate(
      expiresAt.getDate() + REMEMBERED_SESSION_DAYS,
    );
  } else {
    expiresAt.setHours(
      expiresAt.getHours() + NORMAL_SESSION_HOURS,
    );
  }

  return expiresAt;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim();
}

function isDuplicateDatabaseError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

async function ensureAdminExists(
  adminUserId: string,
): Promise<AdminUser> {
  const admin =
    await adminAuthRepository.findAdminById(adminUserId);

  if (!admin) {
    throw new AdminAuthError(
      "Administrator not found.",
      404,
      "ADMIN_NOT_FOUND",
    );
  }

  return admin;
}

async function ensureLastSuperAdminIsPreserved(
  admin: AdminUser,
  willRemainSuperAdmin: boolean,
): Promise<void> {
  if (admin.role !== "super_admin" || willRemainSuperAdmin) {
    return;
  }

  if (!admin.is_active) {
    return;
  }

  const activeSuperAdmins =
    await adminAuthRepository.countAdmins({
      role: "super_admin",
      is_active: true,
    });

  if (activeSuperAdmins <= 1) {
    throw new AdminAuthError(
      "Cannot remove or disable the last active super administrator.",
      409,
      "LAST_SUPER_ADMIN",
    );
  }
}

/**
 * Prevent the service from accepting invalid pagination values.
 */
function normalizePagination(
  page: number,
  limit: number,
): { page: number; limit: number; offset: number } {
  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    throw new AdminAuthError(
      "Invalid pagination parameters.",
      400,
      "INVALID_PAGINATION",
    );
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

/* -------------------------------------------------------------------------- */
/*                                    Login                                   */
/* -------------------------------------------------------------------------- */

export async function loginAdmin(
  identifier: string,
  password: string,
  rememberMe = false,
): Promise<AdminLoginResult> {
  const normalizedIdentifier = identifier.trim();

  if (!normalizedIdentifier || !password) {
    throw new AdminAuthError(
      "Invalid email/username or password.",
      400,
      "INVALID_LOGIN_INPUT",
    );
  }

  const admin =
    await adminAuthRepository.findAdminByEmailOrUsername(
      normalizedIdentifier,
    );

  if (!admin) {
    throw new AdminAuthError(
      "Invalid email/username or password.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const passwordIsValid = await verifyPassword(
    password,
    admin.password_hash,
  );

  if (!passwordIsValid) {
    throw new AdminAuthError(
      "Invalid email/username or password.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  if (!admin.is_active) {
    throw new AdminAuthError(
      "This administrator account is disabled.",
      403,
      "ADMIN_ACCOUNT_DISABLED",
    );
  }

  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = createSessionExpiration(rememberMe);

  const session = await adminAuthRepository.createAdminSession({
    admin_user_id: admin.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  try {
    const updated =
      await adminAuthRepository.updateAdminLastLogin(admin.id);

    if (!updated) {
      throw new Error("Failed to update last login.");
    }

    const updatedAdmin =
      await adminAuthRepository.findAdminById(admin.id);

    if (!updatedAdmin) {
      throw new Error("Administrator no longer exists.");
    }

    return {
      admin: toPublicAdmin(updatedAdmin),
      sessionToken,
      session,
    };
  } catch (error) {
    await adminAuthRepository.revokeAdminSessionByTokenHash(
      tokenHash,
    );

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                              Session Validation                            */
/* -------------------------------------------------------------------------- */

export async function authenticateAdminSession(
  sessionToken: string | undefined | null,
): Promise<AuthenticatedAdmin | null> {
  if (!sessionToken) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken);

  const session =
    await adminAuthRepository
      .findAdminSessionWithAdminByTokenHash(tokenHash);

  if (!session) {
    return null;
  }

  if (session.revoked_at !== null) {
    return null;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await adminAuthRepository.revokeAdminSession(
      session.session_id,
    );

    return null;
  }

  if (!session.is_active) {
    await adminAuthRepository.revokeAdminSession(
      session.session_id,
    );

    return null;
  }

  const updated =
    await adminAuthRepository.updateAdminSessionLastSeen(
      session.session_id,
    );

  if (!updated) {
    return null;
  }

  return {
    admin: {
      id: session.admin_id,
      username: session.username,
      email: session.email,
      role: session.role,
      is_active: Boolean(session.is_active),
      last_login_at: session.last_login_at,
      created_at: session.admin_created_at,
      updated_at: session.admin_updated_at,
    },
    session: {
      id: session.session_id,
      expires_at: session.expires_at,
      created_at: session.session_created_at,
      last_seen_at: session.last_seen_at,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                    Logout                                  */
/* -------------------------------------------------------------------------- */

export async function logoutAdmin(
  sessionToken: string | undefined | null,
): Promise<void> {
  if (!sessionToken) {
    return;
  }

  const tokenHash = hashSessionToken(sessionToken);

  await adminAuthRepository.revokeAdminSessionByTokenHash(
    tokenHash,
  );
}

/* -------------------------------------------------------------------------- */
/*                              Session Management                            */
/* -------------------------------------------------------------------------- */

/**
 * Get all active sessions belonging to an administrator.
 */
export async function getAdminActiveSessions(
  adminUserId: string,
): Promise<AdminSession[]> {
  await ensureAdminExists(adminUserId);

  return adminAuthRepository.listActiveAdminSessions(
    adminUserId,
  );
}

/**
 * Get all sessions, including revoked and expired sessions.
 */
export async function getAdminSessions(
  adminUserId: string,
): Promise<AdminSession[]> {
  await ensureAdminExists(adminUserId);

  return adminAuthRepository.listAdminSessions(
    adminUserId,
  );
}

/**
 * Revoke one session after checking ownership.
 */
export async function revokeAdminSession(
  adminUserId: string,
  sessionId: string,
): Promise<void> {
  const session =
    await adminAuthRepository.findAdminSessionById(sessionId);

  if (!session || session.admin_user_id !== adminUserId) {
    throw new AdminAuthError(
      "Session not found.",
      404,
      "ADMIN_SESSION_NOT_FOUND",
    );
  }

  await adminAuthRepository.revokeAdminSession(sessionId);
}

/**
 * Revoke all sessions belonging to an administrator.
 */
export async function revokeAllAdminSessions(
  adminUserId: string,
): Promise<number> {
  await ensureAdminExists(adminUserId);

  return adminAuthRepository.revokeAllAdminSessions(
    adminUserId,
  );
}

/**
 * Revoke all sessions except the current session.
 */
export async function revokeOtherAdminSessions(
  adminUserId: string,
  currentSessionId: string,
): Promise<number> {
  await ensureAdminExists(adminUserId);

  const currentSession =
    await adminAuthRepository.findAdminSessionById(
      currentSessionId,
    );

  if (
    !currentSession ||
    currentSession.admin_user_id !== adminUserId ||
    currentSession.revoked_at !== null
  ) {
    throw new AdminAuthError(
      "Current session not found.",
      404,
      "CURRENT_SESSION_NOT_FOUND",
    );
  }

  return adminAuthRepository.revokeOtherAdminSessions(
    adminUserId,
    currentSessionId,
  );
}

/* -------------------------------------------------------------------------- */
/*                              Password Management                           */
/* -------------------------------------------------------------------------- */

export async function changeAdminPassword(
  adminUserId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!currentPassword || !newPassword) {
    throw new AdminAuthError(
      "Current password and new password are required.",
      400,
      "INVALID_PASSWORD_INPUT",
    );
  }

  if (
    newPassword.length < MIN_PASSWORD_LENGTH ||
    newPassword.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AdminAuthError(
      `The new password must contain between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
      400,
      "WEAK_PASSWORD",
    );
  }

  if (currentPassword === newPassword) {
    throw new AdminAuthError(
      "New password must differ from current password.",
      400,
      "PASSWORD_UNCHANGED",
    );
  }

  const admin = await ensureAdminExists(adminUserId);

  if (!admin.is_active) {
    throw new AdminAuthError(
      "This administrator account is disabled.",
      403,
      "ADMIN_ACCOUNT_DISABLED",
    );
  }

  const passwordIsValid = await verifyPassword(
    currentPassword,
    admin.password_hash,
  );

  if (!passwordIsValid) {
    throw new AdminAuthError(
      "The current password is incorrect.",
      400,
      "INCORRECT_CURRENT_PASSWORD",
    );
  }

  const newPasswordHash = await hashPassword(newPassword);

  const updated =
    await adminAuthRepository.updateAdminPasswordHash(
      adminUserId,
      newPasswordHash,
    );

  if (!updated) {
    throw new AdminAuthError(
      "Unable to update the password.",
      500,
      "PASSWORD_UPDATE_FAILED",
    );
  }

  // Security: invalidate every session after a password change.
  await adminAuthRepository.revokeAllAdminSessions(
    adminUserId,
  );
}

/* -------------------------------------------------------------------------- */
/*                         Administrator Creation                             */
/* -------------------------------------------------------------------------- */

export async function createAdminAccount(
  input: CreateAdminAccountInput,
): Promise<AdminPublicProfile> {
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);

  if (!username || !email || !input.password) {
    throw new AdminAuthError(
      "Username, email and password are required.",
      400,
      "INVALID_ADMIN_INPUT",
    );
  }

  if (
    input.password.length < 6 ||
    input.password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AdminAuthError(
      "Password must contain between 6 and 128 characters.",
      400,
      "WEAK_PASSWORD",
    );
  }

  const existingByEmail =
    await adminAuthRepository.findAdminByEmail(email);

  if (existingByEmail) {
    throw new AdminAuthError(
      "An administrator with this email already exists.",
      409,
      "ADMIN_EMAIL_ALREADY_EXISTS",
    );
  }

  const existingByUsername =
    await adminAuthRepository.findAdminByUsername(username);

  if (existingByUsername) {
    throw new AdminAuthError(
      "This username is already in use.",
      409,
      "ADMIN_USERNAME_ALREADY_EXISTS",
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const admin = await adminAuthRepository.createAdmin({
      username,
      email,
      password_hash: passwordHash,
      role: input.role ?? "admin",
      is_active: true,
    });

    return toPublicAdmin(admin);
  } catch (error) {
    if (isDuplicateDatabaseError(error)) {
      throw new AdminAuthError(
        "The email or username is already in use.",
        409,
        "ADMIN_ALREADY_EXISTS",
      );
    }

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                         Administrator Listing                              */
/* -------------------------------------------------------------------------- */

export async function listAdminAccounts(
  input: AdminListInput,
): Promise<AdminListResult> {
  const { page, limit, offset } = normalizePagination(
    input.page,
    input.limit,
  );

  const filters = {
    search: input.search?.trim() || undefined,
    role: input.role,
    is_active: input.isActive,
  };

  const sortBy = input.sortBy ?? "created_at";
  const sortOrder = input.sortOrder ?? "desc";

  const [admins, total] = await Promise.all([
    adminAuthRepository.listAdmins({
      ...filters,
      limit,
      offset,
      sortBy,
      sortOrder,
    }),
    adminAuthRepository.countAdmins(filters),
  ]);

  return {
    admins: admins.map(toPublicAdmin),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                         Administrator Update                               */
/* -------------------------------------------------------------------------- */

export async function updateAdminAccount(
  adminUserId: string,
  input: UpdateAdminAccountInput,
): Promise<AdminPublicProfile> {
  const admin = await ensureAdminExists(adminUserId);

  const username =
    input.username !== undefined
      ? normalizeUsername(input.username)
      : undefined;

  const email =
    input.email !== undefined
      ? normalizeEmail(input.email)
      : undefined;

  if (username !== undefined && !username) {
    throw new AdminAuthError(
      "Username cannot be empty.",
      400,
      "INVALID_USERNAME",
    );
  }

  if (email !== undefined && !email) {
    throw new AdminAuthError(
      "Email cannot be empty.",
      400,
      "INVALID_EMAIL",
    );
  }

  if (email !== undefined && email !== admin.email) {
    const existing =
      await adminAuthRepository.findAdminByEmail(email);

    if (existing && existing.id !== adminUserId) {
      throw new AdminAuthError(
        "This email is already in use.",
        409,
        "ADMIN_EMAIL_ALREADY_EXISTS",
      );
    }
  }

  if (
    username !== undefined &&
    username !== admin.username
  ) {
    const existing =
      await adminAuthRepository.findAdminByUsername(username);

    if (existing && existing.id !== adminUserId) {
      throw new AdminAuthError(
        "This username is already in use.",
        409,
        "ADMIN_USERNAME_ALREADY_EXISTS",
      );
    }
  }

  const newRole = input.role ?? admin.role;

  await ensureLastSuperAdminIsPreserved(
    admin,
    newRole === "super_admin",
  );

  try {
    const updated = await adminAuthRepository.updateAdmin(
      adminUserId,
      {
        ...(username !== undefined ? { username } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
      },
    );

    if (!updated) {
      throw new AdminAuthError(
        "Unable to update administrator.",
        500,
        "ADMIN_UPDATE_FAILED",
      );
    }

    return toPublicAdmin(updated);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      throw error;
    }

    if (isDuplicateDatabaseError(error)) {
      throw new AdminAuthError(
        "The email or username is already in use.",
        409,
        "ADMIN_ALREADY_EXISTS",
      );
    }

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                         Administrator Status                               */
/* -------------------------------------------------------------------------- */

export async function setAdminAccountActive(
  adminUserId: string,
  isActive: boolean,
): Promise<void> {
  const admin = await ensureAdminExists(adminUserId);

  if (!isActive) {
    await ensureLastSuperAdminIsPreserved(admin, false);
  }

  const updated = await adminAuthRepository.setAdminActive(
    adminUserId,
    isActive,
  );

  if (!updated) {
    throw new AdminAuthError(
      "Unable to update administrator status.",
      500,
      "ADMIN_STATUS_UPDATE_FAILED",
    );
  }

  if (!isActive) {
    await adminAuthRepository.revokeAllAdminSessions(
      adminUserId,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                         Administrator Deletion                             */
/* -------------------------------------------------------------------------- */

export async function deleteAdminAccount(
  adminUserId: string,
  requestingAdminId: string,
): Promise<void> {
  if (adminUserId === requestingAdminId) {
    throw new AdminAuthError(
      "You cannot delete your own account.",
      403,
      "CANNOT_DELETE_SELF",
    );
  }

  const admin = await ensureAdminExists(adminUserId);

  await ensureLastSuperAdminIsPreserved(admin, false);

  const deleted =
    await adminAuthRepository.deleteAdmin(adminUserId);

  if (!deleted) {
    throw new AdminAuthError(
      "Unable to delete administrator.",
      500,
      "ADMIN_DELETE_FAILED",
    );
  }
}
