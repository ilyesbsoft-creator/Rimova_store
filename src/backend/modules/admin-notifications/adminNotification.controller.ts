
import type {
  CreateAdminNotificationInput,
} from "./adminNotification.service";

import {
  createAdminNotification,
  getAdminNotifications,
  getAdminUnreadNotificationsCount,
  getAdminNotificationById,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  connectAdminTelegram,
  setAdminTelegramNotifications,
  getAdminTelegramConnection,
  sendAdminTelegramTestMessage,
} from "./adminNotification.service";

import {
  createAdminNotificationSchema,
  getAdminNotificationsSchema,
  notificationIdSchema,
  connectAdminTelegramSchema,
  updateAdminTelegramSettingsSchema,
} from "./adminNotification.validation";

/**
 * Creates a notification for selected admin recipients.
 */
export async function createAdminNotificationController(
  input: unknown,
) {
  const validatedData = createAdminNotificationSchema.parse(input);

  return createAdminNotification(
    validatedData as CreateAdminNotificationInput,
  );
}

/**
 * Returns paginated notifications for the authenticated admin.
 */
export async function getAdminNotificationsController(
  adminUserId: string,
  query: unknown,
) {
  const filters = getAdminNotificationsSchema.parse(query);

  return getAdminNotifications(adminUserId, filters);
}

/**
 * Returns the unread notifications count.
 */
export async function getAdminUnreadNotificationsCountController(
  adminUserId: string,
) {
  return getAdminUnreadNotificationsCount(adminUserId);
}

/**
 * Returns one notification assigned to the authenticated admin.
 */
export async function getAdminNotificationByIdController(
  adminUserId: string,
  params: unknown,
) {
  const validatedParams = notificationIdSchema.parse(params);

  return getAdminNotificationById(
    validatedParams.id,
    adminUserId,
  );
}

/**
 * Marks one notification as read.
 */
export async function markAdminNotificationAsReadController(
  adminUserId: string,
  params: unknown,
) {
  const validatedParams = notificationIdSchema.parse(params);

  return markAdminNotificationAsRead(
    validatedParams.id,
    adminUserId,
  );
}

/**
 * Marks all notifications as read for the authenticated admin.
 */
export async function markAllAdminNotificationsAsReadController(
  adminUserId: string,
) {
  return markAllAdminNotificationsAsRead(adminUserId);
}

/**
 * Connects a Telegram chat to the authenticated admin account.
 */
export async function connectAdminTelegramController(
  adminUserId: string,
  input: unknown,
) {
  const validatedData = connectAdminTelegramSchema.parse(input);

  return connectAdminTelegram(
    adminUserId,
    validatedData.chat_id,
  );
}

/**
 * Enables or disables Telegram notifications.
 */
export async function updateAdminTelegramSettingsController(
  adminUserId: string,
  input: unknown,
) {
  const validatedData =
    updateAdminTelegramSettingsSchema.parse(input);

  return setAdminTelegramNotifications(
    adminUserId,
    validatedData.is_enabled,
  );
}

/**
 * Returns Telegram connection information.
 */
export async function getAdminTelegramConnectionController(
  adminUserId: string,
) {
  return getAdminTelegramConnection(adminUserId);
}

/**
 * Sends a test Telegram message to the authenticated admin.
 */
export async function sendAdminTelegramTestMessageController(
  adminUserId: string,
) {
  return sendAdminTelegramTestMessage(adminUserId);
}
