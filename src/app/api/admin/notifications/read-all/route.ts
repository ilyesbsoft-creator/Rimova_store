
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  markAllAdminNotificationsAsReadController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import { handleApiError } from "../_utils";

/**
 * PATCH /api/admin/notifications/read-all
 *
 * Marks all notifications as read
 * for the authenticated admin.
 */
export async function PATCH(request: NextRequest) {
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
      await markAllAdminNotificationsAsReadController(
        auth.admin.id,
      );

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
