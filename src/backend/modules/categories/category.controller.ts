
import type { NextRequest } from "next/server";

import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  categorySlugSchema,
  categoryStatusSchema,
  categoryListQuerySchema,
} from "./category.validation";

import {
  getActiveCategories,
  getActiveCategoriesPaginated,
  getCategoriesForAdmin,
  getCategoryBySlug,
  getCategoryById,
  createNewCategory,
  updateExistingCategory,
  changeCategoryStatus,
  permanentlyDeleteCategory,
  CategoryServiceError,
} from "./category.service";

import {
  successResponse,
  errorResponse,
  getErrorResponse,
} from "../../utils/http";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * Parsed category form data.
 */
interface ParsedCategoryFormData {
  fields: Record<string, unknown>;
  image: Buffer | null;
}

/**
 * Extract category fields and image from FormData.
 */
async function parseCategoryFormData(
  request: NextRequest,
): Promise<ParsedCategoryFormData> {
  const formData = await request.formData();

  const fields: Record<string, unknown> = {};

  const name = formData.get("name");
  const slug = formData.get("slug");
  const description = formData.get("description");
  const isActive = formData.get("is_active");

  if (name !== null) {
    fields.name = name;
  }

  if (slug !== null) {
    fields.slug = slug;
  }

  if (description !== null) {
    fields.description =
      description === "" ? null : description;
  }

  if (isActive !== null) {
    if (isActive !== "true" && isActive !== "false") {
      throw new CategoryServiceError(
        "INVALID_CATEGORY_STATUS",
        400,
      );
    }

    fields.is_active = isActive === "true";
  }

  const imageFile = formData.get("image");

  let image: Buffer | null = null;

  if (imageFile !== null) {
    if (!(imageFile instanceof File)) {
      throw new CategoryServiceError(
        "INVALID_CATEGORY_IMAGE",
        400,
      );
    }

    if (imageFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        throw new CategoryServiceError(
          "UNSUPPORTED_CATEGORY_IMAGE_TYPE",
          400,
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
        throw new CategoryServiceError(
          "CATEGORY_IMAGE_TOO_LARGE",
          400,
        );
      }

      image = Buffer.from(
        await imageFile.arrayBuffer(),
      );
    }
  }

  return {
    fields,
    image,
  };
}

/**
 * Handle category service and validation errors.
 */
function handleCategoryError(error: unknown): Response {
  if (error instanceof CategoryServiceError) {
    return errorResponse(
      error.message,
      error.statusCode,
    );
  }

  return getErrorResponse(error);
}

/**
 * GET /api/categories
 *
 * Get active categories.
 * Public.
 */
export async function getPublicCategories(
  request: NextRequest,
): Promise<Response> {
  try {
    const query = categoryListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!query.success) {
      return errorResponse(
        "INVALID_QUERY_PARAMETERS",
        400,
      );
    }

    const filters = query.data;

    const result =
      filters.page === 1 &&
      !request.nextUrl.searchParams.has("page") &&
      !request.nextUrl.searchParams.has("limit") &&
      !filters.search
        ? await getActiveCategories()
        : await getActiveCategoriesPaginated(filters);

    return successResponse({
      code: "CATEGORIES_FETCHED",
      message: "Categories fetched successfully.",
      data: result,
    });
  } catch (error) {
    return handleCategoryError(error);
  }
}

/**
 * GET /api/categories/[slug]
 *
 * Get active category by slug.
 * Public.
 */
export async function getPublicCategoryBySlug(
  slug: string,
): Promise<Response> {
  try {
    const validation = categorySlugSchema.safeParse({
      slug,
    });

    if (!validation.success) {
      return errorResponse(
        "INVALID_CATEGORY_SLUG",
        400,
      );
    }

    const category = await getCategoryBySlug(
      validation.data.slug,
    );

    return successResponse({
      code: "CATEGORY_FETCHED",
      message: "Category fetched successfully.",
      data: category,
    });
  } catch (error) {
    return handleCategoryError(error);
  }
}

/**
 * GET /api/admin/categories
 *
 * Get all categories with filters and pagination.
 * Admin.
 */
export async function getAdminCategories(
  request: NextRequest,
): Promise<Response> {
  try {
    const query = categoryListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!query.success) {
      return errorResponse(
        "INVALID_QUERY_PARAMETERS",
        400,
      );
    }

    const categories = await getCategoriesForAdmin(
      query.data,
    );

    return successResponse({
      code: "ADMIN_CATEGORIES_FETCHED",
      message: "Categories fetched successfully.",
      data: categories,
    });
  } catch (error) {
    return handleCategoryError(error);
  }
}

/**
 * GET /api/admin/categories/[id]
 *
 * Get category by ID.
 * Admin.
 */
export async function getAdminCategoryById(
  id: string,
): Promise<Response> {
  try {
    const validation = categoryIdSchema.safeParse({
      id,
    });

    if (!validation.success) {
      return errorResponse(
        "INVALID_CATEGORY_ID",
        400,
      );
    }

    const category = await getCategoryById(
      validation.data.id,
    );

    return successResponse({
      code: "ADMIN_CATEGORY_FETCHED",
      message: "Category fetched successfully.",
      data: category,
    });
  } catch (error) {
    return handleCategoryError(error);
  }
}

/**
 * POST /api/admin/categories
 *
 * Create category.
 * Admin.
 *
 * Content-Type: multipart/form-data
 */
export async function createAdminCategory(
  request: NextRequest,
): Promise<Response> {
  try {
    const { fields, image } =
      await parseCategoryFormData(request);

    const validation = createCategorySchema.safeParse(
      fields,
    );

    if (!validation.success) {
      return errorResponse(
        "INVALID_CATEGORY_DATA",
        400,
      );
    }

    const category = await createNewCategory(
      validation.data,
      image,
    );

    return successResponse(
      {
        code: "CATEGORY_CREATED",
        message: "Category created successfully.",
        data: category,
      },
      201,
    );
  } catch (error) {
    return handleCategoryError(error);
  }
}

/**
 * PATCH /api/admin/categories/[id]
 *
 * Update category.
 * Admin.
 *
 * Content-Type: multipart/form-data
 */
export async function updateAdminCategory(
  request: NextRequest,
  id: string,
): Promise<Response> {
  try {
    const idValidation = categoryIdSchema.safeParse({
      id,
    });

    if (!idValidation.success) {
      return errorResponse(
        "INVALID_CATEGORY_ID",
        400,
      );
    }

    const { fields, image } =
      await parseCategoryFormData(request);

    const validation = updateCategorySchema.safeParse(
      fields,
    );

    if (!validation.success) {
      return errorResponse(
        "INVALID_CATEGORY_DATA",
        400,
      );
    }

    if (
      Object.keys(validation.data).length === 0 &&
      !image
    ) {
      return errorResponse(
        "CATEGORY_UPDATE_DATA_REQUIRED",
        400,
      );
    }

    const category = await updateExistingCategory(
      idValidation.data.id,
      validation.data,
      image,
    );

    return successResponse({
      code: "CATEGORY_UPDATED",
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    return handleCategoryError(error);
  }
}

/**
 * PATCH /api/admin/categories/[id]/status
 *
 * Activate / deactivate category.
 * Admin.
 *
 * Content-Type: application/json
 */
export async function updateAdminCategoryStatus(
  request: NextRequest,
  id: string,
): Promise<Response> {
  try {
    const idValidation = categoryIdSchema.safeParse({
      id,
    });

    if (!idValidation.success) {
      return errorResponse(
        "INVALID_CATEGORY_ID",
        400,
      );
    }

    const body = await request.json();

    const validation = categoryStatusSchema.safeParse(
      body,
    );

    if (!validation.success) {
      return errorResponse(
        "INVALID_CATEGORY_STATUS",
        400,
      );
    }

    const category = await changeCategoryStatus(
      idValidation.data.id,
      validation.data.is_active,
    );

    return successResponse({
      code: validation.data.is_active
        ? "CATEGORY_ACTIVATED"
        : "CATEGORY_DEACTIVATED",
      message: validation.data.is_active
        ? "Category activated successfully."
        : "Category deactivated successfully.",
      data: category,
    });
  } catch (error) {
    return handleCategoryError(error);
  }
}

/**
 * DELETE /api/admin/categories/[id]
 *
 * Permanently delete category.
 * Admin.
 */
export async function deleteAdminCategory(
  id: string,
): Promise<Response> {
  try {
    const validation = categoryIdSchema.safeParse({
      id,
    });

    if (!validation.success) {
      return errorResponse(
        "INVALID_CATEGORY_ID",
        400,
      );
    }

    await permanentlyDeleteCategory(
      validation.data.id,
    );

    return successResponse({
      code: "CATEGORY_DELETED",
      message: "Category deleted successfully.",
      data: null,
    });
  } catch (error) {
    return handleCategoryError(error);
  }
}
