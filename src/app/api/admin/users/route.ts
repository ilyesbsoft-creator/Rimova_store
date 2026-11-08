import type { NextRequest } from "next/server";

import {
  getAdmins,
  createAdmin,
} from "@/backend/modules/admin-auth/adminAuth.controller";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";
import type { AdminRole } from "@/backend/modules/admin-auth/adminAuth.repository";

const ALLOWED_ROLES: AdminRole[] = ["super_admin"];

export async function GET(request: NextRequest): Promise<Response> {
  const { response } = await requireAdmin(request, ALLOWED_ROLES);
  if (response) return response;

  return getAdmins(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireAdmin(request, ALLOWED_ROLES);
  if (response) return response;

  return createAdmin(request);
}
