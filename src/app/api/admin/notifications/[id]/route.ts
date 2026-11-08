
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminNotificationByIdController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import { handleApiError } from "../_utils";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/admin/notifications/[id]
 *
 * Returns one notification belonging to the authenticated admin.
 */
export async function GET(
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
      await getAdminNotificationByIdController(
        auth.admin.id,
        params,
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
