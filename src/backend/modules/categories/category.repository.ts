
import type { Knex } from "knex";
import db from "../../database/knex";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  image_public_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  image_public_id?: string | null;
  is_active?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  image_public_id?: string | null;
  is_active?: boolean;
}

export interface CategoryFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: "name" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
}

export interface PaginatedCategories {
  data: Category[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

type DatabaseConnection = Knex | Knex.Transaction;

const TABLE = "categories";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Create a category.
 */
export async function createCategory(
  data: CreateCategoryData,
  connection: DatabaseConnection = db,
): Promise<Category> {
  await connection(TABLE).insert(data);

  const category = await findCategoryById(
    data.id,
    connection,
  );

  if (!category) {
    throw new Error("CATEGORY_CREATE_FAILED");
  }

  return category;
}

/**
 * Find category by ID.
 */
export async function findCategoryById(
  id: string,
  connection: DatabaseConnection = db,
): Promise<Category | null> {
  const category = await connection<Category>(TABLE)
    .where({ id })
    .first();

  return category ?? null;
}

/**
 * Find category by slug.
 */
export async function findCategoryBySlug(
  slug: string,
  connection: DatabaseConnection = db,
): Promise<Category | null> {
  const category = await connection<Category>(TABLE)
    .where({ slug })
    .first();

  return category ?? null;
}

/**
 * Find active category by slug.
 * Intended for public users.
 */
export async function findActiveCategoryBySlug(
  slug: string,
  connection: DatabaseConnection = db,
): Promise<Category | null> {
  const category = await connection<Category>(TABLE)
    .where({
      slug,
      is_active: true,
    })
    .first();

  return category ?? null;
}

/**
 * Find category by ID with row lock.
 * Must be used inside a transaction.
 */
export async function findCategoryByIdForUpdate(
  id: string,
  trx: Knex.Transaction,
): Promise<Category | null> {
  const category = await trx<Category>(TABLE)
    .where({ id })
    .forUpdate()
    .first();

  return category ?? null;
}

/**
 * Check whether a slug already exists.
 *
 * excludeId is useful when updating a category
 * without changing its own slug.
 */
export async function categorySlugExists(
  slug: string,
  excludeId?: string,
  connection: DatabaseConnection = db,
): Promise<boolean> {
  const query = connection(TABLE).where({ slug });

  if (excludeId) {
    query.whereNot("id", excludeId);
  }

  const category = await query.first("id");

  return Boolean(category);
}

/**
 * Get all active categories.
 * Intended for public users.
 */
export async function findActiveCategories(
  connection: DatabaseConnection = db,
): Promise<Category[]> {
  return connection<Category>(TABLE)
    .where({ is_active: true })
    .orderBy("name", "asc");
}

/**
 * Get all active categories with pagination.
 * Intended for public users.
 */
export async function findActiveCategoriesPaginated(
  filters: CategoryFilters = {},
  connection: DatabaseConnection = db,
): Promise<PaginatedCategories> {
  return findCategoriesPaginated(
    {
      ...filters,
      is_active: true,
    },
    connection,
  );
}

/**
 * Get categories with filters and pagination.
 * Intended for administration.
 */
export async function findCategoriesPaginated(
  filters: CategoryFilters = {},
  connection: DatabaseConnection = db,
): Promise<PaginatedCategories> {
  const page = Math.max(
    1,
    Math.floor(filters.page ?? 1),
  );

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(filters.limit ?? DEFAULT_LIMIT),
    ),
  );

  const offset = (page - 1) * limit;

  const sortBy = filters.sort_by ?? "created_at";
  const sortOrder = filters.sort_order ?? "desc";

  const allowedSortColumns = [
    "name",
    "created_at",
    "updated_at",
  ] as const;

  const safeSortBy = allowedSortColumns.includes(sortBy)
    ? sortBy
    : "created_at";

  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const buildQuery = () => {
    const query = connection<Category>(TABLE);

    if (typeof filters.is_active === "boolean") {
      query.where("is_active", filters.is_active);
    }

    if (filters.search?.trim()) {
      const search = `%${filters.search.trim()}%`;

      query.where((builder) => {
        builder
          .where("name", "like", search)
          .orWhere("slug", "like", search);
      });
    }

    return query;
  };

  const [data, countResult] = await Promise.all([
    buildQuery()
      .select("*")
      .orderBy(safeSortBy, safeSortOrder)
      .limit(limit)
      .offset(offset),

    buildQuery().count({ total: "id" }).first(),
  ]);

  const total = Number(countResult?.total ?? 0);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update category.
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryData,
  connection: DatabaseConnection = db,
): Promise<Category | null> {
  const affectedRows = await connection(TABLE)
    .where({ id })
    .update(data);

  if (!affectedRows) {
    return null;
  }

  return findCategoryById(id, connection);
}

/**
 * Activate / deactivate category.
 */
export async function setCategoryActiveStatus(
  id: string,
  isActive: boolean,
  connection: DatabaseConnection = db,
): Promise<Category | null> {
  return updateCategory(
    id,
    { is_active: isActive },
    connection,
  );
}

/**
 * Permanently delete category.
 * Use only when permanent deletion is explicitly required.
 */
export async function deleteCategory(
  id: string,
  connection: DatabaseConnection = db,
): Promise<boolean> {
  const affectedRows = await connection(TABLE)
    .where({ id })
    .delete();

  return affectedRows > 0;
}
