
import { randomUUID } from "node:crypto";

import {
  createCategory,
  findCategoryById,
  findCategoryByIdForUpdate,
  findActiveCategoryBySlug,
  findActiveCategories,
  findActiveCategoriesPaginated,
  findCategoriesPaginated,
  categorySlugExists,
  updateCategory,
  setCategoryActiveStatus,
  deleteCategory,
  type Category,
  type CreateCategoryData,
  type UpdateCategoryData,
  type CategoryFilters,
} from "./category.repository";

import { withCategoryTransaction } from "./category.transaction.repository";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.validation";

import {
  uploadImage,
  deleteImage,
} from "../../services/cloudinary.service";

import type {
  UploadedImage,
} from "../../services/cloudinary.service";

export class CategoryServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CategoryServiceError";
  }
}

/**
 * Normalize category slug.
 */
function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/**
 * Upload category image to Cloudinary.
 */
async function uploadCategoryImage(
  image: Buffer,
): Promise<UploadedImage> {
  try {
    return await uploadImage(image, {
      folder: "categories",
      overwrite: false,
    });
  } catch {
    throw new CategoryServiceError(
      "CATEGORY_IMAGE_UPLOAD_FAILED",
      500,
    );
  }
}

/**
 * Delete image safely without masking the original error.
 */
async function cleanupUploadedImage(
  publicId: string | null | undefined,
): Promise<void> {
  if (!publicId) return;

  try {
    await deleteImage(publicId);
  } catch (error) {
    console.error(
      "Failed to cleanup Cloudinary image:",
      publicId,
      error,
    );
  }
}

/**
 * Delete old category image after successful database update.
 *
 * A cleanup failure must not invalidate an already committed
 * category update.
 */
async function deleteOldCategoryImage(
  publicId: string | null,
  newPublicId: string | null,
): Promise<void> {
  if (!publicId || publicId === newPublicId) {
    return;
  }

  await cleanupUploadedImage(publicId);
}

/**
 * Get active categories.
 * Public.
 */
export async function getActiveCategories(): Promise<Category[]> {
  return findActiveCategories();
}

/**
 * Get active categories with pagination.
 * Public.
 */
export async function getActiveCategoriesPaginated(
  filters: CategoryFilters,
) {
  return findActiveCategoriesPaginated(filters);
}

/**
 * Get all categories with filters and pagination.
 * Admin.
 */
export async function getCategoriesForAdmin(
  filters: CategoryFilters,
) {
  return findCategoriesPaginated(filters);
}

/**
 * Get active category by slug.
 * Public.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<Category> {
  const category = await findActiveCategoryBySlug(slug);

  if (!category) {
    throw new CategoryServiceError(
      "CATEGORY_NOT_FOUND",
      404,
    );
  }

  return category;
}

/**
 * Get category by ID.
 * Admin.
 */
export async function getCategoryById(
  id: string,
): Promise<Category> {
  const category = await findCategoryById(id);

  if (!category) {
    throw new CategoryServiceError(
      "CATEGORY_NOT_FOUND",
      404,
    );
  }

  return category;
}

/**
 * Create category.
 * Admin.
 */
export async function createNewCategory(
  input: CreateCategoryInput,
  image?: Buffer | null,
): Promise<Category> {
  const slug = normalizeSlug(input.slug);

  // Check slug before uploading the image.
  const exists = await categorySlugExists(slug);

  if (exists) {
    throw new CategoryServiceError(
      "CATEGORY_SLUG_ALREADY_EXISTS",
      409,
    );
  }

  // Upload image only when provided.
  const uploadedImage = image
    ? await uploadCategoryImage(image)
    : null;

  try {
    return await withCategoryTransaction(async (trx) => {
      // Recheck slug inside the transaction.
      // This protects against concurrent requests.
      const slugExists = await categorySlugExists(
        slug,
        undefined,
        trx,
      );

      if (slugExists) {
        throw new CategoryServiceError(
          "CATEGORY_SLUG_ALREADY_EXISTS",
          409,
        );
      }

      const data: CreateCategoryData = {
        id: randomUUID(),
        name: input.name.trim(),
        slug,
        description: input.description ?? null,
        image_url: uploadedImage?.url ?? null,
        image_public_id: uploadedImage?.publicId ?? null,
        is_active: input.is_active ?? true,
      };

      return createCategory(data, trx);
    });
  } catch (error) {
    // Database operation failed: remove the newly uploaded image.
    await cleanupUploadedImage(uploadedImage?.publicId);

    throw error;
  }
}

/**
 * Update category.
 * Admin.
 */

export async function updateExistingCategory(
  id: string,
  input: UpdateCategoryInput,
  image?: Buffer | null,
): Promise<Category> {
  const currentCategory = await findCategoryById(id);

  if (!currentCategory) {
    throw new CategoryServiceError(
      "CATEGORY_NOT_FOUND",
      404,
    );
  }

  const normalizedSlug =
    input.slug !== undefined
      ? normalizeSlug(input.slug)
      : undefined;

  if (normalizedSlug !== undefined) {
    const exists = await categorySlugExists(
      normalizedSlug,
      id,
    );

    if (exists) {
      throw new CategoryServiceError(
        "CATEGORY_SLUG_ALREADY_EXISTS",
        409,
      );
    }
  }

  const uploadedImage = image
    ? await uploadCategoryImage(image)
    : null;

  let oldImagePublicId: string | null = null;

  try {
    const updatedCategory = await withCategoryTransaction(
      async (trx) => {
        const existingCategory =
          await findCategoryByIdForUpdate(id, trx);

        if (!existingCategory) {
          throw new CategoryServiceError(
            "CATEGORY_NOT_FOUND",
            404,
          );
        }

        const data: UpdateCategoryData = {};

        if (input.name !== undefined) {
          data.name = input.name.trim();
        }

        if (normalizedSlug !== undefined) {
          const exists = await categorySlugExists(
            normalizedSlug,
            id,
            trx,
          );

          if (exists) {
            throw new CategoryServiceError(
              "CATEGORY_SLUG_ALREADY_EXISTS",
              409,
            );
          }

          data.slug = normalizedSlug;
        }

        if (input.description !== undefined) {
          data.description = input.description;
        }

        if (input.is_active !== undefined) {
          data.is_active = input.is_active;
        }

        if (uploadedImage) {
          data.image_url = uploadedImage.url;
          data.image_public_id = uploadedImage.publicId;

          oldImagePublicId =
            existingCategory.image_public_id;
        }

        const result = await updateCategory(
          id,
          data,
          trx,
        );

        if (!result) {
          throw new CategoryServiceError(
            "CATEGORY_UPDATE_FAILED",
            500,
          );
        }

        return result;
      },
    );

    // Database transaction committed successfully.
    if (uploadedImage) {
      await deleteOldCategoryImage(
        oldImagePublicId,
        uploadedImage.publicId,
      );
    }

    return updatedCategory;
  } catch (error) {
    await cleanupUploadedImage(uploadedImage?.publicId);
    throw error;
  }
}


/**
 * Activate / deactivate category.
 * Admin.
 */
export async function changeCategoryStatus(
  id: string,
  isActive: boolean,
): Promise<Category> {
  return withCategoryTransaction(async (trx) => {
    const existingCategory = await findCategoryByIdForUpdate(
      id,
      trx,
    );

    if (!existingCategory) {
      throw new CategoryServiceError(
        "CATEGORY_NOT_FOUND",
        404,
      );
    }

    if (Boolean(existingCategory.is_active) === isActive) {
      return existingCategory;
    }

    const updatedCategory = await setCategoryActiveStatus(
      id,
      isActive,
      trx,
    );

    if (!updatedCategory) {
      throw new CategoryServiceError(
        "CATEGORY_STATUS_UPDATE_FAILED",
        500,
      );
    }

    return updatedCategory;
  });
}

/**
 * Permanently delete category.
 * Admin.
 */
export async function permanentlyDeleteCategory(
  id: string,
): Promise<void> {
  const deletedCategory = await withCategoryTransaction(
    async (trx) => {
      const existingCategory =
        await findCategoryByIdForUpdate(id, trx);

      if (!existingCategory) {
        throw new CategoryServiceError(
          "CATEGORY_NOT_FOUND",
          404,
        );
      }

      const deleted = await deleteCategory(id, trx);

      if (!deleted) {
        throw new CategoryServiceError(
          "CATEGORY_DELETE_FAILED",
          500,
        );
      }

      return existingCategory;
    },
  );

  // Delete image only after successful database deletion.
  await cleanupUploadedImage(
    deletedCategory.image_public_id,
  );
}
