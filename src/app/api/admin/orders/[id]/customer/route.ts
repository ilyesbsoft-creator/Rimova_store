import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";
import {
  updateOrderCustomerController,
} from "@/backend/modules/orders/order.controller";

const ALLOWED_ROLES = [
  "super_admin",
  "admin",
  "manager",
  "support",
] as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { response } = await requireAdmin(request, [...ALLOWED_ROLES]);
  if (response) return response;

  return updateOrderCustomerController(request, context);
}
