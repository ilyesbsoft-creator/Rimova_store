import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminDeliveryCommunesController,
} from "@/backend/modules/delivery/delivery.controller";

/**
 * GET /api/admin/delivery/communes
 *
 * Get communes by wilaya IDs.
 */
export async function GET(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return getAdminDeliveryCommunesController(request);
}