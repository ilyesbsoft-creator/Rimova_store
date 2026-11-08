
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  createAdminNotificationController,
  getAdminNotificationsController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import {
  handleApiError,
  readJsonBody,
} from "./_utils";

/**
 * GET /api/admin/notifications
 *
 * Returns paginated notifications for the authenticated admin.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (auth.response) {
    return auth.response;
  }

  if (!auth.admin) {
    return Response.json(
      {
        success: false,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  try {
    const query = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );

    const result =
      await getAdminNotificationsController(
        auth.admin.id,
        query,
      );

    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/notifications
 *
 * Creates a notification.
 * Restricted to authorized administrative roles.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, [
    "super_admin",
    "admin",
    "manager",
  ]);

  if (auth.response) {
    return auth.response;
  }

  if (!auth.admin) {
    return Response.json(
      {
        success: false,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  try {
    const body = await readJsonBody(request);

    const result =
      await createAdminNotificationController(body);

    return Response.json(result, {
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
