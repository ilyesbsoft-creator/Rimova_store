import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminDeliveryCompaniesController,
  createAdminDeliveryCompanyController,
} from "@/backend/modules/delivery/delivery.controller";

/**
 * GET /api/admin/delivery/companies
 *
 * Get all delivery companies.
 */
export async function GET(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return getAdminDeliveryCompaniesController(request);
}

/**
 * POST /api/admin/delivery/companies
 *
 * Create a delivery company.
 */
export async function POST(
  request: NextRequest
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  return createAdminDeliveryCompanyController(request);
}