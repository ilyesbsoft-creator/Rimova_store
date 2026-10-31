import type { NextRequest } from "next/server";

import { authenticateAdminSession } from "./adminAuth.service";
import type { AdminRole } from "./adminAuth.repository";

import { ADMIN_SESSION_COOKIE } from "./adminAuth.constants";

export async function requireAdmin(
  request: NextRequest,
  allowedRoles?: AdminRole[],
) {
  const sessionToken = request.cookies.get(
    ADMIN_SESSION_COOKIE,
  )?.value;

  if (!sessionToken) {
    return {
      admin: null,
      response: Response.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 },
      ),
    };
  }

  try {
    const authenticatedAdmin =
      await authenticateAdminSession(sessionToken);

    if (!authenticatedAdmin) {
      return {
        admin: null,
        response: Response.json(
          {
            success: false,
            message: "Invalid or expired session.",
          },
          { status: 401 },
        ),
      };
    }

    const admin = authenticatedAdmin.admin;

    if (
      allowedRoles &&
      !allowedRoles.includes(admin.role)
    ) {
      return {
        admin: null,
        response: Response.json(
          {
            success: false,
            message: "You do not have permission.",
          },
          { status: 403 },
        ),
      };
    }

    return {
      admin,
      response: null,
    };
  } catch (error) {
    console.error("[requireAdmin]", error);

    return {
      admin: null,
      response: Response.json(
        {
          success: false,
          message: "Unable to authenticate administrator.",
        },
        { status: 500 },
      ),
    };
  }
}