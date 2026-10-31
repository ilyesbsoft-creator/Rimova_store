import type { NextRequest } from "next/server";

import {
  updateAdminCategoryStatus,
} from "@/backend/modules/categories/category.controller";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

/**
 * PATCH /api/admin/categories/:id/status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return updateAdminCategoryStatus(request, id);
}
