
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  RefreshCw,
  Search,
  Plus,
  Send,
  MessageCircle,
  Settings,
  AlertCircle,
  ShoppingBag,
  Package,
  ShieldCheck,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Users,
  Mail,
  Link2,
  Unlink,
  ExternalLink,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type NotificationType =
  | "NEW_ORDER"
  | "ORDER_STATUS_CHANGED"
  | "LOW_STOCK"
  | "SYSTEM";

type AdminRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "support";

type AdminNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  is_read: boolean | number;
  read_at?: string | null;
};

type TelegramConnection = {
  is_connected?: boolean;
  is_enabled?: boolean;
  chat_id?: string | null;
  connected_at?: string | null;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

type NotificationForm = {
  type: NotificationType;
  title: string;
  message: string;
  recipient_roles: AdminRole[];
  telegram_message: string;
  send_telegram: boolean;
};

const PAGE_SIZE = 15;

const INITIAL_FORM: NotificationForm = {
  type: "SYSTEM",
  title: "",
  message: "",
  recipient_roles: ["super_admin", "admin", "manager", "support"],
  telegram_message: "",
  send_telegram: false,
};

const ROLES: {
  value: AdminRole;
  label: string;
}[] = [
  { value: "super_admin", label: "مدير عام" },
  { value: "admin", label: "مدير" },
  { value: "manager", label: "مشرف" },
  { value: "support", label: "دعم فني" },
];

const NOTIFICATION_TYPES: {
  value: NotificationType;
  label: string;
}[] = [
  { value: "NEW_ORDER", label: "طلب جديد" },
  { value: "ORDER_STATUS_CHANGED", label: "تغيير حالة طلب" },
  { value: "LOW_STOCK", label: "مخزون منخفض" },
  { value: "SYSTEM", label: "النظام" },
];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const inputClass =
  "h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-[#252720] outline-none transition placeholder:text-gray-300 focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "حدث خطأ غير متوقع.";
}

function extractData<T>(payload: any): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload as T;
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (
    response.status === 401 &&
    payload?.message === "Invalid or expired session."
  ) {
    window.location.replace("/admin/login");
    throw new Error("Invalid or expired session.");
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error?.message ||
        "حدث خطأ أثناء تنفيذ العملية.",
    );
  }

  return extractData<T>(payload);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isRead(value: boolean | number | undefined) {
  return value === true || value === 1;
}

function getTypeLabel(type: NotificationType) {
  return (
    NOTIFICATION_TYPES.find((item) => item.value === type)?.label ??
    type
  );
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "NEW_ORDER":
      return ShoppingBag;
    case "ORDER_STATUS_CHANGED":
      return RefreshCw;
    case "LOW_STOCK":
      return Package;
    default:
      return Info;
  }
}

function getTypeStyle(type: NotificationType) {
  switch (type) {
    case "NEW_ORDER":
      return "bg-[#edf3e9] text-[#64805b]";
    case "ORDER_STATUS_CHANGED":
      return "bg-[#edf1f6] text-[#647b98]";
    case "LOW_STOCK":
      return "bg-[#fbf1e8] text-[#b07852]";
    default:
      return "bg-[#f1efe8] text-[#85816d]";
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Components                                */
/* -------------------------------------------------------------------------- */

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: typeof Bell;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-gray-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black tabular-nums">
            {value.toLocaleString("ar-DZ")}
          </p>

          <p className="mt-1 text-[10px] text-gray-400">
            {description}
          </p>
        </div>

        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f1efe8] text-[#85816d]">
          <Icon size={21} />
        </span>
      </div>
    </div>
  );
}

function TypeBadge({
  type,
}: {
  type: NotificationType;
}) {
  const Icon = getTypeIcon(type);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${getTypeStyle(type)}`}
    >
      <Icon size={12} />
      {getTypeLabel(type)}
    </span>
  );
}

function ReadBadge({
  read,
}: {
  read: boolean;
}) {
  return read ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f0ec] px-2.5 py-1.5 text-[10px] font-bold text-gray-500">
      <Check size={12} />
      مقروء
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3e9] px-2.5 py-1.5 text-[10px] font-bold text-[#64805b]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#78966d]" />
      جديد
    </span>
  );
}

function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-[#55564e]">
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </span>

      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Main Page                                 */
/* -------------------------------------------------------------------------- */

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<
    AdminNotification[]
  >([]);

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    total_pages: 1,
  });

  const [unreadCount, setUnreadCount] = useState(0);

  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedNotification, setSelectedNotification] =
    useState<AdminNotification | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [readBusyId, setReadBusyId] = useState<string | null>(null);
  const [readAllLoading, setReadAllLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NotificationForm>(INITIAL_FORM);

  const [telegram, setTelegram] =
    useState<TelegramConnection | null>(null);

  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [chatId, setChatId] = useState("");
  const [showChatId, setShowChatId] = useState(false);

  /* ---------------------------------------------------------------------- */
  /*                                  Statistics                            */
  /* ---------------------------------------------------------------------- */

  const readCount = useMemo(
    () =>
      notifications.filter((item) => isRead(item.is_read)).length,
    [notifications],
  );

  const currentUnreadCount = useMemo(
    () =>
      notifications.filter((item) => !isRead(item.is_read)).length,
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    let result = notifications;

    if (typeFilter) {
      result = result.filter((item) => item.type === typeFilter);
    }

    const term = search.trim().toLowerCase();

    if (term) {
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.message.toLowerCase().includes(term),
      );
    }

    return result;
  }, [notifications, typeFilter, search]);

  /* ---------------------------------------------------------------------- */
  /*                              Load Notifications                        */
  /* ---------------------------------------------------------------------- */

  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await apiRequest<any>(
        "/api/admin/notifications/unread-count",
      );

      const count =
        typeof result === "number"
          ? result
          : Number(
              result?.count ??
                result?.unread_count ??
                result?.total ??
                0,
            );

      setUnreadCount(count);
    } catch {
      // The list remains usable even if the counter endpoint fails.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      if (unreadOnly) {
        params.set("unread_only", "true");
      }

      const result = await apiRequest<any>(
        `/api/admin/notifications?${params.toString()}`,
      );

      const list = Array.isArray(result?.notifications)
        ? result.notifications
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];

      const paginationData = result?.pagination ?? {};

      setNotifications(list);

      setPagination({
        total: Number(
          paginationData.total ??
            result?.total ??
            list.length,
        ),
        page: Number(paginationData.page ?? page),
        limit: Number(paginationData.limit ?? PAGE_SIZE),
        total_pages: Number(
          paginationData.total_pages ??
            paginationData.totalPages ??
            Math.max(
              1,
              Math.ceil(
                Number(paginationData.total ?? result?.total ?? list.length) /
                  PAGE_SIZE,
              ),
            ),
        ),
      });
    } catch (error) {
      setError(getErrorMessage(error));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

const loadTelegramConnection = useCallback(async () => {
  setTelegramLoading(true);

  try {
    const result = await apiRequest<any>(
      "/api/admin/notifications/telegram",
    );

    const connection = result?.connection ?? result ?? null;

    if (!connection) {
      setTelegram(null);
      setChatId("");
      return;
    }

    setTelegram({
      ...connection,
      is_connected: Boolean(
        connection.is_connected ?? connection.connected,
      ),
      is_enabled: Boolean(
        connection.is_enabled ?? connection.enabled,
      ),
    });

    setChatId(connection.chat_id ?? "");
  } catch {
    setTelegram(null);
    setChatId("");
  } finally {
    setTelegramLoading(false);
  }
}, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);

    await Promise.all([
      loadNotifications(),
      loadUnreadCount(),
      loadTelegramConnection(),
    ]);

    setRefreshing(false);
  }, [
    loadNotifications,
    loadUnreadCount,
    loadTelegramConnection,
  ]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    void loadTelegramConnection();
  }, [loadTelegramConnection]);

  /* ---------------------------------------------------------------------- */
  /*                              Update Form                               */
  /* ---------------------------------------------------------------------- */

  function updateForm<K extends keyof NotificationForm>(
    key: K,
    value: NotificationForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleRole(role: AdminRole) {
    setForm((current) => ({
      ...current,
      recipient_roles: current.recipient_roles.includes(role)
        ? current.recipient_roles.filter((item) => item !== role)
        : [...current.recipient_roles, role],
    }));
  }

  function openCreateModal() {
    setForm(INITIAL_FORM);
    setError("");
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (saving) return;

    setCreateModalOpen(false);
    setForm(INITIAL_FORM);
  }

  /* ---------------------------------------------------------------------- */
  /*                              Create Notification                      */
  /* ---------------------------------------------------------------------- */

  async function handleCreateNotification(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setNotice("");

    if (!form.title.trim()) {
      setError("عنوان الإشعار مطلوب.");
      return;
    }

    if (!form.message.trim()) {
      setError("محتوى الإشعار مطلوب.");
      return;
    }

    if (form.recipient_roles.length === 0) {
      setError("يجب تحديد مستلم واحد على الأقل.");
      return;
    }

    if (form.send_telegram && !telegram?.is_connected) {
      setError("يجب ربط Telegram أولاً.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          message: form.message.trim(),
          recipient_roles: form.recipient_roles,
          telegram_message: form.send_telegram
            ? form.telegram_message.trim() || form.message.trim()
            : undefined,
          send_telegram: form.send_telegram,
        }),
      });

      setCreateModalOpen(false);
      setForm(INITIAL_FORM);

      setNotice("تم إنشاء الإشعار بنجاح.");

      setPage(1);

      if (page === 1) {
        await loadNotifications();
      }

      await loadUnreadCount();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                              Notification Details                     */
  /* ---------------------------------------------------------------------- */

  async function openNotificationDetails(
    notification: AdminNotification,
  ) {
    setSelectedNotification(notification);
    setDetailLoading(true);

    try {
      const result = await apiRequest<any>(
        `/api/admin/notifications/${notification.id}`,
      );

      const detail =
        result?.notification ??
        result?.data ??
        result;

      if (detail?.id) {
        setSelectedNotification((current) =>
          current?.id === notification.id
            ? { ...notification, ...detail }
            : current,
        );
      }
    } catch {
      // The notification already contains enough information
      // to display a basic details view.
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetails() {
    setSelectedNotification(null);
  }

  /* ---------------------------------------------------------------------- */
  /*                              Mark As Read                              */
  /* ---------------------------------------------------------------------- */

  async function markAsRead(notification: AdminNotification) {
    if (isRead(notification.is_read)) return;

    setReadBusyId(notification.id);
    setError("");

    try {
      await apiRequest(
        `/api/admin/notifications/${notification.id}/read`,
        {
          method: "PATCH",
        },
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : item,
        ),
      );

      setSelectedNotification((current) =>
        current?.id === notification.id
          ? {
              ...current,
              is_read: true,
              read_at: new Date().toISOString(),
            }
          : current,
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setReadBusyId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return;

    if (!window.confirm("هل تريد تحديد جميع الإشعارات كمقروءة؟")) {
      return;
    }

    setReadAllLoading(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/api/admin/notifications/read-all", {
        method: "POST",
      });

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
      setNotice("تم تحديد جميع الإشعارات كمقروءة.");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setReadAllLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                              Telegram                                  */
  /* ---------------------------------------------------------------------- */

  async function connectTelegram(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!chatId.trim()) {
      setError("أدخل Telegram Chat ID.");
      return;
    }

    if (!/^-?\d+$/.test(chatId.trim())) {
      setError("صيغة Chat ID غير صحيحة.");
      return;
    }

    setTelegramBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/api/admin/notifications/telegram/connect", {
        method: "POST",
        body: JSON.stringify({
          chat_id: chatId.trim(),
        }),
      });

      setNotice("تم حفظ إعدادات Telegram بنجاح.");
      setTelegramModalOpen(false);

      await loadTelegramConnection();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setTelegramBusy(false);
    }
  }

  async function toggleTelegramNotifications() {
    if (!telegram?.is_connected) {
      setTelegramModalOpen(true);
      return;
    }

    const nextEnabled = !telegram.is_enabled;

    setTelegramBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/api/admin/notifications/telegram/settings", {
        method: "PATCH",
        body: JSON.stringify({
          is_enabled: nextEnabled,
        }),
      });

      setTelegram((current) =>
        current
          ? {
              ...current,
              is_enabled: nextEnabled,
            }
          : current,
      );

      setNotice(
        nextEnabled
          ? "تم تفعيل إشعارات Telegram."
          : "تم تعطيل إشعارات Telegram.",
      );
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setTelegramBusy(false);
    }
  }

  async function sendTelegramTest() {
    setTelegramBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/api/admin/notifications/telegram/test", {
        method: "POST",
      });

      setNotice("تم إرسال الرسالة التجريبية بنجاح.");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setTelegramBusy(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                              Pagination                                */
  /* ---------------------------------------------------------------------- */

  const totalPages = Math.max(
    1,
    pagination.total_pages,
  );

  const firstItem =
    pagination.total === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  const lastItem = Math.min(
    page * PAGE_SIZE,
    pagination.total,
  );

  /* ---------------------------------------------------------------------- */
  /*                                    UI                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div dir="rtl" className="space-y-6 pb-10 text-[#252720]">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1efe8] text-[#85816d]">
            <Bell size={21} />

            {unreadCount > 0 && (
              <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b0786b] px-1 text-[9px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>

          <div>
            <h1 className="text-lg font-black">
              إدارة الإشعارات
            </h1>

            <p className="mt-1 text-[11px] text-gray-400">
              متابعة إشعارات الطلبات والمخزون والنظام.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshing || loading}
            className="flex h-10 items-center gap-2 rounded-xl border border-black/[0.07] bg-white px-3 text-xs font-semibold text-[#77735f] transition hover:bg-[#f5f3ed] disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            تحديث
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#252720] px-4 text-xs font-bold text-white transition hover:bg-[#3a3c33]"
          >
            <Plus size={16} />
            إنشاء إشعار
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && !createModalOpen && !telegramModalOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <AlertCircle size={17} />

          <span className="flex-1">{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-[#dce8d5] bg-[#f1f6ed] px-4 py-3 text-xs text-[#64805b]">
          <Check size={17} />

          <span className="flex-1">{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          title="إجمالي الإشعارات"
          value={pagination.total}
          icon={Bell}
          description="الإشعارات المسندة إليك"
        />

        <StatCard
          title="الإشعارات غير المقروءة"
          value={unreadCount}
          icon={BellRing}
          description="تحتاج إلى مراجعتك"
        />

        <StatCard
          title="المقروءة في الصفحة"
          value={readCount}
          icon={CheckCheck}
          description="تمت مراجعتها"
        />
      </div>

      {/* Telegram Integration */}
      <section className="overflow-hidden rounded-2xl border border-black/[0.055] bg-white">
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">

          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf1f6] text-[#647b98]">
              <Send size={20} />
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black">
                  إشعارات Telegram
                </h2>

                {telegramLoading ? (
                  <span className="text-[10px] text-gray-400">
                    جارٍ التحقق...
                  </span>
                ) : telegram?.is_connected ? (
                  <span className="rounded-full bg-[#edf3e9] px-2.5 py-1 text-[10px] font-bold text-[#64805b]">
                    متصل
                  </span>
                ) : (
                  <span className="rounded-full bg-[#f2f0ec] px-2.5 py-1 text-[10px] font-bold text-gray-500">
                    غير متصل
                  </span>
                )}
              </div>

              <p className="mt-1 text-[10px] leading-5 text-gray-400">
                استقبال إشعارات المتجر عبر Telegram عند تفعيل هذه القناة.
              </p>

              {telegram?.chat_id && (
                <p className="mt-2 text-[10px] text-gray-500" dir="ltr">
                  Chat ID: {showChatId ? telegram.chat_id : "••••••••••"}
                  <button
                    type="button"
                    onClick={() => setShowChatId((current) => !current)}
                    className="mr-2 inline-flex align-middle text-[#85816d]"
                    title="إظهار أو إخفاء Chat ID"
                  >
                    {showChatId ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {telegram?.is_connected ? (
              <>
                <button
                  type="button"
                  onClick={() => void toggleTelegramNotifications()}
                  disabled={telegramBusy}
                  className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-[10px] font-bold transition disabled:opacity-50 ${
                    telegram.is_enabled
                      ? "border-[#dce8d5] bg-[#f1f6ed] text-[#64805b]"
                      : "border-black/[0.08] bg-white text-gray-500"
                  }`}
                >
                  {telegram.is_enabled ? (
                    <Check size={14} />
                  ) : (
                    <Bell size={14} />
                  )}

                  {telegram.is_enabled ? "الإشعارات مفعلة" : "الإشعارات متوقفة"}
                </button>

                <button
                  type="button"
                  onClick={() => void sendTelegramTest()}
                  disabled={telegramBusy}
                  className="flex h-9 items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 text-[10px] font-bold text-[#77735f] transition hover:bg-[#f5f3ed] disabled:opacity-50"
                >
                  <Send size={13} />
                  رسالة تجريبية
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChatId(telegram.chat_id ?? "");
                    setTelegramModalOpen(true);
                  }}
                  className="flex h-9 items-center gap-2 rounded-lg bg-[#252720] px-3 text-[10px] font-bold text-white transition hover:bg-[#3a3c33]"
                >
                  <Settings size={13} />
                  الإعدادات
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setTelegramModalOpen(true)}
                className="flex h-9 items-center gap-2 rounded-lg bg-[#252720] px-4 text-[10px] font-bold text-white transition hover:bg-[#3a3c33]"
              >
                <Link2 size={14} />
                ربط Telegram
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Notifications List */}
      <section className="overflow-hidden rounded-2xl border border-black/[0.055] bg-white">

        {/* Toolbar */}
        <div className="border-b border-black/[0.055] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-sm font-black">
                سجل الإشعارات
              </h2>

              <p className="mt-1 text-[10px] text-gray-400">
                جميع الإشعارات التي تم إرسالها إلى حسابك.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

              {/* Search */}
              <div className="relative sm:w-64">
                <Search
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث في الإشعارات..."
                  className={`${inputClass} pr-9 text-xs`}
                />
              </div>

              {/* Type filter */}
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className={`${inputClass} text-xs sm:w-44`}
              >
                <option value="">جميع الأنواع</option>

                {NOTIFICATION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              {/* Unread filter */}
              <button
                type="button"
                onClick={() => {
                  setUnreadOnly((current) => !current);
                  setPage(1);
                }}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                  unreadOnly
                    ? "border-[#85816d] bg-[#f5f3ed] text-[#77735f]"
                    : "border-black/[0.08] bg-white text-gray-500 hover:bg-[#faf9f6]"
                }`}
              >
                <Filter size={14} />
                {unreadOnly ? "غير المقروء فقط" : "كل الإشعارات"}
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] text-gray-400">
              {unreadCount.toLocaleString("ar-DZ")} إشعار غير مقروء
            </p>

            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0 || readAllLoading}
              className="flex items-center gap-2 text-[10px] font-bold text-[#85816d] transition hover:text-[#252720] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {readAllLoading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}

              تحديد الكل كمقروء
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="divide-y divide-black/[0.045]">
          {loading ? (
            <div className="py-16 text-center text-xs text-gray-400">
              <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-[#e5e2d8] border-t-[#85816d]" />
              جارٍ تحميل الإشعارات...
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f3ed] text-[#85816d]">
                <Bell size={25} />
              </span>

              <p className="mt-4 text-sm font-bold">
                لا توجد إشعارات
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                {search || typeFilter || unreadOnly
                  ? "لا توجد نتائج تطابق عوامل التصفية."
                  : "ستظهر هنا الإشعارات الجديدة عند وصولها."}
              </p>

              {(search || typeFilter || unreadOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("");
                    setUnreadOnly(false);
                    setPage(1);
                  }}
                  className="mt-4 text-xs font-bold text-[#85816d] hover:text-[#252720]"
                >
                  مسح عوامل التصفية
                </button>
              )}
            </div>
          ) : (
            visibleNotifications.map((notification) => {
              const read = isRead(notification.is_read);
              const Icon = getTypeIcon(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`flex flex-col gap-3 p-5 transition hover:bg-[#faf9f6] sm:flex-row sm:items-start sm:p-6 ${
                    !read ? "bg-[#fdfdfb]" : ""
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getTypeStyle(notification.type)}`}
                  >
                    <Icon size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-black">
                        {notification.title}
                      </h3>

                      {!read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#78966d]" />
                      )}
                    </div>

                    <p className="mt-2 line-clamp-2 text-[11px] leading-6 text-gray-500">
                      {notification.message}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <TypeBadge type={notification.type} />

                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock size={12} />
                        {formatDate(notification.created_at)}
                      </span>

                      <ReadBadge read={read} />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() =>
                        void openNotificationDetails(notification)
                      }
                      title="عرض التفاصيل"
                      className="rounded-lg p-2 text-[#77735f] transition hover:bg-[#f1efe8]"
                    >
                      <Eye size={16} />
                    </button>

                    {!read && (
                      <button
                        type="button"
                        onClick={() => void markAsRead(notification)}
                        disabled={readBusyId === notification.id}
                        title="تحديد كمقروء"
                        className="rounded-lg p-2 text-[#64805b] transition hover:bg-[#edf3e9] disabled:opacity-40"
                      >
                        {readBusyId === notification.id ? (
                          <RefreshCw
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <CheckCheck size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col justify-between gap-4 border-t border-black/[0.055] px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-[10px] text-gray-400">
            عرض{" "}
            <span className="font-bold text-[#55564e]">
              {firstItem} - {lastItem}
            </span>{" "}
            من{" "}
            <span className="font-bold text-[#55564e]">
              {pagination.total}
            </span>{" "}
            إشعار
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              className="flex h-9 items-center gap-1 rounded-lg border border-black/[0.07] px-3 text-[11px] font-semibold text-gray-500 transition hover:bg-[#f5f3ed] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight size={14} />
              السابق
            </button>

            <span className="min-w-20 text-center text-[11px] font-bold tabular-nums">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1),
                )
              }
              className="flex h-9 items-center gap-1 rounded-lg border border-black/[0.07] px-3 text-[11px] font-semibold text-gray-500 transition hover:bg-[#f5f3ed] disabled:cursor-not-allowed disabled:opacity-35"
            >
              التالي
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*                         Notification Details Modal                 */}
      {/* ------------------------------------------------------------------ */}

      {selectedNotification && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetails();
            }
          }}
        >
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-sm font-black">
                  تفاصيل الإشعار
                </h2>

                <p className="mt-1 text-[10px] text-gray-400">
                  معلومات الإشعار وحالة قراءته.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-xl bg-[#f5f3ed] p-2 text-gray-500 transition hover:bg-[#ebe8df]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              {detailLoading && (
                <p className="text-[10px] text-gray-400">
                  جارٍ تحميل التفاصيل...
                </p>
              )}

              <div className="flex items-start gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getTypeStyle(selectedNotification.type)}`}
                >
                  {(() => {
                    const Icon = getTypeIcon(selectedNotification.type);
                    return <Icon size={20} />;
                  })()}
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black leading-6">
                    {selectedNotification.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TypeBadge type={selectedNotification.type} />
                    <ReadBadge
                      read={isRead(selectedNotification.is_read)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-black/[0.055] bg-[#faf9f6] p-4">
                <p className="mb-2 text-[10px] font-bold text-gray-400">
                  محتوى الإشعار
                </p>

                <p className="whitespace-pre-wrap text-xs leading-7 text-[#55564e]">
                  {selectedNotification.message}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/[0.055] p-3">
                  <p className="text-[10px] text-gray-400">
                    تاريخ الإرسال
                  </p>

                  <p className="mt-2 text-[11px] font-semibold">
                    {formatDate(selectedNotification.created_at)}
                  </p>
                </div>

                <div className="rounded-xl border border-black/[0.055] p-3">
                  <p className="text-[10px] text-gray-400">
                    تاريخ القراءة
                  </p>

                  <p className="mt-2 text-[11px] font-semibold">
                    {formatDate(selectedNotification.read_at)}
                  </p>
                </div>

                {selectedNotification.entity_type && (
                  <div className="rounded-xl border border-black/[0.055] p-3">
                    <p className="text-[10px] text-gray-400">
                      نوع العنصر المرتبط
                    </p>

                    <p className="mt-2 text-[11px] font-semibold">
                      {selectedNotification.entity_type}
                    </p>
                  </div>
                )}

                {selectedNotification.entity_id && (
                  <div className="rounded-xl border border-black/[0.055] p-3">
                    <p className="text-[10px] text-gray-400">
                      معرف العنصر
                    </p>

                    <p
                      dir="ltr"
                      className="mt-2 break-all text-left text-[10px] font-semibold"
                    >
                      {selectedNotification.entity_id}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-black/[0.055] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              {!isRead(selectedNotification.is_read) && (
                <button
                  type="button"
                  onClick={() =>
                    void markAsRead(selectedNotification)
                  }
                  disabled={readBusyId === selectedNotification.id}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#252720] px-5 text-xs font-bold text-white transition hover:bg-[#3a3c33] disabled:opacity-50"
                >
                  <CheckCheck size={15} />
                  تحديد كمقروء
                </button>
              )}

              <button
                type="button"
                onClick={closeDetails}
                className="h-10 rounded-xl border border-black/[0.08] bg-white px-5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*                          Create Notification Modal                 */}
      {/* ------------------------------------------------------------------ */}

      {createModalOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-base font-black">
                  إنشاء إشعار إداري
                </h2>

                <p className="mt-1 text-[11px] text-gray-400">
                  إرسال إشعار إلى أعضاء فريق الإدارة.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="rounded-xl bg-[#f5f3ed] p-2 text-gray-500 transition hover:bg-[#ebe8df]"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleCreateNotification}>
              <div className="space-y-5 p-5 sm:p-7">
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertCircle size={17} />
                    <span className="flex-1">{error}</span>

                    <button
                      type="button"
                      onClick={() => setError("")}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                <Field label="نوع الإشعار" required>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      updateForm(
                        "type",
                        event.target.value as NotificationType,
                      )
                    }
                    className={inputClass}
                  >
                    {NOTIFICATION_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="عنوان الإشعار" required>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    placeholder="مثال: تنبيه إداري جديد"
                    maxLength={150}
                    className={inputClass}
                  />
                </Field>

                <Field label="محتوى الإشعار" required>
                  <textarea
                    value={form.message}
                    onChange={(event) =>
                      updateForm("message", event.target.value)
                    }
                    placeholder="اكتب تفاصيل الإشعار..."
                    rows={4}
                    className="w-full resize-y rounded-xl border border-black/[0.08] bg-white p-3 text-sm text-[#252720] outline-none transition placeholder:text-gray-300 focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10"
                  />
                </Field>

                <Field label="المستلمون" required>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ROLES.map((role) => {
                      const selected = form.recipient_roles.includes(
                        role.value,
                      );

                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => toggleRole(role.value)}
                          className={`flex items-center justify-between rounded-xl border p-3 text-right transition ${
                            selected
                              ? "border-[#85816d] bg-[#f5f3ed] ring-2 ring-[#85816d]/10"
                              : "border-black/[0.07] bg-white hover:bg-[#faf9f6]"
                          }`}
                        >
                          <span className="text-xs font-bold">
                            {role.label}
                          </span>

                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              selected
                                ? "border-[#85816d] bg-[#85816d] text-white"
                                : "border-gray-300"
                            }`}
                          >
                            {selected && <Check size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <div className="rounded-xl border border-black/[0.06] p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Send size={16} className="text-[#647b98]" />

                      <div>
                        <p className="text-xs font-bold">
                          إرسال عبر Telegram
                        </p>

                        <p className="mt-1 text-[10px] text-gray-400">
                          إرسال نسخة من الإشعار إلى قناة Telegram.
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.send_telegram}
                      onChange={(event) =>
                        updateForm("send_telegram", event.target.checked)
                      }
                      disabled={!telegram?.is_connected}
                      className="h-4 w-4 accent-[#85816d]"
                    />
                  </label>

                  {!telegram?.is_connected && (
                    <p className="mt-3 text-[10px] text-[#b0786b]">
                      يجب ربط Telegram أولاً لاستخدام هذه الخاصية.
                    </p>
                  )}

                  {form.send_telegram && (
                    <div className="mt-4">
                      <Field label="رسالة Telegram (اختياري)">
                        <textarea
                          value={form.telegram_message}
                          onChange={(event) =>
                            updateForm(
                              "telegram_message",
                              event.target.value,
                            )
                          }
                          placeholder="اتركه فارغًا لاستخدام محتوى الإشعار."
                          rows={3}
                          className="w-full resize-y rounded-xl border border-black/[0.08] bg-white p-3 text-xs text-[#252720] outline-none transition placeholder:text-gray-300 focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-black/[0.055] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={saving}
                  className="h-10 rounded-xl border border-black/[0.08] bg-white px-5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#252720] px-6 text-xs font-bold text-white transition hover:bg-[#3a3c33] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}

                  {saving ? "جارٍ الإرسال..." : "إنشاء الإشعار"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*                           Telegram Modal                           */}
      {/* ------------------------------------------------------------------ */}

      {telegramModalOpen && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !telegramBusy) {
              setTelegramModalOpen(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf1f6] text-[#647b98]">
                  <Send size={18} />
                </span>

                <div>
                  <h2 className="text-sm font-black">
                    ربط Telegram
                  </h2>

                  <p className="mt-1 text-[10px] text-gray-400">
                    إعداد استقبال إشعارات المتجر.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTelegramModalOpen(false)}
                disabled={telegramBusy}
                className="rounded-xl bg-[#f5f3ed] p-2 text-gray-500 transition hover:bg-[#ebe8df]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={connectTelegram}>
              <div className="space-y-5 p-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertCircle size={16} />
                    <span className="flex-1">{error}</span>
                  </div>
                )}

                <div className="rounded-xl bg-[#faf9f6] p-4">
                  <p className="text-xs font-bold">
                    كيفية الحصول على Chat ID
                  </p>

                  <ol className="mt-3 space-y-2 text-[10px] leading-5 text-gray-500">
                    <li>1. افتح المحادثة مع Telegram Bot الخاص بك.</li>
                    <li>2. أرسل رسالة إلى البوت.</li>
                    <li>3. استخرج Chat ID الخاص بالمحادثة.</li>
                    <li>4. أدخل الرقم هنا لحفظ إعدادات الربط.</li>
                  </ol>
                </div>

                <Field label="Telegram Chat ID" required>
                  <div className="relative">
                    <MessageCircle
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      dir="ltr"
                      value={chatId}
                      onChange={(event) => setChatId(event.target.value)}
                      placeholder="مثال: 123456789"
                      className={`${inputClass} pr-9 text-left`}
                    />
                  </div>
                </Field>

                <p className="text-[10px] leading-5 text-gray-400">
                  يتم حفظ Chat ID في إعدادات قناة Telegram. تأكد من أنك
                  أرسلت رسالة للبوت قبل الربط.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-black/[0.055] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setTelegramModalOpen(false)}
                  disabled={telegramBusy}
                  className="h-10 rounded-xl border border-black/[0.08] bg-white px-5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={telegramBusy}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#252720] px-6 text-xs font-bold text-white transition hover:bg-[#3a3c33] disabled:opacity-50"
                >
                  {telegramBusy ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Link2 size={14} />
                  )}

                  حفظ الربط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
