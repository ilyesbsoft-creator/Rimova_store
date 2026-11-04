import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminOfficeDeliveryRatesController,
  createAdminOfficeDeliveryRateController,
} from "@/backend/modules/delivery/delivery.controller";

/**
 * GET /api/admin/delivery/office-rates
 *
 * Get office delivery rates.
 */
export async function GET(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return getAdminOfficeDeliveryRatesController(request);
}

/**
 * POST /api/admin/delivery/office-rates
 *
 * Create office delivery rate.
 */
export async function POST(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return createAdminOfficeDeliveryRateController(request);
}