import type { NextRequest } from "next/server";

import { createAttributeValue } from "@/backend/modules/products/product.controller";
import { requireProductAdmin } from "../../../../_access";

type RouteContext = {
  params: Promise<{ id: string; attributeId: string }>;
};

/**
 * POST /api/admin/products/:id/attributes/:attributeId/values
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, attributeId } = await context.params;
  return createAttributeValue(request, id, attributeId);
}
