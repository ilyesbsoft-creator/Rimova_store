
import type { NextRequest } from "next/server";

import {
  HttpError,
  successResponse,
  getErrorResponse,
  readJsonBody,
} from "../../utils/http";

import {
  createOrder,	
  getOrders,
  getOrderDetails,
  changeOrderStatus,
  updateOrderCustomerInfo,
  addItemToOrder,
  removeItemFromOrder,
  getOrderStats,
  updateOrderDeliveryInfo,
  updateOrderItem
} from "./order.service";

import {
  createOrderSchema,
  orderIdSchema,
  orderItemParamsSchema,
  orderListQuerySchema,
  updateOrderStatusSchema,
  updateOrderCustomerSchema,
  addOrderItemSchema,
  updateOrderItemSchema,
  orderStatsQuerySchema,
  updateOrderDeliverySchema,  
} from "./order.validation";

/* =========================================================
   VALIDATION HELPER
========================================================= */

function validate<T>(
  schema: {
    safeParse: (data: unknown) => {
      success: boolean;
      data?: T;
      error?: {
        flatten: () => unknown;
      };
    };
  },
  data: unknown
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new HttpError(
      "Validation failed.",
      400,
      result.error?.flatten()
    );
  }

  return result.data as T;
}

/* =========================================================
   PARAMS HELPER
========================================================= */

type OrderRouteContext = {
  params: Promise<{ id: string }>;
};

type OrderItemRouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

/* =========================================================
   POST /api/orders
========================================================= */

export async function createOrderController(
  request: NextRequest
) {
  try {
    const body = validate(
      createOrderSchema,
      await readJsonBody(request)
    );

    const result = await createOrder(body);

return successResponse(
  {
    message: "Order created successfully.",
    ...result,
  },
  201
);
  } catch (error) {
	  console.error("error = ",error);
    return getErrorResponse(error);
  }
}

/* =========================================================
   GET /api/admin/orders
========================================================= */

export async function getOrdersController(
  request: NextRequest
) {
  try {
    const queryParams = Object.fromEntries(
      request.nextUrl.searchParams.entries()
    );

    const filters = validate(
      orderListQuerySchema,
      queryParams
    );

    const result = await getOrders(filters);

    return successResponse({
      message: "Orders retrieved successfully.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* =========================================================
   GET /api/admin/orders/:id
========================================================= */

export async function getOrderDetailsController(
  _request: NextRequest,
  context: OrderRouteContext
) {
  try {
    const params = validate(
      orderIdSchema,
      await context.params
    );

    const order = await getOrderDetails(params.id);

    return successResponse({
      message: "Order retrieved successfully.",
      data: order,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* =========================================================
   PATCH /api/admin/orders/:id/status
========================================================= */

export async function updateOrderStatusController(
  request: NextRequest,
  context: OrderRouteContext
) {
  try {
    const params = validate(
      orderIdSchema,
      await context.params
    );

    const body = validate(
      updateOrderStatusSchema,
      await readJsonBody(request)
    );

    const result = await changeOrderStatus(
      params.id,
      body.status
    );

    return successResponse({
      message: "Order status updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* =========================================================
   PATCH /api/admin/orders/:id/customer
========================================================= */

export async function updateOrderCustomerController(
  request: NextRequest,
  context: OrderRouteContext
) {
  try {
    const params = validate(
      orderIdSchema,
      await context.params
    );

    const body = validate(
      updateOrderCustomerSchema,
      await readJsonBody(request)
    );

    const result = await updateOrderCustomerInfo(
      params.id,
      body
    );

    return successResponse({
      message: "Order customer information updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* =========================================================
   POST /api/admin/orders/:id/items
========================================================= */

export async function addOrderItemController(
  request: NextRequest,
  context: OrderRouteContext
) {
  try {
    const params = validate(
      orderIdSchema,
      await context.params
    );

    const body = validate(
      addOrderItemSchema,
      await readJsonBody(request)
    );

    const result = await addItemToOrder(
      params.id,
      body
    );

    return successResponse(
      {
        message: "Order item added successfully.",
        data: result,
      },
      201
    );
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* =========================================================
   PATCH /api/admin/orders/:id/items/:itemId
========================================================= */

export async function updateOrderItemController(
  request: NextRequest,
  context: OrderItemRouteContext
) {
  try {
    const params = validate(
      orderItemParamsSchema,
      await context.params
    );

    const body = validate(
      updateOrderItemSchema,
      await readJsonBody(request)
    );

    const result = await updateOrderItem(
      params.id,
      params.itemId,
      body
    );

    return successResponse({
      message: "Order item updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* =========================================================
   DELETE /api/admin/orders/:id/items/:itemId
========================================================= */

export async function deleteOrderItemController(
  _request: NextRequest,
  context: OrderItemRouteContext
) {
  try {
    const params = validate(
      orderItemParamsSchema,
      await context.params
    );

    const result = await removeItemFromOrder(
      params.id,
      params.itemId
    );

    return successResponse({
      message: "Order item removed successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* =========================================================
   GET /api/admin/orders/stats
========================================================= */

export async function getOrderStatsController(
  request: NextRequest
) {
  try {
    const queryParams = Object.fromEntries(
      request.nextUrl.searchParams.entries()
    );

    const filters = validate(
      orderStatsQuerySchema,
      queryParams
    );

    const result = await getOrderStats(
      filters.date_from,
      filters.date_to
    );

    return successResponse({
      message: "Order statistics retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}


/* =========================================================
   PATCH /api/admin/orders/:id/delivery
========================================================= */

export async function updateOrderDeliveryController(
  request: NextRequest,
  context: OrderRouteContext
) {
  try {
    const params = validate(
      orderIdSchema,
      await context.params
    );

    const body = validate(
      updateOrderDeliverySchema,
      await readJsonBody(request)
    );

    const result = await updateOrderDeliveryInfo(
      params.id,
      body
    );

    return successResponse({
      message: "Order delivery information updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
