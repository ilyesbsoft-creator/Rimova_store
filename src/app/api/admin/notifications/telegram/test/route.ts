
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  sendAdminTelegramTestMessageController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import { handleApiError } from "../../_utils";

/**
 * POST /api/admin/notifications/telegram/test
 *
 * Sends a test Telegram message
 * to the authenticated admin.
 */
export async function POST(request: NextRequest) {
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
      await sendAdminTelegramTestMessageController(
        auth.admin.id,
      );

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
