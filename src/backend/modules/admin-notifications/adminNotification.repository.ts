
import { randomUUID } from "crypto";
import type { Knex } from "knex";
import db from "../../database/knex";

/* =========================================================
   Types & Interfaces
========================================================= */

export type DatabaseConnection = Knex | Knex.Transaction;

export type AdminNotificationType =
  | "NEW_ORDER"
  | "ORDER_STATUS_CHANGED"
  | "LOW_STOCK"
  | "SYSTEM";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: Date;
}

export interface AdminNotificationRecipient {
  id: string;
  notification_id: string;
  admin_user_id: string;
  read_at: Date | null;
  created_at: Date;
}

export interface AdminNotificationChannel {
  id: string;
  admin_user_id: string;
  channel: "telegram";
  external_id: string;
  is_enabled: boolean;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminNotificationWithReadStatus
  extends AdminNotification {
  read_at: Date | null;
}

export interface CreateAdminNotificationData {
  id?: string;
  type: AdminNotificationType | string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
}

export interface CreateNotificationRecipientData {
  id?: string;
  notification_id: string;
  admin_user_id: string;
}

export interface CreateTelegramChannelData {
  id?: string;
  admin_user_id: string;
  channel?: "telegram";
  external_id: string;
  is_enabled?: boolean;
  verified_at?: Date | null;
}

export interface AdminNotificationFilters {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}

export interface PaginatedAdminNotifications {
  data: AdminNotificationWithReadStatus[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    unread_count: number;
  };
}

export interface TelegramRecipient {
  admin_user_id: string;
  external_id: string;
}

/* =========================================================
   Constants
========================================================= */

const NOTIFICATIONS_TABLE = "admin_notifications";
const RECIPIENTS_TABLE = "admin_notification_recipients";
const CHANNELS_TABLE = "admin_notification_channels";
const ADMINS_TABLE = "admin_users";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/* =========================================================
   Notifications
========================================================= */

/**
 * Create a notification.
 */
export async function createAdminNotification(
  data: CreateAdminNotificationData,
  connection: DatabaseConnection = db,
): Promise<AdminNotification> {
  const id = data.id ?? randomUUID();

  await connection(NOTIFICATIONS_TABLE).insert({
    id,
    type: data.type,
    title: data.title,
    message: data.message,
    entity_type: data.entity_type ?? null,
    entity_id: data.entity_id ?? null,
  });

  const notification = await findAdminNotificationById(
    id,
    connection,
  );

  if (!notification) {
    throw new Error("ADMIN_NOTIFICATION_CREATE_FAILED");
  }

  return notification;
}

/**
 * Find notification by ID.
 */
export async function findAdminNotificationById(
  id: string,
  connection: DatabaseConnection = db,
): Promise<AdminNotification | null> {
  const notification = await connection<AdminNotification>(
    NOTIFICATIONS_TABLE,
  )
    .where({ id })
    .first();

  return notification ?? null;
}

/**
 * Delete notification.
 * Recipients are deleted automatically through ON DELETE CASCADE.
 */
export async function deleteAdminNotification(
  id: string,
  connection: DatabaseConnection = db,
): Promise<boolean> {
  const affectedRows = await connection(NOTIFICATIONS_TABLE)
    .where({ id })
    .delete();

  return affectedRows > 0;
}

/* =========================================================
   Notification Recipients
========================================================= */

/**
 * Add a recipient to a notification.
 */
export async function createNotificationRecipient(
  data: CreateNotificationRecipientData,
  connection: DatabaseConnection = db,
): Promise<AdminNotificationRecipient> {
  const id = data.id ?? randomUUID();

  await connection(RECIPIENTS_TABLE).insert({
    id,
    notification_id: data.notification_id,
    admin_user_id: data.admin_user_id,
  });

  const recipient = await connection<AdminNotificationRecipient>(
    RECIPIENTS_TABLE,
  )
    .where({ id })
    .first();

  if (!recipient) {
    throw new Error("NOTIFICATION_RECIPIENT_CREATE_FAILED");
  }

  return recipient;
}

/**
 * Add multiple recipients to a notification.
 * Duplicate admin IDs are removed before insertion.
 */
export async function createNotificationRecipients(
  notificationId: string,
  adminUserIds: string[],
  connection: DatabaseConnection = db,
): Promise<void> {
  const uniqueAdminIds = [...new Set(adminUserIds)].filter(Boolean);

  if (uniqueAdminIds.length === 0) {
    return;
  }

  await connection(RECIPIENTS_TABLE).insert(
    uniqueAdminIds.map((adminUserId) => ({
      id: randomUUID(),
      notification_id: notificationId,
      admin_user_id: adminUserId,
    })),
  );
}

/**
 * Find a notification recipient.
 */
export async function findNotificationRecipient(
  notificationId: string,
  adminUserId: string,
  connection: DatabaseConnection = db,
): Promise<AdminNotificationRecipient | null> {
  const recipient = await connection<AdminNotificationRecipient>(
    RECIPIENTS_TABLE,
  )
    .where({
      notification_id: notificationId,
      admin_user_id: adminUserId,
    })
    .first();

  return recipient ?? null;
}

/**
 * Check whether a notification belongs to an admin.
 */
export async function isNotificationAssignedToAdmin(
  notificationId: string,
  adminUserId: string,
  connection: DatabaseConnection = db,
): Promise<boolean> {
  const recipient = await connection(RECIPIENTS_TABLE)
    .where({
      notification_id: notificationId,
      admin_user_id: adminUserId,
    })
    .first("id");

  return Boolean(recipient);
}

/**
 * Mark one notification as read.
 * Only the assigned admin can mark it as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
  adminUserId: string,
  connection: DatabaseConnection = db,
): Promise<boolean> {
  const affectedRows = await connection(RECIPIENTS_TABLE)
    .where({
      notification_id: notificationId,
      admin_user_id: adminUserId,
    })
    .whereNull("read_at")
    .update({
      read_at: connection.fn.now(),
    });

  return affectedRows > 0;
}

/**
 * Mark all notifications as read for an admin.
 */
export async function markAllNotificationsAsRead(
  adminUserId: string,
  connection: DatabaseConnection = db,
): Promise<number> {
  const affectedRows = await connection(RECIPIENTS_TABLE)
    .where({ admin_user_id: adminUserId })
    .whereNull("read_at")
    .update({
      read_at: connection.fn.now(),
    });

  return Number(affectedRows);
}

/**
 * Count unread notifications for an admin.
 */
export async function countUnreadNotifications(
  adminUserId: string,
  connection: DatabaseConnection = db,
): Promise<number> {
  const result = await connection(RECIPIENTS_TABLE)
    .where({ admin_user_id: adminUserId })
    .whereNull("read_at")
    .count({ total: "id" })
    .first();

  return Number(result?.total ?? 0);
}

/* =========================================================
   Admin Notifications Queries
========================================================= */

/**
 * Get notifications assigned to an admin with pagination.
 */
export async function findAdminNotificationsPaginated(
  adminUserId: string,
  filters: AdminNotificationFilters = {},
  connection: DatabaseConnection = db,
): Promise<PaginatedAdminNotifications> {
  const page = Math.max(
    1,
    Math.floor(filters.page ?? 1),
  );

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(filters.limit ?? DEFAULT_LIMIT),
    ),
  );

  const offset = (page - 1) * limit;

  const buildQuery = () => {
    const query = connection<AdminNotificationWithReadStatus>(
      `${NOTIFICATIONS_TABLE} as n`,
    )
      .join(
        `${RECIPIENTS_TABLE} as r`,
        "r.notification_id",
        "n.id",
      )
      .where("r.admin_user_id", adminUserId);

    if (filters.unread_only === true) {
      query.whereNull("r.read_at");
    }

    return query;
  };

  const [
    data,
    countResult,
    unreadResult,
  ] = await Promise.all([
    buildQuery()
      .select(
        "n.id",
        "n.type",
        "n.title",
        "n.message",
        "n.entity_type",
        "n.entity_id",
        "n.created_at",
        "r.read_at",
      )
      .orderBy("n.created_at", "desc")
      .limit(limit)
      .offset(offset),

    connection(`${NOTIFICATIONS_TABLE} as n`)
      .join(
        `${RECIPIENTS_TABLE} as r`,
        "r.notification_id",
        "n.id",
      )
      .where("r.admin_user_id", adminUserId)
      .modify((query) => {
        if (filters.unread_only === true) {
          query.whereNull("r.read_at");
        }
      })
      .countDistinct({ total: "n.id" })
      .first(),

    connection(RECIPIENTS_TABLE)
      .where({ admin_user_id: adminUserId })
      .whereNull("read_at")
      .count({ total: "id" })
      .first(),
  ]);

  const total = Number(countResult?.total ?? 0);
  const unreadCount = Number(unreadResult?.total ?? 0);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      unread_count: unreadCount,
    },
  };
}

/* =========================================================
   Admin Users
========================================================= */

/**
 * Get active admin IDs by roles.
 *
 * Default recipients:
 * super_admin, admin, manager.
 */
export async function findActiveAdminUserIds(
  roles: string[] = [
    "super_admin",
    "admin",
    "manager",
  ],
  connection: DatabaseConnection = db,
): Promise<string[]> {
  if (roles.length === 0) {
    return [];
  }

  const rows = await connection(ADMINS_TABLE)
    .select("id")
    .where("is_active", true)
    .whereIn("role", roles);

  return rows.map((row: { id: string }) => row.id);
}

/**
 * Check whether an admin account is active.
 */
export async function isAdminUserActive(
  adminUserId: string,
  connection: DatabaseConnection = db,
): Promise<boolean> {
  const admin = await connection(ADMINS_TABLE)
    .where({
      id: adminUserId,
      is_active: true,
    })
    .first("id");

  return Boolean(admin);
}

/* =========================================================
   Notification Channels - Telegram
========================================================= */

/**
 * Find Telegram channel by admin ID.
 */
export async function findAdminTelegramChannel(
  adminUserId: string,
  connection: DatabaseConnection = db,
): Promise<AdminNotificationChannel | null> {
  const channel = await connection<AdminNotificationChannel>(
    CHANNELS_TABLE,
  )
    .where({
      admin_user_id: adminUserId,
      channel: "telegram",
    })
    .first();

  return channel ?? null;
}

/**
 * Create a Telegram channel for an admin.
 */
export async function createAdminTelegramChannel(
  data: CreateTelegramChannelData,
  connection: DatabaseConnection = db,
): Promise<AdminNotificationChannel> {
  const id = data.id ?? randomUUID();

  await connection(CHANNELS_TABLE).insert({
    id,
    admin_user_id: data.admin_user_id,
    channel: data.channel ?? "telegram",
    external_id: data.external_id,
    is_enabled: data.is_enabled ?? true,
    verified_at: data.verified_at ?? null,
  });

  const channel = await connection<AdminNotificationChannel>(
    CHANNELS_TABLE,
  )
    .where({ id })
    .first();

  if (!channel) {
    throw new Error("ADMIN_TELEGRAM_CHANNEL_CREATE_FAILED");
  }

  return channel;
}

/**
 * Update Telegram channel.
 */
export async function updateAdminTelegramChannel(
  adminUserId: string,
  data: {
    external_id?: string;
    is_enabled?: boolean;
    verified_at?: Date | null;
  },
  connection: DatabaseConnection = db,
): Promise<AdminNotificationChannel | null> {
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: connection.fn.now(),
  };

  const affectedRows = await connection(CHANNELS_TABLE)
    .where({
      admin_user_id: adminUserId,
      channel: "telegram",
    })
    .update(updateData);

  if (!affectedRows) {
    return null;
  }

  return findAdminTelegramChannel(adminUserId, connection);
}

/**
 * Save Telegram channel.
 *
 * Creates the channel if it does not exist,
 * otherwise updates the existing channel.
 */
export async function saveAdminTelegramChannel(
  adminUserId: string,
  externalId: string,
  connection: DatabaseConnection = db,
): Promise<AdminNotificationChannel> {
  const existing = await findAdminTelegramChannel(
    adminUserId,
    connection,
  );

  if (existing) {
    const updated = await updateAdminTelegramChannel(
      adminUserId,
      {
        external_id: externalId,
        is_enabled: true,
        verified_at: null,
      },
      connection,
    );

    if (!updated) {
      throw new Error("ADMIN_TELEGRAM_CHANNEL_UPDATE_FAILED");
    }

    return updated;
  }

  return createAdminTelegramChannel(
    {
      admin_user_id: adminUserId,
      external_id: externalId,
      channel: "telegram",
      is_enabled: true,
    },
    connection,
  );
}

/**
 * Enable or disable Telegram notifications for an admin.
 */
export async function setAdminTelegramChannelStatus(
  adminUserId: string,
  isEnabled: boolean,
  connection: DatabaseConnection = db,
): Promise<boolean> {
  const affectedRows = await connection(CHANNELS_TABLE)
    .where({
      admin_user_id: adminUserId,
      channel: "telegram",
    })
    .update({
      is_enabled: isEnabled,
      updated_at: connection.fn.now(),
    });

  return affectedRows > 0;
}

/**
 * Get enabled Telegram recipients for selected admins.
 * Only active admin accounts are returned.
 */
export async function findEnabledTelegramRecipients(
  adminUserIds: string[],
  connection: DatabaseConnection = db,
): Promise<TelegramRecipient[]> {
  const uniqueIds = [...new Set(adminUserIds)].filter(Boolean);

  if (uniqueIds.length === 0) {
    return [];
  }

  return connection(`${CHANNELS_TABLE} as c`)
    .join(
      `${ADMINS_TABLE} as a`,
      "a.id",
      "c.admin_user_id",
    )
    .whereIn("c.admin_user_id", uniqueIds)
    .where("c.channel", "telegram")
    .where("c.is_enabled", true)
    .where("a.is_active", true)
    .select(
      "c.admin_user_id",
      "c.external_id",
    ) as Promise<TelegramRecipient[]>;
}

/**
 * Get all enabled Telegram recipients by admin roles.
 */
export async function findEnabledTelegramRecipientsByRoles(
  roles: string[] = [
    "super_admin",
    "admin",
    "manager",
  ],
  connection: DatabaseConnection = db,
): Promise<TelegramRecipient[]> {
  if (roles.length === 0) {
    return [];
  }

  return connection(`${CHANNELS_TABLE} as c`)
    .join(
      `${ADMINS_TABLE} as a`,
      "a.id",
      "c.admin_user_id",
    )
    .where("c.channel", "telegram")
    .where("c.is_enabled", true)
    .where("a.is_active", true)
    .whereIn("a.role", roles)
    .select(
      "c.admin_user_id",
      "c.external_id",
    ) as Promise<TelegramRecipient[]>;
}
