
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminTelegramConnectionController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import { handleApiError } from "../_utils";

/**
 * GET /api/admin/notifications/telegram
 *
 * Returns Telegram connection information
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
      await getAdminTelegramConnectionController(
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
