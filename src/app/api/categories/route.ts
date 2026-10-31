import type { NextRequest } from "next/server";

import {
  getPublicCategories,
} from "@/backend/modules/categories/category.controller";

/**
 * GET /api/categories
 */
export async function GET(
  request: NextRequest,
): Promise<Response> {
  return getPublicCategories(request);
}
