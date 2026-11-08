"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Monitor,
  LogOut,
  Clock,
  Mail,
  User,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type AdminRole = "super_admin" | "admin" | "manager" | "support";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  is_active: boolean | number;
  last_login_at: string | null;
  created_at: string;
  updated_at?: string;
};

type AdminSession = {
  id: string;
  admin_user_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  last_seen_at: string | null;
};

type AdminForm = {
  username: string;
  email: string;
  password: string;
  role: AdminRole;
};

type Pagination = {
  total: number;
  limit: number;
  offset: number;
};

type Filters = {
  search: string;
  role: string;
  status: string;
};

const PAGE_SIZE = 20;

const INITIAL_FORM: AdminForm = {
  username: "",
  email: "",
  password: "",
  role: "admin",
};

const INITIAL_FILTERS: Filters = {
  search: "",
  role: "",
  status: "",
};

const ROLES: {
  value: AdminRole;
  label: string;
  description: string;
}[] = [
  {
    value: "super_admin",
    label: "مدير عام",
    description: "صلاحيات كاملة",
  },
  {
    value: "admin",
    label: "مدير",
    description: "إدارة المتجر",
  },
  {
    value: "manager",
    label: "مشرف",
    description: "إدارة العمليات",
  },
  {
    value: "support",
    label: "دعم فني",
    description: "متابعة العملاء",
  },
];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const inputClass =
  "h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-[#252720] outline-none transition placeholder:text-gray-300 focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10";

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

  // Handle invalid or expired admin session.
  if (
    response.status === 401 &&
    payload?.message === "Invalid or expired session."
  ) {
    window.location.replace("/admin/login");

    throw new Error("Invalid or expired session.");
  }

  // Handle HTTP errors.
  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error?.message ||
      "حدث خطأ أثناء تنفيذ العملية.";

    throw new Error(message);
  }

  // Return data when available.
  if (payload && "data" in payload && payload.data !== undefined) {
    return payload.data as T;
  }

  return payload as T;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "حدث خطأ غير متوقع.";
}

function isActive(value: boolean | number) {
  return value === true || value === 1;
}

function getRoleLabel(role: AdminRole) {
  return ROLES.find((item) => item.value === role)?.label ?? role;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/* -------------------------------------------------------------------------- */
/*                                  Components                                */
/* -------------------------------------------------------------------------- */

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
        {required && (
          <span className="mr-1 text-red-500">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3e9] px-2.5 py-1.5 text-[10px] font-bold text-[#64805b]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#78966d]" />
      نشط
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f0ec] px-2.5 py-1.5 text-[10px] font-bold text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      غير نشط
    </span>
  );
}

function RoleBadge({
  role,
}: {
  role: AdminRole;
}) {
  return (
    <span className="inline-flex rounded-lg bg-[#f1efe8] px-2.5 py-1.5 text-[10px] font-bold text-[#77735f]">
      {getRoleLabel(role)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Main Page                                 */
/* -------------------------------------------------------------------------- */

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
  });

  const [filters, setFilters] =
    useState<Filters>(INITIAL_FILTERS);

  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] =
    useState<AdminUser | null>(null);

  const [form, setForm] = useState<AdminForm>(INITIAL_FORM);

  const [showPassword, setShowPassword] = useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [statusBusyId, setStatusBusyId] =
    useState<string | null>(null);

  const [sessionsUser, setSessionsUser] =
    useState<AdminUser | null>(null);

  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionBusyId, setSessionBusyId] =
    useState<string | null>(null);

  /* ---------------------------------------------------------------------- */
  /*                                Statistics                              */
  /* ---------------------------------------------------------------------- */

  const activeCount = useMemo(
    () => users.filter((user) => isActive(user.is_active)).length,
    [users],
  );

  const inactiveCount = users.length - activeCount;

  /* ---------------------------------------------------------------------- */
  /*                                Load Users                              */
  /* ---------------------------------------------------------------------- */

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
const params = new URLSearchParams();

params.set("limit", String(PAGE_SIZE));
params.set("page", String(page));

if (filters.search.trim()) {
  params.set("search", filters.search.trim());
}

if (filters.role) {
  params.set("role", filters.role);
}

if (filters.status === "active") {
  params.set("isActive", "true");
} else if (filters.status === "inactive") {
  params.set("isActive", "false");
}

      const payload = await apiRequest<any>(
        `/api/admin/users?${params.toString()}`,
      );

      const result = extractData<any>(payload);

const list = Array.isArray(result?.admins)
  ? result.admins
  : [];

      setUsers(list);

      setPagination({
        total: Number(
          result?.pagination?.total ??
          result?.total ??
          list.length,
        ),
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
    } catch (error) {
      setError(getErrorMessage(error));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  /* ---------------------------------------------------------------------- */
  /*                                  Search                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({
        ...current,
        search: searchInput,
      }));

      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  function updateFilter<K extends keyof Filters>(
    key: K,
    value: Filters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));

    setPage(1);
  }

  /* ---------------------------------------------------------------------- */
  /*                              Modal Handling                            */
  /* ---------------------------------------------------------------------- */

  function openCreateModal() {
    setEditingUser(null);
    setForm(INITIAL_FORM);
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(user: AdminUser) {
    setEditingUser(user);

    setForm({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
    });

    setShowPassword(false);
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingUser(null);
    setForm(INITIAL_FORM);
  }

  function updateForm<K extends keyof AdminForm>(
    key: K,
    value: AdminForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  /* ---------------------------------------------------------------------- */
  /*                              Save User                                 */
  /* ---------------------------------------------------------------------- */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setNotice("");

    if (!form.username.trim()) {
      setError("اسم المستخدم مطلوب.");
      return;
    }

    if (!form.email.trim()) {
      setError("البريد الإلكتروني مطلوب.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("البريد الإلكتروني غير صالح.");
      return;
    }

if (!editingUser && form.password.length < 6) {
  setError("كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.");
  return;
}

    setSaving(true);

    try {
      if (editingUser) {
        await apiRequest(
          `/api/admin/users/${editingUser.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              username: form.username.trim(),
              email: form.email.trim(),
              role: form.role,
            }),
          },
        );

        setNotice("تم تحديث بيانات الموظف بنجاح.");
      } else {
        await apiRequest("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
          }),
        });

        setNotice("تم إنشاء حساب الموظف بنجاح.");
      }

      setModalOpen(false);
      setEditingUser(null);
      setForm(INITIAL_FORM);

      await loadUsers();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                            Activate / Deactivate                       */
  /* ---------------------------------------------------------------------- */

  async function toggleUserStatus(user: AdminUser) {
    const nextStatus = !isActive(user.is_active);

    const action = nextStatus ? "تفعيل" : "تعطيل";

    if (
      !window.confirm(
        `هل تريد ${action} حساب الموظف "${user.username}"؟`,
      )
    ) {
      return;
    }

    setStatusBusyId(user.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/api/admin/users/${user.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isActive: nextStatus,
          }),
        },
      );

      setNotice(
        nextStatus
          ? "تم تفعيل الحساب بنجاح."
          : "تم تعطيل الحساب بنجاح.",
      );

      await loadUsers();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setStatusBusyId(null);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                               Delete User                              */
  /* ---------------------------------------------------------------------- */

  async function handleDelete(user: AdminUser) {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف الموظف "${user.username}"؟ لا يمكن التراجع عن هذه العملية.`,
      )
    ) {
      return;
    }

    setDeletingId(user.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      setNotice("تم حذف الموظف بنجاح.");

      if (users.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadUsers();
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                              User Sessions                             */
  /* ---------------------------------------------------------------------- */

  async function openSessions(user: AdminUser) {
    setSessionsUser(user);
    setSessions([]);
    setSessionsError("");
    setSessionsLoading(true);

    try {
      const payload = await apiRequest<any>(
        `/api/admin/users/${user.id}/sessions`,
      );

      const result = extractData<any>(payload);

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.sessions)
          ? result.sessions
          : Array.isArray(result?.data)
            ? result.data
            : [];

      setSessions(list);
    } catch (error) {
      setSessionsError(getErrorMessage(error));
    } finally {
      setSessionsLoading(false);
    }
  }

  function closeSessions() {
    if (sessionBusyId) return;

    setSessionsUser(null);
    setSessions([]);
    setSessionsError("");
  }

  async function revokeSession(session: AdminSession) {
    if (!sessionsUser) return;

    if (!window.confirm("هل تريد إلغاء هذه الجلسة؟")) {
      return;
    }

    setSessionBusyId(session.id);
    setSessionsError("");

    try {
      await apiRequest(
        `/api/admin/users/${sessionsUser.id}/sessions/${session.id}`,
        {
          method: "DELETE",
        },
      );

      setSessions((current) =>
        current.map((item) =>
          item.id === session.id
            ? {
                ...item,
                revoked_at: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (error) {
      setSessionsError(getErrorMessage(error));
    } finally {
      setSessionBusyId(null);
    }
  }

  async function revokeAllSessions() {
    if (!sessionsUser) return;

    if (
      !window.confirm(
        `هل تريد إلغاء جميع جلسات "${sessionsUser.username}"؟`,
      )
    ) {
      return;
    }

    setSessionBusyId("all");
    setSessionsError("");

    try {
      await apiRequest(
        `/api/admin/users/${sessionsUser.id}/sessions`,
        {
          method: "DELETE",
        },
      );

      setSessions((current) =>
        current.map((session) => ({
          ...session,
          revoked_at:
            session.revoked_at ?? new Date().toISOString(),
        })),
      );
    } catch (error) {
      setSessionsError(getErrorMessage(error));
    } finally {
      setSessionBusyId(null);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                                  Counts                                */
  /* ---------------------------------------------------------------------- */

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / PAGE_SIZE),
  );

  const firstItem =
    pagination.total === 0
      ? 0
      : pagination.offset + 1;

  const lastItem = Math.min(
    pagination.offset + users.length,
    pagination.total,
  );

  /* ---------------------------------------------------------------------- */
  /*                                    UI                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div dir="rtl" className="space-y-6 pb-10 text-[#252720]">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1efe8] text-[#77735f]">
              <Users size={20} />
            </span>

            <div>
              <h1 className="text-lg font-black">
                إدارة الموظفين
              </h1>

              <p className="mt-1 text-[11px] text-gray-400">
                إدارة حسابات فريق العمل والصلاحيات والجلسات.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl border border-black/[0.07] bg-white px-3 text-xs font-semibold text-[#77735f] transition hover:bg-[#f5f3ed] disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            تحديث
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#252720] px-4 text-xs font-bold text-white transition hover:bg-[#3a3c33]"
          >
            <Plus size={16} />
            إضافة موظف
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && !modalOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <AlertCircle size={17} />
          <span className="flex-1">{error}</span>

          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-[#dce8d5] bg-[#f1f6ed] px-4 py-3 text-xs text-[#64805b]">
          <Check size={17} />
          <span className="flex-1">{notice}</span>

          <button onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400">
                إجمالي الموظفين
              </p>

              <p className="mt-2 text-2xl font-black tabular-nums">
                {pagination.total.toLocaleString("ar-DZ")}
              </p>
            </div>

            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1efe8] text-[#85816d]">
              <Users size={21} />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400">
                الحسابات النشطة في الصفحة
              </p>

              <p className="mt-2 text-2xl font-black tabular-nums text-[#64805b]">
                {activeCount.toLocaleString("ar-DZ")}
              </p>
            </div>

            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf3e9] text-[#78966d]">
              <UserCheck size={21} />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400">
                الحسابات غير النشطة في الصفحة
              </p>

              <p className="mt-2 text-2xl font-black tabular-nums text-gray-500">
                {inactiveCount.toLocaleString("ar-DZ")}
              </p>
            </div>

            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2f0ec] text-gray-500">
              <UserX size={21} />
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <section className="overflow-hidden rounded-2xl border border-black/[0.055] bg-white">

        {/* Filters */}
        <div className="border-b border-black/[0.055] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">

            <div>
              <h2 className="text-sm font-black">
                قائمة الموظفين
              </h2>

              <p className="mt-1 text-[10px] text-gray-400">
                ابحث عن الموظفين وأدر حساباتهم وصلاحياتهم.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:min-w-[620px]">

              {/* Search */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="بحث بالاسم أو البريد..."
                  className={`${inputClass} pr-9 text-xs`}
                />
              </div>

              {/* Role */}
              <select
                value={filters.role}
                onChange={(event) =>
                  updateFilter("role", event.target.value)
                }
                className={`${inputClass} text-xs`}
              >
                <option value="">جميع الصلاحيات</option>

                {ROLES.map((role) => (
                  <option
                    key={role.value}
                    value={role.value}
                  >
                    {role.label}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                value={filters.status}
                onChange={(event) =>
                  updateFilter("status", event.target.value)
                }
                className={`${inputClass} text-xs`}
              >
                <option value="">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-xs">

            <thead className="bg-[#faf9f6] text-[10px] text-gray-400">
              <tr>
                <th className="px-5 py-4 font-semibold">
                  الموظف
                </th>

                <th className="px-5 py-4 font-semibold">
                  الصلاحية
                </th>

                <th className="px-5 py-4 font-semibold">
                  الحالة
                </th>

                <th className="px-5 py-4 font-semibold">
                  آخر تسجيل دخول
                </th>

                <th className="px-5 py-4 font-semibold">
                  تاريخ الإنشاء
                </th>

                <th className="px-5 py-4 text-center font-semibold">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.045]">

              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-xs text-gray-400"
                  >
                    <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-[#e5e2d8] border-t-[#85816d]" />
                    جارٍ تحميل الموظفين...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="flex flex-col items-center text-center">

                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f3ed] text-[#85816d]">
                        <Users size={25} />
                      </span>

                      <p className="mt-4 text-sm font-bold">
                        لا يوجد موظفون
                      </p>

                      <p className="mt-1 text-[11px] text-gray-400">
                        لم يتم العثور على حسابات تطابق البحث.
                      </p>

                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-4 text-xs font-bold text-[#85816d] hover:text-[#252720]"
                      >
                        إضافة أول موظف
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="text-xs transition hover:bg-[#faf9f6]"
                  >

                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex min-w-[220px] items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1efe8] text-[#85816d]">
                          <User size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate font-bold text-[#252720]">
                            {user.username}
                          </p>

                          <p
                            dir="ltr"
                            className="mt-1 max-w-[200px] truncate text-right text-[10px] text-gray-400"
                          >
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge
                        active={isActive(user.is_active)}
                      />
                    </td>

                    {/* Last Login */}
                    <td className="px-5 py-4 text-[10px] text-gray-500">
                      {formatDate(user.last_login_at)}
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-[10px] text-gray-500">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">

                        <button
                          type="button"
                          onClick={() => void openSessions(user)}
                          title="الجلسات"
                          className="rounded-lg p-2 text-[#77735f] transition hover:bg-[#f1efe8]"
                        >
                          <Monitor size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          title="تعديل الموظف"
                          className="rounded-lg p-2 text-[#77735f] transition hover:bg-[#f1efe8]"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void toggleUserStatus(user)}
                          disabled={statusBusyId === user.id}
                          title={
                            isActive(user.is_active)
                              ? "تعطيل الحساب"
                              : "تفعيل الحساب"
                          }
                          className={`rounded-lg p-2 transition disabled:opacity-40 ${
                            isActive(user.is_active)
                              ? "text-[#b0786b] hover:bg-red-50"
                              : "text-[#64805b] hover:bg-[#edf3e9]"
                          }`}
                        >
                          {statusBusyId === user.id ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#85816d]" />
                          ) : isActive(user.is_active) ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(user)}
                          disabled={deletingId === user.id}
                          title="حذف الموظف"
                          className="rounded-lg p-2 text-[#b0786b] transition hover:bg-red-50 disabled:opacity-40"
                        >
                          {deletingId === user.id ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                          ) : (
                            <Trash2 size={16} />
                          )}
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
            موظف
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
      {/*                           Create / Edit Modal                      */}
      {/* ------------------------------------------------------------------ */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-5 sm:px-7">

              <div>
                <h2 className="text-base font-black">
                  {editingUser
                    ? "تعديل بيانات الموظف"
                    : "إضافة موظف جديد"}
                </h2>

                <p className="mt-1 text-[11px] text-gray-400">
                  {editingUser
                    ? "تحديث بيانات الحساب وصلاحيات الموظف."
                    : "إنشاء حساب جديد لأحد أعضاء فريق العمل."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl bg-[#f5f3ed] p-2 text-gray-500 transition hover:bg-[#ebe8df]"
                aria-label="إغلاق"
              >
                <X size={17} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>

              <div className="space-y-5 p-5 sm:p-7">

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertCircle size={17} />

                    <span className="flex-1 leading-6">
                      {error}
                    </span>

                    <button
                      type="button"
                      onClick={() => setError("")}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                <Field label="اسم المستخدم" required>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      value={form.username}
                      onChange={(event) =>
                        updateForm("username", event.target.value)
                      }
                      placeholder="مثال: ilyes"
                      maxLength={100}
                      className={`${inputClass} pr-9`}
                    />
                  </div>
                </Field>

                <Field label="البريد الإلكتروني" required>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="email"
                      dir="ltr"
                      value={form.email}
                      onChange={(event) =>
                        updateForm("email", event.target.value)
                      }
                      placeholder="employee@example.com"
                      maxLength={255}
                      className={`${inputClass} text-left`}
                    />
                  </div>
                </Field>

                {!editingUser && (
                  <Field label="كلمة المرور" required>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        dir="ltr"
                        value={form.password}
                        onChange={(event) =>
                          updateForm("password", event.target.value)
                        }
                        placeholder="6 أحرف على الأقل"
                        minLength={6}
                        className={`${inputClass} pl-10 text-left`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        aria-label="إظهار كلمة المرور"
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-[10px] text-gray-400">
                      يجب أن تتكون كلمة المرور من 12 حرفًا على الأقل.
                    </p>
                  </Field>
                )}

                <Field label="صلاحية الموظف" required>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

                    {ROLES.map((role) => {
                      const selected = form.role === role.value;

                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() =>
                            updateForm("role", role.value)
                          }
                          className={`flex items-center justify-between rounded-xl border p-3 text-right transition ${
                            selected
                              ? "border-[#85816d] bg-[#f5f3ed] ring-2 ring-[#85816d]/10"
                              : "border-black/[0.07] bg-white hover:bg-[#faf9f6]"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">
                              {role.label}
                            </p>

                            <p className="mt-1 text-[10px] text-gray-400">
                              {role.description}
                            </p>
                          </div>

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

                {editingUser && (
                  <div className="rounded-xl bg-[#faf9f6] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        size={16}
                        className="text-[#85816d]"
                      />

                      <p className="text-[11px] font-semibold text-[#55564e]">
                        تغيير كلمة المرور
                      </p>
                    </div>

                    <p className="mt-1 text-[10px] leading-5 text-gray-400">
                      تغيير كلمة المرور غير متاح من هذه النافذة.
                      يمكن إضافة وظيفة مستقلة لذلك لاحقًا.
                    </p>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse gap-2 border-t border-black/[0.055] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">

                <button
                  type="button"
                  onClick={closeModal}
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
                  {saving && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}

                  {saving
                    ? "جارٍ الحفظ..."
                    : editingUser
                      ? "حفظ التعديلات"
                      : "إنشاء الحساب"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*                              Sessions Modal                        */}
      {/* ------------------------------------------------------------------ */}

      {sessionsUser && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSessions();
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-5 sm:px-7">

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Monitor
                    size={18}
                    className="text-[#85816d]"
                  />

                  <h2 className="text-sm font-black">
                    جلسات الموظف
                  </h2>
                </div>

                <p className="mt-1 truncate text-[11px] text-gray-400">
                  {sessionsUser.username} · {sessionsUser.email}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSessions}
                disabled={sessionBusyId !== null}
                className="rounded-xl bg-[#f5f3ed] p-2 text-gray-500 transition hover:bg-[#ebe8df]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 p-5 sm:p-7">

              {/* Sessions summary */}
              <div className="flex flex-col justify-between gap-3 rounded-xl bg-[#faf9f6] p-4 sm:flex-row sm:items-center">

                <div>
                  <p className="text-xs font-bold">
                    جلسات تسجيل الدخول
                  </p>

                  <p className="mt-1 text-[10px] text-gray-400">
                    يمكنك إلغاء جلسة محددة أو جميع الجلسات.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void revokeAllSessions()}
                  disabled={
                    sessionsLoading ||
                    sessionBusyId !== null ||
                    sessions.filter((item) => !item.revoked_at).length === 0
                  }
                  className="flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-[10px] font-bold text-[#b0786b] transition hover:bg-red-50 disabled:opacity-40"
                >
                  {sessionBusyId === "all" ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                  ) : (
                    <LogOut size={14} />
                  )}

                  إلغاء جميع الجلسات
                </button>
              </div>

              {sessionsError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  <AlertCircle size={16} />
                  <span>{sessionsError}</span>
                </div>
              )}

              {/* Sessions list */}
              {sessionsLoading ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-[#e5e2d8] border-t-[#85816d]" />
                  جارٍ تحميل الجلسات...
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5f3ed] text-[#85816d]">
                    <Monitor size={21} />
                  </span>

                  <p className="mt-3 text-xs font-bold">
                    لا توجد جلسات
                  </p>

                  <p className="mt-1 text-[10px] text-gray-400">
                    لا توجد جلسات تسجيل دخول لهذا الموظف.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">

                  {sessions.map((session) => {
                    const revoked = Boolean(session.revoked_at);

                    return (
                      <div
                        key={session.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-black/[0.06] p-4 sm:flex-row sm:items-center"
                      >

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f3ed] text-[#85816d]">
                              <Monitor size={15} />
                            </span>

                            <span className="text-xs font-bold">
                              جلسة تسجيل دخول
                            </span>

                            {revoked ? (
                              <span className="rounded-full bg-[#f2f0ec] px-2 py-1 text-[9px] font-bold text-gray-500">
                                ملغاة
                              </span>
                            ) : (
                              <span className="rounded-full bg-[#edf3e9] px-2 py-1 text-[9px] font-bold text-[#64805b]">
                                نشطة
                              </span>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] text-gray-400 sm:grid-cols-2">

                            <p className="flex items-center gap-1.5">
                              <Clock size={12} />
                              الإنشاء: {formatDate(session.created_at)}
                            </p>

                            <p className="flex items-center gap-1.5">
                              <Clock size={12} />
                              آخر نشاط: {formatDate(session.last_seen_at)}
                            </p>

                            <p className="flex items-center gap-1.5">
                              <Clock size={12} />
                              انتهاء الصلاحية: {formatDate(session.expires_at)}
                            </p>

                            {revoked && (
                              <p className="flex items-center gap-1.5">
                                <LogOut size={12} />
                                الإلغاء: {formatDate(session.revoked_at)}
                              </p>
                            )}
                          </div>
                        </div>

                        {!revoked && (
                          <button
                            type="button"
                            onClick={() => void revokeSession(session)}
                            disabled={sessionBusyId !== null}
                            className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-[10px] font-bold text-[#b0786b] transition hover:bg-red-50 disabled:opacity-40"
                          >
                            {sessionBusyId === session.id ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                            ) : (
                              <LogOut size={14} />
                            )}

                            إلغاء الجلسة
                          </button>
                        )}

                      </div>
                    );
                  })}

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-black/[0.055] bg-[#faf9f6] px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={closeSessions}
                disabled={sessionBusyId !== null}
                className="h-9 rounded-xl border border-black/[0.08] bg-white px-5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}