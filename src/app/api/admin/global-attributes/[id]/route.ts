import type { NextRequest } from "next/server";

import {
  getGlobalAttributeController,
  updateGlobalAttributeController,
  deleteGlobalAttributeController,
} from "@/backend/modules/global-attributes/global-attribute.controller";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import type { AdminRole } from "@/backend/modules/admin-auth/adminAuth.repository";

const ALLOWED_ROLES: AdminRole[] = [
  "super_admin",
  "admin",
  "manager",
];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { response } = await requireAdmin(
    request,
    ALLOWED_ROLES,
  );

  if (response) return response;

  return getGlobalAttributeController(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const { response } = await requireAdmin(
    request,
    ALLOWED_ROLES,
  );

  if (response) return response;

  return updateGlobalAttributeController(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  const { response } = await requireAdmin(
    request,
    ALLOWED_ROLES,
  );

  if (response) return response;

  return deleteGlobalAttributeController(request, context);
}