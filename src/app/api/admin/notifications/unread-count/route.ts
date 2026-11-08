
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminUnreadNotificationsCountController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import { handleApiError } from "../_utils";

/**
 * GET /api/admin/notifications/unread-count
 *
 * Returns the unread notifications count
 * for the authenticated admin.
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
    const result =
      await getAdminUnreadNotificationsCountController(
        auth.admin.id,
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
