import type { NextRequest } from "next/server";

import {
  getProductDetails,
  updateProduct,
  deleteProduct,
} from "@/backend/modules/products/product.controller";

import { requireProductAdmin } from "../_access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/products/:id
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id } = await context.params;
  return getProductDetails(request, id);
}

/**
 * PATCH /api/admin/products/:id
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id } = await context.params;
  return updateProduct(request, id);
}

/**
 * DELETE /api/admin/products/:id
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  const { id } = await context.params;
  return deleteProduct(request, id);
}
