import { randomUUID } from "crypto";

import {
  createGlobalAttribute,
  deleteGlobalAttribute,
  findAllGlobalAttributes,
  findGlobalAttributeById,
  findGlobalAttributeByName,
  updateGlobalAttribute,
  type GlobalAttributeRow,
} from "./global-attribute.repository";

export type CreateGlobalAttributeServiceInput = {
  name: string;
  type: string;
};

export type UpdateGlobalAttributeServiceInput = {
  name: string;
  type: string;
};

export class GlobalAttributeServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "GlobalAttributeServiceError";
  }
}

function normalizeName(name: string): string {
  return name.trim();
}

function normalizeType(type: string): string {
  return type.trim();
}

async function ensureUniqueName(
  name: string,
  excludeId?: string
): Promise<void> {
  const existing = await findGlobalAttributeByName(name);

  if (existing && existing.id !== excludeId) {
    throw new GlobalAttributeServiceError(
      "A global attribute with this name already exists.",
      409
    );
  }
}

export async function getAllGlobalAttributes(): Promise<
  GlobalAttributeRow[]
> {
  return findAllGlobalAttributes();
}

export async function getGlobalAttributeById(
  id: string
): Promise<GlobalAttributeRow> {
  const attribute = await findGlobalAttributeById(id);

  if (!attribute) {
    throw new GlobalAttributeServiceError(
      "Global attribute not found.",
      404
    );
  }

  return attribute;
}

export async function createGlobalAttributeService(
  input: CreateGlobalAttributeServiceInput
): Promise<GlobalAttributeRow> {
  const name = normalizeName(input.name);
  const type = normalizeType(input.type);

  await ensureUniqueName(name);

  const id = randomUUID();

  try {
    await createGlobalAttribute({
      id,
      name,
      type,
    });
  } catch (error) {
    // حماية إضافية من تكرار الاسم عند حدوث طلبين متزامنين.
    if (
      (error as { code?: string })?.code === "ER_DUP_ENTRY"
    ) {
      throw new GlobalAttributeServiceError(
        "A global attribute with this name already exists.",
        409
      );
    }

    throw error;
  }

  const createdAttribute = await findGlobalAttributeById(id);

  if (!createdAttribute) {
    throw new GlobalAttributeServiceError(
      "Failed to retrieve the created global attribute.",
      500
    );
  }

  return createdAttribute;
}

export async function updateGlobalAttributeService(
  id: string,
  input: UpdateGlobalAttributeServiceInput
): Promise<GlobalAttributeRow> {
  const existing = await findGlobalAttributeById(id);

  if (!existing) {
    throw new GlobalAttributeServiceError(
      "Global attribute not found.",
      404
    );
  }

  const name = normalizeName(input.name);
  const type = normalizeType(input.type);

  await ensureUniqueName(name, id);

  try {
    await updateGlobalAttribute(id, {
      name,
      type,
    });
  } catch (error) {
    if (
      (error as { code?: string })?.code === "ER_DUP_ENTRY"
    ) {
      throw new GlobalAttributeServiceError(
        "A global attribute with this name already exists.",
        409
      );
    }

    throw error;
  }

  const updatedAttribute = await findGlobalAttributeById(id);

  if (!updatedAttribute) {
    throw new GlobalAttributeServiceError(
      "Failed to retrieve the updated global attribute.",
      500
    );
  }

  return updatedAttribute;
}

export async function deleteGlobalAttributeService(
  id: string
): Promise<void> {
  const existing = await findGlobalAttributeById(id);

  if (!existing) {
    throw new GlobalAttributeServiceError(
      "Global attribute not found.",
      404
    );
  }

  try {
    await deleteGlobalAttribute(id);
  } catch (error) {
    if (
      (error as { code?: string })?.code === "ER_ROW_IS_REFERENCED_2"
    ) {
      throw new GlobalAttributeServiceError(
        "Cannot delete this attribute because it is being used.",
        409
      );
    }

    throw error;
  }
}