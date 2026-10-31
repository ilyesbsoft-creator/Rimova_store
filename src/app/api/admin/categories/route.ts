import type { NextRequest } from "next/server";

import {
  getAdminCategories,
  createAdminCategory,
} from "@/backend/modules/categories/category.controller";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

/**
 * GET /api/admin/categories
 */
export async function GET(
  request: NextRequest,
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return getAdminCategories(request);
}

/**
 * POST /api/admin/categories
 */
export async function POST(
  request: NextRequest,
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return createAdminCategory(request);
}
