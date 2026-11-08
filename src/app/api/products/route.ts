import { getProducts } from "@/backend/modules/products/product.controller";

/**
 * GET /api/products
 * Public storefront endpoint: list products.
 */
export async function GET(request: Request): Promise<Response> {
  return getProducts(request);
}
