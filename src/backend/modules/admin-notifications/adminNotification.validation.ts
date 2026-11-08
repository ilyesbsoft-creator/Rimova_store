
import { z } from "zod";

const uuidSchema = z.string().uuid();

const notificationTypeSchema = z.enum([
  "NEW_ORDER",
  "ORDER_STATUS_CHANGED",
  "LOW_STOCK",
  "SYSTEM",
]);

const adminRoleSchema = z.enum([
  "super_admin",
  "admin",
  "manager",
  "support",
]);

/**
 * Create an admin notification.
 */
export const createAdminNotificationSchema = z
  .object({
    type: notificationTypeSchema,

    title: z.string().trim().min(1).max(150),

    message: z.string().trim().min(1),

    entity_type: z.string().trim().max(50).nullable().optional(),

    entity_id: uuidSchema.nullable().optional(),

    recipient_admin_ids: z
      .array(uuidSchema)
      .max(100)
      .optional(),

    recipient_roles: z
      .array(adminRoleSchema)
      .min(1)
      .optional(),

    telegram_message: z.string().trim().min(1).optional(),

    send_telegram: z.boolean().optional().default(false),
  })
  .refine(
    (data) =>
      !data.recipient_admin_ids ||
      new Set(data.recipient_admin_ids).size ===
        data.recipient_admin_ids.length,
    {
      message: "Recipient admin IDs must be unique.",
      path: ["recipient_admin_ids"],
    },
  );

export type CreateAdminNotificationValidation = z.infer<
  typeof createAdminNotificationSchema
>;

/**
 * Admin notification list filters.
 */
export const getAdminNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  unread_only: z.preprocess((value) => {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;

    return value;
  }, z.boolean().default(false)),
});

export type GetAdminNotificationsValidation = z.infer<
  typeof getAdminNotificationsSchema
>;

/**
 * Notification ID parameter.
 */
export const notificationIdSchema = z.object({
  id: uuidSchema,
});

/**
 * Connect Telegram account.
 */
export const connectAdminTelegramSchema = z.object({
  chat_id: z
    .string()
    .trim()
    .regex(/^-?\d+$/, "Invalid Telegram chat ID.")
    .max(100),
});

export type ConnectAdminTelegramValidation = z.infer<
  typeof connectAdminTelegramSchema
>;

/**
 * Enable or disable Telegram notifications.
 */
export const updateAdminTelegramSettingsSchema = z.object({
  is_enabled: z.boolean(),
});

export type UpdateAdminTelegramSettingsValidation = z.infer<
  typeof updateAdminTelegramSettingsSchema
>;
