
import { z } from "zod";

/* =========================================================
   COMMON
========================================================= */

const uuidSchema = z.string().uuid();

const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);

const deliveryMethodSchema = z.enum([
  "HOME",
  "OFFICE",
]);

const dateSchema = z.string().date();

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional();

const pageSchema = z.coerce.number().int().min(1).default(1);

const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20);

/* =========================================================
   ORDER ID
========================================================= */

export const orderIdSchema = z.object({
  id: uuidSchema,
});

export const orderItemParamsSchema = z.object({
  id: uuidSchema,
  itemId: uuidSchema,
});

/* =========================================================
   ORDER LIST
========================================================= */

export const orderListQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,

    search: optionalTrimmedString(200),

    status: orderStatusSchema.optional(),

    delivery_method: deliveryMethodSchema.optional(),

    delivery_company_id: uuidSchema.optional(),

    wilaya_id: uuidSchema.optional(),

    commune_id: uuidSchema.optional(),

    date_from: dateSchema.optional(),

    date_to: dateSchema.optional(),

    sort: z
      .enum([
        "newest",
        "oldest",
        "total_asc",
        "total_desc",
      ])
      .default("newest"),
  })
  .refine(
    (data) =>
      !data.date_from ||
      !data.date_to ||
      data.date_from <= data.date_to,
    {
      message: "Invalid date range.",
      path: ["date_to"],
    }
  );

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

/* =========================================================
   UPDATE CUSTOMER INFORMATION
========================================================= */

export const updateOrderCustomerSchema = z
  .object({
    customer_first_name: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    customer_last_name: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    customer_phone: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .optional(),

    customer_note: z
      .string()
      .trim()
      .max(5000)
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.values(data).some(
      (value) => value !== undefined
    ),
    {
      message: "At least one field is required.",
    }
  );

/* =========================================================
   ADD ORDER ITEM
========================================================= */

export const addOrderItemSchema = z.object({
  product_id: uuidSchema,

  product_variant_id: uuidSchema.nullable().optional(),

  quantity: z.coerce
    .number()
    .int()
    .min(1)
    .max(100000),
});

/* =========================================================
   UPDATE ORDER ITEM
========================================================= */

export const updateOrderItemSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .min(1)
    .max(100000),
});

/* =========================================================
   ORDER STATISTICS
========================================================= */

export const orderStatsQuerySchema = z
  .object({
    date_from: dateSchema.optional(),
    date_to: dateSchema.optional(),
  })
  .refine(
    (data) =>
      !data.date_from ||
      !data.date_to ||
      data.date_from <= data.date_to,
    {
      message: "Invalid date range.",
      path: ["date_to"],
    }
  );
  

/* =========================================================
   UPDATE ORDER DELIVERY
========================================================= */

export const updateOrderDeliverySchema = z.object({
  wilaya_id: uuidSchema,
  commune_id: uuidSchema,
  delivery_company_id: uuidSchema,

  delivery_method: deliveryMethodSchema,

  delivery_office_id: uuidSchema.nullable().optional(),

  delivery_address: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional(),
});

export type UpdateOrderDeliveryPayload = z.infer<
  typeof updateOrderDeliverySchema
>;
  

/* =========================================================
   INFERRED TYPES
========================================================= */

export type OrderIdParams = z.infer<
  typeof orderIdSchema
>;

export type OrderItemParams = z.infer<
  typeof orderItemParamsSchema
>;

export type OrderListQuery = z.infer<
  typeof orderListQuerySchema
>;

export type UpdateOrderStatusPayload = z.infer<
  typeof updateOrderStatusSchema
>;

export type UpdateOrderCustomerPayload = z.infer<
  typeof updateOrderCustomerSchema
>;

export type AddOrderItemPayload = z.infer<
  typeof addOrderItemSchema
>;

export type UpdateOrderItemPayload = z.infer<
  typeof updateOrderItemSchema
>;

export type OrderStatsQuery = z.infer<
  typeof orderStatsQuerySchema
>;
