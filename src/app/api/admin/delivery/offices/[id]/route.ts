import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminDeliveryOfficeController,
  updateAdminDeliveryOfficeController,
  deleteAdminDeliveryOfficeController,
} from "@/backend/modules/delivery/delivery.controller";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/admin/delivery/offices/:id
 *
 * Get delivery office details.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return getAdminDeliveryOfficeController(id);
}

/**
 * PATCH /api/admin/delivery/offices/:id
 *
 * Update delivery office.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return updateAdminDeliveryOfficeController(
    request,
    id
  );
}

/**
 * DELETE /api/admin/delivery/offices/:id
 *
 * Delete delivery office.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return deleteAdminDeliveryOfficeController(id);
}