
import type { NextRequest } from "next/server";

import {
  updateAdmin,
  deleteAdmin,
  getAdmin,
} from "@/backend/modules/admin-auth/adminAuth.controller";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";
import type { AdminRole } from "@/backend/modules/admin-auth/adminAuth.repository";

const ALLOWED_ROLES: AdminRole[] = ["super_admin"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireAdmin(request, ALLOWED_ROLES);
  if (response) return response;

  const { id } = await context.params;

  return getAdmin(request, id);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireAdmin(request, ALLOWED_ROLES);
  if (response) return response;

  const { id } = await context.params;

  return updateAdmin(request, id);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { admin, response } = await requireAdmin(request, ALLOWED_ROLES);
  if (response) return response;

  const { id } = await context.params;

  if (admin?.id === id) {
    return Response.json(
      {
        success: false,
        message: "You cannot delete your own account.",
      },
      { status: 400 },
    );
  }

  return deleteAdmin(request, id);
}
