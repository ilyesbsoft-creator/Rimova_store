
import { z } from "zod";

import {
  HttpError,
  successResponse,
  getErrorResponse,
  readJsonBody,
} from "../../utils/http";

import * as productService from "./product.service";

import {
  productIdParamSchema,
  productListQuerySchema,
  createProductSchema,
  updateProductSchema,
  updateProductImageSchema,
  createVariantSchema,
  updateVariantSchema,
  setProductStockSchema,
  setVariantStockSchema,
  createAttributeSchema,
  updateAttributeSchema,
  createAttributeValueSchema,
  updateAttributeValueSchema,
} from "./product.validation";

import type {
  ProductImageInput,
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
} from "./product.service";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new HttpError(
      "Validation failed.",
      400,
      result.error.flatten(),
    );
  }

  return result.data;
}

function getStringField(
  formData: FormData,
  key: string,
): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  return value;
}

function parseJsonField<T>(
  value: string | undefined,
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new HttpError(
      `Invalid JSON in "${value}" field.`,
      400,
    );
  }
}

function isUploadedFile(
  value: FormDataEntryValue,
): value is File {
  return (
    typeof value !== "string" &&
    typeof value.arrayBuffer === "function"
  );
}

/**
 * Reads either JSON or multipart/form-data.
 *
 * Multipart convention:
 * - Regular product fields are sent as form fields.
 * - Uploaded files use the "images" field (repeatable).
 * - External image URLs are sent as JSON in "image_urls".
 *
 * image_urls example:
 * [
 *   { "image_url": "https://example.com/image.jpg", "alt_text": "Front" }
 * ]
 */
async function readProductPayload(
  request: Request,
): Promise<Record<string, unknown>> {
  const contentType =
    request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const payload: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
      if (
        key === "images" ||
        key === "image_urls"
      ) {
        continue;
      }

      if (typeof value === "string") {
        payload[key] = value;
      }
    }

    const uploadedFiles = formData
      .getAll("images")
      .filter(isUploadedFile);

    const externalImages = parseJsonField<
      Array<{
        image_url: string;
        alt_text?: string | null;
      }>
    >(
      getStringField(formData, "image_urls"),
      [],
    );

    const images: ProductImageInput[] = [];

    for (const file of uploadedFiles) {
      if (file.size <= 0) {
        throw new HttpError(
          "An uploaded image is empty.",
          400,
        );
      }

      const buffer = Buffer.from(
        await file.arrayBuffer(),
      );

      images.push({
        type: "upload",
        buffer,
      });
    }

    for (const image of externalImages) {
      images.push({
        type: "url",
        image_url: image.image_url,
        alt_text: image.alt_text,
      });
    }

    if (images.length > 0) {
      payload.images = images;
    }

    return payload;
  }

  const body = await readJsonBody(request);

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new HttpError(
      "Request body must be a JSON object.",
      400,
    );
  }

  return body as Record<string, unknown>;
}

async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const body = await readJsonBody(request);

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new HttpError(
      "Request body must be a JSON object.",
      400,
    );
  }

  return body as Record<string, unknown>;
}

function getId(id: unknown): string {
  return validate(
    productIdParamSchema.shape.id,
    id,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Products                                  */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/admin/products
 */
export async function getProducts(
  request: Request,
): Promise<Response> {
  try {
    const url = new URL(request.url);

    const query = validate(
      productListQuerySchema,
      Object.fromEntries(url.searchParams.entries()),
    );

    const result = await productService.getProducts(query);

    return successResponse({
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * GET /api/admin/products/:id
 */
export async function getProductDetails(
  _request: Request,
  id: string,
): Promise<Response> {
  try {
    const productId = getId(id);

    const result =
      await productService.getProductDetails(productId);

    return successResponse({
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * POST /api/admin/products
 */
export async function createProduct(
  request: Request,
): Promise<Response> {
  try {
    const body = await readProductPayload(request);

    const validated = validate(
      createProductSchema,
      body,
    );

    const input = validated as CreateProductInput;

    const result =
      await productService.createProductWithImages(input);

    return successResponse(
      {
        message: "Product created successfully.",
        data: result,
      },
      201,
    );
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/products/:id
 */
export async function updateProduct(
  request: Request,
  id: string,
): Promise<Response> {
  try {
    const productId = getId(id);

    const body = await readProductPayload(request);

    const validated = validate(
      updateProductSchema,
      body,
    );

    const input = validated as UpdateProductInput;

    const result =
      await productService.updateProductDetails(
        productId,
        input,
      );

    return successResponse({
      message: "Product updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/products/:id
 */
export async function deleteProduct(
  _request: Request,
  id: string,
): Promise<Response> {
  try {
    const productId = getId(id);

    const result =
      await productService.deleteProductWithImages(
        productId,
      );

    return successResponse({
      message: "Product deleted successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Images                                   */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/admin/products/:id/images
 */
export async function addProductImages(
  request: Request,
  id: string,
): Promise<Response> {
  try {
    const productId = getId(id);

    const body = await readProductPayload(request);

    const validated = validate(
      z.object({
        images: z.array(z.unknown()).min(1).max(20),
      }),
      body,
    );

    const images = validated.images as ProductImageInput[];

    const result =
      await productService.addProductImages(
        productId,
        images,
      );

    return successResponse(
      {
        message: "Product images added successfully.",
        data: result,
      },
      201,
    );
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/products/:id/images/:imageId
 */
export async function updateProductImage(
  request: Request,
  id: string,
  imageId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validImageId = getId(imageId);

    const body = await readJsonObject(request);

    const validated = validate(
      updateProductImageSchema,
      body,
    );

    const result =
      await productService.updateProductImageDetails(
        productId,
        validImageId,
        validated,
      );

    return successResponse({
      message: "Product image updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/products/:id/images/:imageId
 */
export async function removeProductImage(
  _request: Request,
  id: string,
  imageId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validImageId = getId(imageId);

    const result =
      await productService.removeProductImage(
        productId,
        validImageId,
      );

    return successResponse({
      message: "Product image removed successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/products/:id/images/:imageId/primary
 */
export async function makeProductImagePrimary(
  _request: Request,
  id: string,
  imageId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validImageId = getId(imageId);

    const result =
      await productService.makeProductImagePrimary(
        productId,
        validImageId,
      );

    return successResponse({
      message: "Primary image updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Variants                                  */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/admin/products/:id/variants
 */
export async function createVariant(
  request: Request,
  id: string,
): Promise<Response> {
  try {
    const productId = getId(id);

    const body = await readJsonObject(request);

    const validated = validate(
      createVariantSchema,
      body,
    );

    const input = validated as CreateVariantInput;

    const result =
      await productService.createVariant(
        productId,
        input,
      );

    return successResponse(
      {
        message: "Variant created successfully.",
        data: result,
      },
      201,
    );
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/products/:id/variants/:variantId
 */
export async function updateVariant(
  request: Request,
  id: string,
  variantId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validVariantId = getId(variantId);

    const body = await readJsonObject(request);

    const validated = validate(
      updateVariantSchema,
      body,
    );

    const input = validated as UpdateVariantInput;

    const result =
      await productService.updateVariantDetails(
        productId,
        validVariantId,
        input,
      );

    return successResponse({
      message: "Variant updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/products/:id/variants/:variantId
 */
export async function removeVariant(
  _request: Request,
  id: string,
  variantId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validVariantId = getId(variantId);

    const result =
      await productService.removeVariant(
        productId,
        validVariantId,
      );

    return successResponse({
      message: "Variant removed successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Inventory                                 */
/* -------------------------------------------------------------------------- */

/**
 * PATCH /api/admin/products/:id/stock
 */
export async function setProductStock(
  request: Request,
  id: string,
): Promise<Response> {
  try {
    const productId = getId(id);

    const body = await readJsonObject(request);

    const validated = validate(
      setProductStockSchema,
      body,
    );

    const result =
      await productService.setProductStock(
        productId,
        validated.stock_quantity,
      );

    return successResponse({
      message: "Product stock updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/products/:id/variants/:variantId/stock
 */
export async function setVariantStock(
  request: Request,
  id: string,
  variantId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validVariantId = getId(variantId);

    const body = await readJsonObject(request);

    const validated = validate(
      setVariantStockSchema,
      body,
    );

    const result =
      await productService.setVariantStock(
        productId,
        validVariantId,
        validated.stock_quantity,
      );

    return successResponse({
      message: "Variant stock updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Attributes                                */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/admin/products/:id/attributes
 */
export async function createAttribute(
  request: Request,
  id: string,
): Promise<Response> {
  try {
    const productId = getId(id);

    const body = await readJsonObject(request);

    const validated = validate(
      createAttributeSchema,
      body,
    );

    const result =
      await productService.createAttribute(
        productId,
        validated,
      );

    return successResponse(
      {
        message: "Attribute created successfully.",
        data: result,
      },
      201,
    );
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/products/:id/attributes/:attributeId
 */
export async function updateAttribute(
  request: Request,
  id: string,
  attributeId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validAttributeId = getId(attributeId);

    const body = await readJsonObject(request);

    const validated = validate(
      updateAttributeSchema,
      body,
    );

    const result =
      await productService.updateAttribute(
        productId,
        validAttributeId,
        validated,
      );

    return successResponse({
      message: "Attribute updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/products/:id/attributes/:attributeId
 */
export async function removeAttribute(
  _request: Request,
  id: string,
  attributeId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validAttributeId = getId(attributeId);

    const result =
      await productService.removeAttribute(
        productId,
        validAttributeId,
      );

    return successResponse({
      message: "Attribute removed successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Attribute Values                             */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/admin/products/:id/attributes/:attributeId/values
 */
export async function createAttributeValue(
  request: Request,
  id: string,
  attributeId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validAttributeId = getId(attributeId);

    const body = await readJsonObject(request);

    const validated = validate(
      createAttributeValueSchema,
      body,
    );

    const result =
      await productService.createAttributeValue(
        productId,
        validAttributeId,
        validated,
      );

    return successResponse(
      {
        message: "Attribute value created successfully.",
        data: result,
      },
      201,
    );
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/products/:id/attributes/:attributeId/values/:valueId
 */
export async function updateAttributeValue(
  request: Request,
  id: string,
  attributeId: string,
  valueId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validAttributeId = getId(attributeId);
    const validValueId = getId(valueId);

    const body = await readJsonObject(request);

    const validated = validate(
      updateAttributeValueSchema,
      body,
    );

    const result =
      await productService.updateAttributeValue(
        productId,
        validAttributeId,
        validValueId,
        validated,
      );

    return successResponse({
      message: "Attribute value updated successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/products/:id/attributes/:attributeId/values/:valueId
 */
export async function removeAttributeValue(
  _request: Request,
  id: string,
  attributeId: string,
  valueId: string,
): Promise<Response> {
  try {
    const productId = getId(id);
    const validAttributeId = getId(attributeId);
    const validValueId = getId(valueId);

    const result =
      await productService.removeAttributeValue(
        productId,
        validAttributeId,
        validValueId,
      );

    return successResponse({
      message: "Attribute value removed successfully.",
      data: result,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
