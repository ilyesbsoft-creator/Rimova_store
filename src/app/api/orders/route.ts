
import { NextResponse } from "next/server";
import {
  createOrder,
  OrderServiceError,
} from "@/backend/modules/order/order.service";


export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "INVALID_REQUEST_BODY" },
        { status: 400 },
      );
    }

    const result = await createOrder(
      body as Parameters<typeof createOrder>[0],
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    console.error("[POST /api/orders] Failed to create order:", error);

    return NextResponse.json(
      { error: "ORDER_CREATION_FAILED" },
      { status: 500 },
    );
  }
}
