
import { z } from "zod";

/**
 * Shared validation rules
 */

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(254, "Email must not exceed 254 characters.")
  .email("Invalid email address.");

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must contain at least 3 characters.")
  .max(100, "Username must not exceed 100 characters.")
  .regex(
    /^[a-zA-Z0-9_.-]+$/,
    "Username can contain only letters, numbers, dots, underscores, and hyphens.",
  );

const passwordSchema = z
  .string()
  .min(6, "Password must contain at least 6 characters.")
  .max(128, "Password must not exceed 128 characters.");

const adminRoleSchema = z.enum([
  "super_admin",
  "admin",
  "manager",
  "support",
]);

/**
 * Login
 */

export const adminLoginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, "Email or username is required.")
      .max(254, "Email or username must not exceed 254 characters."),

    password: z
      .string()
      .min(1, "Password is required.")
      .max(128, "Password must not exceed 128 characters."),

    rememberMe: z.boolean().optional().default(false),
  })
  .strict();

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * Create an admin account
 */

export const createAdminSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: adminRoleSchema.optional().default("admin"),
  })
  .strict();

export type CreateAdminValidationInput = z.infer<
  typeof createAdminSchema
>;

/**
 * Update admin profile
 */

export const updateAdminSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    role: adminRoleSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided.",
    },
  );

export type UpdateAdminValidationInput = z.infer<
  typeof updateAdminSchema
>;

/**
 * Change password
 */

export const changeAdminPasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required.")
      .max(128, "Current password must not exceed 128 characters."),

    newPassword: passwordSchema,
  })
  .strict()
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: "New password must differ from current password.",
      path: ["newPassword"],
    },
  );

export type ChangeAdminPasswordInput = z.infer<
  typeof changeAdminPasswordSchema
>;

/**
 * Update admin account status
 */

export const updateAdminStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type UpdateAdminStatusInput = z.infer<
  typeof updateAdminStatusSchema
>;

/**
 * List admins
 */

export const listAdminsQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),

    role: adminRoleSchema.optional(),

    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    sortBy: z
      .enum(["username", "email", "role", "created_at", "last_login_at"])
      .default("created_at"),

    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc"),
  })
  .strict();

export type ListAdminsQueryInput = z.infer<
  typeof listAdminsQuerySchema
>;

/**
 * Revoke a specific admin session
 */

export const revokeAdminSessionSchema = z
  .object({
    sessionId: z.string().uuid("Invalid session ID."),
  })
  .strict();

export type RevokeAdminSessionInput = z.infer<
  typeof revokeAdminSessionSchema
>;