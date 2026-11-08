import type { NextRequest } from "next/server";

import {
  getGlobalAttributesController,
  createGlobalAttributeController,
} from "@/backend/modules/global-attributes/global-attribute.controller";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import type { AdminRole } from "@/backend/modules/admin-auth/adminAuth.repository";

const ALLOWED_ROLES: AdminRole[] = [
  "super_admin",
  "admin",
  "manager",
];

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin(
    request,
    ALLOWED_ROLES,
  );

  if (response) return response;

  return getGlobalAttributesController(request);
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin(
    request,
    ALLOWED_ROLES,
  );

  if (response) return response;

  return createGlobalAttributeController(request);
}