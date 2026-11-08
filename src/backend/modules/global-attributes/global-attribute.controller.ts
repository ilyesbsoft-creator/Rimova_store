import type { NextRequest } from "next/server";

import {
  successResponse,
  getErrorResponse,
  readJsonBody,
  HttpError,
} from "../../utils/http";

import {
  createGlobalAttributeService,
  deleteGlobalAttributeService,
  getAllGlobalAttributes,
  getGlobalAttributeById,
  updateGlobalAttributeService,
  GlobalAttributeServiceError,
} from "./global-attribute.service";

import {
  createGlobalAttributeSchema,
  updateGlobalAttributeSchema,
  globalAttributeIdSchema,
} from "./global-attribute.validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function handleControllerError(error: unknown): Response {
  if (error instanceof GlobalAttributeServiceError) {
    return getErrorResponse(
      new HttpError(error.message, error.statusCode)
    );
  }

  return getErrorResponse(error);
}

/**
 * GET /api/admin/global-attributes
 */
export async function getGlobalAttributesController(
  _request: NextRequest
): Promise<Response> {
  try {
    const attributes = await getAllGlobalAttributes();

    return successResponse({
      data: attributes,
    });
  } catch (error) {
    return handleControllerError(error);
  }
}

/**
 * GET /api/admin/global-attributes/[id]
 */
export async function getGlobalAttributeController(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const { id } = await context.params;

    const validation = globalAttributeIdSchema.safeParse({ id });

    if (!validation.success) {
      throw new HttpError("Invalid global attribute ID.", 400);
    }

    const attribute = await getGlobalAttributeById(id);

    return successResponse({
      data: attribute,
    });
  } catch (error) {
    return handleControllerError(error);
  }
}

/**
 * POST /api/admin/global-attributes
 */
export async function createGlobalAttributeController(
  request: NextRequest
): Promise<Response> {
  try {
    const body = await readJsonBody(request);

    const validation = createGlobalAttributeSchema.safeParse(body);

    if (!validation.success) {
      throw new HttpError(
        validation.error.issues[0]?.message ??
          "Invalid global attribute data.",
        400
      );
    }

    const attribute = await createGlobalAttributeService(
      validation.data
    );

    return successResponse({
      data: attribute,
      message: "Global attribute created successfully.",
    });
  } catch (error) {
    return handleControllerError(error);
  }
}

/**
 * PATCH /api/admin/global-attributes/[id]
 */
export async function updateGlobalAttributeController(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const { id } = await context.params;

    const idValidation = globalAttributeIdSchema.safeParse({ id });

    if (!idValidation.success) {
      throw new HttpError("Invalid global attribute ID.", 400);
    }

    const body = await readJsonBody(request);

    const validation = updateGlobalAttributeSchema.safeParse(body);

    if (!validation.success) {
      throw new HttpError(
        validation.error.issues[0]?.message ??
          "Invalid global attribute data.",
        400
      );
    }

    const attribute = await updateGlobalAttributeService(
      id,
      validation.data
    );

    return successResponse({
      data: attribute,
      message: "Global attribute updated successfully.",
    });
  } catch (error) {
    return handleControllerError(error);
  }
}

/**
 * DELETE /api/admin/global-attributes/[id]
 */
export async function deleteGlobalAttributeController(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const { id } = await context.params;

    const validation = globalAttributeIdSchema.safeParse({ id });

    if (!validation.success) {
      throw new HttpError("Invalid global attribute ID.", 400);
    }

    await deleteGlobalAttributeService(id);

    return successResponse({
      message: "Global attribute deleted successfully.",
    });
  } catch (error) {
    return handleControllerError(error);
  }
}