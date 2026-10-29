
import { randomUUID } from "node:crypto";
import db from "../../database/knex";

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

  // عنوان المنزل والمكتب كلاهما اختياريان.
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

    // 4. التأكد من أن البلدية تتبع الولاية المختارة
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

    // 5. التحقق من خيار التوصيل وحساب تكلفته من قاعدة البيانات
    let deliveryFeeCents: number;

    if (input.delivery_method === "HOME") {
      const rate = await findActiveHomeDeliveryRate(
        company.id,
        commune.id,
        trx
      );

      if (!rate) {
        throw new OrderServiceError(
          "HOME_DELIVERY_NOT_AVAILABLE"
        );
      }

      deliveryFeeCents = toCents(rate.price);
    } else {
      // اختيار المكتب اختياري.
      // إذا أُرسل معرّف مكتب، يجب التحقق من صلاحيته.
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

      // الرسوم تعتمد على شركة التوصيل والبلدية،
      // ولا تتطلب تحديد مكتب بعينه.
      const rate = await findActiveOfficeDeliveryRate(
        company.id,
        commune.id,
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

      const lineTotalCents = unitPriceCents * item.quantity;

      if (!Number.isSafeInteger(lineTotalCents)) {
        throw new OrderServiceError("ORDER_AMOUNT_TOO_LARGE");
      }

      subtotalCents += lineTotalCents;

      if (!Number.isSafeInteger(subtotalCents)) {
        throw new OrderServiceError("ORDER_AMOUNT_TOO_LARGE");
      }

      orderItems.push({
        id: randomUUID(),
        order_id: "", // يُحدد بعد إنشاء الطلب
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
      commune_id: input.commune_id,
      delivery_company_id: company.id,
      delivery_method: input.delivery_method,

      delivery_office_id:
        input.delivery_method === "OFFICE" ? officeId : null,

      delivery_address:
        input.delivery_method === "HOME" ? address : null,

      delivery_fee: deliveryFeeCents / 100,
      subtotal: subtotalCents / 100,
      total_amount: totalCents / 100,
      status: "PENDING",
      customer_note: input.customer_note?.trim() || null,
    };

    await insertOrder(order, trx);

    // 9. ربط العناصر بالطلب الذي أُنشئ
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
