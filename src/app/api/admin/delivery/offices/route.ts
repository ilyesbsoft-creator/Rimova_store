import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminDeliveryOfficesController,
  createAdminDeliveryOfficeController,
} from "@/backend/modules/delivery/delivery.controller";

/**
 * GET /api/admin/delivery/offices
 *
 * Get delivery offices.
 */
export async function GET(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return getAdminDeliveryOfficesController(request);
}

/**
 * POST /api/admin/delivery/offices
 *
 * Create delivery office.
 */
export async function POST(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return createAdminDeliveryOfficeController(request);
}