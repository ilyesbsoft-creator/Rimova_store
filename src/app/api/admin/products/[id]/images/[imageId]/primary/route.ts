import type { NextRequest } from "next/server";

import { makeProductImagePrimary } from "@/backend/modules/products/product.controller";
import { requireProductAdmin } from "../../../../_access";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

/**
 * PATCH /api/admin/products/:id/images/:imageId/primary
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id, imageId } = await context.params;
  return makeProductImagePrimary(request, id, imageId);
}
