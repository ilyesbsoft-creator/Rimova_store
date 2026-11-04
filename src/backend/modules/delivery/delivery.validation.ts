
import { z } from "zod";

/* =========================================================
   SHARED
========================================================= */

const uuidSchema = z.string().uuid();

const optionalBooleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const sortOrderSchema = z.enum(["asc", "desc"]).default("asc");

/**
 * Accepts a valid price as a number or numeric string.
 * Rejects empty strings instead of coercing them to zero.
 */
const priceSchema = z
  .union([
    z.number(),
    z.string().trim().min(1).regex(/^\d+(\.\d{1,2})?$/),
  ])
  .transform(Number)
  .pipe(
    z.number()
      .finite()
      .min(0)
      .max(9999999999.99)
  );

/* =========================================================
   CUSTOMER
   DELIVERY OPTIONS
========================================================= */

export const deliveryTypeSchema = z.enum([
  "HOME",
  "OFFICE",
]);

export const deliveryWilayaIdSchema = z.object({
  wilaya_id: uuidSchema,
});

export const homeDeliverySchema = z.object({
  delivery_type: z.literal("HOME"),
  wilaya_id: uuidSchema,
  commune_id: uuidSchema,
});

export const officeDeliverySchema = z.object({
  delivery_type: z.literal("OFFICE"),
  wilaya_id: uuidSchema,
  delivery_office_id: uuidSchema,
});

export const deliverySelectionSchema = z.discriminatedUnion(
  "delivery_type",
  [
    homeDeliverySchema,
    officeDeliverySchema,
  ]
);

export const deliveryOptionsQuerySchema = z
  .object({
    delivery_type: deliveryTypeSchema.optional(),
    wilaya_id: uuidSchema.optional(),
  })
  .refine(
    (data) =>
      !data.delivery_type || Boolean(data.wilaya_id),
    {
      message: "wilaya_id is required when delivery_type is provided.",
      path: ["wilaya_id"],
    }
  );

export type DeliveryType = z.infer<
  typeof deliveryTypeSchema
>;

export type HomeDeliveryInput = z.infer<
  typeof homeDeliverySchema
>;

export type OfficeDeliveryInput = z.infer<
  typeof officeDeliverySchema
>;

export type DeliverySelectionInput = z.infer<
  typeof deliverySelectionSchema
>;

export type DeliveryOptionsQuery = z.infer<
  typeof deliveryOptionsQuerySchema
>;

/* =========================================================
   ADMIN
   DELIVERY COMPANIES
========================================================= */

export const createDeliveryCompanySchema = z.object({
  name: z.string().trim().min(2).max(150),

  phone: z.string().trim().max(30).nullable().optional(),

  website_url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .nullable()
    .optional(),

  is_active: z.boolean().optional().default(false),
});

export const updateDeliveryCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),

    phone: z.string().trim().max(30).nullable().optional(),

    website_url: z
      .string()
      .trim()
      .url()
      .max(2048)
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided.",
    }
  );

export const deliveryCompanyIdSchema = z.object({
  id: uuidSchema,
});

export const deliveryCompanyStatusSchema = z.object({
  is_active: z.boolean(),
});

export const deliveryCompanyListQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),

  is_active: optionalBooleanQuerySchema.optional(),

  ...paginationSchema,

  sort_by: z
    .enum(["name", "created_at", "updated_at"])
    .default("created_at"),

  sort_order: sortOrderSchema,
});

export type CreateDeliveryCompanyInput = z.infer<
  typeof createDeliveryCompanySchema
>;

export type UpdateDeliveryCompanyInput = z.infer<
  typeof updateDeliveryCompanySchema
>;

export type DeliveryCompanyListQuery = z.infer<
  typeof deliveryCompanyListQuerySchema
>;

/* =========================================================
   ADMIN
   DELIVERY OFFICES
========================================================= */

export const createDeliveryOfficeSchema = z.object({
  delivery_company_id: uuidSchema,

  commune_id: uuidSchema,

  external_office_id: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional(),

  name: z.string().trim().min(2).max(150),

  address: z.string().trim().min(2).max(500),

  phone: z.string().trim().max(30).nullable().optional(),

  is_active: z.boolean().optional().default(true),
});

export const updateDeliveryOfficeSchema = z
  .object({
    commune_id: uuidSchema.optional(),

    external_office_id: z
      .string()
      .trim()
      .max(100)
      .nullable()
      .optional(),

    name: z.string().trim().min(2).max(150).optional(),

    address: z.string().trim().min(2).max(500).optional(),

    phone: z.string().trim().max(30).nullable().optional(),

    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided.",
    }
  );

export const deliveryOfficeIdSchema = z.object({
  id: uuidSchema,
});

export const deliveryOfficeStatusSchema = z.object({
  is_active: z.boolean(),
});

export const deliveryOfficeListQuerySchema = z.object({
  delivery_company_id: uuidSchema.optional(),

  commune_id: uuidSchema.optional(),

  is_active: optionalBooleanQuerySchema.optional(),

  search: z.string().trim().max(150).optional(),

  ...paginationSchema,

  sort_by: z
    .enum(["name", "created_at", "updated_at"])
    .default("created_at"),

  sort_order: sortOrderSchema,
});

export type CreateDeliveryOfficeInput = z.infer<
  typeof createDeliveryOfficeSchema
>;

export type UpdateDeliveryOfficeInput = z.infer<
  typeof updateDeliveryOfficeSchema
>;

export type DeliveryOfficeListQuery = z.infer<
  typeof deliveryOfficeListQuerySchema
>;

/* =========================================================
   ADMIN
   DELIVERY RATES
========================================================= */

const createDeliveryRateBaseSchema = {
  delivery_company_id: uuidSchema,

  wilaya_id: uuidSchema,

  price: priceSchema,

  is_active: z.boolean().optional().default(true),
};

const updateDeliveryRateBaseSchema = {
  price: priceSchema.optional(),

  is_active: z.boolean().optional(),
};

/* -------------------------
   HOME DELIVERY RATES
------------------------- */

export const createHomeDeliveryRateSchema = z.object({
  ...createDeliveryRateBaseSchema,
});

export const updateHomeDeliveryRateSchema = z
  .object({
    ...updateDeliveryRateBaseSchema,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided.",
    }
  );

export const homeDeliveryRateIdSchema = z.object({
  id: uuidSchema,
});

export const homeDeliveryRateListQuerySchema = z.object({
  delivery_company_id: uuidSchema.optional(),

  wilaya_id: uuidSchema.optional(),

  is_active: optionalBooleanQuerySchema.optional(),

  ...paginationSchema,

  sort_order: sortOrderSchema,
});

/* -------------------------
   OFFICE DELIVERY RATES
------------------------- */

export const createOfficeDeliveryRateSchema = z.object({
  ...createDeliveryRateBaseSchema,
});

export const updateOfficeDeliveryRateSchema = z
  .object({
    ...updateDeliveryRateBaseSchema,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided.",
    }
  );

export const officeDeliveryRateIdSchema = z.object({
  id: uuidSchema,
});

export const officeDeliveryRateListQuerySchema = z.object({
  delivery_company_id: uuidSchema.optional(),

  wilaya_id: uuidSchema.optional(),

  is_active: optionalBooleanQuerySchema.optional(),

  ...paginationSchema,

  sort_order: sortOrderSchema,
});

/* -------------------------
   RATE STATUS
------------------------- */

export const deliveryRateStatusSchema = z.object({
  is_active: z.boolean(),
});

export type CreateHomeDeliveryRateInput = z.infer<
  typeof createHomeDeliveryRateSchema
>;

export type UpdateHomeDeliveryRateInput = z.infer<
  typeof updateHomeDeliveryRateSchema
>;

export type HomeDeliveryRateListQuery = z.infer<
  typeof homeDeliveryRateListQuerySchema
>;

export type CreateOfficeDeliveryRateInput = z.infer<
  typeof createOfficeDeliveryRateSchema
>;

export type UpdateOfficeDeliveryRateInput = z.infer<
  typeof updateOfficeDeliveryRateSchema
>;

export type OfficeDeliveryRateListQuery = z.infer<
  typeof officeDeliveryRateListQuerySchema
>;

/* =========================================================
   ADMIN
   WILAYAS / COMMUNES
========================================================= */

export const deliveryCommunesQuerySchema = z.object({
  wilaya_ids: z
    .string()
    .transform((value) =>
      [...new Set(
        value
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      )]
    )
    .pipe(
      z.array(uuidSchema).min(1).max(69)
    ),
});

export type DeliveryCommunesQuery = z.infer<
  typeof deliveryCommunesQuerySchema
>;
