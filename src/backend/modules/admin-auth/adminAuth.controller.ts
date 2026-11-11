
import type { NextRequest } from "next/server";

import {
  adminLoginSchema,
  changeAdminPasswordSchema,
  createAdminSchema,
  updateAdminSchema,
  updateAdminStatusSchema,
  listAdminsQuerySchema,
  uuidSchema,
} from "./adminAuth.validation";

import {
  AdminAuthError,
  loginAdmin,
  authenticateAdminSession,
  logoutAdmin,
  changeAdminPassword,
  createAdminAccount,
  getAdminAccount,
  listAdminAccounts,
  updateAdminAccount,
  deleteAdminAccount,
  setAdminAccountActive,
  getAdminActiveSessions,
  revokeAdminSession,
  revokeAllAdminSessions,
} from "./adminAuth.service";

import { ADMIN_SESSION_COOKIE } from "./adminAuth.constants";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

type ValidationError = {
  [key: string]: string[] | undefined;
};

/* -------------------------------------------------------------------------- */
/*                              Cookie Configuration                          */
/* -------------------------------------------------------------------------- */

const COOKIE_ATTRIBUTES = [
  "HttpOnly",
  "Path=/",
  "SameSite=Lax",
];

function getCookieSecurityAttribute(): string[] {
  return process.env.NODE_ENV === "production"
    ? ["Secure"]
    : [];
}

function appendSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date | string,
): void {
  const expiration = new Date(expiresAt).getTime();

  const maxAge = Math.max(
    0,
    Math.floor((expiration - Date.now()) / 1000),
  );

  response.headers.append(
    "Set-Cookie",
    [
      `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
      ...COOKIE_ATTRIBUTES,
      ...getCookieSecurityAttribute(),
      `Max-Age=${maxAge}`,
    ].join("; "),
  );
}

function clearSessionCookie(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    [
      `${ADMIN_SESSION_COOKIE}=`,
      ...COOKIE_ATTRIBUTES,
      ...getCookieSecurityAttribute(),
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ].join("; "),
  );
}

/* -------------------------------------------------------------------------- */
/*                              Response Helpers                              */
/* -------------------------------------------------------------------------- */

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
  code?: string,
): Response {
  return Response.json(
    {
      success: false,
      message,
      ...(code ? { code } : {}),
      ...(errors !== undefined ? { errors } : {}),
    },
    { status },
  );
}

function validationErrorResponse(
  errors: ValidationError,
  message = "Validation failed.",
): Response {
  return errorResponse(
    message,
    400,
    errors,
    "VALIDATION_ERROR",
  );
}

async function readJsonBody(
  request: Request,
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminAuthError(
      "Invalid JSON request body.",
      400,
      "INVALID_JSON",
    );
  }
}

function getErrorResponse(error: unknown): Response {
  if (error instanceof AdminAuthError) {
    return errorResponse(
      error.message,
      error.statusCode,
      undefined,
      error.code,
    );
  }

  console.error("[AdminAuthController]", error);

  return errorResponse(
    "An unexpected error occurred.",
    500,
    undefined,
    "INTERNAL_SERVER_ERROR",
  );
}

/* -------------------------------------------------------------------------- */
/*                         Authentication Helpers                             */
/* -------------------------------------------------------------------------- */

async function getAuthenticatedAdmin(
  request: NextRequest,
) {
  const token = request.cookies.get(
    ADMIN_SESSION_COOKIE,
  )?.value;

  if (!token) {
    throw new AdminAuthError(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }

  const authenticated = await authenticateAdminSession(token);

  if (!authenticated) {
    throw new AdminAuthError(
      "Your session is invalid or expired.",
      401,
      "INVALID_SESSION",
    );
  }

  return authenticated;
}

/**
 * Validate an administrator UUID.
 */
function validateAdminId(id: string): Response | null {
  const validation = uuidSchema.safeParse(id);

  if (!validation.success) {
    return errorResponse(
      "Invalid administrator ID.",
      400,
      validation.error.flatten().fieldErrors,
      "INVALID_ADMIN_ID",
    );
  }

  return null;
}

/**
 * Validate a session UUID.
 */
function validateSessionId(
  sessionId: string,
): Response | null {
  const validation = uuidSchema.safeParse(sessionId);

  if (!validation.success) {
    return errorResponse(
      "Invalid session ID.",
      400,
      validation.error.flatten().fieldErrors,
      "INVALID_SESSION_ID",
    );
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                                    Login                                   */
/* -------------------------------------------------------------------------- */

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
      return validationErrorResponse(
        validation.error.flatten().fieldErrors,
      );
    }

    const result = await loginAdmin(
      validation.data.identifier,
      validation.data.password,
      validation.data.rememberMe,
    );

    const response = successResponse({
      message: "Logged in successfully.",
      admin: result.admin,
    });

    appendSessionCookie(
      response,
      result.sessionToken,
      result.session.expires_at,
    );

    return response;
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Current Admin                                 */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/admin/auth/me
 */
export async function me(
  request: NextRequest,
): Promise<Response> {
  try {
    const authenticated = await getAuthenticatedAdmin(request);

    return successResponse({
      admin: authenticated.admin,
      session: {
        id: authenticated.session.id,
        expires_at: authenticated.session.expires_at,
        created_at: authenticated.session.created_at,
        last_seen_at: authenticated.session.last_seen_at,
      },
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Logout                                   */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/admin/auth/logout
 */
export async function logout(
  request: NextRequest,
): Promise<Response> {
  try {
    const token = request.cookies.get(
      ADMIN_SESSION_COOKIE,
    )?.value;

    if (token) {
      await logoutAdmin(token);
    }

    const response = successResponse({
      message: "Logged out successfully.",
    });

    clearSessionCookie(response);

    return response;
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Change Password                               */
/* -------------------------------------------------------------------------- */

/**
 * PATCH /api/admin/auth/password
 */
export async function changePassword(
  request: NextRequest,
): Promise<Response> {
  try {
    const authenticated = await getAuthenticatedAdmin(request);

    const body = await readJsonBody(request);

    const validation = changeAdminPasswordSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(
        validation.error.flatten().fieldErrors,
      );
    }

    await changeAdminPassword(
      authenticated.admin.id,
      validation.data.currentPassword,
      validation.data.newPassword,
    );

    const response = successResponse({
      message: "Password changed successfully. Please log in again.",
    });

    clearSessionCookie(response);

    return response;
  } catch (error) {
    return getErrorResponse(error);
  }
}


/* -------------------------------------------------------------------------- */
/*                           Get Administrator                                */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/admin/users/:id
 */
export async function getAdmin(
  request: NextRequest,
  id: string,
): Promise<Response> {
  try {
    const idError = validateAdminId(id);

    if (idError) {
      return idError;
    }

    const admin = await getAdminAccount(id);

    return successResponse({
      admin,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}


/* -------------------------------------------------------------------------- */
/*                            List Administrators                             */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/admin/users
 *
 * Query:
 * search
 * role
 * isActive
 * page
 * limit
 * sortBy
 * sortOrder
 */
export async function getAdmins(
  request: NextRequest,
): Promise<Response> {
  try {
    const query = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );

    const validation = listAdminsQuerySchema.safeParse(query);

    if (!validation.success) {
      return validationErrorResponse(
        validation.error.flatten().fieldErrors,
        "Invalid query parameters.",
      );
    }

    const {
      search,
      role,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    } = validation.data;

    const result = await listAdminAccounts({
      search,
      role,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return successResponse({
      admins: result.admins,
      pagination: result.pagination,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                            Create Administrator                            */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/admin/users
 */
export async function createAdmin(
  request: NextRequest,
): Promise<Response> {
  try {
    const body = await readJsonBody(request);

    const validation = createAdminSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(
        validation.error.flatten().fieldErrors,
      );
    }

    const admin = await createAdminAccount(validation.data);

    return successResponse(
      {
        message: "Administrator created successfully.",
        admin,
      },
      201,
    );
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                            Update Administrator                            */
/* -------------------------------------------------------------------------- */

/**
 * PATCH /api/admin/users/:id
 */
export async function updateAdmin(
  request: NextRequest,
  id: string,
): Promise<Response> {
  try {
	  	  
    const idError = validateAdminId(id);

    if (idError) {
      return idError;
    }

    const body = await readJsonBody(request);

    const validation = updateAdminSchema.safeParse(body);
	
if (!validation.success) {
  return validationErrorResponse(
    validation.error.flatten().fieldErrors,
  );
}	

    const admin = await updateAdminAccount(
      id,
      validation.data,
    );

    return successResponse({
      message: "Administrator updated successfully.",
      admin,
    });
  } catch (error) {
	  console.error("error = ",error);
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                            Delete Administrator                            */
/* -------------------------------------------------------------------------- */

/**
 * DELETE /api/admin/users/:id
 */
export async function deleteAdmin(
  request: NextRequest,
  id: string,
): Promise<Response> {
  try {
    // Validate target administrator ID.
    const idError = validateAdminId(id);

    if (idError) {
      return idError;
    }

    // Get the currently authenticated administrator.
    const authenticated = await getAuthenticatedAdmin(request);

    // Delete target administrator while passing the requester ID.
    await deleteAdminAccount(
      id,
      authenticated.admin.id,
    );

    return successResponse({
      message: "Administrator deleted successfully.",
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}


/* -------------------------------------------------------------------------- */
/*                         Update Administrator Status                        */
/* -------------------------------------------------------------------------- */

/**
 * PATCH /api/admin/users/:id/status
 *
 * Body: { isActive: boolean }
 */
export async function updateAdminStatus(
  request: NextRequest,
  id: string,
): Promise<Response> {
  try {
    const idError = validateAdminId(id);

    if (idError) {
      return idError;
    }

    const body = await readJsonBody(request);

    const validation = updateAdminStatusSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(
        validation.error.flatten().fieldErrors,
      );
    }

    await setAdminAccountActive(
      id,
      validation.data.isActive,
    );

    return successResponse({
      message: validation.data.isActive
        ? "Administrator account enabled successfully."
        : "Administrator account disabled successfully.",
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                         List Administrator Sessions                        */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/admin/users/:id/sessions
 *
 * Returns active sessions only.
 */
export async function getAdminSessions(
  request: NextRequest,
  id: string,
): Promise<Response> {
  try {
    const idError = validateAdminId(id);

    if (idError) {
      return idError;
    }

    const sessions = await getAdminActiveSessions(id);

    // Never expose token_hash or other internal session secrets.
    const safeSessions = sessions.map((session) => ({
      id: session.id,
      admin_user_id: session.admin_user_id,
      expires_at: session.expires_at,
      created_at: session.created_at,
      last_seen_at: session.last_seen_at,
    }));

    return successResponse({
      sessions: safeSessions,
      total: safeSessions.length,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                         Revoke Administrator Session                       */
/* -------------------------------------------------------------------------- */

/**
 * DELETE /api/admin/users/:id/sessions/:sessionId
 */
export async function revokeAdminSessionController(
  request: NextRequest,
  id: string,
  sessionId: string,
): Promise<Response> {
  try {
    const idError = validateAdminId(id);

    if (idError) {
      return idError;
    }

    const sessionError = validateSessionId(sessionId);

    if (sessionError) {
      return sessionError;
    }

    await revokeAdminSession(
      id,
      sessionId,
    );

    return successResponse({
      message: "Session revoked successfully.",
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                      Revoke All Administrator Sessions                     */
/* -------------------------------------------------------------------------- */

/**
 * DELETE /api/admin/users/:id/sessions
 */
export async function revokeAllAdminSessionsController(
  request: NextRequest,
  id: string,
): Promise<Response> {
  try {
    const idError = validateAdminId(id);

    if (idError) {
      return idError;
    }

    const revokedCount = await revokeAllAdminSessions(id);

    return successResponse({
      message: "All administrator sessions have been revoked.",
      revokedCount,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
