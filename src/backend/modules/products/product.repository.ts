
import db from "../../database/knex";
import type { Knex } from "knex";

type DatabaseConnection = Knex | Knex.Transaction;

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

export type ProductImageRow = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean | number;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  price: string | number | null;
  stock_quantity: number;
};

export type VariantAttributeRow = {
  variant_id: string;
  attribute_id: string;
  attribute_name: string;
  attribute_value_id: string;
  attribute_value: string;
};

export type ProductAttributeOptionRow = {
  attribute_id: string;
  attribute_name: string;
  attribute_value_id: string;
  attribute_value: string;
};

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
 * جلب صور المنتج وترتيب الصورة الرئيسية أولًا.
 */
export async function findProductImages(
  productId: string,
  connection: DatabaseConnection = db
): Promise<ProductImageRow[]> {
  return connection<ProductImageRow>("product_images")
    .select(
      "id",
      "image_url",
      "alt_text",
      "sort_order",
      "is_primary"
    )
    .where("product_id", productId)
    .orderBy("is_primary", "desc")
    .orderBy("sort_order", "asc");
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
      "stock_quantity"
    )
    .where("product_id", productId)
    .where("is_active", true)
    .orderBy("created_at", "asc");
}

/**
 * جلب خصائص وقيم المتغيرات المحددة.
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
      "pav.attribute_id"
    )
    .select(
      "pvav.variant_id",
      "pa.id as attribute_id",
      "pa.name as attribute_name",
      "pav.id as attribute_value_id",
      "pav.value as attribute_value"
    )
    .whereIn("pvav.variant_id", variantIds)
    .orderBy("pa.name", "asc");
}

/**
 * جلب جميع خصائص المنتج وقيمها المسجلة.
 *
 * تُستخدم هذه الدالة لبناء مجموعات مستقلة في الواجهة،
 * مثل اللون والحجم، بدل عرض كل تركيبة كخيار منفصل.
 */
export async function findProductAttributeOptions(
  productId: string,
  connection: DatabaseConnection = db
): Promise<ProductAttributeOptionRow[]> {
  return connection("product_attributes as pa")
    .join(
      "product_attribute_values as pav",
      "pav.attribute_id",
      "pa.id"
    )
    .select(
      "pa.id as attribute_id",
      "pa.name as attribute_name",
      "pav.id as attribute_value_id",
      "pav.value as attribute_value"
    )
    .where("pa.product_id", productId)
    .orderBy("pa.created_at", "asc")
    .orderBy("pav.value", "asc");
}