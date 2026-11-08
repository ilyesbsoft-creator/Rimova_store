
import { randomUUID } from "crypto";
import type { Knex } from "knex";

import db from "../../database/knex";

import {
  createAdminNotification as createAdminNotificationRepository,
  createNotificationRecipients,
  findActiveAdminUserIds,
  findAdminNotificationById,
  findAdminNotificationsPaginated,
  findEnabledTelegramRecipients,
  findAdminTelegramChannel,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  saveAdminTelegramChannel,
  setAdminTelegramChannelStatus,
  isNotificationAssignedToAdmin,
} from "./adminNotification.repository";

import type {
  AdminNotification,
  AdminNotificationType,
  AdminNotificationFilters,
  AdminNotificationWithReadStatus,
  PaginatedAdminNotifications,
} from "./adminNotification.repository";

import {
  sendTelegramMessageSafely,
} from "../../services/telegram/telegram.service";

/* =========================================================
   Constants
========================================================= */

const DEFAULT_RECIPIENT_ROLES = [
  "super_admin",
  "admin",
  "manager",
];

const DEFAULT_CURRENCY = "DZD";

/* =========================================================
   Types & Interfaces
========================================================= */

export interface CreateAdminNotificationInput {
  type: AdminNotificationType | string;
  title: string;
  message: string;

  entity_type?: string | null;
  entity_id?: string | null;

  /**
   * Explicit recipient IDs.
   * When provided, they override recipient_roles.
   */
  recipient_admin_ids?: string[];

  /**
   * Admin roles that should receive the notification.
   */
  recipient_roles?: string[];

  /**
   * Optional custom Telegram message.
   */
  telegram_message?: string;

  /**
   * Whether Telegram notifications should be sent.
   */
  send_telegram?: boolean;
}

export interface CreateAdminNotificationResult {
  notification: AdminNotification;
  recipients_count: number;

  telegram: {
    attempted: number;
    sent: number;
    failed: number;
  };
}

export interface NewOrderNotificationInput {
  order_id: string;
  order_number: string;

  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;

  total: number;

  currency?: string;

  /**
   * Optional URL to the admin order details page.
   */
  order_url?: string;

  /**
   * Optional explicit recipients.
   */
  recipient_admin_ids?: string[];
}

export interface NotificationListResult
  extends PaginatedAdminNotifications {}

export interface TelegramConnectionResult {
  connected: boolean;
  admin_user_id: string;
}

export interface TelegramTestResult {
  sent: boolean;
  error?: string;
}

/* =========================================================
   Helpers
========================================================= */

/**
 * Normalize and remove duplicate admin IDs.
 */
function normalizeAdminIds(adminIds: string[]): string[] {
  return [
    ...new Set(
      adminIds
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * Format an amount using the selected currency.
 */
function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("INVALID_NOTIFICATION_AMOUNT");
  }

  return `${new Intl.NumberFormat("en-US").format(amount)} ${currency}`;
}

/**
 * Build a Telegram notification for a new order.
 *
 * Telegram receives plain text, not HTML.
 */
function buildNewOrderTelegramMessage(
  input: NewOrderNotificationInput,
): string {
  const customerName = [
    input.customer_first_name,
    input.customer_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const lines = [
    "🛍 NEW RIMOVA ORDER",
    "",
    `Order: ${input.order_number}`,
    `Customer: ${customerName}`,
    `Phone: ${input.customer_phone}`,
    `Total: ${formatCurrency(
      input.total,
      input.currency,
    )}`,
    "",
    "Status: PENDING",
  ];

  if (input.order_url) {
    lines.push("");
    lines.push(`View order: ${input.order_url}`);
  }

  return lines.join("\n");
}

/**
 * Build a default Telegram notification message.
 */
function buildTelegramMessage(
  title: string,
  message: string,
): string {
  return `${title}\n\n${message}`;
}

/* =========================================================
   Create Notification
========================================================= */

/**
 * Create an admin notification and assign its recipients.
 *
 * Database operations are performed inside one transaction.
 * Telegram delivery happens only after the transaction commits.
 */
export async function createAdminNotification(
  input: CreateAdminNotificationInput,
): Promise<CreateAdminNotificationResult> {
  const title = input.title.trim();
  const message = input.message.trim();
  const type = input.type.trim();

  if (!type) {
    throw new Error("NOTIFICATION_TYPE_REQUIRED");
  }

  if (!title) {
    throw new Error("NOTIFICATION_TITLE_REQUIRED");
  }

  if (!message) {
    throw new Error("NOTIFICATION_MESSAGE_REQUIRED");
  }

  let recipientAdminIds: string[];

  if (input.recipient_admin_ids !== undefined) {
    recipientAdminIds = normalizeAdminIds(
      input.recipient_admin_ids,
    );
  } else {
    const roles =
      input.recipient_roles ?? DEFAULT_RECIPIENT_ROLES;

    recipientAdminIds = await findActiveAdminUserIds(roles);
  }

  const notificationId = randomUUID();

  let notification: AdminNotification;

  /*
   * Notification and recipients must be saved together.
   */
  await db.transaction(async (trx: Knex.Transaction) => {
    notification = await createAdminNotificationRepository(
      {
        id: notificationId,
        type,
        title,
        message,
        entity_type: input.entity_type ?? null,
        entity_id: input.entity_id ?? null,
      },
      trx,
    );

    await createNotificationRecipients(
      notificationId,
      recipientAdminIds,
      trx,
    );
  });

  /*
   * Retrieve Telegram channels only after the transaction commits.
   */
  let telegramResult = {
    attempted: 0,
    sent: 0,
    failed: 0,
  };

  if (
    input.send_telegram !== false &&
    recipientAdminIds.length > 0
  ) {
    const telegramRecipients =
      await findEnabledTelegramRecipients(
        recipientAdminIds,
      );

    const telegramMessage =
      input.telegram_message?.trim() ||
      buildTelegramMessage(title, message);

    telegramResult.attempted = telegramRecipients.length;

    /*
     * Send messages independently.
     * A failed Telegram delivery must not invalidate
     * the database notification.
     */
    const results = await Promise.all(
      telegramRecipients.map((recipient) =>
        sendTelegramMessageSafely(
          recipient.external_id,
          telegramMessage,
        ),
      ),
    );

    telegramResult.sent = results.filter(
      (result) => result.ok,
    ).length;

    telegramResult.failed =
      telegramResult.attempted - telegramResult.sent;
  }

  /*
   * The notification is already persisted.
   */
  return {
    notification: notification!,
    recipients_count: recipientAdminIds.length,
    telegram: telegramResult,
  };
}

/* =========================================================
   New Order Notifications
========================================================= */

/**
 * Notify selected administrators when a new order is created.
 *
 * IMPORTANT:
 * Call this function AFTER the order transaction commits.
 *
 * Notification errors are intentionally isolated from
 * the order creation process.
 */
export async function notifyNewOrder(
  input: NewOrderNotificationInput,
): Promise<{
  success: boolean;
  notification_id?: string;
}> {
  try {
    if (!input.order_id || !input.order_number) {
      throw new Error("INVALID_ORDER_NOTIFICATION_DATA");
    }

    const customerName = [
      input.customer_first_name,
      input.customer_last_name,
    ]
      .filter(Boolean)
      .join(" ");

    const total = formatCurrency(
      input.total,
      input.currency,
    );

    const message = [
      `Order: ${input.order_number}`,
      `Customer: ${customerName}`,
      `Phone: ${input.customer_phone}`,
      `Total: ${total}`,
      "Status: PENDING",
    ].join("\n");

    const result = await createAdminNotification({
      type: "NEW_ORDER",
      title: `New Order #${input.order_number}`,
      message,

      entity_type: "order",
      entity_id: input.order_id,

      recipient_admin_ids: input.recipient_admin_ids,

      telegram_message: buildNewOrderTelegramMessage(input),

      send_telegram: true,
    });

    return {
      success: true,
      notification_id: result.notification.id,
    };
  } catch (error) {
    /*
     * Never let notification failure cancel an existing order.
     */
    console.error(
      "[adminNotification.service] New order notification failed:",
      error instanceof Error
        ? error.message
        : error,
    );

    return {
      success: false,
    };
  }
}

/* =========================================================
   Get Notifications
========================================================= */

/**
 * Get notifications belonging to an authenticated admin.
 */
export async function getAdminNotifications(
  adminUserId: string,
  filters: AdminNotificationFilters = {},
): Promise<NotificationListResult> {
  if (!adminUserId) {
    throw new Error("ADMIN_USER_ID_REQUIRED");
  }

  return findAdminNotificationsPaginated(
    adminUserId,
    filters,
  );
}

/**
 * Get unread notifications count.
 */
export async function getAdminUnreadNotificationsCount(
  adminUserId: string,
): Promise<number> {
  if (!adminUserId) {
    throw new Error("ADMIN_USER_ID_REQUIRED");
  }

  return countUnreadNotifications(adminUserId);
}

/* =========================================================
   Read Notifications
========================================================= */

/**
 * Mark a specific notification as read.
 *
 * Returns false if:
 * - Notification does not belong to the admin.
 * - Notification is already read.
 */
export async function markAdminNotificationAsRead(
  notificationId: string,
  adminUserId: string,
): Promise<boolean> {
  if (!notificationId || !adminUserId) {
    throw new Error("INVALID_NOTIFICATION_READ_REQUEST");
  }

  const isAssigned = await isNotificationAssignedToAdmin(
    notificationId,
    adminUserId,
  );

  if (!isAssigned) {
    return false;
  }

  return markNotificationAsRead(
    notificationId,
    adminUserId,
  );
}

/**
 * Mark all notifications as read for an admin.
 */
export async function markAllAdminNotificationsAsRead(
  adminUserId: string,
): Promise<number> {
  if (!adminUserId) {
    throw new Error("ADMIN_USER_ID_REQUIRED");
  }

  return markAllNotificationsAsRead(adminUserId);
}

/* =========================================================
   Telegram Connection
========================================================= */

/**
 * Connect or update an admin Telegram chat ID.
 *
 * This stores the supplied chat ID.
 * It does not independently verify Telegram ownership.
 */
export async function connectAdminTelegram(
  adminUserId: string,
  chatId: string,
): Promise<TelegramConnectionResult> {
  const normalizedChatId = chatId.trim();

  if (!adminUserId) {
    throw new Error("ADMIN_USER_ID_REQUIRED");
  }

  if (!/^-?\d{1,20}$/.test(normalizedChatId)) {
    throw new Error("INVALID_TELEGRAM_CHAT_ID");
  }

  await saveAdminTelegramChannel(
    adminUserId,
    normalizedChatId,
  );

  return {
    connected: true,
    admin_user_id: adminUserId,
  };
}

/**
 * Enable or disable Telegram notifications.
 */
export async function setAdminTelegramNotifications(
  adminUserId: string,
  enabled: boolean,
): Promise<boolean> {
  if (!adminUserId) {
    throw new Error("ADMIN_USER_ID_REQUIRED");
  }

  return setAdminTelegramChannelStatus(
    adminUserId,
    enabled,
  );
}

/**
 * Get Telegram connection information.
 *
 * Do not expose external_id in public admin API responses
 * unless it is actually needed by the UI.
 */
export async function getAdminTelegramConnection(
  adminUserId: string,
): Promise<{
  connected: boolean;
  enabled: boolean;
  verified: boolean;
}> {
  if (!adminUserId) {
    throw new Error("ADMIN_USER_ID_REQUIRED");
  }

  const channel = await findAdminTelegramChannel(
    adminUserId,
  );

  return {
    connected: Boolean(channel),
    enabled: channel?.is_enabled ?? false,
    verified: Boolean(channel?.verified_at),
  };
}

/**
 * Send a test message to the authenticated admin's Telegram.
 */
export async function sendAdminTelegramTestMessage(
  adminUserId: string,
): Promise<TelegramTestResult> {
  if (!adminUserId) {
    throw new Error("ADMIN_USER_ID_REQUIRED");
  }

  const channel = await findAdminTelegramChannel(
    adminUserId,
  );

  if (!channel) {
    return {
      sent: false,
      error: "TELEGRAM_NOT_CONNECTED",
    };
  }

  if (!channel.is_enabled) {
    return {
      sent: false,
      error: "TELEGRAM_NOT_ENABLED",
    };
  }

  const result = await sendTelegramMessageSafely(
    channel.external_id,
    [
      "✅ RIMOVA Telegram Test",
      "",
      "Your Telegram notifications are configured.",
      "You will receive new order notifications here.",
    ].join("\n"),
  );

  if (!result.ok) {
    return {
      sent: false,
      error: result.error,
    };
  }

  return {
    sent: true,
  };
}

/* =========================================================
   Notification Details
========================================================= */

/**
 * Get a notification only if it belongs to the admin.
 *
 * Prevents administrators from accessing other admins'
 * notification records through the service layer.
 */
export async function getAdminNotificationById(
  notificationId: string,
  adminUserId: string,
): Promise<AdminNotificationWithReadStatus | null> {
  if (!notificationId || !adminUserId) {
    throw new Error("INVALID_NOTIFICATION_REQUEST");
  }

  const isAssigned = await isNotificationAssignedToAdmin(
    notificationId,
    adminUserId,
  );

  if (!isAssigned) {
    return null;
  }

  const notification = await findAdminNotificationById(
    notificationId,
  );

  if (!notification) {
    return null;
  }

  /*
   * Read status is stored in the recipient table.
   */
  const result = await findAdminNotificationsPaginated(
    adminUserId,
    {
      page: 1,
      limit: 1,
    },
  );

  const recipient = result.data.find(
    (item) => item.id === notificationId,
  );

  if (!recipient) {
    return null;
  }

  return recipient;
}
