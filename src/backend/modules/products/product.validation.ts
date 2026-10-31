
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const uuidSchema = z.string().uuid("Invalid ID.");

const positiveIdSchema = z.coerce
  .number()
  .int()
  .positive("ID must be a positive integer.");

const nonNegativeNumberSchema = z.coerce
  .number()
  .finite()
  .min(0, "Value cannot be negative.");

const positiveNumberSchema = z.coerce
  .number()
  .finite()
  .positive("Value must be greater than zero.");

const optionalBooleanSchema = z.preprocess((value) => {
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return value;
}, z.boolean().optional());

const nullableStringSchema = z.string().trim().nullable().optional();

/* -------------------------------------------------------------------------- */
/*                                  Products                                  */
/* -------------------------------------------------------------------------- */

export const productIdParamSchema = z.object({
  id: uuidSchema,
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().optional(),
  category_id: uuidSchema.optional(),

  is_active: optionalBooleanSchema,

  sort_by: z
    .enum(["created_at", "updated_at", "name", "price"])
    .default("created_at"),

  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const createProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200),

    slug: z.string().trim().min(1).max(220),

    category_id: uuidSchema,

    description: nullableStringSchema,

    price: positiveNumberSchema,

    compare_at_price: nonNegativeNumberSchema
      .nullable()
      .optional(),

    sku: z.string().trim().max(100).nullable().optional(),

    stock_quantity: z.coerce
      .number()
      .int()
      .min(0)
      .default(0),

    is_active: optionalBooleanSchema,

    images: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),

    slug: z.string().trim().min(1).max(220).optional(),

    category_id: uuidSchema.optional(),

    description: nullableStringSchema,

    price: positiveNumberSchema.optional(),

    compare_at_price: nonNegativeNumberSchema
      .nullable()
      .optional(),

    sku: z.string().trim().max(100).nullable().optional(),

    stock_quantity: z.coerce
      .number()
      .int()
      .min(0)
      .optional(),

    is_active: optionalBooleanSchema,

    images: z.array(z.unknown()).optional(),
  })
  .passthrough()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

/* -------------------------------------------------------------------------- */
/*                                   Images                                   */
/* -------------------------------------------------------------------------- */

export const imageUrlSchema = z
  .string()
  .trim()
  .url("Invalid image URL.")
  .max(2048);

export const productImageUrlInputSchema = z.object({
  type: z.literal("url"),
  image_url: imageUrlSchema,
  alt_text: z.string().trim().max(255).nullable().optional(),
});

export const productImageUploadInputSchema = z.object({
  type: z.literal("upload"),
  alt_text: z.string().trim().max(255).nullable().optional(),
});

export const productImageInputSchema = z.discriminatedUnion("type", [
  productImageUrlInputSchema,
  productImageUploadInputSchema,
]);

export const productImagesInputSchema = z
  .array(productImageInputSchema)
  .max(20, "You can add up to 20 images at once.");

export const addProductImagesSchema = z.object({
  images: productImagesInputSchema.min(
    1,
    "At least one image is required.",
  ),
});

export const updateProductImageSchema = z
  .object({
    alt_text: z.string().trim().max(255).nullable().optional(),
    image_url: imageUrlSchema.optional(),
    is_primary: z.coerce.boolean().optional(),
    sort_order: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one image field must be provided.",
  );

export const productImageParamsSchema = z.object({
  id: uuidSchema,
  imageId: uuidSchema,
});

/* -------------------------------------------------------------------------- */
/*                                  Variants                                  */
/* -------------------------------------------------------------------------- */

export const createVariantSchema = z
  .object({
    sku: z.string().trim().max(100).nullable().optional(),

    price: positiveNumberSchema.optional(),

    compare_at_price: nonNegativeNumberSchema
      .nullable()
      .optional(),

    stock_quantity: z.coerce
      .number()
      .int()
      .min(0)
      .default(0),

    is_active: optionalBooleanSchema,

    attribute_value_ids: z
      .array(uuidSchema)
      .max(50)
      .default([]),
  })
  .passthrough();

export const updateVariantSchema = z
  .object({
    sku: z.string().trim().max(100).nullable().optional(),

    price: positiveNumberSchema.optional(),

    compare_at_price: nonNegativeNumberSchema
      .nullable()
      .optional(),

    stock_quantity: z.coerce
      .number()
      .int()
      .min(0)
      .optional(),

    is_active: optionalBooleanSchema,

    attribute_value_ids: z
      .array(uuidSchema)
      .max(50)
      .optional(),
  })
  .passthrough()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one variant field must be provided.",
  );

export const productVariantParamsSchema = z.object({
  id: uuidSchema,
  variantId: uuidSchema,
});

/* -------------------------------------------------------------------------- */
/*                                  Inventory                                 */
/* -------------------------------------------------------------------------- */

export const setProductStockSchema = z.object({
  stock_quantity: z.coerce
    .number()
    .int()
    .min(0, "Stock quantity cannot be negative."),
});

export const setVariantStockSchema = z.object({
  stock_quantity: z.coerce
    .number()
    .int()
    .min(0, "Stock quantity cannot be negative."),
});

/* -------------------------------------------------------------------------- */
/*                                  Attributes                                */
/* -------------------------------------------------------------------------- */

export const createAttributeSchema = z
  .object({
    name: z.string().trim().min(1).max(150),

    slug: z.string().trim().min(1).max(180).optional(),

    display_name: z.string().trim().max(150).optional(),

    is_required: optionalBooleanSchema,

    position: z.coerce.number().int().min(0).optional(),
  })
  .passthrough();

export const updateAttributeSchema = z.object({
  name: z.string().trim().min(1).max(150),

  slug: z.string().trim().min(1).max(180).optional(),

  display_name: z.string().trim().max(150).optional(),

  is_required: optionalBooleanSchema,

  position: z.coerce.number().int().min(0).optional(),
});

export const productAttributeParamsSchema = z.object({
  id: uuidSchema,
  attributeId: uuidSchema,
});

/* -------------------------------------------------------------------------- */
/*                              Attribute Values                             */
/* -------------------------------------------------------------------------- */

export const createAttributeValueSchema = z
  .object({
    value: z.string().trim().min(1).max(150),

    color_code: z
      .string()
      .trim()
      .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
      .nullable()
      .optional(),

    position: z.coerce.number().int().min(0).optional(),
  })
  .passthrough();

export const updateAttributeValueSchema = z.object({
  value: z.string().trim().min(1).max(150),

  color_code: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .nullable()
    .optional(),

  position: z.coerce.number().int().min(0).optional(),
});

export const productAttributeValueParamsSchema = z.object({
  id: uuidSchema,
  attributeId: uuidSchema,
  valueId: uuidSchema,
});

/* -------------------------------------------------------------------------- */
/*                              Inferred Types                               */
/* -------------------------------------------------------------------------- */

export type ProductListQuery = z.infer<
  typeof productListQuerySchema
>;

export type CreateProductValidation = z.infer<
  typeof createProductSchema
>;

export type UpdateProductValidation = z.infer<
  typeof updateProductSchema
>;

export type CreateVariantValidation = z.infer<
  typeof createVariantSchema
>;

export type UpdateVariantValidation = z.infer<
  typeof updateVariantSchema
>;
