import { z } from "zod";

export const createGlobalAttributeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Attribute name is required.")
    .max(100, "Attribute name cannot exceed 100 characters."),

  type: z
    .string()
    .trim()
    .min(1, "Attribute type is required.")
    .max(30, "Attribute type cannot exceed 30 characters."),
});

export const updateGlobalAttributeSchema =
  createGlobalAttributeSchema;

export const globalAttributeIdSchema = z.object({
  id: z.string().uuid("Invalid global attribute ID."),
});

export type CreateGlobalAttributeDTO = z.infer<
  typeof createGlobalAttributeSchema
>;

export type UpdateGlobalAttributeDTO = z.infer<
  typeof updateGlobalAttributeSchema
>;