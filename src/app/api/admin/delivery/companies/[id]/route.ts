import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminDeliveryCompanyController,
  updateAdminDeliveryCompanyController,
  deleteAdminDeliveryCompanyController,
} from "@/backend/modules/delivery/delivery.controller";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/admin/delivery/companies/:id
 *
 * Get delivery company details.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return getAdminDeliveryCompanyController(id);
}

/**
 * PATCH /api/admin/delivery/companies/:id
 *
 * Update delivery company.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return updateAdminDeliveryCompanyController(request, id);
}

/**
 * DELETE /api/admin/delivery/companies/:id
 *
 * Delete delivery company.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return deleteAdminDeliveryCompanyController(id);
}