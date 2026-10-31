import type { NextRequest } from "next/server";

import {
  updateVariant,
  removeVariant,
} from "@/backend/modules/products/product.controller";

import { requireProductAdmin } from "../../../_access";

type RouteContext = {
  params: Promise<{ id: string; variantId: string }>;
};

/**
 * PATCH /api/admin/products/:id/variants/:variantId
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, variantId } = await context.params;
  return updateVariant(request, id, variantId);
}

/**
 * DELETE /api/admin/products/:id/variants/:variantId
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, variantId } = await context.params;
  return removeVariant(request, id, variantId);
}
