
import type { NextRequest } from "next/server";

import {
  adminLoginSchema,
  changeAdminPasswordSchema,
} from "./adminAuth.validation";

import {
  AdminAuthError,
  loginAdmin,
  authenticateAdminSession,
  logoutAdmin,
  changeAdminPassword,
} from "./adminAuth.service";

import { hashSessionToken } from "./adminAuth.utils";

/**
 * Cookie configuration
 */
import { ADMIN_SESSION_COOKIE } from "./adminAuth.constants";


const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * HTTP response helpers
 */

function successResponse(
  data: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(
    {
      success: true,
      ...data,
    },
    { status },
  );
}

function errorResponse(
  message: string,
  status: number,
  errors?: unknown,
): Response {
  return Response.json(
    {
      success: false,
      message,
      ...(errors !== undefined ? { errors } : {}),
    },
    { status },
  );
}

async function readJsonBody(
  request: Request,
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminAuthError("Invalid JSON request body.");
  }
}

function getErrorResponse(error: unknown): Response {
  if (error instanceof AdminAuthError) {
    const message = error.message;

    const status =
      message === "Invalid credentials."
        ? 401
        : message === "Admin account is inactive."
          ? 403
          : message === "Current password is incorrect."
            ? 400
            : message === "Admin session is invalid."
              ? 401
              : message === "Admin session has expired."
                ? 401
                : 400;

    return errorResponse(message, status);
  }

  console.error("[AdminAuthController]", error);

  return errorResponse(
    "An unexpected error occurred.",
    500,
  );
}

/**
 * POST /api/admin/auth/login
 */

export async function login(
  request: NextRequest,
): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const validation = adminLoginSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "Validation failed.",
        400,
        validation.error.flatten().fieldErrors,
      );
    }

    const { identifier, password, rememberMe } =
      validation.data;

    const result = await loginAdmin(
      identifier,
      password,
      rememberMe,
    );

    const response = successResponse({
      admin: result.admin,
    });

    const expiresAt = result.session.expires_at;

    const maxAge = Math.max(
      0,
      Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000,
      ),
    );

    response.headers.append(
      "Set-Cookie",
      [
        `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(result.sessionToken)}`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        `Max-Age=${maxAge}`,
        ...(process.env.NODE_ENV === "production"
          ? ["Secure"]
          : []),
      ].join("; "),
    );

    return response;
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * GET /api/admin/auth/me
 */

/**
 * GET /api/admin/auth/me
 */

export async function me(
  request: NextRequest,
): Promise<Response> {
  try {
    const sessionToken = request.cookies.get(
      ADMIN_SESSION_COOKIE,
    )?.value;

    if (!sessionToken) {
      return errorResponse("Authentication required.", 401);
    }

    const authenticatedAdmin =
      await authenticateAdminSession(sessionToken);

    if (!authenticatedAdmin) {
      return errorResponse("Authentication required.", 401);
    }

    return successResponse({
      admin: authenticatedAdmin.admin,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * POST /api/admin/auth/logout
 */

export async function logout(
  request: NextRequest,
): Promise<Response> {
  try {
    const sessionToken = request.cookies.get(
      ADMIN_SESSION_COOKIE,
    )?.value;

    if (sessionToken) {
      await logoutAdmin(sessionToken);
    }

    const response = successResponse({
      message: "Logged out successfully.",
    });

    response.headers.append(
      "Set-Cookie",
      [
        `${ADMIN_SESSION_COOKIE}=`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        "Max-Age=0",
        ...(process.env.NODE_ENV === "production"
          ? ["Secure"]
          : []),
      ].join("; "),
    );

    return response;
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/auth/password
 */

export async function changePassword(
  request: NextRequest,
): Promise<Response> {
  try {
    const sessionToken = request.cookies.get(
      ADMIN_SESSION_COOKIE,
    )?.value;

    if (!sessionToken) {
      return errorResponse("Authentication required.", 401);
    }

const authenticatedAdmin =
  await authenticateAdminSession(sessionToken);

if (!authenticatedAdmin) {
  return errorResponse("Authentication required.", 401);
}

    const body = await readJsonBody(request);
    const validation =
      changeAdminPasswordSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "Validation failed.",
        400,
        validation.error.flatten().fieldErrors,
      );
    }

    const { currentPassword, newPassword } = validation.data;

await changeAdminPassword(
  authenticatedAdmin.admin.id,
  currentPassword,
  newPassword,
);

    const response = successResponse({
      message:
        "Password changed successfully. Please log in again.",
    });

    response.headers.append(
      "Set-Cookie",
      [
        `${ADMIN_SESSION_COOKIE}=`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        "Max-Age=0",
        ...(process.env.NODE_ENV === "production"
          ? ["Secure"]
          : []),
      ].join("; "),
    );

    return response;
  } catch (error) {
    return getErrorResponse(error);
  }
}
