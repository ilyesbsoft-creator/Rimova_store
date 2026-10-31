
import { randomBytes, createHash } from "node:crypto";
import * as argon2 from "argon2";

/* -------------------------------------------------------------------------- */
/*                              Session Token                                 */
/* -------------------------------------------------------------------------- */

/**
 * Generate a cryptographically secure session token.
 *
 * Return the raw token only to the caller that needs to set the cookie.
 * Never store this raw token in the database or log it.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a session token with SHA-256.
 *
 * The database stores this hash instead of the raw token.
 */
export function hashSessionToken(token: string): string {
  if (!token || typeof token !== "string") {
    throw new Error("A valid session token is required.");
  }

  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

/* -------------------------------------------------------------------------- */
/*                              Password Hashing                              */
/* -------------------------------------------------------------------------- */

/**
 * Hash a password using Argon2id.
 *
 * Argon2 automatically generates and stores a unique salt
 * inside the resulting encoded hash.
 */
export async function hashPassword(
  password: string,
): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must not be empty.");
  }

  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verify a password against its stored Argon2 hash.
 *
 * Returns false when the password does not match.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    typeof passwordHash !== "string" ||
    password.length === 0 ||
    passwordHash.length === 0
  ) {
    return false;
  }

  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    // Invalid or corrupted hashes must not authenticate a user.
    return false;
  }
}
