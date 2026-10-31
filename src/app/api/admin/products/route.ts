import type { NextRequest } from "next/server";

import {
  getProducts,
  createProduct,
} from "@/backend/modules/products/product.controller";

import { requireProductAdmin } from "./_access";

/**
 * GET /api/admin/products
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  return getProducts(request);
}

/**
 * POST /api/admin/products
 */
export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireProductAdmin(request);
  if (response) return response;

  return createProduct(request);
}
