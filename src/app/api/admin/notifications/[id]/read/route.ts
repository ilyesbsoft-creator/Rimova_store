
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  markAdminNotificationAsReadController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import { handleApiError } from "../../_utils";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * PATCH /api/admin/notifications/[id]/read
 *
 * Marks one notification as read.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
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
    const params = await context.params;

    const result =
      await markAdminNotificationAsReadController(
        auth.admin.id,
        params,
      );

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
