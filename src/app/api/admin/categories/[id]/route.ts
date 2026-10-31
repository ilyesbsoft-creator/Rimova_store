import type { NextRequest } from "next/server";

import {
  getAdminCategoryById,
  updateAdminCategory,
  deleteAdminCategory,
} from "@/backend/modules/categories/category.controller";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/categories/:id
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return getAdminCategoryById(id);
}

/**
 * PATCH /api/admin/categories/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return updateAdminCategory(request, id);
}

/**
 * DELETE /api/admin/categories/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return deleteAdminCategory(id);
}
