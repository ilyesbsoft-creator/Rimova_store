import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminOfficeDeliveryRateController,
  updateAdminOfficeDeliveryRateController,
  deleteAdminOfficeDeliveryRateController,
} from "@/backend/modules/delivery/delivery.controller";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/admin/delivery/office-rates/:id
 *
 * Get office delivery rate details.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return getAdminOfficeDeliveryRateController(id);
}

/**
 * PATCH /api/admin/delivery/office-rates/:id
 *
 * Update office delivery rate.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return updateAdminOfficeDeliveryRateController(
    request,
    id
  );
}

/**
 * DELETE /api/admin/delivery/office-rates/:id
 *
 * Delete office delivery rate.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return deleteAdminOfficeDeliveryRateController(id);
}