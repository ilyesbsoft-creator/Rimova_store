import type { NextRequest } from "next/server";

import {
  revokeAdminSessionController,
} from "@/backend/modules/admin-auth/adminAuth.controller";
import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";
import type { AdminRole } from "@/backend/modules/admin-auth/adminAuth.repository";

const ALLOWED_ROLES: AdminRole[] = ["super_admin"];

type RouteContext = {
  params: Promise<{
    id: string;
    sessionId: string;
  }>;
};

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireAdmin(request, ALLOWED_ROLES);
  if (response) return response;

  const { id, sessionId } = await context.params;
  return revokeAdminSessionController(request, id, sessionId);
}
