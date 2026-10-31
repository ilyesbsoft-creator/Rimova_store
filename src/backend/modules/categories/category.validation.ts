
import { z } from "zod";

/**
 * Create category validation.
 *
 * Image is uploaded separately through multipart/form-data.
 * image_url and image_public_id are managed by the backend.
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(150),

  slug: z
    .string()
    .trim()
    .min(1)
    .max(180),

  description: z
    .string()
    .nullable()
    .optional(),

  is_active: z
    .boolean()
    .optional(),
});

/**
 * Update category validation.
 *
 * Only provided fields will be updated.
 */

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(150)
    .optional(),

  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .optional(),

  description: z
    .string()
    .nullable()
    .optional(),

  is_active: z
    .boolean()
    .optional(),
});

/**
 * Category ID validation.
 */
export const categoryIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Category slug validation.
 */
export const categorySlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180),
});

/**
 * Category status validation.
 */
export const categoryStatusSchema = z.object({
  is_active: z.boolean(),
});

/**
 * Category list query validation.
 */
export const categoryListQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .optional(),

  is_active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;

      return value === "true";
    }),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  sort_by: z
    .enum(["name", "created_at", "updated_at"])
    .default("created_at"),

  sort_order: z
    .enum(["asc", "desc"])
    .default("desc"),
});

export type CreateCategoryInput = z.infer<
  typeof createCategorySchema
>;

export type UpdateCategoryInput = z.infer<
  typeof updateCategorySchema
>;

export type CategoryListQuery = z.infer<
  typeof categoryListQuerySchema
>;
