import {
  getPublicCategoryBySlug,
} from "@/backend/modules/categories/category.controller";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * GET /api/categories/:slug
 */
export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { slug } = await params;

  return getPublicCategoryBySlug(slug);
}
