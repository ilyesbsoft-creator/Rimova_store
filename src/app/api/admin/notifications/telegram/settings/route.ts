
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  updateAdminTelegramSettingsController,
} from "@/backend/modules/admin-notifications/adminNotification.controller";

import {
  handleApiError,
  readJsonBody,
} from "../../_utils";

/**
 * PATCH /api/admin/notifications/telegram/settings
 *
 * Enables or disables Telegram notifications.
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
    const body = await readJsonBody(request);

    const result =
      await updateAdminTelegramSettingsController(
        auth.admin.id,
        body,
      );

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
