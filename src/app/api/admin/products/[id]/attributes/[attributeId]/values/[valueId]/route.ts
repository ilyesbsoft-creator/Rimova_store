import type { NextRequest } from "next/server";

import {
  updateAttributeValue,
  removeAttributeValue,
} from "@/backend/modules/products/product.controller";

import { requireProductAdmin } from "../../../../../_access";

type RouteContext = {
  params: Promise<{
    id: string;
    attributeId: string;
    valueId: string;
  }>;
};

/**
 * PATCH /api/admin/products/:id/attributes/:attributeId/values/:valueId
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, attributeId, valueId } = await context.params;
  return updateAttributeValue(request, id, attributeId, valueId);
}

/**
 * DELETE /api/admin/products/:id/attributes/:attributeId/values/:valueId
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, attributeId, valueId } = await context.params;
  return removeAttributeValue(request, id, attributeId, valueId);
}
