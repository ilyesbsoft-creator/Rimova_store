
import type { NextRequest } from "next/server";

import {
  getPublicDeliveryOptions,
} from "@/backend/modules/delivery/delivery.controller";

/**
 * GET /api/delivery
 *
 * Get public delivery options.
 */
export async function GET(
  request: NextRequest,
): Promise<Response> {
  return getPublicDeliveryOptions(request);
}
