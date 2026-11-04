import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminHomeDeliveryRatesController,
  createAdminHomeDeliveryRateController,
} from "@/backend/modules/delivery/delivery.controller";

/**
 * GET /api/admin/delivery/home-rates
 *
 * Get home delivery rates.
 */
export async function GET(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return getAdminHomeDeliveryRatesController(request);
}

/**
 * POST /api/admin/delivery/home-rates
 *
 * Create home delivery rate.
 */
export async function POST(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return createAdminHomeDeliveryRateController(request);
}