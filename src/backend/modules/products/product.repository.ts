
import db from "../../database/knex";
import type { Knex } from "knex";

type DatabaseConnection = Knex | Knex.Transaction;

/* =========================================================
   BASIC TYPES
========================================================= */

export type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string | number;
  stock_quantity: number;
  sku: string | null;
  is_active: boolean | number;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  price: string | number | null;
  stock_quantity: number;
  image_url: string | null;
};

export type VariantAttributeRow = {
  variant_id: string;
  attribute_id: string;
  attribute_name: string;
  attribute_type: string;
  attribute_value_id: string;
  attribute_value: string;
  color_code: string | null;
};

export type ProductAttributeOptionRow = {
  attribute_id: string;
  attribute_name: string;
  attribute_type: string;
  attribute_value_id: string;
  attribute_value: string;
  color_code: string | null;
};

/* =========================================================
   ADMIN TYPES
========================================================= */

export type AdminProductRow = ProductRow & {
  category_name: string;
  primary_image_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type AdminProductVariantRow = ProductVariantRow & {
  is_active: boolean | number;
  created_at: Date;
  updated_at: Date;
};

export type AdminProductAttributeRow = {
  id: string;
  product_id: string;
  global_attribute_id: string;
  name: string;
  type: string;
  created_at: Date;
};

export type AdminProductAttributeValueRow = {
  id: string;
  product_attribute_id: string;
  value: string;
  color_code: string | null;
};

export type CreateProductData = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  stock_quantity?: number;
  sku?: string | null;
  is_active?: boolean;
};

export type UpdateProductData = {
  category_id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number | string;
  stock_quantity?: number;
  sku?: string | null;
  is_active?: boolean;
};

export interface ProductFilters {
  search?: string;
  category_id?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?:
    | "name"
    | "price"
    | "stock_quantity"
    | "created_at"
    | "updated_at";
  sort_order?: "asc" | "desc";
}

export interface PaginatedProducts {
  data: AdminProductRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export type CreateProductVariantData = {
  id: string;
  product_id: string;
  sku?: string | null;
  price?: number | string | null;
  stock_quantity?: number;
  image_url?: string | null;
  is_active?: boolean;
};

export type UpdateProductVariantData = {
  sku?: string | null;
  price?: number | string | null;
  stock_quantity?: number;
  image_url?: string | null;
  is_active?: boolean;
};

export type CreateProductAttributeData = {
  id: string;
  product_id: string;
  global_attribute_id: string;
};

export type UpdateProductAttributeData = {
  global_attribute_id: string;
};

export type CreateProductAttributeValueData = {
  id: string;
  product_attribute_id: string;
  value: string;
  color_code?: string | null;
};

export type UpdateProductAttributeValueData = {
  value?: string;
  color_code?: string | null;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  image_public_id: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean | number;
  created_at: Date;
};

export type CreateProductImageData = {
  id: string;
  product_id: string;
  image_url: string;
  image_public_id?: string | null;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
};

export type UpdateProductImageData = {
  image_url?: string;
  image_public_id?: string | null;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
};

/* =========================================================
   EXISTING PUBLIC FUNCTIONS
========================================================= */

/**
 * جلب المنتج النشط حسب المعرّف.
 */
export async function findActiveProductById(
  id: string,
  connection: DatabaseConnection = db
): Promise<ProductRow | undefined> {
  return connection<ProductRow>("products")
    .select(
      "id",
      "category_id",
      "name",
      "slug",
      "description",
      "price",
      "stock_quantity",
      "sku",
      "is_active"
    )
    .where("id", id)
    .where("is_active", true)
    .first();
}

/**
 * جلب المتغيرات النشطة للمنتج.
 */
export async function findActiveProductVariants(
  productId: string,
  connection: DatabaseConnection = db
): Promise<ProductVariantRow[]> {
  return connection<ProductVariantRow>("product_variants")
    .select(
      "id",
      "product_id",
      "sku",
      "price",
      "stock_quantity",
      "image_url"
    )
    .where("product_id", productId)
    .where("is_active", true)
    .orderBy("created_at", "asc");
}

/**
 * جلب خصائص وقيم المتغيرات المحددة.
 *
 * اسم الخاصية ونوعها يأتيان من global_attributes.
 */
export async function findVariantAttributes(
  variantIds: string[],
  connection: DatabaseConnection = db
): Promise<VariantAttributeRow[]> {
  if (variantIds.length === 0) {
    return [];
  }

  return connection("product_variant_attribute_values as pvav")
    .join(
      "product_attribute_values as pav",
      "pav.id",
      "pvav.attribute_value_id"
    )
    .join(
      "product_attributes as pa",
      "pa.id",
      "pav.product_attribute_id"
    )
    .join(
      "global_attributes as ga",
      "ga.id",
      "pa.global_attribute_id"
    )
    .select(
      "pvav.variant_id",
      "pa.id as attribute_id",
      "ga.name as attribute_name",
      "ga.type as attribute_type",
      "pav.id as attribute_value_id",
      "pav.value as attribute_value",
      "pav.color_code"
    )
    .whereIn("pvav.variant_id", variantIds)
    .orderBy("ga.name", "asc");
}

/**
 * جلب جميع خصائص المنتج وقيمها المسجلة.
 */
export async function findProductAttributeOptions(
  productId: string,
  connection: DatabaseConnection = db
): Promise<ProductAttributeOptionRow[]> {
  return connection("product_attributes as pa")
    .join(
      "global_attributes as ga",
      "ga.id",
      "pa.global_attribute_id"
    )
    .join(
      "product_attribute_values as pav",
      "pav.product_attribute_id",
      "pa.id"
    )
    .select(
      "pa.id as attribute_id",
      "ga.name as attribute_name",
      "ga.type as attribute_type",
      "pav.id as attribute_value_id",
      "pav.value as attribute_value",
      "pav.color_code"
    )
    .where("pa.product_id", productId)
    .orderBy("pa.created_at", "asc")
    .orderBy("pav.value", "asc");
}

/* =========================================================
   PRODUCT ADMIN FUNCTIONS
========================================================= */

/**
 * جلب منتج حسب المعرّف دون اشتراط أن يكون نشطًا.
 */
export async function findProductById(
  id: string,
  connection: DatabaseConnection = db
): Promise<ProductRow | undefined> {
  return connection<ProductRow>("products")
    .select(
      "id",
      "category_id",
      "name",
      "slug",
      "description",
      "price",
      "stock_quantity",
      "sku",
      "is_active"
    )
    .where("id", id)
    .first();
}

/**
 * إنشاء منتج.
 */
export async function createProduct(
  data: CreateProductData,
  connection: DatabaseConnection = db
): Promise<ProductRow> {
  await connection("products").insert(data);

  const product = await findProductById(data.id, connection);

  if (!product) {
    throw new Error("PRODUCT_CREATE_FAILED");
  }

  return product;
}

/**
 * جلب المنتجات مع البحث والتصفية والترقيم.
 *
 * الصورة الرئيسية تؤخذ من أول Variant لديه صورة.
 */
export async function findProductsPaginated(
  filters: ProductFilters = {},
  connection: DatabaseConnection = db
): Promise<PaginatedProducts> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  const limit = Math.min(
    100,
    Math.max(1, Math.floor(filters.limit ?? 20))
  );

  const offset = (page - 1) * limit;

  const sortBy = filters.sort_by ?? "created_at";
  const sortOrder = filters.sort_order ?? "desc";

  const allowedSortColumns = [
    "name",
    "price",
    "stock_quantity",
    "created_at",
    "updated_at",
  ] as const;

  const safeSortBy = allowedSortColumns.includes(sortBy)
    ? sortBy
    : "created_at";

  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const buildQuery = () => {
    const query = connection("products as p").leftJoin(
      "categories as c",
      "c.id",
      "p.category_id"
    );

    if (typeof filters.is_active === "boolean") {
      query.where("p.is_active", filters.is_active);
    }

    if (filters.category_id) {
      query.where("p.category_id", filters.category_id);
    }

    if (filters.search?.trim()) {
      const search = `%${filters.search.trim()}%`;

      query.where((builder) => {
        builder
          .where("p.name", "like", search)
          .orWhere("p.slug", "like", search)
          .orWhere("p.sku", "like", search);
      });
    }

    return query;
  };

  const primaryImageQuery = connection("product_variants as pv")
    .select("pv.image_url")
    .whereRaw("pv.product_id = p.id")
    .whereNotNull("pv.image_url")
    .where("pv.image_url", "!=", "")
    .orderBy("pv.created_at", "asc")
    .limit(1);

  const [data, countResult] = await Promise.all([
    buildQuery()
      .select(
        "p.id",
        "p.category_id",
        "p.name",
        "p.slug",
        "p.description",
        "p.price",
        "p.stock_quantity",
        "p.sku",
        "p.is_active",
        "p.created_at",
        "p.updated_at",
        "c.name as category_name"
      )
      .select({
        primary_image_url: primaryImageQuery,
      })
      .orderBy(`p.${safeSortBy}`, safeSortOrder)
      .limit(limit)
      .offset(offset),

    buildQuery().count({ total: "p.id" }).first(),
  ]);

  const total = Number(countResult?.total ?? 0);

  return {
    data: data as AdminProductRow[],
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
}

/**
 * تعديل بيانات المنتج.
 */
export async function updateProduct(
  id: string,
  data: UpdateProductData,
  connection: DatabaseConnection = db
): Promise<ProductRow | null> {
  const affectedRows = await connection("products")
    .where({ id })
    .update(data);

  if (!affectedRows) {
    return null;
  }

  return (await findProductById(id, connection)) ?? null;
}

/**
 * تفعيل أو إيقاف المنتج.
 */
export async function setProductActiveStatus(
  id: string,
  isActive: boolean,
  connection: DatabaseConnection = db
): Promise<ProductRow | null> {
  return updateProduct(id, { is_active: isActive }, connection);
}

/**
 * حذف المنتج نهائيًا.
 * الجداول التابعة تحذف وفق ON DELETE CASCADE.
 */
export async function deleteProduct(
  id: string,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("products")
    .where({ id })
    .delete();

  return affectedRows > 0;
}

/* =========================================================
   PRODUCT IMAGES ADMIN FUNCTIONS
========================================================= */

/**
 * جلب صور المنتج.
 */
export async function findProductImages(
  productId: string,
  connection: DatabaseConnection = db
): Promise<ProductImageRow[]> {
  return connection<ProductImageRow>("product_images")
    .select(
      "id",
      "product_id",
      "image_url",
      "image_public_id",
      "alt_text",
      "sort_order",
      "is_primary",
      "created_at"
    )
    .where("product_id", productId)
    .orderBy("sort_order", "asc")
    .orderBy("created_at", "asc");
}

/**
 * جلب صور المنتج للإدارة.
 */
export async function findProductImagesForAdmin(
  productId: string,
  connection: DatabaseConnection = db
): Promise<ProductImageRow[]> {
  return findProductImages(productId, connection);
}

/**
 * جلب صورة حسب المعرّف.
 */
export async function findProductImageById(
  id: string,
  connection: DatabaseConnection = db
): Promise<ProductImageRow | undefined> {
  return connection<ProductImageRow>("product_images")
    .select("*")
    .where({ id })
    .first();
}

/**
 * إنشاء صورة للمنتج.
 */
export async function createProductImage(
  data: CreateProductImageData,
  connection: DatabaseConnection = db
): Promise<ProductImageRow | undefined> {
  await connection("product_images").insert(data);

  return findProductImageById(data.id, connection);
}

/**
 * تعديل بيانات الصورة مع التأكد من أنها تابعة للمنتج المحدد.
 */
export async function updateProductImage(
  id: string,
  productId: string,
  data: UpdateProductImageData,
  connection: DatabaseConnection = db
): Promise<ProductImageRow | null> {
  const affectedRows = await connection("product_images")
    .where({
      id,
      product_id: productId,
    })
    .update(data);

  if (!affectedRows) {
    return null;
  }

  return (
    (await connection("product_images")
      .where({
        id,
        product_id: productId,
      })
      .first()) ?? null
  );
}

/**
 * حذف صورة مع التأكد من أنها تابعة للمنتج المحدد.
 */
export async function deleteProductImage(
  id: string,
  productId: string,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("product_images")
    .where({
      id,
      product_id: productId,
    })
    .delete();

  return affectedRows > 0;
}

/**
 * تعيين صورة رئيسية للمنتج.
 *
 * يجب تنفيذها داخل Transaction.
 */
export async function setProductPrimaryImage(
  productId: string,
  imageId: string,
  trx: Knex.Transaction
): Promise<boolean> {
  const image = await trx("product_images")
    .select("id")
    .where({
      id: imageId,
      product_id: productId,
    })
    .first();

  if (!image) {
    return false;
  }

  await trx("product_images")
    .where({ product_id: productId })
    .update({ is_primary: false });

  await trx("product_images")
    .where({
      id: imageId,
      product_id: productId,
    })
    .update({ is_primary: true });

  return true;
}
/* =========================================================
   PRODUCT VARIANTS ADMIN FUNCTIONS
========================================================= */

/**
 * جلب جميع متغيرات المنتج، النشطة وغير النشطة.
 */
export async function findProductVariantsForAdmin(
  productId: string,
  connection: DatabaseConnection = db
): Promise<AdminProductVariantRow[]> {
  return connection<AdminProductVariantRow>("product_variants")
    .select(
      "id",
      "product_id",
      "sku",
      "price",
      "stock_quantity",
      "image_url",
      "is_active",
      "created_at",
      "updated_at"
    )
    .where("product_id", productId)
    .orderBy("created_at", "asc");
}

/**
 * جلب متغير حسب المعرّف.
 */
export async function findProductVariantById(
  id: string,
  connection: DatabaseConnection = db
): Promise<AdminProductVariantRow | undefined> {
  return connection<AdminProductVariantRow>("product_variants")
    .select(
      "id",
      "product_id",
      "sku",
      "price",
      "stock_quantity",
      "image_url",
      "is_active",
      "created_at",
      "updated_at"
    )
    .where({ id })
    .first();
}

/**
 * إنشاء متغير للمنتج.
 */
export async function createProductVariant(
  data: CreateProductVariantData,
  connection: DatabaseConnection = db
): Promise<AdminProductVariantRow | undefined> {
  await connection("product_variants").insert(data);

  return findProductVariantById(data.id, connection);
}

/**
 * تعديل متغير.
 */
export async function updateProductVariant(
  id: string,
  data: UpdateProductVariantData,
  connection: DatabaseConnection = db
): Promise<AdminProductVariantRow | null> {
  const affectedRows = await connection("product_variants")
    .where({ id })
    .update(data);

  if (!affectedRows) {
    return null;
  }

  return (await findProductVariantById(id, connection)) ?? null;
}

/**
 * تفعيل أو إيقاف متغير.
 */
export async function setProductVariantActiveStatus(
  id: string,
  isActive: boolean,
  connection: DatabaseConnection = db
): Promise<AdminProductVariantRow | null> {
  return updateProductVariant(id, { is_active: isActive }, connection);
}

/**
 * حذف متغير.
 * روابط الخصائص التابعة تحذف تلقائيًا.
 */
export async function deleteProductVariant(
  id: string,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("product_variants")
    .where({ id })
    .delete();

  return affectedRows > 0;
}

/* =========================================================
   PRODUCT ATTRIBUTES ADMIN FUNCTIONS
========================================================= */

/**
 * جلب جميع خصائص المنتج مع الاسم والنوع من global_attributes.
 */
export async function findProductAttributes(
  productId: string,
  connection: DatabaseConnection = db
): Promise<AdminProductAttributeRow[]> {
  return connection("product_attributes as pa")
    .join(
      "global_attributes as ga",
      "ga.id",
      "pa.global_attribute_id"
    )
    .select(
      "pa.id",
      "pa.product_id",
      "pa.global_attribute_id",
      "ga.name",
      "ga.type",
      "pa.created_at"
    )
    .where("pa.product_id", productId)
    .orderBy("pa.created_at", "asc");
}

/**
 * جلب خاصية منتج حسب المعرّف.
 */
export async function findProductAttributeById(
  id: string,
  connection: DatabaseConnection = db
): Promise<AdminProductAttributeRow | undefined> {
  return connection("product_attributes as pa")
    .join(
      "global_attributes as ga",
      "ga.id",
      "pa.global_attribute_id"
    )
    .select(
      "pa.id",
      "pa.product_id",
      "pa.global_attribute_id",
      "ga.name",
      "ga.type",
      "pa.created_at"
    )
    .where("pa.id", id)
    .first();
}

/**
 * إضافة خاصية عامة إلى منتج.
 */
export async function createProductAttribute(
  data: CreateProductAttributeData,
  connection: DatabaseConnection = db
): Promise<AdminProductAttributeRow | undefined> {
  await connection("product_attributes").insert(data);

  return findProductAttributeById(data.id, connection);
}

/**
 * تغيير الخاصية العامة المرتبطة بالمنتج.
 */
export async function updateProductAttribute(
  id: string,
  data: UpdateProductAttributeData,
  connection: DatabaseConnection = db
): Promise<AdminProductAttributeRow | null> {
  const affectedRows = await connection("product_attributes")
    .where({ id })
    .update(data);

  if (!affectedRows) {
    return null;
  }

  return (await findProductAttributeById(id, connection)) ?? null;
}

/**
 * حذف خاصية من المنتج.
 * قيم الخاصية وروابطها تحذف وفق قيود Foreign Key.
 */
export async function deleteProductAttribute(
  id: string,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("product_attributes")
    .where({ id })
    .delete();

  return affectedRows > 0;
}

/* =========================================================
   PRODUCT ATTRIBUTE VALUES ADMIN FUNCTIONS
========================================================= */

/**
 * جلب جميع قيم خاصية منتج محددة.
 */
export async function findProductAttributeValues(
  attributeId: string,
  connection: DatabaseConnection = db
): Promise<AdminProductAttributeValueRow[]> {
  return connection<AdminProductAttributeValueRow>(
    "product_attribute_values"
  )
    .select(
      "id",
      "product_attribute_id",
      "value",
      "color_code"
    )
    .where("product_attribute_id", attributeId)
    .orderBy("value", "asc");
}

/**
 * جلب قيمة خاصية حسب المعرّف.
 */
export async function findProductAttributeValueById(
  id: string,
  connection: DatabaseConnection = db
): Promise<AdminProductAttributeValueRow | undefined> {
  return connection<AdminProductAttributeValueRow>(
    "product_attribute_values"
  )
    .select(
      "id",
      "product_attribute_id",
      "value",
      "color_code"
    )
    .where({ id })
    .first();
}

/**
 * إضافة قيمة لخاصية منتج.
 */
export async function createProductAttributeValue(
  data: CreateProductAttributeValueData,
  connection: DatabaseConnection = db
): Promise<AdminProductAttributeValueRow | undefined> {
  await connection("product_attribute_values").insert(data);

  return findProductAttributeValueById(data.id, connection);
}

/**
 * تعديل قيمة خاصية.
 */
export async function updateProductAttributeValue(
  id: string,
  data: UpdateProductAttributeValueData,
  connection: DatabaseConnection = db
): Promise<AdminProductAttributeValueRow | null> {
  const affectedRows = await connection(
    "product_attribute_values"
  )
    .where({ id })
    .update(data);

  if (!affectedRows) {
    return null;
  }

  return (
    (await findProductAttributeValueById(id, connection)) ?? null
  );
}

/**
 * حذف قيمة خاصية.
 * إذا كانت القيمة مرتبطة بمتغير، فسيتم حذف روابطها تلقائيًا.
 */
export async function deleteProductAttributeValue(
  id: string,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection(
    "product_attribute_values"
  )
    .where({ id })
    .delete();

  return affectedRows > 0;
}

/* =========================================================
   VARIANT ATTRIBUTE VALUES ADMIN FUNCTIONS
========================================================= */

/**
 * ربط قيمة خاصية بمتغير.
 */
export async function attachAttributeValueToVariant(
  variantId: string,
  attributeValueId: string,
  connection: DatabaseConnection = db
): Promise<void> {
  await connection("product_variant_attribute_values").insert({
    variant_id: variantId,
    attribute_value_id: attributeValueId,
  });
}

/**
 * ربط عدة قيم خصائص بمتغير.
 */
export async function attachAttributeValuesToVariant(
  variantId: string,
  attributeValueIds: string[],
  connection: DatabaseConnection = db
): Promise<void> {
  if (attributeValueIds.length === 0) {
    return;
  }

  await connection("product_variant_attribute_values").insert(
    attributeValueIds.map((attributeValueId) => ({
      variant_id: variantId,
      attribute_value_id: attributeValueId,
    }))
  );
}

/**
 * إزالة قيمة خاصية من متغير.
 */
export async function detachAttributeValueFromVariant(
  variantId: string,
  attributeValueId: string,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection(
    "product_variant_attribute_values"
  )
    .where({
      variant_id: variantId,
      attribute_value_id: attributeValueId,
    })
    .delete();

  return affectedRows > 0;
}

/**
 * إزالة جميع قيم الخصائص المرتبطة بمتغير.
 */
export async function detachAllAttributeValuesFromVariant(
  variantId: string,
  connection: DatabaseConnection = db
): Promise<number> {
  return connection("product_variant_attribute_values")
    .where({ variant_id: variantId })
    .delete();
}

/**
 * استبدال جميع قيم الخصائص لمتغير.
 *
 * يفضل تنفيذ هذه العملية داخل Transaction.
 */
export async function replaceVariantAttributeValues(
  variantId: string,
  attributeValueIds: string[],
  connection: DatabaseConnection = db
): Promise<void> {
  await detachAllAttributeValuesFromVariant(variantId, connection);

  await attachAttributeValuesToVariant(
    variantId,
    attributeValueIds,
    connection
  );
}

/* =========================================================
   INVENTORY ADMIN FUNCTIONS
========================================================= */

/**
 * تحديث مخزون المنتج مباشرة.
 */
export async function updateProductStockQuantity(
  productId: string,
  quantity: number,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("products")
    .where({ id: productId })
    .update({
      stock_quantity: quantity,
    });

  return affectedRows > 0;
}

/**
 * تحديث مخزون متغير مباشرة.
 */
export async function updateProductVariantStockQuantity(
  variantId: string,
  quantity: number,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("product_variants")
    .where({ id: variantId })
    .update({
      stock_quantity: quantity,
    });

  return affectedRows > 0;
}

/**
 * زيادة مخزون المنتج.
 */
export async function increaseProductStock(
  productId: string,
  quantity: number,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("products")
    .where({ id: productId })
    .increment("stock_quantity", quantity);

  return affectedRows > 0;
}

/**
 * تخفيض مخزون المنتج بشرط توفر الكمية.
 */
export async function decreaseProductStock(
  productId: string,
  quantity: number,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("products")
    .where({ id: productId })
    .where("stock_quantity", ">=", quantity)
    .decrement("stock_quantity", quantity);

  return affectedRows > 0;
}

/**
 * زيادة مخزون متغير.
 */
export async function increaseProductVariantStock(
  variantId: string,
  quantity: number,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("product_variants")
    .where({ id: variantId })
    .increment("stock_quantity", quantity);

  return affectedRows > 0;
}

/**
 * تخفيض مخزون متغير بشرط توفر الكمية.
 */
export async function decreaseProductVariantStock(
  variantId: string,
  quantity: number,
  connection: DatabaseConnection = db
): Promise<boolean> {
  const affectedRows = await connection("product_variants")
    .where({ id: variantId })
    .where("stock_quantity", ">=", quantity)
    .decrement("stock_quantity", quantity);

  return affectedRows > 0;
}

/* =========================================================
   SERVICE SUPPORT FUNCTIONS
========================================================= */

/**
 * جلب المنتج مع قفل السجل.
 * يجب استخدامها داخل Transaction.
 */
export async function findProductByIdForUpdate(
  id: string,
  trx: Knex.Transaction
): Promise<ProductRow | undefined> {
  return trx<ProductRow>("products")
    .select(
      "id",
      "category_id",
      "name",
      "slug",
      "description",
      "price",
      "stock_quantity",
      "sku",
      "is_active"
    )
    .where({ id })
    .forUpdate()
    .first();
}

/**
 * جلب المتغير مع قفل السجل.
 * يجب استخدامها داخل Transaction.
 */
export async function findProductVariantByIdForUpdate(
  id: string,
  trx: Knex.Transaction
): Promise<AdminProductVariantRow | undefined> {
  return trx<AdminProductVariantRow>("product_variants")
    .select(
      "id",
      "product_id",
      "sku",
      "price",
      "stock_quantity",
      "image_url",
      "is_active",
      "created_at",
      "updated_at"
    )
    .where({ id })
    .forUpdate()
    .first();
}

/**
 * التحقق من قيم الخصائص التي تنتمي إلى منتج معين.
 *
 * لا تعيد إلا القيم التابعة لخصائص ذلك المنتج.
 */
export async function findProductAttributeValuesByIds(
  productId: string,
  attributeValueIds: string[],
  connection: DatabaseConnection = db
): Promise<
  Array<{
    id: string;
    product_attribute_id: string;
    attribute_name: string;
    attribute_type: string;
    value: string;
    color_code: string | null;
  }>
> {
  if (attributeValueIds.length === 0) {
    return [];
  }

  return connection("product_attribute_values as pav")
    .join(
      "product_attributes as pa",
      "pa.id",
      "pav.product_attribute_id"
    )
    .join(
      "global_attributes as ga",
      "ga.id",
      "pa.global_attribute_id"
    )
    .select(
      "pav.id",
      "pa.id as product_attribute_id",
      "ga.name as attribute_name",
      "ga.type as attribute_type",
      "pav.value",
      "pav.color_code"
    )
    .where("pa.product_id", productId)
    .whereIn("pav.id", attributeValueIds);
}

/**
 * جلب عدد المتغيرات ومجموع مخزونها.
 */
export async function findProductVariantStockSummary(
  productId: string,
  connection: DatabaseConnection = db
): Promise<{
  variants_count: number;
  total_stock: number;
}> {
  const result = await connection("product_variants")
    .where({ product_id: productId })
    .count({ variants_count: "id" })
    .sum({ total_stock: "stock_quantity" })
    .first();

  return {
    variants_count: Number(result?.variants_count ?? 0),
    total_stock: Number(result?.total_stock ?? 0),
  };
}
