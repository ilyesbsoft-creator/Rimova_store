import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";
import {
  getOrderStatsController,
} from "@/backend/modules/orders/order.controller";

const ALLOWED_ROLES = [
  "super_admin",
  "admin",
  "manager",
  "support",
] as const;

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin(request, [...ALLOWED_ROLES]);
  if (response) return response;

  return getOrderStatsController(request);
}
