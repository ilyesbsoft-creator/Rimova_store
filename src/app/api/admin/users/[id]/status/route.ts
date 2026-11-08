import type { NextRequest } from "next/server";

import { updateAdminStatus } from "@/backend/modules/admin-auth/adminAuth.controller";
import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";
import type { AdminRole } from "@/backend/modules/admin-auth/adminAuth.repository";

const ALLOWED_ROLES: AdminRole[] = ["super_admin"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { admin, response } = await requireAdmin(request, ALLOWED_ROLES);
  if (response) return response;

  const { id } = await context.params;

  // Prevent an administrator from disabling their own account.
  // The controller/service should also protect the last active super_admin.
  if (admin?.id === id) {
    return Response.json(
      { success: false, message: "You cannot change your own account status." },
      { status: 400 },
    );
  }

  return updateAdminStatus(request, id);
}
