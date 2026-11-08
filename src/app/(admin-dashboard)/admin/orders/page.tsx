"use client";

import { OrderDetailsModal } from "@/app/components/admin/orders/order-details-modal";
import type {
  Order,
  OrderStatus,
} from "@/app/components/admin/orders/order-details-modal";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Truck,
  CalendarDays,
  UserRound,
  MapPin,
  Clock3,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  SlidersHorizontal,
  ShoppingBag,
  ArrowUpDown,
  RotateCcw,
  Save,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type DeliveryMethod = "HOME" | "OFFICE";

type SortOption =
  | "newest"
  | "oldest"
  | "total_asc"
  | "total_desc";

type OrderStats = {
  total_orders?: number;
  pending_orders?: number;
  confirmed_orders?: number;
  processing_orders?: number;
  shipped_orders?: number;
  delivered_orders?: number;
  cancelled_orders?: number;
  returned_orders?: number;
  total_revenue?: number | string;
  delivered_revenue?: number | string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
};

type OrderFilters = {
  search: string;
  status: OrderStatus | "";
  delivery_method: DeliveryMethod | "";
  delivery_company_id: string;
  wilaya_id: string;
  commune_id: string;
  date_from: string;
  date_to: string;
  sort: SortOption;
};

type CustomerForm = {
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
};

const PAGE_SIZE = 10;

const INITIAL_FILTERS: OrderFilters = {
  search: "",
  status: "",
  delivery_method: "",
  delivery_company_id: "",
  wilaya_id: "",
  commune_id: "",
  date_from: "",
  date_to: "",
  sort: "newest",
};

const STATUS_OPTIONS: {
  value: OrderStatus;
  label: string;
}[] = [
  { value: "PENDING", label: "قيد الانتظار" },
  { value: "CONFIRMED", label: "مؤكد" },
  { value: "PROCESSING", label: "قيد التجهيز" },
  { value: "SHIPPED", label: "تم الشحن" },
  { value: "DELIVERED", label: "تم التسليم" },
  { value: "CANCELLED", label: "ملغى" },
  { value: "RETURNED", label: "مرتجع" },
];

const STATUS_STYLES: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "قيد الانتظار",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  CONFIRMED: {
    label: "مؤكد",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  PROCESSING: {
    label: "قيد التجهيز",
    className: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  SHIPPED: {
    label: "تم الشحن",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  DELIVERED: {
    label: "تم التسليم",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  CANCELLED: {
    label: "ملغى",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
  RETURNED: {
    label: "مرتجع",
    className: "bg-gray-100 text-gray-700 ring-gray-200",
  },
};

const inputClass =
  "w-full rounded-xl border border-[#e5e2d9] bg-white px-3.5 py-3 text-sm text-[#252720] outline-none transition placeholder:text-[#aaa79c] focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10 disabled:cursor-not-allowed disabled:bg-gray-50";

/* -------------------------------------------------------------------------- */
/*                                  Utilities                                 */
/* -------------------------------------------------------------------------- */

function formatMoney(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return `${new Intl.NumberFormat("fr-DZ", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)} د.ج`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ar-DZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "حدث خطأ غير متوقع. يرجى المحاولة مجددًا.";
}


async function apiRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
    credentials: "same-origin",
  });

  const body = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;

  // Handle invalid or expired admin session.
  if (
    response.status === 401 &&
    body?.message === "Invalid or expired session."
  ) {
    window.location.replace("/admin/login");

    throw new Error("Invalid or expired session.");
  }

  // Handle HTTP errors.
  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error ||
        `تعذر تنفيذ الطلب (${response.status})`,
    );
  }

  // Extract data from the API response.
  if (body && "data" in body && body.data !== undefined) {
    return body.data;
  }

  return body as T;
}


function getQueryString(
  filters: OrderFilters,
  page: number,
): string {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));
  params.set("sort", filters.sort);

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.delivery_method) {
    params.set("delivery_method", filters.delivery_method);
  }

  if (filters.delivery_company_id) {
    params.set("delivery_company_id", filters.delivery_company_id);
  }

  if (filters.wilaya_id) {
    params.set("wilaya_id", filters.wilaya_id);
  }

  if (filters.commune_id) {
    params.set("commune_id", filters.commune_id);
  }

  if (filters.date_from) {
    params.set("date_from", filters.date_from);
  }

  if (filters.date_to) {
    params.set("date_to", filters.date_to);
  }

  return params.toString();
}

function normalizeOrderDetails(result: unknown): Order {
  if (!result || typeof result !== "object") {
    throw new Error("استجابة تفاصيل الطلب غير صالحة.");
  }

  const payload = result as {
    order?: Order;
    data?: Order | { order?: Order };
  };

  if (payload.order) return payload.order;

  if (payload.data && typeof payload.data === "object") {
    if ("order" in payload.data && payload.data.order) {
      return payload.data.order;
    }

    return payload.data as Order;
  }

  return result as Order;
}

/* -------------------------------------------------------------------------- */
/*                              Reusable Components                           */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  title: string;
  value: string | number;
  icon: typeof ShoppingBag;
  tone: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e9e6dd] bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#85816d]">{title}</p>

          <div className="mt-3 text-2xl font-bold tracking-tight text-[#252720]">
            {loading ? (
              <LoaderCircle className="h-6 w-6 animate-spin text-[#85816d]" />
            ) : (
              value
            )}
          </div>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#faf9f6] text-[#85816d]">
        <ShoppingBag className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-base font-bold text-[#252720]">{title}</h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-[#85816d]">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#45463f]">{label}</span>
      {children}
    </label>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eeeae1] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[#252720]">{title}</h2>

            {subtitle && (
              <p className="mt-1 text-sm text-[#85816d]">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-2 text-[#85816d] transition hover:bg-[#faf9f6] hover:text-[#252720]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-6">
          {children}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Main Orders Page                              */
/* -------------------------------------------------------------------------- */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [stats, setStats] = useState<OrderStats>({});
  const [filters, setFilters] = useState<OrderFilters>(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [customerOrder, setCustomerOrder] = useState<Order | null>(null);

  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    customer_first_name: "",
    customer_last_name: "",
    customer_phone: "",
  });

  const [statusOrder, setStatusOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("PENDING");

  const [saving, setSaving] = useState(false);
  const [savingItems, setSavingItems] = useState(false);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = useMemo(() => {
    return [
      filters.status,
      filters.delivery_method,
      filters.delivery_company_id,
      filters.wilaya_id,
      filters.commune_id,
      filters.date_from,
      filters.date_to,
    ].filter(Boolean).length;
  }, [filters]);

  /* ------------------------------------------------------------------------ */
  /*                              Load Orders                                 */
  /* ------------------------------------------------------------------------ */

  const loadOrders = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);

      setError("");

      try {
        const result = await apiRequest<unknown>(
          `/api/admin/orders?${getQueryString(filters, pagination.page)}`,
        );

        const payload = result as {
          orders?: Order[];
          items?: Order[];
          data?: Order[];
          pagination?: Partial<Pagination>;
          meta?: Partial<Pagination>;
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        };

        const rows = Array.isArray(result)
          ? (result as Order[])
          : Array.isArray(payload.orders)
            ? payload.orders
            : Array.isArray(payload.items)
              ? payload.items
              : Array.isArray(payload.data)
                ? payload.data
                : [];

        const meta = payload.pagination ?? payload.meta ?? {};

        const total = Number(meta.total ?? payload.total ?? rows.length);
        const page = Number(meta.page ?? payload.page ?? pagination.page);
        const limit = Number(meta.limit ?? payload.limit ?? PAGE_SIZE);

        const totalPages = Number(
          meta.totalPages ??
            payload.totalPages ??
            Math.max(1, Math.ceil(total / Math.max(limit, 1))),
        );

        setOrders(rows);

        setPagination({
          page,
          limit,
          total,
          totalPages: Math.max(1, totalPages),
        });
      } catch (err) {
        setError(getErrorMessage(err));
        setOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, pagination.page],
  );

  /* ------------------------------------------------------------------------ */
  /*                              Load Statistics                             */
  /* ------------------------------------------------------------------------ */

  const loadStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const result = await apiRequest<unknown>(
        "/api/admin/orders/stats",
      );

      const payload = result as {
        stats?: OrderStats;
        data?: OrderStats;
      };

      setStats(
        (payload.stats ?? payload.data ?? result) as OrderStats,
      );
    } catch {
      setStats({});
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(null), 4000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  /* ------------------------------------------------------------------------ */
  /*                                  Filters                                 */
  /* ------------------------------------------------------------------------ */

  function updateFilter<K extends keyof OrderFilters>(
    key: K,
    value: OrderFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilter("search", searchInput);
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  async function refreshAll() {
    setRefreshing(true);
    await Promise.all([loadOrders(false), loadStats()]);
  }

  /* ------------------------------------------------------------------------ */
  /*                              Order Details                               */
  /* ------------------------------------------------------------------------ */

  async function openOrder(order: Order) {
    setSelectedOrder(order);
    setDetailsLoading(true);

    try {
      const result = await apiRequest<unknown>(
        `/api/admin/orders/${order.id}`,
      );

      setSelectedOrder(normalizeOrderDetails(result));
    } catch (err) {
      setNotice({
        type: "error",
        text: getErrorMessage(err),
      });
    } finally {
      setDetailsLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                        Refresh After Item Mutation                       */
  /* ------------------------------------------------------------------------ */

  async function refreshOrderAfterItemMutation(orderId: string) {
    await Promise.all([
      loadOrders(false),
      loadStats(),
    ]);

    const result = await apiRequest<unknown>(
      `/api/admin/orders/${orderId}`,
    );

    const refreshedOrder = normalizeOrderDetails(result);

    setSelectedOrder(refreshedOrder);
  }

  /* ------------------------------------------------------------------------ */
  /*                              Add Order Item                              */
  /* ------------------------------------------------------------------------ */

  async function addOrderItem(input: {
    product_id: string;
    product_variant_id: string | null;
    quantity: number;
  }) {
    if (!selectedOrder || savingItems) return;

    setSavingItems(true);

    try {
      await apiRequest(
        `/api/admin/orders/${selectedOrder.id}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            product_id: input.product_id,
            product_variant_id: input.product_variant_id,
            quantity: input.quantity,
          }),
        },
      );

      await refreshOrderAfterItemMutation(selectedOrder.id);

      setNotice({
        type: "success",
        text: "تمت إضافة المنتج إلى الطلب وتحديث الإجماليات والمخزون.",
      });
    } catch (err) {
      const message = getErrorMessage(err);

      setNotice({
        type: "error",
        text: message,
      });

      throw new Error(message);
    } finally {
      setSavingItems(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                         Update Order Item Quantity                       */
  /* ------------------------------------------------------------------------ */

async function updateOrderItem(
  itemId: string,
  input: {
    product_id: string;
    product_variant_id: string | null;
    quantity: number;
  },
) {
  if (!selectedOrder || savingItems) return;

  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw new Error("يرجى إدخال كمية صحيحة أكبر من صفر.");
  }

  setSavingItems(true);

  try {
    await apiRequest(
      `/api/admin/orders/${selectedOrder.id}/items/${itemId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );

    await refreshOrderAfterItemMutation(selectedOrder.id);

    setNotice({
      type: "success",
      text: "تم تحديث المنتج وخصائصه وكميته بنجاح.",
    });
  } catch (err) {
    const message = getErrorMessage(err);

    setNotice({
      type: "error",
      text: message,
    });

    throw new Error(message);
  } finally {
    setSavingItems(false);
  }
}

  /* ------------------------------------------------------------------------ */
  /*                              Remove Order Item                           */
  /* ------------------------------------------------------------------------ */

  async function removeOrderItem(itemId: string) {
    if (!selectedOrder || savingItems) return;

    if ((selectedOrder.items?.length ?? 0) <= 1) {
      throw new Error(
        "لا يمكن حذف آخر منتج من الطلب. يجب أن يحتوي الطلب على منتج واحد على الأقل.",
      );
    }

    setSavingItems(true);

    try {
      await apiRequest(
        `/api/admin/orders/${selectedOrder.id}/items/${itemId}`,
        {
          method: "DELETE",
        },
      );

      await refreshOrderAfterItemMutation(selectedOrder.id);

      setNotice({
        type: "success",
        text: "تم حذف المنتج وإرجاع الكمية إلى المخزون وتحديث الإجماليات.",
      });
    } catch (err) {
      const message = getErrorMessage(err);

      setNotice({
        type: "error",
        text: message,
      });

      throw new Error(message);
    } finally {
      setSavingItems(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                            Customer Information                          */
  /* ------------------------------------------------------------------------ */

  function openCustomerEditor(order: Order) {
    setCustomerOrder(order);

    setCustomerForm({
      customer_first_name: order.customer_first_name,
      customer_last_name: order.customer_last_name,
      customer_phone: order.customer_phone,
    });
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customerOrder || saving) return;

    setSaving(true);

    try {
      await apiRequest(
        `/api/admin/orders/${customerOrder.id}/customer`,
        {
          method: "PATCH",
          body: JSON.stringify(customerForm),
        },
      );

      setNotice({
        type: "success",
        text: "تم تحديث بيانات العميل بنجاح.",
      });

      setCustomerOrder(null);

      await loadOrders(false);

      if (selectedOrder?.id === customerOrder.id) {
        await openOrder(customerOrder);
      }
    } catch (err) {
      setNotice({
        type: "error",
        text: getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                               Order Status                               */
  /* ------------------------------------------------------------------------ */

  function openStatusEditor(order: Order) {
    setStatusOrder(order);
    setNewStatus(order.status);
  }

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!statusOrder || saving) return;

    setSaving(true);

    try {
      await apiRequest(
        `/api/admin/orders/${statusOrder.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        },
      );

      setNotice({
        type: "success",
        text: "تم تحديث حالة الطلب بنجاح.",
      });

      setStatusOrder(null);

      await Promise.all([
        loadOrders(false),
        loadStats(),
      ]);

      if (selectedOrder?.id === statusOrder.id) {
        await openOrder(statusOrder);
      }
    } catch (err) {
      setNotice({
        type: "error",
        text: getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                                    UI                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#faf9f6] p-4 sm:p-6 lg:p-8"
    >
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#85816d]">
              <span>لوحة التحكم</span>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="text-[#252720]">الطلبات</span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#252720] sm:text-3xl">
              إدارة الطلبات
            </h1>

            <p className="mt-2 text-sm text-[#85816d]">
              تابع الطلبات، راجع تفاصيلها، وأدر حالات المعالجة والتوصيل.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e2d9] bg-white px-4 py-3 text-sm font-semibold text-[#45463f] transition hover:border-[#85816d] hover:bg-[#faf9f6] disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            تحديث البيانات
          </button>
        </div>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="طلبات قيد الانتظار"
            value={Number(stats.pending_orders ?? 0).toLocaleString("ar-DZ")}
            icon={Clock3}
            tone="bg-amber-50 text-amber-700"
            loading={statsLoading}
          />

          <StatCard
            title="الطلبات المؤكدة"
            value={Number(stats.confirmed_orders ?? 0).toLocaleString("ar-DZ")}
            icon={ShoppingBag}
            tone="bg-blue-50 text-blue-700"
            loading={statsLoading}
          />

          <StatCard
            title="طلبات قيد التجهيز"
            value={Number(stats.processing_orders ?? 0).toLocaleString("ar-DZ")}
            icon={CheckCircle2}
            tone="bg-violet-50 text-violet-700"
            loading={statsLoading}
          />

          <StatCard
            title="طلبات تم شحنها"
            value={Number(stats.shipped_orders ?? 0).toLocaleString("ar-DZ")}
            icon={Truck}
            tone="bg-indigo-50 text-indigo-700"
            loading={statsLoading}
          />
        </section>

        {/* Orders table */}
        <section className="overflow-hidden rounded-2xl border border-[#e9e6dd] bg-white">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-[#eeeae1] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-[#252720]">جميع الطلبات</h2>

              <p className="mt-1 text-sm text-[#85816d]">
                {pagination.total.toLocaleString("ar-DZ")} طلب
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <form
                onSubmit={handleSearchSubmit}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-[#e5e2d9] px-3 sm:min-w-[300px]"
              >
                <Search className="h-4 w-4 shrink-0 text-[#85816d]" />

                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="رقم الطلب، اسم العميل، الهاتف..."
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#aaa79c]"
                />

                <button
                  type="submit"
                  className="rounded-lg bg-[#252720] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#45463f]"
                >
                  بحث
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  showFilters || activeFilterCount > 0
                    ? "border-[#85816d] bg-[#f5f3ec] text-[#45463f]"
                    : "border-[#e5e2d9] text-[#45463f] hover:bg-[#faf9f6]"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                الفلاتر

                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#252720] px-1 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <select
                aria-label="ترتيب الطلبات"
                value={filters.sort}
                onChange={(event) =>
                  updateFilter("sort", event.target.value as SortOption)
                }
                className={`${inputClass} sm:w-auto`}
              >
                <option value="newest">الأحدث أولًا</option>
                <option value="oldest">الأقدم أولًا</option>
                <option value="total_desc">الأعلى سعرًا</option>
                <option value="total_asc">الأقل سعرًا</option>
              </select>
            </div>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="grid grid-cols-1 gap-4 border-b border-[#eeeae1] bg-[#fcfbf8] p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
              <Field label="حالة الطلب">
                <select
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter(
                      "status",
                      event.target.value as OrderStatus | "",
                    )
                  }
                  className={inputClass}
                >
                  <option value="">كل الحالات</option>

                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="طريقة التوصيل">
                <select
                  value={filters.delivery_method}
                  onChange={(event) =>
                    updateFilter(
                      "delivery_method",
                      event.target.value as DeliveryMethod | "",
                    )
                  }
                  className={inputClass}
                >
                  <option value="">كل الطرق</option>
                  <option value="HOME">توصيل للمنزل</option>
                  <option value="OFFICE">توصيل للمكتب</option>
                </select>
              </Field>

              <Field label="من تاريخ">
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(event) =>
                    updateFilter("date_from", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="إلى تاريخ">
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(event) =>
                    updateFilter("date_to", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#85816d] transition hover:bg-[#f0eee7] hover:text-[#252720]"
                >
                  <RotateCcw className="h-4 w-4" />
                  إعادة ضبط الفلاتر
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="m-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => void loadOrders()}
                className="inline-flex items-center gap-2 self-start rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Responsive table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right">
              <thead className="bg-[#faf9f6]">
                <tr className="border-b border-[#eeeae1] text-xs font-semibold text-[#85816d]">
                  <th className="px-5 py-4">رقم الطلب</th>
                  <th className="px-5 py-4">العميل</th>
                  <th className="px-5 py-4">التوصيل</th>
                  <th className="px-5 py-4">المبلغ الإجمالي</th>
                  <th className="px-5 py-4">الحالة</th>
                  <th className="px-5 py-4">التاريخ</th>
                  <th className="px-5 py-4">الإجراءات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0eee7]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#85816d]" />

                      <p className="mt-3 text-sm text-[#85816d]">
                        جارٍ تحميل الطلبات...
                      </p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        title="لا توجد طلبات"
                        description="لم يتم العثور على طلبات تطابق معايير البحث الحالية."
                      />
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition hover:bg-[#fcfbf8]"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => void openOrder(order)}
                          className="font-bold text-[#252720] transition hover:text-[#85816d]"
                        >
                          #{order.order_number}
                        </button>

                        <p className="mt-1 text-xs text-[#aaa79c]">
                          {order.items?.length ?? 0} منتجات
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#252720]">
                          {order.customer_first_name}{" "}
                          {order.customer_last_name}
                        </p>

                        <p
                          dir="ltr"
                          className="mt-1 text-right text-xs text-[#85816d]"
                        >
                          {order.customer_phone}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#45463f]">
                          {order.delivery_method === "HOME" ? (
                            <MapPin className="h-4 w-4 text-[#85816d]" />
                          ) : (
                            <Truck className="h-4 w-4 text-[#85816d]" />
                          )}

                          <span>
                            {order.delivery_method === "HOME"
                              ? "للمنزل"
                              : "للمكتب"}
                          </span>
                        </div>

                        <p className="mt-1 max-w-[190px] truncate text-xs text-[#85816d]">
                          {order.commune_name || "—"}
                          {order.wilaya_name
                            ? `، ${order.wilaya_name}`
                            : ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-[#252720]">
                          {formatMoney(order.total_amount)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#45463f]">
                          <CalendarDays className="h-4 w-4 text-[#85816d]" />
                          {formatDate(order.created_at)}
                        </div>

                        <p className="mt-1 text-xs text-[#85816d]">
                          {formatTime(order.created_at)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="عرض التفاصيل"
                            aria-label="عرض تفاصيل الطلب"
                            onClick={() => void openOrder(order)}
                            className="rounded-lg p-2 text-[#85816d] transition hover:bg-[#f0eee7] hover:text-[#252720]"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            title="تعديل العميل"
                            aria-label="تعديل بيانات العميل"
                            onClick={() => openCustomerEditor(order)}
                            className="rounded-lg p-2 text-[#85816d] transition hover:bg-[#f0eee7] hover:text-[#252720]"
                          >
                            <UserRound className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            title="تغيير الحالة"
                            aria-label="تغيير حالة الطلب"
                            onClick={() => openStatusEditor(order)}
                            className="rounded-lg p-2 text-[#85816d] transition hover:bg-[#f0eee7] hover:text-[#252720]"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <footer className="flex flex-col gap-4 border-t border-[#eeeae1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#85816d]">
              {pagination.total === 0
                ? "لا توجد نتائج"
                : `عرض ${(
                    (pagination.page - 1) * pagination.limit +
                    1
                  ).toLocaleString("ar-DZ")} إلى ${Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  ).toLocaleString("ar-DZ")} من ${pagination.total.toLocaleString(
                    "ar-DZ",
                  )} طلب`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
                className="flex items-center gap-1 rounded-xl border border-[#e5e2d9] px-3 py-2 text-sm font-medium text-[#45463f] transition hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </button>

              <span className="min-w-[90px] text-center text-sm text-[#45463f]">
                صفحة {pagination.page} من {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={
                  pagination.page >= pagination.totalPages || loading
                }
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
                className="flex items-center gap-1 rounded-xl border border-[#e5e2d9] px-3 py-2 text-sm font-medium text-[#45463f] transition hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </section>
      </div>

      {/* Toast notification */}
      {notice && (
        <div
          role="status"
          className={`fixed bottom-5 left-5 z-[70] flex max-w-[calc(100vw-40px)] items-center gap-3 rounded-xl border px-4 py-3 shadow-xl ${
            notice.type === "success"
              ? "border-emerald-200 bg-white text-emerald-800"
              : "border-red-200 bg-white text-red-700"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" />
          )}

          <p className="text-sm font-medium">{notice.text}</p>

          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="إغلاق الإشعار"
            className="mr-2 rounded p-1 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Customer editor */}
      {customerOrder && (
        <Modal
          title="تعديل بيانات العميل"
          subtitle={`الطلب رقم #${customerOrder.order_number}`}
          onClose={() => {
            if (!saving) setCustomerOrder(null);
          }}
        >
          <form onSubmit={saveCustomer} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="الاسم">
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={customerForm.customer_first_name}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      customer_first_name: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="الاسم الأول"
                />
              </Field>

              <Field label="اللقب">
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={customerForm.customer_last_name}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      customer_last_name: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="اسم العائلة"
                />
              </Field>
            </div>

            <Field label="رقم الهاتف">
              <input
                required
                type="tel"
                dir="ltr"
                maxLength={30}
                value={customerForm.customer_phone}
                onChange={(event) =>
                  setCustomerForm((current) => ({
                    ...current,
                    customer_phone: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="05XXXXXXXX"
              />
            </Field>

            <div className="flex justify-end gap-3 border-t border-[#eeeae1] pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => setCustomerOrder(null)}
                className="rounded-xl border border-[#e5e2d9] px-4 py-2.5 text-sm font-semibold text-[#45463f] hover:bg-[#faf9f6] disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#252720] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#45463f] disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ التغييرات
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Status editor */}
      {statusOrder && (
        <Modal
          title="تغيير حالة الطلب"
          subtitle={`الطلب رقم #${statusOrder.order_number}`}
          onClose={() => {
            if (!saving) setStatusOrder(null);
          }}
        >
          <form onSubmit={saveStatus} className="space-y-5">
            <div className="rounded-xl bg-[#faf9f6] p-4">
              <p className="text-xs text-[#85816d]">الحالة الحالية</p>

              <div className="mt-3">
                <StatusBadge status={statusOrder.status} />
              </div>
            </div>

            <Field label="الحالة الجديدة">
              <select
                value={newStatus}
                onChange={(event) =>
                  setNewStatus(event.target.value as OrderStatus)
                }
                className={inputClass}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Field>

            <p className="text-xs leading-6 text-[#85816d]">
              سيقوم الخادم بالتحقق من انتقال الحالة وصلاحيات الإدارة قبل
              حفظ التغيير. قد يؤثر إلغاء الطلب أو إعادة فتحه في المخزون.
            </p>

            <div className="flex justify-end gap-3 border-t border-[#eeeae1] pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => setStatusOrder(null)}
                className="rounded-xl border border-[#e5e2d9] px-4 py-2.5 text-sm font-semibold text-[#45463f] hover:bg-[#faf9f6] disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={saving || newStatus === statusOrder.status}
                className="inline-flex items-center gap-2 rounded-xl bg-[#252720] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#45463f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                تأكيد التغيير
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Order details */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          loading={detailsLoading}
          savingItems={savingItems}
          onClose={() => {
            if (!savingItems) setSelectedOrder(null);
          }}
          onEditCustomer={(order) => {
            setSelectedOrder(null);
            openCustomerEditor(order);
          }}
          onChangeStatus={openStatusEditor}
          onAddItem={addOrderItem}
          onUpdateItem={updateOrderItem}
          onRemoveItem={removeOrderItem}
        />
      )}
    </main>
  );
}