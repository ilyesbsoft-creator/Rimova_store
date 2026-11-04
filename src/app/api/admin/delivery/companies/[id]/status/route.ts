import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";

import {
  updateAdminDeliveryCompanyStatusController,
} from "@/backend/modules/delivery/delivery.controller";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * PATCH /api/admin/delivery/companies/:id/status
 *
 * Activate or deactivate delivery company.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { response } = await requireAdmin(request);

  if (response) return response;

  const { id } = await params;

  return updateAdminDeliveryCompanyStatusController(
    request,
    id
  );
}