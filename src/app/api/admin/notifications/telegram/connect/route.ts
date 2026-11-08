
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  connectAdminTelegramController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import {
  handleApiError,
  readJsonBody,
} from "../../_utils";

/**
 * POST /api/admin/notifications/telegram/connect
 *
 * Connects a Telegram chat to the authenticated admin.
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
    const body = await readJsonBody(request);

    const result =
      await connectAdminTelegramController(
        auth.admin.id,
        body,
      );

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
