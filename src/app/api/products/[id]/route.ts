import { getProductDetails } from "@/backend/modules/products/product.controller";

/**
 * GET /api/products/:id
 * Public storefront endpoint: get one product with its details.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return getProductDetails(request, id);
}
