import type { NextRequest } from "next/server";

import {
  updateProductImage,
  removeProductImage,
} from "@/backend/modules/products/product.controller";

import { requireProductAdmin } from "../../../_access";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

/**
 * PATCH /api/admin/products/:id/images/:imageId
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, imageId } = await context.params;
  return updateProductImage(request, id, imageId);
}

/**
 * DELETE /api/admin/products/:id/images/:imageId
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, imageId } = await context.params;
  return removeProductImage(request, id, imageId);
}
