import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminDeliveryWilayasController,
} from "@/backend/modules/delivery/delivery.controller";

/**
 * GET /api/admin/delivery/wilayas
 *
 * Get delivery wilayas.
 */
export async function GET(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return getAdminDeliveryWilayasController();
}