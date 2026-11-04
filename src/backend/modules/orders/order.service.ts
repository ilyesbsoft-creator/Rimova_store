
import { randomUUID } from "node:crypto";
import db from "../../database/knex";

import type { UpdateOrderItemPayload } from "./order.validation";

import {
  findActiveProductForOrder,
  findActiveVariantForOrder,
  decreaseProductStock,
  decreaseVariantStock,
  findActiveDeliveryCompany,
  findActiveCommuneInWilaya,
  findActiveHomeDeliveryRate,
  findActiveOfficeDeliveryRate,
  findActiveDeliveryOffice,
  insertOrder,
  insertOrderItems,
  findOrdersPaginated,
  findAdminOrderById,
  findAdminOrderItems,
  findOrderForUpdate,
  findOrderInventoryItems,
  updateOrderStatus as updateOrderStatusRepository,
  updateOrderCustomer,
  increaseProductStock,
  increaseVariantStock,
  findOrderItemForUpdate,
  insertAdminOrderItem,
  updateAdminOrderItemQuantity,
  updateAdminOrderItem,
  deleteAdminOrderItem,
  calculateOrderSubtotal,
  findOrderStatistics,
  updateOrderDelivery,
  type UpdateOrderDeliveryData,
  type AdminOrderFilters,
  type AdminOrderRow,
  type OrderStatus,
  type UpdateOrderCustomerData,
  type NewOrderRow,
  type NewOrderItemRow,
} from "./order.repository";

type DeliveryMethod = "HOME" | "OFFICE";

type CreateOrderInput = {
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;

  wilaya_id: string;
  commune_id: string;
  delivery_company_id: string;

  delivery_method: DeliveryMethod;
  delivery_office_id?: string | null;
  delivery_address?: string | null;
  customer_note?: string | null;

  items: {
    product_id: string;
    product_variant_id?: string | null;
    quantity: number;
  }[];
};

export class OrderServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "OrderServiceError";
  }
}

function requiredText(value: string, field: string): string {
  const result = value?.trim();

  if (!result) {
    throw new OrderServiceError(`${field} is required`);
  }

  return result;
}

function toCents(value: string | number): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new OrderServiceError("INVALID_PRICE", 500);
  }

  return Math.round(numericValue * 100);
}


export async function createOrder(input: CreateOrderInput) {
  // 1. التحقق من المدخلات قبل بدء العملية
  const firstName = requiredText(
    input.customer_first_name,
    "customer_first_name"
  );

  const lastName = requiredText(
    input.customer_last_name,
    "customer_last_name"
  );

  const phone = requiredText(
    input.customer_phone,
    "customer_phone"
  );

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new OrderServiceError("ORDER_ITEMS_REQUIRED");
  }

  if (
    input.delivery_method !== "HOME" &&
    input.delivery_method !== "OFFICE"
  ) {
    throw new OrderServiceError("INVALID_DELIVERY_METHOD");
  }

  // عنوان المنزل والمكتب
  const address = input.delivery_address?.trim() || null;
  const officeId = input.delivery_office_id?.trim() || null;

  // لا يُسمح بتمرير مكتب عند اختيار التوصيل إلى المنزل.
  if (
    input.delivery_method === "HOME" &&
    officeId !== null
  ) {
    throw new OrderServiceError("INVALID_DELIVERY_DETAILS");
  }

  // 2. بدء Transaction للعملية كاملة
  return db.transaction(async (trx) => {
    // 3. التحقق من شركة التوصيل
    const company = await findActiveDeliveryCompany(
      input.delivery_company_id,
      trx
    );

    if (!company) {
      throw new OrderServiceError(
        "DELIVERY_COMPANY_NOT_AVAILABLE"
      );
    }

    // 4. تحديد البلدية والتحقق منها
    let communeId: string;

    if (input.delivery_method === "HOME") {
      // في التوصيل إلى المنزل، البلدية تأتي من الواجهة.
      const commune = await findActiveCommuneInWilaya(
        input.commune_id,
        input.wilaya_id,
        trx
      );

      if (!commune) {
        throw new OrderServiceError(
          "INVALID_WILAYA_OR_COMMUNE"
        );
      }

      communeId = commune.id;
    } else {
      // في التوصيل إلى المكتب، نستخرج البلدية من المكتب.
      if (!officeId) {
        throw new OrderServiceError(
          "DELIVERY_OFFICE_REQUIRED"
        );
      }

      const office = await findActiveDeliveryOffice(
        officeId,
        company.id,
        trx
      );

      if (!office) {
        throw new OrderServiceError(
          "DELIVERY_OFFICE_NOT_AVAILABLE"
        );
      }

      communeId = office.commune_id;
    }

    // 5. التحقق من خيار التوصيل وحساب تكلفته
    let deliveryFeeCents: number;

    if (input.delivery_method === "HOME") {
      const rate = await findActiveHomeDeliveryRate(
        company.id,
        input.wilaya_id,
        trx
      );

      if (!rate) {
        throw new OrderServiceError(
          "HOME_DELIVERY_NOT_AVAILABLE"
        );
      }

      deliveryFeeCents = toCents(rate.price);
    } else {
      const rate = await findActiveOfficeDeliveryRate(
        company.id,
        input.wilaya_id,
        trx
      );

      if (!rate) {
        throw new OrderServiceError(
          "OFFICE_DELIVERY_NOT_AVAILABLE"
        );
      }

      deliveryFeeCents = toCents(rate.price);
    }

    // 6. التحقق من المنتجات والأسعار والمخزون
    const orderItems: NewOrderItemRow[] = [];
    let subtotalCents = 0;

    for (const item of input.items) {
      if (
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new OrderServiceError("INVALID_ITEM_QUANTITY");
      }

      const product = await findActiveProductForOrder(
        item.product_id,
        trx
      );

      if (!product) {
        throw new OrderServiceError(
          "PRODUCT_NOT_AVAILABLE"
        );
      }

      let variant: Awaited<
        ReturnType<typeof findActiveVariantForOrder>
      > = undefined;

      if (item.product_variant_id) {
        variant = await findActiveVariantForOrder(
          product.id,
          item.product_variant_id,
          trx
        );

        if (!variant) {
          throw new OrderServiceError(
            "PRODUCT_VARIANT_NOT_AVAILABLE"
          );
        }

        if (variant.stock_quantity < item.quantity) {
          throw new OrderServiceError("INSUFFICIENT_STOCK");
        }
      } else if (product.stock_quantity < item.quantity) {
        throw new OrderServiceError("INSUFFICIENT_STOCK");
      }

      const unitPriceCents = toCents(
        variant?.price ?? product.price
      );

      const lineTotalCents =
        unitPriceCents * item.quantity;

      if (!Number.isSafeInteger(lineTotalCents)) {
        throw new OrderServiceError("ORDER_AMOUNT_TOO_LARGE");
      }

      subtotalCents += lineTotalCents;

      if (!Number.isSafeInteger(subtotalCents)) {
        throw new OrderServiceError("ORDER_AMOUNT_TOO_LARGE");
      }

      orderItems.push({
        id: randomUUID(),
        order_id: "",
        product_id: product.id,
        product_variant_id: variant?.id ?? null,
        product_name: product.name,
        product_sku: variant?.sku ?? product.sku,
        quantity: item.quantity,
        unit_price: unitPriceCents / 100,
      });
    }

    // 7. حساب المجموع من القيم الموثوقة
    const totalCents = subtotalCents + deliveryFeeCents;

    if (!Number.isSafeInteger(totalCents)) {
      throw new OrderServiceError("ORDER_AMOUNT_TOO_LARGE");
    }

    // 8. إنشاء سجل الطلب
    const orderId = randomUUID();

    const orderNumber =
      `RM-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const order: NewOrderRow = {
      id: orderId,
      order_number: orderNumber,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_phone: phone,
      wilaya_id: input.wilaya_id,
      commune_id: communeId,
      delivery_company_id: company.id,
      delivery_method: input.delivery_method,

      delivery_office_id:
        input.delivery_method === "OFFICE"
          ? officeId
          : null,

      delivery_address:
        input.delivery_method === "HOME"
          ? address
          : null,

      delivery_fee: deliveryFeeCents / 100,
      subtotal: subtotalCents / 100,
      total_amount: totalCents / 100,
      status: "PENDING",
      customer_note: input.customer_note?.trim() || null,
    };

    await insertOrder(order, trx);

    // 9. ربط العناصر بالطلب
    for (const item of orderItems) {
      item.order_id = orderId;
    }

    await insertOrderItems(orderItems, trx);

    // 10. خصم المخزون داخل المعاملة نفسها
    for (const item of orderItems) {
      if (item.product_variant_id) {
        await decreaseVariantStock(
          item.product_variant_id,
          item.quantity,
          trx
        );
      } else {
        await decreaseProductStock(
          item.product_id,
          item.quantity,
          trx
        );
      }
    }

    // 11. إرجاع ملخص الطلب
    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      total_amount: order.total_amount,
      delivery_method: order.delivery_method,
    };
  });
}



/* =========================================================
   ADMIN ORDER MANAGEMENT
========================================================= */

const EDITABLE_ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
];

function assertEditableOrderStatus(status: OrderStatus) {
  if (!EDITABLE_ORDER_STATUSES.includes(status)) {
    throw new OrderServiceError(
      "ORDER_ITEMS_CANNOT_BE_MODIFIED",
      409
    );
  }
}

function assertOrderStatusTransition(
  current: OrderStatus,
  next: OrderStatus
) {
  const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED", "RETURNED"],
    DELIVERED: ["RETURNED"],
    CANCELLED: ["PENDING"],
    RETURNED: [],
  };

  if (current === next) {
    return;
  }

  if (!allowedTransitions[current].includes(next)) {
    throw new OrderServiceError(
      "INVALID_ORDER_STATUS_TRANSITION",
      409
    );
  }
}

function toSafeQuantity(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new OrderServiceError("INVALID_ITEM_QUANTITY");
  }

  return value;
}

async function restoreOrderInventory(
  orderId: string,
  trx: import("knex").Knex.Transaction
) {
  const items = await findOrderInventoryItems(orderId, trx);

  for (const item of items) {
    if (!item.product_id) {
      continue;
    }

    if (item.product_variant_id) {
      await increaseVariantStock(
        item.product_variant_id,
        item.quantity,
        trx
      );
    } else {
      await increaseProductStock(
        item.product_id,
        item.quantity,
        trx
      );
    }
  }
}

async function reserveOrderInventory(
  orderId: string,
  trx: import("knex").Knex.Transaction
) {
  const items = await findOrderInventoryItems(orderId, trx);

  for (const item of items) {
    if (!item.product_id) {
      throw new OrderServiceError(
        "ORDER_PRODUCT_NO_LONGER_EXISTS",
        409
      );
    }

    if (item.product_variant_id) {
      await decreaseVariantStock(
        item.product_variant_id,
        item.quantity,
        trx
      );
    } else {
      await decreaseProductStock(
        item.product_id,
        item.quantity,
        trx
      );
    }
  }
}

/* =========================================================
   LIST ORDERS
========================================================= */

export async function getOrders(
  filters: AdminOrderFilters
) {
  return findOrdersPaginated(filters);
}

/* =========================================================
   ORDER DETAILS
========================================================= */

export async function getOrderDetails(orderId: string) {
  const order = await findAdminOrderById(orderId);

  if (!order) {
    throw new OrderServiceError("ORDER_NOT_FOUND", 404);
  }

  const items = await findAdminOrderItems(orderId);

  return {
    ...order,
    items,
  };
}

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

export async function changeOrderStatus(
  orderId: string,
  nextStatus: OrderStatus
) {
  return db.transaction(async (trx) => {
    const order = await findOrderForUpdate(orderId, trx);

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", 404);
    }

    assertOrderStatusTransition(order.status, nextStatus);

    if (order.status === nextStatus) {
      return {
        id: order.id,
        status: order.status,
      };
    }

    // إلغاء الطلب: إعادة المخزون مرة واحدة فقط.
    if (nextStatus === "CANCELLED") {
      await restoreOrderInventory(orderId, trx);
    }

    // إعادة فتح طلب ملغى: حجز المخزون من جديد.
    if (
      order.status === "CANCELLED" &&
      nextStatus === "PENDING"
    ) {
      await reserveOrderInventory(orderId, trx);
    }

    // RETURNED لا يعيد المخزون.
    await updateOrderStatusRepository(
      orderId,
      nextStatus,
      trx
    );

    return {
      id: order.id,
      previous_status: order.status,
      status: nextStatus,
    };
  });
}

/* =========================================================
   UPDATE CUSTOMER INFORMATION
========================================================= */

export async function updateOrderCustomerInfo(
  orderId: string,
  input: UpdateOrderCustomerData
) {
  return db.transaction(async (trx) => {
    const order = await findOrderForUpdate(orderId, trx);

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", 404);
    }

    if (
      order.status === "CANCELLED" ||
      order.status === "RETURNED"
    ) {
      throw new OrderServiceError(
        "ORDER_CANNOT_BE_EDITED",
        409
      );
    }

    const data: UpdateOrderCustomerData = {};

    if (input.customer_first_name !== undefined) {
      data.customer_first_name = requiredText(
        input.customer_first_name,
        "customer_first_name"
      );
    }

    if (input.customer_last_name !== undefined) {
      data.customer_last_name = requiredText(
        input.customer_last_name,
        "customer_last_name"
      );
    }

    if (input.customer_phone !== undefined) {
      data.customer_phone = requiredText(
        input.customer_phone,
        "customer_phone"
      );
    }

    if (input.customer_note !== undefined) {
      data.customer_note =
        input.customer_note?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      throw new OrderServiceError(
        "NO_ORDER_DATA_TO_UPDATE"
      );
    }

    await updateOrderCustomer(orderId, data, trx);

    return {
      id: orderId,
      ...data,
    };
  });
}

/* =========================================================
   ORDER TOTALS
========================================================= */

async function recalculateOrderTotals(
  order: AdminOrderRow,
  trx: import("knex").Knex.Transaction
) {
  const subtotal = await calculateOrderSubtotal(
    order.id,
    trx
  );

  const subtotalCents = toCents(subtotal);
  const deliveryFeeCents = toCents(order.delivery_fee);
  const totalCents = subtotalCents + deliveryFeeCents;

  if (!Number.isSafeInteger(totalCents)) {
    throw new OrderServiceError(
      "ORDER_AMOUNT_TOO_LARGE"
    );
  }

  await trx("orders")
    .where("id", order.id)
    .update({
      subtotal: subtotalCents / 100,
      total_amount: totalCents / 100,
      updated_at: trx.fn.now(),
    });
}

/* =========================================================
   ADD ITEM TO ORDER
========================================================= */

export async function addItemToOrder(
  orderId: string,
  input: {
    product_id: string;
    product_variant_id?: string | null;
    quantity: number;
  }
) {
  const quantity = toSafeQuantity(input.quantity);

  return db.transaction(async (trx) => {
    const order = await findOrderForUpdate(orderId, trx);

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", 404);
    }

    assertEditableOrderStatus(order.status);

    const product = await findActiveProductForOrder(
      input.product_id,
      trx
    );

    if (!product) {
      throw new OrderServiceError(
        "PRODUCT_NOT_AVAILABLE"
      );
    }

    let variant:
      | Awaited<ReturnType<typeof findActiveVariantForOrder>>
      | undefined;

    if (input.product_variant_id) {
      variant = await findActiveVariantForOrder(
        product.id,
        input.product_variant_id,
        trx
      );

      if (!variant) {
        throw new OrderServiceError(
          "PRODUCT_VARIANT_NOT_AVAILABLE"
        );
      }
    }

    const unitPriceCents = toCents(
      variant?.price ?? product.price
    );

    const item: NewOrderItemRow = {
      id: randomUUID(),
      order_id: orderId,
      product_id: product.id,
      product_variant_id: variant?.id ?? null,
      product_name: product.name,
      product_sku: variant?.sku ?? product.sku,
      quantity,
      unit_price: unitPriceCents / 100,
    };

    if (variant) {
      await decreaseVariantStock(
        variant.id,
        quantity,
        trx
      );
    } else {
      await decreaseProductStock(
        product.id,
        quantity,
        trx
      );
    }

    await insertAdminOrderItem(item, trx);
    await recalculateOrderTotals(order, trx);

    return item;
  });
}

/* =========================================================
   UPDATE ORDER ITEM QUANTITY
========================================================= */

export async function changeOrderItemQuantity(
  orderId: string,
  itemId: string,
  newQuantity: number
) {
  toSafeQuantity(newQuantity);

  return db.transaction(async (trx) => {
    const order = await findOrderForUpdate(orderId, trx);

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", 404);
    }

    assertEditableOrderStatus(order.status);

    const item = await findOrderItemForUpdate(
      itemId,
      orderId,
      trx
    );

    if (!item) {
      throw new OrderServiceError(
        "ORDER_ITEM_NOT_FOUND",
        404
      );
    }

    const difference = newQuantity - item.quantity;

    if (difference > 0) {
      if (!item.product_id) {
        throw new OrderServiceError(
          "ORDER_PRODUCT_NO_LONGER_EXISTS",
          409
        );
      }

      if (item.product_variant_id) {
        await decreaseVariantStock(
          item.product_variant_id,
          difference,
          trx
        );
      } else {
        await decreaseProductStock(
          item.product_id,
          difference,
          trx
        );
      }
    } else if (difference < 0) {
      const returnedQuantity = Math.abs(difference);

      if (item.product_variant_id) {
        await increaseVariantStock(
          item.product_variant_id,
          returnedQuantity,
          trx
        );
      } else if (item.product_id) {
        await increaseProductStock(
          item.product_id,
          returnedQuantity,
          trx
        );
      }
    }

    await updateAdminOrderItemQuantity(
      itemId,
      orderId,
      newQuantity,
      trx
    );

    await recalculateOrderTotals(order, trx);

    return {
      id: itemId,
      quantity: newQuantity,
    };
  });
}

export async function updateOrderItem(
  orderId: string,
  itemId: string,
  input: UpdateOrderItemPayload
) {
  return db.transaction(async (trx) => {
    // 1. قفل الطلب والتحقق من إمكانية تعديله
    const order = await findOrderForUpdate(orderId, trx);

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", 404);
    }

    assertEditableOrderStatus(order.status);

    // 2. قفل عنصر الطلب
    const currentItem = await findOrderItemForUpdate(
      itemId,
      orderId,
      trx
    );

    if (!currentItem) {
      throw new OrderServiceError("ORDER_ITEM_NOT_FOUND", 404);
    }

    const quantity = toSafeQuantity(input.quantity);

    // 3. التحقق من المنتج الجديد
    const product = await findActiveProductForOrder(
      input.product_id,
      trx
    );

    if (!product) {
      throw new OrderServiceError("PRODUCT_NOT_FOUND", 404);
    }

    // 4. التحقق من النسخة المختارة إن وجدت
    const variant = input.product_variant_id
      ? await findActiveVariantForOrder(
          product.id,
          input.product_variant_id,
          trx
        )
      : null;

    if (input.product_variant_id && !variant) {
      throw new OrderServiceError("VARIANT_NOT_FOUND", 404);
    }

    // 5. تحديد مصدر المخزون القديم والجديد
    const oldProductId = currentItem.product_id;
    const oldVariantId = currentItem.product_variant_id;

    const newProductId = product.id;
    const newVariantId = variant?.id ?? null;

    const sameInventorySource =
      oldProductId === newProductId &&
      oldVariantId === newVariantId;

    // 6. تعديل المخزون
    if (sameInventorySource) {
      const difference = quantity - currentItem.quantity;

      if (difference > 0) {
        if (newVariantId) {
          await decreaseVariantStock(newVariantId, difference, trx);
        } else {
          await decreaseProductStock(newProductId, difference, trx);
        }
      } else if (difference < 0) {
        const returnedQuantity = Math.abs(difference);

        if (oldVariantId) {
          await increaseVariantStock(
            oldVariantId,
            returnedQuantity,
            trx
          );
        } else {
          await increaseProductStock(
            oldProductId!,
            returnedQuantity,
            trx
          );
        }
      }
    } else {
      // إرجاع كمية العنصر القديم إلى مخزونه
      if (oldVariantId) {
        await increaseVariantStock(
          oldVariantId,
          currentItem.quantity,
          trx
        );
      } else if (oldProductId) {
        await increaseProductStock(
          oldProductId,
          currentItem.quantity,
          trx
        );
      }

      // حجز الكمية من مخزون المنتج أو النسخة الجديدة
      if (newVariantId) {
        await decreaseVariantStock(newVariantId, quantity, trx);
      } else {
        await decreaseProductStock(newProductId, quantity, trx);
      }
    }

    // 7. تحديد السعر وبيانات العنصر الجديدة
    const unitPrice = Number(variant?.price ?? product.price);

    const affectedRows = await updateAdminOrderItem(
      itemId,
      orderId,
      {
        product_id: newProductId,
        product_variant_id: newVariantId,
        product_name: product.name,
        product_sku: variant?.sku ?? product.sku,
        quantity,
        unit_price: unitPrice,
      },
      trx
    );

    if (affectedRows !== 1) {
      throw new OrderServiceError("ORDER_ITEM_UPDATE_FAILED", 500);
    }

    // 8. إعادة حساب إجمالي الطلب
    await recalculateOrderTotals(order, trx);

    return {
      id: itemId,
      product_id: newProductId,
      product_variant_id: newVariantId,
      quantity,
      unit_price: unitPrice,
    };
  });
}
/* =========================================================
   REMOVE ITEM FROM ORDER
========================================================= */

export async function removeItemFromOrder(
  orderId: string,
  itemId: string
) {
  return db.transaction(async (trx) => {
    const order = await findOrderForUpdate(orderId, trx);

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", 404);
    }

    assertEditableOrderStatus(order.status);

    const item = await findOrderItemForUpdate(
      itemId,
      orderId,
      trx
    );

    if (!item) {
      throw new OrderServiceError(
        "ORDER_ITEM_NOT_FOUND",
        404
      );
    }

    if (item.product_variant_id) {
      await increaseVariantStock(
        item.product_variant_id,
        item.quantity,
        trx
      );
    } else if (item.product_id) {
      await increaseProductStock(
        item.product_id,
        item.quantity,
        trx
      );
    }

    await deleteAdminOrderItem(
      itemId,
      orderId,
      trx
    );

    const remainingItems = await findAdminOrderItems(
      orderId,
      trx
    );

    if (remainingItems.length === 0) {
      throw new OrderServiceError(
        "ORDER_MUST_HAVE_AT_LEAST_ONE_ITEM",
        409
      );
    }

    await recalculateOrderTotals(order, trx);

    return {
      id: itemId,
      deleted: true,
    };
  });
}

/* =========================================================
   ORDER STATISTICS
========================================================= */

export async function getOrderStats(
  dateFrom?: string,
  dateTo?: string
) {
  return findOrderStatistics(dateFrom, dateTo);
}


/* =========================================================
   UPDATE ORDER DELIVERY INFORMATION
========================================================= */

export async function updateOrderDeliveryInfo(
  orderId: string,
  input: {
    wilaya_id: string;
    commune_id: string;
    delivery_company_id: string;
    delivery_method: DeliveryMethod;
    delivery_office_id?: string | null;
    delivery_address?: string | null;
  }
) {
  return db.transaction(async (trx) => {
    const order = await findOrderForUpdate(orderId, trx);

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", 404);
    }

    if (
      order.status !== "PENDING" &&
      order.status !== "CONFIRMED"
    ) {
      throw new OrderServiceError(
        "ORDER_DELIVERY_CANNOT_BE_MODIFIED",
        409
      );
    }

    const company = await findActiveDeliveryCompany(
      input.delivery_company_id,
      trx
    );

    if (!company) {
      throw new OrderServiceError(
        "DELIVERY_COMPANY_NOT_AVAILABLE"
      );
    }

    const commune = await findActiveCommuneInWilaya(
      input.commune_id,
      input.wilaya_id,
      trx
    );

    if (!commune) {
      throw new OrderServiceError(
        "INVALID_WILAYA_OR_COMMUNE"
      );
    }

    const officeId =
      input.delivery_office_id?.trim() || null;

    const address =
      input.delivery_address?.trim() || null;

    let rate:
      | Awaited<ReturnType<typeof findActiveHomeDeliveryRate>>
      | undefined;

    if (input.delivery_method === "HOME") {
      if (officeId !== null) {
        throw new OrderServiceError(
          "INVALID_DELIVERY_DETAILS"
        );
      }

rate = await findActiveHomeDeliveryRate(
  company.id,
  input.wilaya_id,
  trx
);

      if (!rate) {
        throw new OrderServiceError(
          "HOME_DELIVERY_NOT_AVAILABLE"
        );
      }
    } else {
      if (officeId !== null) {
        const office = await findActiveDeliveryOffice(
          officeId,
          company.id,
          commune.id,
          trx
        );

        if (!office) {
          throw new OrderServiceError(
            "DELIVERY_OFFICE_NOT_AVAILABLE"
          );
        }
      }

rate = await findActiveOfficeDeliveryRate(
  company.id,
  input.wilaya_id,
  trx
);

      if (!rate) {
        throw new OrderServiceError(
          "OFFICE_DELIVERY_NOT_AVAILABLE"
        );
      }
    }

    const deliveryFeeCents = toCents(rate.price);
    const subtotalCents = toCents(order.subtotal);
    const totalCents = subtotalCents + deliveryFeeCents;

    if (!Number.isSafeInteger(totalCents)) {
      throw new OrderServiceError(
        "ORDER_AMOUNT_TOO_LARGE"
      );
    }

    const data: UpdateOrderDeliveryData = {
      wilaya_id: input.wilaya_id,
      commune_id: input.commune_id,
      delivery_company_id: company.id,
      delivery_method: input.delivery_method,
      delivery_office_id:
        input.delivery_method === "OFFICE" ? officeId : null,
      delivery_address:
        input.delivery_method === "HOME" ? address : null,
      delivery_fee: deliveryFeeCents / 100,
      total_amount: totalCents / 100,
    };

    await updateOrderDelivery(orderId, data, trx);

    return {
      id: orderId,
      ...data,
    };
  });
}
