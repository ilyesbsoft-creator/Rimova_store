import type { NextRequest } from "next/server";

import { setProductStock } from "@/backend/modules/products/product.controller";
import { requireProductAdmin } from "../../_access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/admin/products/:id/stock
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id } = await context.params;
  return setProductStock(request, id);
}
