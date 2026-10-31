import type { NextRequest } from "next/server";

import { setVariantStock } from "@/backend/modules/products/product.controller";
import { requireProductAdmin } from "../../../../_access";

type RouteContext = {
  params: Promise<{ id: string; variantId: string }>;
};

/**
 * PATCH /api/admin/products/:id/variants/:variantId/stock
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, variantId } = await context.params;
  return setVariantStock(request, id, variantId);
}
