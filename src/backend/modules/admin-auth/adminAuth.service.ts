
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
    public readonly statusCode: number = 401,
    public readonly code: string = "ADMIN_AUTH_ERROR",
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
//  expiresAt: Date;
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

/* -------------------------------------------------------------------------- */
/*                               Configuration                                */
/* -------------------------------------------------------------------------- */

const NORMAL_SESSION_HOURS = 12;
const REMEMBERED_SESSION_DAYS = 30;

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

/* -------------------------------------------------------------------------- */
/*                                   Login                                    */
/* -------------------------------------------------------------------------- */

/**
 * Authenticate an administrator and create a database-backed session.
 *
 * The raw session token is returned once so the controller can put it
 * in an HttpOnly cookie. Only its SHA-256 hash is stored in the database.
 */
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

  // Use the same public error for a missing account and a wrong password.
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

  await adminAuthRepository.updateAdminLastLogin(admin.id);

  // Fetch again so last_login_at reflects the successful login.
  const updatedAdmin =
    await adminAuthRepository.findAdminById(admin.id);

  if (!updatedAdmin) {
    // Avoid leaving an orphaned active session if the account disappeared.
    await adminAuthRepository.revokeAdminSessionByTokenHash(
      tokenHash,
    );

    throw new AdminAuthError(
      "Unable to complete administrator login.",
      500,
      "ADMIN_LOGIN_FAILED",
    );
  }

  return {
    admin: toPublicAdmin(updatedAdmin),
    sessionToken,
    session,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Session Validation                            */
/* -------------------------------------------------------------------------- */

/**
 * Validate a raw token received from the session cookie.
 *
 * Returns null if the session is missing, expired, revoked,
 * or belongs to an inactive administrator.
 */
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
    // Expired sessions cannot be used, even if cleanup has not run.
    await adminAuthRepository.revokeAdminSession(
      session.session_id,
    );

    return null;
  }

  if (!session.is_active) {
    // Prevent continued use of this session after account deactivation.
    await adminAuthRepository.revokeAdminSession(
      session.session_id,
    );

    return null;
  }

  await adminAuthRepository.updateAdminSessionLastSeen(
    session.session_id,
  );

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
/*                                   Logout                                   */
/* -------------------------------------------------------------------------- */

/**
 * Revoke the current session.
 * The controller should also clear the browser cookie.
 */
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
 * List active sessions for an administrator.
 */
export async function getAdminActiveSessions(
  adminUserId: string,
): Promise<AdminSession[]> {
  return adminAuthRepository.listActiveAdminSessions(
    adminUserId,
  );
}

/**
 * Revoke a specific session after checking ownership.
 * Prevents one administrator from revoking another administrator's session.
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
  return adminAuthRepository.revokeAllAdminSessions(
    adminUserId,
  );
}

/**
 * Revoke every session except the current one.
 */
export async function revokeOtherAdminSessions(
  adminUserId: string,
  currentSessionId: string,
): Promise<number> {
  return adminAuthRepository.revokeOtherAdminSessions(
    adminUserId,
    currentSessionId,
  );
}

/* -------------------------------------------------------------------------- */
/*                              Password Management                           */
/* -------------------------------------------------------------------------- */

/**
 * Change an administrator's password.
 * All sessions are revoked after a successful password change.
 */
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

  if (newPassword.length < 12) {
    throw new AdminAuthError(
      "The new password must contain at least 12 characters.",
      400,
      "WEAK_PASSWORD",
    );
  }

  const admin =
    await adminAuthRepository.findAdminById(adminUserId);

  if (!admin) {
    throw new AdminAuthError(
      "Administrator not found.",
      404,
      "ADMIN_NOT_FOUND",
    );
  }

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

  // Require login again on every device.
  await adminAuthRepository.revokeAllAdminSessions(
    adminUserId,
  );
}

/* -------------------------------------------------------------------------- */
/*                             Administrator Management                       */
/* -------------------------------------------------------------------------- */

/**
 * Create an administrator account.
 * Password hashing stays in utils; database operations stay in repository.
 *
 * Authorization must be enforced by middleware/controller before this
 * function is called, for example allowing only super_admin.
 */
export async function createAdminAccount(input: {
  username: string;
  email: string;
  password: string;
  role?: AdminRole;
}): Promise<AdminPublicProfile> {
  const username = input.username.trim();
  const email = input.email.trim();

  if (!username || !email || !input.password) {
    throw new AdminAuthError(
      "Username, email and password are required.",
      400,
      "INVALID_ADMIN_INPUT",
    );
  }

  if (input.password.length < 6) {
    throw new AdminAuthError(
      "The password must contain at least 6 characters.",
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
    // Database unique constraints remain the final protection against
    // simultaneous requests creating duplicate email addresses/usernames.
    const dbError = error as { code?: string };

    if (dbError.code === "ER_DUP_ENTRY") {
      throw new AdminAuthError(
        "The email or username is already in use.",
        409,
        "ADMIN_ALREADY_EXISTS",
      );
    }

    throw error;
  }
}

/**
 * Enable or disable an administrator.
 * Disabling an account also revokes all of its sessions.
 */
export async function setAdminAccountActive(
  adminUserId: string,
  isActive: boolean,
): Promise<void> {
  const admin =
    await adminAuthRepository.findAdminById(adminUserId);

  if (!admin) {
    throw new AdminAuthError(
      "Administrator not found.",
      404,
      "ADMIN_NOT_FOUND",
    );
  }

  await adminAuthRepository.setAdminActive(
    adminUserId,
    isActive,
  );

  if (!isActive) {
    await adminAuthRepository.revokeAllAdminSessions(
      adminUserId,
    );
  }
}
