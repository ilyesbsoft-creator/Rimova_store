import type { NextRequest } from "next/server";

import {
  updateAttribute,
  removeAttribute,
} from "@/backend/modules/products/product.controller";

import { requireProductAdmin } from "../../../_access";

type RouteContext = {
  params: Promise<{ id: string; attributeId: string }>;
};

/**
 * PATCH /api/admin/products/:id/attributes/:attributeId
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, attributeId } = await context.params;
  return updateAttribute(request, id, attributeId);
}

/**
 * DELETE /api/admin/products/:id/attributes/:attributeId
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, attributeId } = await context.params;
  return removeAttribute(request, id, attributeId);
}
