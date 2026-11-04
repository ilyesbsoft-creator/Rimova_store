import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  getAdminHomeDeliveryRateController,
  updateAdminHomeDeliveryRateController,
  deleteAdminHomeDeliveryRateController,
} from "@/backend/modules/delivery/delivery.controller";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/admin/delivery/home-rates/:id
 *
 * Get home delivery rate details.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return getAdminHomeDeliveryRateController(id);
}

/**
 * PATCH /api/admin/delivery/home-rates/:id
 *
 * Update home delivery rate.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return updateAdminHomeDeliveryRateController(
    request,
    id
  );
}

/**
 * DELETE /api/admin/delivery/home-rates/:id
 *
 * Delete home delivery rate.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return deleteAdminHomeDeliveryRateController(id);
}