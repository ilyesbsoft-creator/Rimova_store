import type { NextRequest } from "next/server";

import { createAttribute } from "@/backend/modules/products/product.controller";
import { requireProductAdmin } from "../../_access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/admin/products/:id/attributes
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id } = await context.params;
  return createAttribute(request, id);
}
