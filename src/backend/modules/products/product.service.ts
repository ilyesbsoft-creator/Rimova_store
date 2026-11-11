
import { randomUUID } from "node:crypto";
import type { Knex } from "knex";

import db from "../../database/knex";
import { findCategoryById } from "../categories/category.repository";

import {
  findActiveProductById,
  findProductImages,
  findActiveProductVariants,
  findVariantAttributes,
  findProductAttributeOptions,
  createProduct,
  findProductById,
  findProductByIdForUpdate,
  findProductsPaginated,
  updateProduct,
  deleteProduct,
  findProductImagesForAdmin,
  createProductImage,
  updateProductImage,
  deleteProductImage,
  setProductPrimaryImage,
  findProductVariantsForAdmin,
  findProductVariantById,
  findProductVariantByIdForUpdate,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  findProductAttributes,
  findProductAttributeById,
  createProductAttribute,
  updateProductAttribute,
  deleteProductAttribute,
  findProductAttributeValues,
  findProductAttributeValueById,
  createProductAttributeValue,
  updateProductAttributeValue,
  deleteProductAttributeValue,
  replaceVariantAttributeValues,
  findProductAttributeValuesByIds,
  findProductVariantStockSummary,
  updateProductStockQuantity,
  updateProductVariantStockQuantity,
} from "./product.repository";

import {
  uploadImage,
  deleteImage,
} from "../../services/cloudinary.service";

import type {
  CreateProductData,
  UpdateProductData,
  ProductFilters,
  CreateProductImageData,
  UpdateProductImageData,
  CreateProductVariantData,
  UpdateProductVariantData,
  CreateProductAttributeData,
  UpdateProductAttributeData,
  CreateProductAttributeValueData,
  UpdateProductAttributeValueData,
} from "./product.repository";

/* =========================================================
   SERVICE TYPES
========================================================= */

type UploadedFileInput = {
  type: "upload";
  buffer: Buffer;
  alt_text?: string | null;
};

type ExternalImageInput = {
  type: "url";
  image_url: string;
  alt_text?: string | null;
};

export type ProductImageInput =
  | UploadedFileInput
  | ExternalImageInput;

export type CreateProductInput = Omit<
  CreateProductData,
  "id"
> & {
  images?: ProductImageInput[];
};

export type UpdateProductInput = UpdateProductData & {
  images?: ProductImageInput[];
};

export type CreateVariantInput = Omit<
  CreateProductVariantData,
  "id" | "product_id"
> & {
  attribute_value_ids?: string[];
};

export type UpdateVariantInput = UpdateProductVariantData & {
  attribute_value_ids?: string[];
};

/**
 * ربط خاصية عامة بمنتج.
 */
export type CreateAttributeInput = Omit<
  CreateProductAttributeData,
  "id" | "product_id"
>;

/**
 * تعديل ارتباط الخاصية العامة بالمنتج.
 */
export type UpdateAttributeInput =
  UpdateProductAttributeData;

/**
 * إنشاء قيمة لخاصية المنتج.
 */
export type CreateAttributeValueInput = Omit<
  CreateProductAttributeValueData,
  "id" | "product_attribute_id"
>;

/**
 * تعديل قيمة خاصية المنتج.
 */
export type UpdateAttributeValueInput =
  UpdateProductAttributeValueData;

type PreparedImage = {
  id: string;
  image_url: string;
  image_public_id: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

type UploadedCloudinaryImage = {
  publicId: string;
  url: string;
};

type DatabaseTransaction = Knex.Transaction;

/* =========================================================
   SERVICE ERROR
========================================================= */

export class ProductServiceError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = "PRODUCT_ERROR"
  ) {
    super(message);

    this.name = "ProductServiceError";
    this.statusCode = statusCode;
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function throwNotFound(
  message: string,
  code: string
): never {
  throw new ProductServiceError(
    message,
    404,
    code
  );
}

function throwConflict(
  message: string,
  code: string
): never {
  throw new ProductServiceError(
    message,
    409,
    code
  );
}

function assertNonNegativeInteger(
  value: number,
  fieldName: string
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new ProductServiceError(
      `${fieldName} must be a non-negative integer.`,
      400,
      "INVALID_QUANTITY"
    );
  }
}

function assertPositiveInteger(
  value: number,
  fieldName: string
): void {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new ProductServiceError(
      `${fieldName} must be a positive integer.`,
      400,
      "INVALID_QUANTITY"
    );
  }
}

/* =========================================================
   CATEGORY HELPERS
========================================================= */

async function assertActiveCategory(
  categoryId: string,
  trx?: DatabaseTransaction
): Promise<void> {
  const category = await findCategoryById(
    categoryId,
    trx ?? db
  );

  if (!category) {
    throwNotFound(
      "Category not found.",
      "CATEGORY_NOT_FOUND"
    );
  }

  if (!category.is_active) {
    throwConflict(
      "Cannot assign a product to an inactive category.",
      "CATEGORY_INACTIVE"
    );
  }
}

/* =========================================================
   GLOBAL ATTRIBUTE HELPERS
========================================================= */

/**
 * التحقق من وجود الخاصية العامة.
 *
 * ملاحظة:
 * global_attributes هو مصدر اسم الخاصية ونوعها.
 * لا نعدل الاسم من خلال خصائص المنتج.
 */
async function assertGlobalAttributeExists(
  globalAttributeId: string,
  trx: DatabaseTransaction
): Promise<void> {
  const attribute = await trx("global_attributes")
    .select("id")
    .where({ id: globalAttributeId })
    .first();

  if (!attribute) {
    throwNotFound(
      "Global attribute not found.",
      "GLOBAL_ATTRIBUTE_NOT_FOUND"
    );
  }
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

function validateExternalImageUrl(
  imageUrl: string
): string {
  const normalized = imageUrl.trim();

  if (!normalized) {
    throw new ProductServiceError(
      "Image URL is required.",
      400,
      "INVALID_IMAGE_URL"
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new ProductServiceError(
      "Invalid image URL.",
      400,
      "INVALID_IMAGE_URL"
    );
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    throw new ProductServiceError(
      "Only HTTP and HTTPS image URLs are supported.",
      400,
      "INVALID_IMAGE_URL"
    );
  }

  return normalized;
}

async function prepareImages(
  productId: string,
  images: ProductImageInput[],
  startingOrder = 0,
  makeFirstPrimary = false
): Promise<{
  images: PreparedImage[];
  uploaded: UploadedCloudinaryImage[];
}> {
  const prepared: PreparedImage[] = [];
  const uploaded: UploadedCloudinaryImage[] = [];

  try {
    for (let index = 0; index < images.length; index++) {
      const image = images[index];

      let imageUrl: string;
      let publicId: string | null = null;

      if (image.type === "upload") {
        if (!Buffer.isBuffer(image.buffer)) {
          throw new ProductServiceError(
            "Invalid uploaded image buffer.",
            400,
            "INVALID_IMAGE"
          );
        }

        const result = await uploadImage(
          image.buffer,
          {
            folder: `rimova/products/${productId}`,
          }
        );

        imageUrl = result.url;
        publicId = result.publicId;

        uploaded.push({
          publicId: result.publicId,
          url: result.url,
        });
      } else {
        imageUrl = validateExternalImageUrl(
          image.image_url
        );
      }

      prepared.push({
        id: randomUUID(),
        image_url: imageUrl,
        image_public_id: publicId,
        alt_text: image.alt_text?.trim() || null,
        sort_order: startingOrder + index,
        is_primary:
          makeFirstPrimary && index === 0,
      });
    }

    return {
      images: prepared,
      uploaded,
    };
  } catch (error) {
    await cleanupUploadedImages(uploaded);
    throw error;
  }
}

async function cleanupUploadedImages(
  images: UploadedCloudinaryImage[]
): Promise<void> {
  await Promise.allSettled(
    images.map((image) =>
      deleteImage(image.publicId)
    )
  );
}

async function insertPreparedImages(
  productId: string,
  images: PreparedImage[],
  trx: DatabaseTransaction
): Promise<void> {
  for (const image of images) {
    const data: CreateProductImageData = {
      id: image.id,
      product_id: productId,
      image_url: image.image_url,
      image_public_id: image.image_public_id,
      alt_text: image.alt_text,
      sort_order: image.sort_order,
      is_primary: image.is_primary,
    };

    await createProductImage(data, trx);
  }
}

/**
 * التحقق من أن الصورة المختارة موجودة مسبقاً
 * ضمن صور المنتج في product_images.
 *
 * لا يتم رفع الصورة إلى Cloudinary.
 * لا يتم إنشاء سجل صورة جديد.
 * نحفظ الرابط الموجود فقط في قيمة الخاصية.
 */
async function validateProductImageSelection(
  productId: string,
  imageUrl: string,
  trx: DatabaseTransaction
): Promise<string> {
  const normalized = validateExternalImageUrl(imageUrl);

  const images = await findProductImagesForAdmin(
    productId,
    trx
  );

  const exists = images.some(
    (image) => image.image_url === normalized
  );

  if (!exists) {
    throw new ProductServiceError(
      "Selected image does not belong to this product.",
      400,
      "INVALID_PRODUCT_IMAGE"
    );
  }

  return normalized;
}

/* =========================================================
   ATTRIBUTE HELPERS
========================================================= */

/**
 * التحقق من أن جميع قيم الخصائص:
 * - موجودة.
 * - تتبع المنتج نفسه.
 * - لا تحتوي على تكرار.
 * - لا تحتوي على أكثر من قيمة للخاصية نفسها.
 */
async function validateAttributeValueOwnership(
  productId: string,
  attributeValueIds: string[],
  trx: DatabaseTransaction
): Promise<void> {
  const uniqueIds = [...new Set(attributeValueIds)];

  if (uniqueIds.length !== attributeValueIds.length) {
    throw new ProductServiceError(
      "Duplicate attribute values are not allowed.",
      400,
      "DUPLICATE_ATTRIBUTE_VALUES"
    );
  }

  if (uniqueIds.length === 0) {
    return;
  }

  const values = await findProductAttributeValuesByIds(
    productId,
    uniqueIds,
    trx
  );

  if (values.length !== uniqueIds.length) {
    throw new ProductServiceError(
      "One or more attribute values do not belong to this product.",
      400,
      "INVALID_ATTRIBUTE_VALUE"
    );
  }

  const usedAttributes = new Set<string>();

  for (const value of values) {
    if (
      usedAttributes.has(value.product_attribute_id)
    ) {
      throw new ProductServiceError(
        "A variant cannot have multiple values for the same attribute.",
        400,
        "DUPLICATE_ATTRIBUTE"
      );
    }

    usedAttributes.add(value.product_attribute_id);
  }
}

/**
 * التحقق من أن نص القيمة صالح.
 */
function normalizeAttributeValue(
  value: string
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new ProductServiceError(
      "Attribute value cannot be empty.",
      400,
      "INVALID_ATTRIBUTE_VALUE"
    );
  }

  return normalized;
}

/* =========================================================
   INVENTORY HELPERS
========================================================= */

async function syncProductStockFromVariants(
  productId: string,
  trx: DatabaseTransaction
): Promise<number> {
  const summary = await findProductVariantStockSummary(
    productId,
    trx
  );

  if (summary.variants_count === 0) {
    return 0;
  }

  const updated = await updateProductStockQuantity(
    productId,
    summary.total_stock,
    trx
  );

  if (!updated) {
    throwNotFound(
      "Product not found.",
      "PRODUCT_NOT_FOUND"
    );
  }

  return summary.total_stock;
}

async function assertProductHasNoVariants(
  productId: string,
  trx: DatabaseTransaction
): Promise<void> {
  const summary = await findProductVariantStockSummary(
    productId,
    trx
  );

  if (summary.variants_count > 0) {
    throwConflict(
      "Product stock cannot be changed directly while the product has variants.",
      "PRODUCT_HAS_VARIANTS"
    );
  }
}

/* =========================================================
   PRODUCT ADMIN SERVICES
========================================================= */

export async function getProducts(
  filters: ProductFilters = {}
) {
  return findProductsPaginated(filters);
}

/**
 * جلب منتج كامل للإدارة مع الصور والمتغيرات والخصائص.
 */
export async function getProductDetails(
  productId: string
) {
  const product = await findProductById(productId);

  if (!product) {
    throwNotFound(
      "Product not found.",
      "PRODUCT_NOT_FOUND"
    );
  }

  const [
    images,
    variants,
    attributes,
  ] = await Promise.all([
    findProductImagesForAdmin(productId),
    findProductVariantsForAdmin(productId),
    findProductAttributes(productId),
  ]);

  const attributeValues = await Promise.all(
    attributes.map(async (attribute) => ({
      ...attribute,
      values: await findProductAttributeValues(
        attribute.id
      ),
    }))
  );

  const variantAttributes = await findVariantAttributes(
    variants.map((variant) => variant.id)
  );

  const variantsWithAttributes = variants.map((variant) => ({
    ...variant,
    attribute_values: variantAttributes
      .filter((item) => item.variant_id === variant.id)
      .map((item) => ({
        attribute_id: item.attribute_id,
        attribute_name: item.attribute_name,
        attribute_type: item.attribute_type,
        attribute_value_id: item.attribute_value_id,
        attribute_value: item.attribute_value,
        color_code: item.color_code,
      })),
  }));

  return {
    ...product,
    images,
    variants: variantsWithAttributes,
    attributes: attributeValues,
  };
}

/**
 * إنشاء منتج مع الصور الاختيارية.
 */
export async function createProductWithImages(
  input: CreateProductInput
) {
  const productId = randomUUID();

  await assertActiveCategory(input.category_id);

  const imagesInput = input.images ?? [];

  const {
    images,
    uploaded,
  } = await prepareImages(
    productId,
    imagesInput,
    0,
    imagesInput.length > 0
  );

  try {
    const product = await db.transaction(
      async (trx) => {
        const data: CreateProductData = {
          id: productId,
          category_id: input.category_id,
          name: input.name,
          slug: input.slug,
          description: input.description,
          price: input.price,
          stock_quantity: input.stock_quantity ?? 0,
          sku: input.sku,
          is_active: input.is_active ?? true,
        };

        const created = await createProduct(
          data,
          trx
        );

        await insertPreparedImages(
          productId,
          images,
          trx
        );

        return created;
      }
    );

    return {
      product,
      images,
    };
  } catch (error) {
    await cleanupUploadedImages(uploaded);
    throw error;
  }
}

/**
 * تعديل بيانات المنتج وإضافة صور جديدة اختيارية.
 */
export async function updateProductDetails(
  productId: string,
  input: UpdateProductInput
) {
  const imagesInput = input.images ?? [];

  const {
    images,
    uploaded,
  } = await prepareImages(
    productId,
    imagesInput
  );

  try {
    const result = await db.transaction(
      async (trx) => {
        const product = await findProductByIdForUpdate(
          productId,
          trx
        );

        if (!product) {
          throwNotFound(
            "Product not found.",
            "PRODUCT_NOT_FOUND"
          );
        }

        if (
          input.category_id &&
          input.category_id !== product.category_id
        ) {
          await assertActiveCategory(
            input.category_id,
            trx
          );
        }

        if (input.stock_quantity !== undefined) {
          assertNonNegativeInteger(
            input.stock_quantity,
            "stock_quantity"
          );

          await assertProductHasNoVariants(
            productId,
            trx
          );
        }

        const {
          images: ignoredImages,
          ...productData
        } = input;

        const updated = await updateProduct(
          productId,
          productData,
          trx
        );

        if (!updated) {
          throwNotFound(
            "Product not found.",
            "PRODUCT_NOT_FOUND"
          );
        }

        if (images.length > 0) {
          const existingImages =
            await findProductImagesForAdmin(
              productId,
              trx
            );

          const hasPrimary = existingImages.some(
            (image) => Boolean(image.is_primary)
          );

          const preparedImages = images.map(
            (image, index) => ({
              ...image,
              sort_order:
                existingImages.length + index,
              is_primary:
                !hasPrimary && index === 0,
            })
          );

          await insertPreparedImages(
            productId,
            preparedImages,
            trx
          );
        }

        return updated;
      }
    );

    return {
      product: result,
      images,
    };
  } catch (error) {
    await cleanupUploadedImages(uploaded);
    throw error;
  }
}

/**
 * حذف المنتج وجميع سجلاته التابعة.
 */
export async function deleteProductWithImages(
  productId: string
) {
  const images = await findProductImagesForAdmin(
    productId
  );

  const deleted = await db.transaction(
    async (trx) => {
      const product = await findProductByIdForUpdate(
        productId,
        trx
      );

      if (!product) {
        return false;
      }

      return deleteProduct(productId, trx);
    }
  );

  if (!deleted) {
    return false;
  }

  const cloudinaryImages = images.filter(
    (image) => image.image_public_id
  );

  const cleanupResults = await Promise.allSettled(
    cloudinaryImages.map((image) =>
      deleteImage(image.image_public_id!)
    )
  );

  const failedPublicIds = cleanupResults
    .map((result, index) => ({
      result,
      publicId:
        cloudinaryImages[index].image_public_id!,
    }))
    .filter(
      (item) => item.result.status === "rejected"
    )
    .map((item) => item.publicId);

  return {
    deleted: true,
    cloudinary_cleanup_failed: failedPublicIds,
  };
}

/* =========================================================
   PRODUCT IMAGE SERVICES
========================================================= */

export async function addProductImages(
  productId: string,
  inputImages: ProductImageInput[]
) {
  const product = await findProductById(productId);

  if (!product) {
    throwNotFound(
      "Product not found.",
      "PRODUCT_NOT_FOUND"
    );
  }

  if (inputImages.length === 0) {
    return [];
  }

  const existingImages =
    await findProductImagesForAdmin(productId);

  const hasPrimary = existingImages.some(
    (image) => Boolean(image.is_primary)
  );

  const {
    images,
    uploaded,
  } = await prepareImages(
    productId,
    inputImages,
    existingImages.length,
    !hasPrimary
  );

  try {
    await db.transaction(async (trx) => {
      await insertPreparedImages(
        productId,
        images,
        trx
      );
    });

    return images;
  } catch (error) {
    await cleanupUploadedImages(uploaded);
    throw error;
  }
}

export async function updateProductImageDetails(
  productId: string,
  imageId: string,
  input: UpdateProductImageData
) {
  const data: UpdateProductImageData = {
    ...input,
  };

  if (data.image_url !== undefined) {
    data.image_url = validateExternalImageUrl(
      data.image_url
    );
  }

  if (data.image_public_id !== undefined) {
    throw new ProductServiceError(
      "Cloudinary public_id cannot be changed directly.",
      400,
      "PUBLIC_ID_IMMUTABLE"
    );
  }

  return db.transaction(async (trx) => {
    const image = await updateProductImage(
      imageId,
      productId,
      data,
      trx
    );

    if (!image) {
      throwNotFound(
        "Product image not found.",
        "PRODUCT_IMAGE_NOT_FOUND"
      );
    }

    return image;
  });
}

export async function removeProductImage(
  productId: string,
  imageId: string
) {
  const images = await findProductImagesForAdmin(
    productId
  );

  const image = images.find(
    (item) => item.id === imageId
  );

  if (!image) {
    throwNotFound(
      "Product image not found.",
      "PRODUCT_IMAGE_NOT_FOUND"
    );
  }
  
const usedByAttributeValue = await db(
  "product_attribute_values"
)
  .where({
    image_url: image.image_url,
  })
  .first();

if (usedByAttributeValue) {
  throwConflict(
    "This image is currently used by a product attribute value.",
    "PRODUCT_IMAGE_IN_USE"
  );
}  

  const deleted = await db.transaction(
    async (trx) => {
      return deleteProductImage(
        imageId,
        productId,
        trx
      );
    }
  );

  if (!deleted) {
    throwNotFound(
      "Product image not found.",
      "PRODUCT_IMAGE_NOT_FOUND"
    );
  }

  if (image.image_public_id) {
    await deleteImage(image.image_public_id);
  }

  return true;
}

export async function makeProductImagePrimary(
  productId: string,
  imageId: string
) {
  return db.transaction(async (trx) => {
    const updated = await setProductPrimaryImage(
      imageId,
      productId,
      trx
    );

    if (!updated) {
      throwNotFound(
        "Product image not found.",
        "PRODUCT_IMAGE_NOT_FOUND"
      );
    }

    return true;
  });
}

/* =========================================================
   PRODUCT VARIANT SERVICES
========================================================= */

export async function createVariant(
  productId: string,
  input: CreateVariantInput
) {
  const attributeValueIds =
    input.attribute_value_ids ?? [];

  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(
      productId,
      trx
    );

    if (!product) {
      throwNotFound(
        "Product not found.",
        "PRODUCT_NOT_FOUND"
      );
    }

    assertNonNegativeInteger(
      input.stock_quantity ?? 0,
      "stock_quantity"
    );

    const summary =
      await findProductVariantStockSummary(
        productId,
        trx
      );

    if (
      summary.variants_count === 0 &&
      Number(product.stock_quantity) > 0
    ) {
      throwConflict(
        "Distribute the existing product stock before creating its first variant.",
        "PRODUCT_STOCK_MUST_BE_DISTRIBUTED"
      );
    }

    await validateAttributeValueOwnership(
      productId,
      attributeValueIds,
      trx
    );

    const variantId = randomUUID();

    const data: CreateProductVariantData = {
      id: variantId,
      product_id: productId,
      sku: input.sku,
      price: input.price,
      stock_quantity: input.stock_quantity ?? 0,
      is_active: input.is_active ?? true,
    };

    const variant = await createProductVariant(
      data,
      trx
    );

    if (!variant) {
      throw new Error(
        "PRODUCT_VARIANT_CREATE_FAILED"
      );
    }

    await replaceVariantAttributeValues(
      variantId,
      attributeValueIds,
      trx
    );

    await syncProductStockFromVariants(
      productId,
      trx
    );

    return variant;
  });
}

export async function updateVariantDetails(
  productId: string,
  variantId: string,
  input: UpdateVariantInput
) {
  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(
      productId,
      trx
    );

    if (!product) {
      throwNotFound(
        "Product not found.",
        "PRODUCT_NOT_FOUND"
      );
    }

    const variant =
      await findProductVariantByIdForUpdate(
        variantId,
        trx
      );

    if (
      !variant ||
      variant.product_id !== productId
    ) {
      throwNotFound(
        "Product variant not found.",
        "PRODUCT_VARIANT_NOT_FOUND"
      );
    }

    if (input.stock_quantity !== undefined) {
      assertNonNegativeInteger(
        input.stock_quantity,
        "stock_quantity"
      );
    }

    const {
      attribute_value_ids,
      ...variantData
    } = input;

    if (attribute_value_ids !== undefined) {
      await validateAttributeValueOwnership(
        productId,
        attribute_value_ids,
        trx
      );
    }

    const updated = await updateProductVariant(
      variantId,
      variantData,
      trx
    );

    if (!updated) {
      throwNotFound(
        "Product variant not found.",
        "PRODUCT_VARIANT_NOT_FOUND"
      );
    }

    if (attribute_value_ids !== undefined) {
      await replaceVariantAttributeValues(
        variantId,
        attribute_value_ids,
        trx
      );
    }

    await syncProductStockFromVariants(
      productId,
      trx
    );

    return updated;
  });
}

export async function removeVariant(
  productId: string,
  variantId: string
) {
  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(
      productId,
      trx
    );

    if (!product) {
      throwNotFound(
        "Product not found.",
        "PRODUCT_NOT_FOUND"
      );
    }

    const variant =
      await findProductVariantByIdForUpdate(
        variantId,
        trx
      );

    if (
      !variant ||
      variant.product_id !== productId
    ) {
      throwNotFound(
        "Product variant not found.",
        "PRODUCT_VARIANT_NOT_FOUND"
      );
    }

    if (Number(variant.stock_quantity) > 0) {
      throwConflict(
        "A variant with available stock cannot be deleted.",
        "VARIANT_HAS_STOCK"
      );
    }

    const deleted = await deleteProductVariant(
      variantId,
      trx
    );

    if (!deleted) {
      throwNotFound(
        "Product variant not found.",
        "PRODUCT_VARIANT_NOT_FOUND"
      );
    }

    await syncProductStockFromVariants(
      productId,
      trx
    );

    return true;
  });
}

/* =========================================================
   INVENTORY SERVICES
========================================================= */

export async function setProductStock(
  productId: string,
  quantity: number
) {
  assertNonNegativeInteger(
    quantity,
    "stock_quantity"
  );

  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(
      productId,
      trx
    );

    if (!product) {
      throwNotFound(
        "Product not found.",
        "PRODUCT_NOT_FOUND"
      );
    }

    await assertProductHasNoVariants(
      productId,
      trx
    );

    const updated = await updateProductStockQuantity(
      productId,
      quantity,
      trx
    );

    if (!updated) {
      throwNotFound(
        "Product not found.",
        "PRODUCT_NOT_FOUND"
      );
    }

    return quantity;
  });
}

export async function setVariantStock(
  productId: string,
  variantId: string,
  quantity: number
) {
  assertNonNegativeInteger(
    quantity,
    "stock_quantity"
  );

  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(
      productId,
      trx
    );

    if (!product) {
      throwNotFound(
        "Product not found.",
        "PRODUCT_NOT_FOUND"
      );
    }

    const variant =
      await findProductVariantByIdForUpdate(
        variantId,
        trx
      );

    if (
      !variant ||
      variant.product_id !== productId
    ) {
      throwNotFound(
        "Product variant not found.",
        "PRODUCT_VARIANT_NOT_FOUND"
      );
    }

    const updated =
      await updateProductVariantStockQuantity(
        variantId,
        quantity,
        trx
      );

    if (!updated) {
      throwNotFound(
        "Product variant not found.",
        "PRODUCT_VARIANT_NOT_FOUND"
      );
    }

    return syncProductStockFromVariants(
      productId,
      trx
    );
  });
}

/* =========================================================
   PRODUCT ATTRIBUTE SERVICES
========================================================= */

/**
 * ربط خاصية عامة بمنتج.
 *
 * مثال:
 * global_attribute_id = معرف Color
 */
export async function createAttribute(
  productId: string,
  input: CreateAttributeInput
) {
  return db.transaction(async (trx) => {
    const product = await findProductByIdForUpdate(
      productId,
      trx
    );

    if (!product) {
      throwNotFound(
        "Product not found.",
        "PRODUCT_NOT_FOUND"
      );
    }

    await assertGlobalAttributeExists(
      input.global_attribute_id,
      trx
    );

    return createProductAttribute(
      {
        id: randomUUID(),
        product_id: productId,
        global_attribute_id: input.global_attribute_id,
      },
      trx
    );
  });
}

/**
 * تغيير الخاصية العامة المرتبطة بالمنتج.
 *
 * لا يغير اسم global_attribute نفسه.
 */
export async function updateAttribute(
  productId: string,
  attributeId: string,
  input: UpdateAttributeInput
) {
  return db.transaction(async (trx) => {
    const attribute =
      await findProductAttributeById(
        attributeId,
        trx
      );

    if (
      !attribute ||
      attribute.product_id !== productId
    ) {
      throwNotFound(
        "Product attribute not found.",
        "PRODUCT_ATTRIBUTE_NOT_FOUND"
      );
    }

    await assertGlobalAttributeExists(
      input.global_attribute_id,
      trx
    );

    return updateProductAttribute(
      attributeId,
      {
        global_attribute_id: input.global_attribute_id,
      },
      trx
    );
  });
}

/**
 * حذف خاصية من المنتج.
 */
export async function removeAttribute(
  productId: string,
  attributeId: string
) {
  return db.transaction(async (trx) => {
    const attribute =
      await findProductAttributeById(
        attributeId,
        trx
      );

    if (
      !attribute ||
      attribute.product_id !== productId
    ) {
      throwNotFound(
        "Product attribute not found.",
        "PRODUCT_ATTRIBUTE_NOT_FOUND"
      );
    }

    return deleteProductAttribute(
      attributeId,
      trx
    );
  });
}

/* =========================================================
   PRODUCT ATTRIBUTE VALUE SERVICES
========================================================= */

export async function createAttributeValue(
  productId: string,
  attributeId: string,
  input: CreateAttributeValueInput
) {
  return db.transaction(async (trx) => {
    const attribute =
      await findProductAttributeById(
        attributeId,
        trx
      );

    if (
      !attribute ||
      attribute.product_id !== productId
    ) {
      throwNotFound(
        "Product attribute not found.",
        "PRODUCT_ATTRIBUTE_NOT_FOUND"
      );
    }

    const value = normalizeAttributeValue(
      input.value
    );

    return createProductAttributeValue(
      {
        id: randomUUID(),
        product_attribute_id: attributeId,
        value,
        color_code: input.color_code ?? null,
      },
      trx
    );
  });
}

/**
 * تعديل قيمة خاصية.
 */
export async function updateAttributeValue(
  productId: string,
  attributeId: string,
  valueId: string,
  input: UpdateAttributeValueInput
) {
  return db.transaction(async (trx) => {
    const attribute =
      await findProductAttributeById(
        attributeId,
        trx
      );

    if (
      !attribute ||
      attribute.product_id !== productId
    ) {
      throwNotFound(
        "Product attribute not found.",
        "PRODUCT_ATTRIBUTE_NOT_FOUND"
      );
    }

    const value =
      await findProductAttributeValueById(
        valueId,
        trx
      );

    if (
      !value ||
      value.product_attribute_id !== attributeId
    ) {
      throwNotFound(
        "Attribute value not found.",
        "PRODUCT_ATTRIBUTE_VALUE_NOT_FOUND"
      );
    }

    const data: UpdateProductAttributeValueData = {};

    if (input.value !== undefined) {
      data.value = normalizeAttributeValue(
        input.value
      );
    }

    if (input.color_code !== undefined) {
      data.color_code = input.color_code;
    }

    if (Object.keys(data).length === 0) {
      throw new ProductServiceError(
        "No attribute value data provided.",
        400,
        "EMPTY_UPDATE"
      );
    }

    return updateProductAttributeValue(
      valueId,
      data,
      trx
    );
  });
}

/**
 * حذف قيمة خاصية.
 */
export async function removeAttributeValue(
  productId: string,
  attributeId: string,
  valueId: string
) {
  return db.transaction(async (trx) => {
    const attribute =
      await findProductAttributeById(
        attributeId,
        trx
      );

    if (
      !attribute ||
      attribute.product_id !== productId
    ) {
      throwNotFound(
        "Product attribute not found.",
        "PRODUCT_ATTRIBUTE_NOT_FOUND"
      );
    }

    const value =
      await findProductAttributeValueById(
        valueId,
        trx
      );

    if (
      !value ||
      value.product_attribute_id !== attributeId
    ) {
      throwNotFound(
        "Attribute value not found.",
        "PRODUCT_ATTRIBUTE_VALUE_NOT_FOUND"
      );
    }

    return deleteProductAttributeValue(
      valueId,
      trx
    );
  });
}
/* =========================================================
   PUBLIC PRODUCT SERVICE
========================================================= */

/**
 * جلب المنتج النشط مع الصور والخصائص والمتغيرات.
 *
 * هذه البيانات تستخدم في صفحة المنتج العامة.
 */
export async function getProductById(id: string) {
  const product = await findActiveProductById(id);

  if (!product) {
    return null;
  }

  const [
    images,
    variants,
    attributeOptions,
  ] = await Promise.all([
    findProductImages(product.id),
    findActiveProductVariants(product.id),
    findProductAttributeOptions(product.id),
  ]);

  const variantAttributes = await findVariantAttributes(
    variants.map((variant) => variant.id)
  );

  /**
   * ربط الخصائص بكل متغير.
   */
  const variantsWithAttributes = variants.map((variant) => ({
    ...variant,

    price: variant.price ?? product.price,

    attributes: variantAttributes
      .filter(
        (attribute) =>
          attribute.variant_id === variant.id
      )
      .map((attribute) => ({
        id: attribute.attribute_id,
        name: attribute.attribute_name,
        type: attribute.attribute_type,
        value_id: attribute.attribute_value_id,
        value: attribute.attribute_value,
        color_code: attribute.color_code,
      })),
  }));

  /**
   * تجميع خيارات الخصائص حسب الخاصية.
   *
   * مثال:
   * Color:
   *   Red
   *   Blue
   *
   * Size:
   *   M
   *   L
   */
  const attributesMap = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      values: {
        id: string;
        value: string;
        color_code: string | null;
      }[];
    }
  >();

  for (const option of attributeOptions) {
    if (!attributesMap.has(option.attribute_id)) {
      attributesMap.set(option.attribute_id, {
        id: option.attribute_id,
        name: option.attribute_name,
        type: option.attribute_type,
        values: [],
      });
    }

    const attribute = attributesMap.get(
      option.attribute_id
    )!;

    const alreadyExists = attribute.values.some(
      (value) =>
        value.id === option.attribute_value_id
    );

    if (!alreadyExists) {
      attribute.values.push({
        id: option.attribute_value_id,
        value: option.attribute_value,
        color_code: option.color_code,
      });
    }
  }

  return {
    ...product,
    images,
    attributes: Array.from(attributesMap.values()),
    variants: variantsWithAttributes,
  };
}
