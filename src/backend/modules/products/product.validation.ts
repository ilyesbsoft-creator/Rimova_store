
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const uuidSchema = z.string().uuid("Invalid ID.");

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

const imageUrlSchema = z
  .string()
  .trim()
  .url("Invalid image URL.")
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Only HTTP and HTTPS image URLs are supported.");

/* -------------------------------------------------------------------------- */
/*                                  Products                                  */
/* -------------------------------------------------------------------------- */

export const productIdParamSchema = z.object({
  id: uuidSchema,
}).strict();

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
}).strict();

export const createProductSchema = z.object({
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

  images: z.array(z.unknown()).max(20).optional(),
}).strict();

export const updateProductSchema = z.object({
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

  images: z.array(z.unknown()).max(20).optional(),
})
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

/* -------------------------------------------------------------------------- */
/*                                   Images                                   */
/* -------------------------------------------------------------------------- */

export const productImageUrlInputSchema = z.object({
  type: z.literal("url"),

  image_url: imageUrlSchema,

  alt_text: z.string().trim().max(255).nullable().optional(),
}).strict();

export const productImageUploadInputSchema = z.object({
  type: z.literal("upload"),

  alt_text: z.string().trim().max(255).nullable().optional(),
}).strict();

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
}).strict();

export const updateProductImageSchema = z.object({
  alt_text: z.string().trim().max(255).nullable().optional(),

  image_url: imageUrlSchema.optional(),

  is_primary: optionalBooleanSchema,

  sort_order: z.coerce.number().int().min(0).optional(),
})
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one image field must be provided.",
  );

export const productImageParamsSchema = z.object({
  id: uuidSchema,

  imageId: uuidSchema,
}).strict();

/* -------------------------------------------------------------------------- */
/*                                  Variants                                  */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/*                                  Variants                                  */
/* -------------------------------------------------------------------------- */

/**
 * Variant:
 * - يمكن ربطه بقيم الخصائص عبر attribute_value_ids.
 * - يمكن تحديد image_url له من صور المنتج الموجودة مسبقاً.
 */

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

    image_url: imageUrlSchema.nullable().optional(),

    is_active: optionalBooleanSchema,

    attribute_value_ids: z
      .array(uuidSchema)
      .max(50)
      .default([]),
  })
  .strict();

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

    image_url: imageUrlSchema.nullable().optional(),

    is_active: optionalBooleanSchema,

    attribute_value_ids: z
      .array(uuidSchema)
      .max(50)
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one variant field must be provided.",
  );

export const productVariantParamsSchema = z.object({
  id: uuidSchema,

  variantId: uuidSchema,
}).strict();
/* -------------------------------------------------------------------------- */
/*                                  Inventory                                 */
/* -------------------------------------------------------------------------- */

export const setProductStockSchema = z.object({
  stock_quantity: z.coerce
    .number()
    .int()
    .min(0, "Stock quantity cannot be negative."),
}).strict();

export const setVariantStockSchema = z.object({
  stock_quantity: z.coerce
    .number()
    .int()
    .min(0, "Stock quantity cannot be negative."),
}).strict();

/* -------------------------------------------------------------------------- */
/*                                  Attributes                                */
/* -------------------------------------------------------------------------- */

/**
 * Product attribute:
 * - product_id
 * - global_attribute_id
 *
 * الاسم والنوع مصدرهما global_attributes.
 */

export const createAttributeSchema = z.object({
  global_attribute_id: uuidSchema,
}).strict();

export const updateAttributeSchema = z.object({
  global_attribute_id: uuidSchema,
}).strict();

export const productAttributeParamsSchema = z.object({
  id: uuidSchema,

  attributeId: uuidSchema,
}).strict();

/* -------------------------------------------------------------------------- */
/*                              Attribute Values                             */
/* -------------------------------------------------------------------------- */

/**
 * Attribute value:
 * - value: اسم القيمة مثل Black أو Red.
 * - color_code: كود اللون عند الحاجة.
 *
 * لا يحتوي هذا الجدول على image_url.
 * الصور تُدار من خلال product_images،
 * ويمكن ربط صورة بالمتغير نفسه.
 */

export const createAttributeValueSchema = z.object({
  value: z.string().trim().min(1).max(150),

  color_code: z
    .string()
    .trim()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      "Invalid color code.",
    )
    .nullable()
    .optional(),
}).strict();

export const updateAttributeValueSchema = z.object({
  value: z.string().trim().min(1).max(150).optional(),

  color_code: z
    .string()
    .trim()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      "Invalid color code.",
    )
    .nullable()
    .optional(),
})
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one attribute value field must be provided.",
  );

export const productAttributeValueParamsSchema = z.object({
  id: uuidSchema,

  attributeId: uuidSchema,

  valueId: uuidSchema,
}).strict();
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

export type CreateAttributeValidation = z.infer<
  typeof createAttributeSchema
>;

export type UpdateAttributeValidation = z.infer<
  typeof updateAttributeSchema
>;

export type CreateAttributeValueValidation = z.infer<
  typeof createAttributeValueSchema
>;

export type UpdateAttributeValueValidation = z.infer<
  typeof updateAttributeValueSchema
>;
