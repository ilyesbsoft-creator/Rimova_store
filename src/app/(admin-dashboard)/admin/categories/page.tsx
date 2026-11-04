
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Plus,
  Search,
  Tags,
  Edit3,
  Trash2,
  Image as ImageIcon,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  LoaderCircle,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  image_public_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

type ApiResponse<T> = {
  code?: string;
  message?: string;
  data?: T;
};

const PAGE_SIZE = 10;

const initialForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  is_active: true,
};

/* =========================================================
   HELPERS
========================================================= */

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(code?: string) {
  const messages: Record<string, string> = {
    CATEGORY_NOT_FOUND: "التصنيف غير موجود.",
    CATEGORY_SLUG_ALREADY_EXISTS:
      "هذا الرابط المختصر مستخدم بالفعل.",
    INVALID_CATEGORY_ID: "معرّف التصنيف غير صالح.",
    INVALID_CATEGORY_DATA: "بيانات التصنيف غير صالحة.",
    CATEGORY_UPDATE_DATA_REQUIRED:
      "لم يتم إدخال أي تعديلات.",
    CATEGORY_IMAGE_UPLOAD_FAILED:
      "فشل رفع الصورة. حاول مرة أخرى.",
    INVALID_CATEGORY_IMAGE: "ملف الصورة غير صالح.",
    UNSUPPORTED_CATEGORY_IMAGE_TYPE:
      "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP.",
    CATEGORY_IMAGE_TOO_LARGE:
      "حجم الصورة يتجاوز الحد المسموح (5MB).",
    INVALID_QUERY_PARAMETERS:
      "معايير البحث غير صالحة.",
    INVALID_CATEGORY_STATUS:
      "حالة التصنيف غير صالحة.",
    CATEGORY_CREATE_FAILED:
      "تعذر إنشاء التصنيف.",
    CATEGORY_UPDATE_FAILED:
      "تعذر تحديث التصنيف.",
    CATEGORY_DELETE_FAILED:
      "تعذر حذف التصنيف.",
  };

  return messages[code ?? ""] ?? "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

async function readApiResponse<T>(
  response: Response,
): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload.code) ||
        payload.message ||
        "حدث خطأ أثناء الاتصال بالخادم.",
    );
  }

  if (payload.data === undefined) {
    throw new Error("استجابة الخادم غير متوقعة.");
  }

  return payload.data;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function CategoriesPage() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const [categories, setCategories] = useState<Category[]>([]);

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    total_pages: 0,
  });

  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  /* -------------------------------------------------------
     FILTERS
  ------------------------------------------------------- */

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);

  /* -------------------------------------------------------
     MODAL
  ------------------------------------------------------- */

  const [modalOpen, setModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [form, setForm] = useState<CategoryForm>(initialForm);

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState("");

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  /* -------------------------------------------------------
     NOTIFICATIONS / ACTIONS
  ------------------------------------------------------- */

  const [notice, setNotice] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(
    null,
  );

  /* =========================================================
     FETCH CATEGORIES
  ========================================================= */

  const fetchCategories = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setPageError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        params.set("sort_by", "created_at");
        params.set("sort_order", "desc");

        if (searchInput.trim()) {
          params.set("search", searchInput.trim());
        }

        if (statusFilter) {
          params.set(
            "is_active",
            statusFilter === "active" ? "true" : "false",
          );
        }

        const [listResponse, activeResponse, inactiveResponse] =
          await Promise.all([
            fetch(`/api/admin/categories?${params.toString()}`, {
              method: "GET",
              cache: "no-store",
            }),

            fetch(
              "/api/admin/categories?is_active=true&page=1&limit=1",
              {
                method: "GET",
                cache: "no-store",
              },
            ),

            fetch(
              "/api/admin/categories?is_active=false&page=1&limit=1",
              {
                method: "GET",
                cache: "no-store",
              },
            ),
          ]);

        const [listResult, activeResult, inactiveResult] =
          await Promise.all([
            readApiResponse<{
              data: Category[];
              pagination: Pagination;
            }>(listResponse),

            readApiResponse<{
              data: Category[];
              pagination: Pagination;
            }>(activeResponse),

            readApiResponse<{
              data: Category[];
              pagination: Pagination;
            }>(inactiveResponse),
          ]);

        setCategories(listResult.data ?? []);
        setPagination(listResult.pagination);

        setActiveCount(activeResult.pagination.total);
        setInactiveCount(inactiveResult.pagination.total);
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "تعذر تحميل التصنيفات.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, searchInput, statusFilter],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchCategories();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [fetchCategories]);

  /* =========================================================
     COUNTS
  ========================================================= */

  const totalCount = pagination.total;

  const visibleRange = useMemo(() => {
    if (totalCount === 0) {
      return { from: 0, to: 0 };
    }

    return {
      from: (page - 1) * PAGE_SIZE + 1,
      to: Math.min(page * PAGE_SIZE, totalCount),
    };
  }, [page, totalCount]);

  /* =========================================================
     MODAL HELPERS
  ========================================================= */

  function openCreateModal() {
    setEditingCategory(null);
    setForm(initialForm);
    setSelectedImage(null);
    setImagePreview("");
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);

    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      is_active: category.is_active,
    });

    setSelectedImage(null);
    setImagePreview(category.image_url ?? "");
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingCategory(null);
    setForm(initialForm);
    setSelectedImage(null);
    setImagePreview("");
    setFormError("");
  }

  function updateForm<K extends keyof CategoryForm>(
    key: K,
    value: CategoryForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  /* =========================================================
     IMAGE
  ========================================================= */

  function handleImageChange(file: File | undefined) {
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setFormError("نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("حجم الصورة يجب ألا يتجاوز 5MB.");
      return;
    }

    setFormError("");
    setSelectedImage(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  /* =========================================================
     CREATE / UPDATE
  ========================================================= */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setFormError("");
    setNotice("");

    const name = form.name.trim();
    const slug = makeSlug(form.slug);

    if (!name || !slug) {
      setFormError("اسم التصنيف والرابط المختصر مطلوبان.");
      return;
    }

    const formData = new FormData();

    formData.append("name", name);
    formData.append("slug", slug);
    formData.append("description", form.description.trim());
    formData.append("is_active", String(form.is_active));

    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingCategory);

      const response = await fetch(
        isEditing
          ? `/api/admin/categories/${editingCategory!.id}`
          : "/api/admin/categories",
        {
          method: isEditing ? "PATCH" : "POST",
          body: formData,
        },
      );

      await readApiResponse<Category>(response);

      setNotice(
        isEditing
          ? "تم تحديث التصنيف بنجاح."
          : "تم إنشاء التصنيف بنجاح.",
      );

      setModalOpen(false);
      setEditingCategory(null);
      setForm(initialForm);
      setSelectedImage(null);
      setImagePreview("");

      // Return to first page to show the new category.
      if (!isEditing && page !== 1) {
        setPage(1);
      } else {
        await fetchCategories(true);
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "تعذر حفظ التصنيف.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     TOGGLE STATUS
  ========================================================= */

  async function toggleStatus(category: Category) {
    if (actionLoading) return;

    setActionLoading(category.id);
    setNotice("");
    setPageError("");

    try {
      const response = await fetch(
        `/api/admin/categories/${category.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !category.is_active,
          }),
        },
      );

      await readApiResponse<Category>(response);

      setNotice(
        category.is_active
          ? "تم تعطيل التصنيف بنجاح."
          : "تم تفعيل التصنيف بنجاح.",
      );

      await fetchCategories(true);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "تعذر تغيير حالة التصنيف.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  /* =========================================================
     DELETE
  ========================================================= */

  async function deleteCategory(category: Category) {
    if (actionLoading) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف التصنيف "${category.name}" نهائيًا؟`,
    );

    if (!confirmed) return;

    setActionLoading(category.id);
    setNotice("");
    setPageError("");

    try {
      const response = await fetch(
        `/api/admin/categories/${category.id}`,
        {
          method: "DELETE",
        },
      );

      await readApiResponse<null>(response);

      setNotice("تم حذف التصنيف بنجاح.");

      // If the last item on this page was deleted,
      // move to the previous page.
      if (categories.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await fetchCategories(true);
      }
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "تعذر حذف التصنيف.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  /* =========================================================
     FILTERS
  ========================================================= */

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("");
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-[1600px] space-y-6"
    >
      {/* PAGE HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span>إدارة المتجر</span>
            <span>/</span>
            <span className="font-semibold text-[#85816d]">
              التصنيفات
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight">
            التصنيفات
          </h1>

          <p className="mt-2 text-xs text-gray-400">
            تنظيم منتجات المتجر وإدارة التصنيفات وحالاتها.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#252720] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#3a3c33]"
        >
          <Plus size={17} />
          إضافة تصنيف جديد
        </button>
      </div>

      {/* NOTIFICATIONS */}

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-[#dce4d5] bg-[#f2f6ef] px-4 py-3 text-xs text-[#52674a]">
          <Check size={17} />
          <span className="flex-1">{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {pageError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <AlertCircle size={17} />
          <span className="flex-1">{pageError}</span>

          <button
            type="button"
            onClick={() => setPageError("")}
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              إجمالي التصنيفات
            </span>

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f1e9] text-[#77735f]">
              <Tags size={20} />
            </span>
          </div>

          <p className="mt-4 text-2xl font-black tabular-nums">
            {totalCount.toLocaleString("ar-DZ")}
          </p>

          <p className="mt-1 text-[10px] text-gray-400">
            جميع التصنيفات المسجلة
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              التصنيفات النشطة
            </span>

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3eb] text-[#66805e]">
              <Eye size={20} />
            </span>
          </div>

          <p className="mt-4 text-2xl font-black tabular-nums">
            {activeCount.toLocaleString("ar-DZ")}
          </p>

          <p className="mt-1 text-[10px] text-gray-400">
            متاحة للاستخدام في المتجر
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              التصنيفات غير النشطة
            </span>

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f0ec] text-gray-500">
              <EyeOff size={20} />
            </span>
          </div>

          <p className="mt-4 text-2xl font-black tabular-nums">
            {inactiveCount.toLocaleString("ar-DZ")}
          </p>

          <p className="mt-1 text-[10px] text-gray-400">
            غير متاحة للاستخدام حاليًا
          </p>
        </div>
      </div>

      {/* CATEGORIES TABLE */}

      <section className="overflow-hidden rounded-2xl border border-black/[0.055] bg-white">
        {/* FILTERS */}

        <div className="border-b border-black/[0.055] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-sm font-bold">
                قائمة التصنيفات
              </h2>

              <p className="mt-1 text-[11px] text-gray-400">
                عرض وإدارة جميع تصنيفات المتجر.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchCategories(true)}
                disabled={refreshing}
                className="flex h-9 items-center justify-center gap-2 rounded-xl border border-black/[0.07] px-3 text-[11px] font-semibold text-[#77735f] transition hover:bg-[#f5f3ed] disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "animate-spin" : ""}
                />
                تحديث
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="flex h-9 items-center justify-center gap-2 rounded-xl border border-black/[0.07] px-3 text-[11px] font-semibold text-[#77735f] transition hover:bg-[#f5f3ed]"
              >
                إعادة ضبط البحث
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={17} />
              </span>

              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  handleSearchChange(event.target.value)
                }
                placeholder="ابحث باسم التصنيف أو الرابط..."
                className="h-11 w-full rounded-xl border border-black/[0.08] bg-white pr-10 pl-3 text-xs outline-none transition focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusChange(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-xs outline-none focus:border-[#85816d]"
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          {(searchInput || statusFilter) && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 text-[11px] font-semibold text-[#85816d] hover:text-[#252720]"
            >
              مسح عوامل التصفية
            </button>
          )}
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-right">
            <thead>
              <tr className="bg-[#faf9f6] text-[10px] text-gray-400">
                <th className="px-5 py-4 font-semibold">
                  التصنيف
                </th>

                <th className="px-5 py-4 font-semibold">
                  الرابط المختصر
                </th>

                <th className="px-5 py-4 font-semibold">
                  الوصف
                </th>

                <th className="px-5 py-4 font-semibold">
                  تاريخ الإنشاء
                </th>

                <th className="px-5 py-4 font-semibold">
                  الحالة
                </th>

                <th className="px-5 py-4 text-center font-semibold">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.045]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-20">
                    <div className="flex flex-col items-center text-center">
                      <LoaderCircle
                        size={28}
                        className="animate-spin text-[#85816d]"
                      />

                      <p className="mt-3 text-xs text-gray-400">
                        جارٍ تحميل التصنيفات...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="flex flex-col items-center text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f3ed] text-[#85816d]">
                        <Tags size={25} />
                      </span>

                      <p className="mt-4 text-sm font-bold">
                        لا توجد تصنيفات
                      </p>

                      <p className="mt-1 text-[11px] text-gray-400">
                        لم يتم العثور على تصنيفات تطابق البحث.
                      </p>

                      {!searchInput && !statusFilter && (
                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="mt-4 text-xs font-bold text-[#85816d] hover:text-[#252720]"
                        >
                          إضافة أول تصنيف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="text-xs transition hover:bg-[#faf9f6]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-[210px] items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/[0.05] bg-[#f5f3ed]">
                          {category.image_url ? (
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon
                              size={20}
                              className="text-[#85816d]"
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-bold text-[#252720]">
                            {category.name}
                          </p>

                          <p className="mt-1 text-[10px] text-gray-400">
                            تصنيف
                          </p>
                        </div>
                      </div>
                    </td>

                    <td
                      dir="ltr"
                      className="px-5 py-4 text-right font-mono text-[11px] text-gray-500"
                    >
                      {category.slug}
                    </td>

                    <td className="max-w-[250px] px-5 py-4 text-gray-400">
                      <p className="line-clamp-2">
                        {category.description || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {formatDate(category.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      {category.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3e9] px-2.5 py-1.5 text-[10px] font-bold text-[#64805b]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#78966d]" />
                          نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f0ec] px-2.5 py-1.5 text-[10px] font-bold text-gray-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          غير نشط
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleStatus(category)}
                          disabled={actionLoading !== null}
                          title={
                            category.is_active
                              ? "تعطيل التصنيف"
                              : "تفعيل التصنيف"
                          }
                          className="rounded-lg p-2 text-[#77735f] transition hover:bg-[#f1efe8] disabled:opacity-40"
                        >
                          {actionLoading === category.id ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : category.is_active ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(category)}
                          disabled={actionLoading !== null}
                          title="تعديل التصنيف"
                          className="rounded-lg p-2 text-[#77735f] transition hover:bg-[#f1efe8] disabled:opacity-40"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteCategory(category)}
                          disabled={actionLoading !== null}
                          title="حذف التصنيف"
                          className="rounded-lg p-2 text-[#b0786b] transition hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-black/[0.055] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-gray-400">
            عرض{" "}
            <span className="font-bold text-[#55564e]">
              {visibleRange.from}
            </span>
            {" - "}
            <span className="font-bold text-[#55564e]">
              {visibleRange.to}
            </span>
            {" من "}
            <span className="font-bold text-[#55564e]">
              {totalCount}
            </span>
            {" تصنيف"}
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1 || loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-gray-500 transition hover:bg-[#f5f3ed] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="الصفحة السابقة"
            >
              <ChevronRight size={17} />
            </button>

            <span className="min-w-[90px] text-center text-[11px] font-semibold text-[#55564e]">
              صفحة {page} من {Math.max(1, pagination.total_pages)}
            </span>

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={
                page >= pagination.total_pages || loading
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-gray-500 transition hover:bg-[#f5f3ed] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="الصفحة التالية"
            >
              <ChevronLeft size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* CREATE / EDIT MODAL */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-base font-black">
                  {editingCategory
                    ? "تعديل التصنيف"
                    : "إضافة تصنيف جديد"}
                </h2>

                <p className="mt-1 text-[11px] text-gray-400">
                  أدخل المعلومات الأساسية للتصنيف.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl bg-[#f5f3ed] p-2 text-gray-500 transition hover:bg-[#ebe8df] disabled:opacity-40"
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </div>

            {/* MODAL FORM */}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7">
                {formError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:col-span-2">
                    <AlertCircle size={17} className="shrink-0" />

                    <span className="flex-1">{formError}</span>

                    <button
                      type="button"
                      onClick={() => setFormError("")}
                      aria-label="إغلاق"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* NAME */}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#55564e]">
                    اسم التصنيف
                    <span className="mr-1 text-red-500">*</span>
                  </label>

                  <input
                    value={form.name}
                    onChange={(event) => {
                      const name = event.target.value;

                      setForm((current) => ({
                        ...current,
                        name,
                        slug: editingCategory
                          ? current.slug
                          : makeSlug(name),
                      }));
                    }}
                    placeholder="مثال: الملابس الرجالية"
                    maxLength={150}
                    required
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-sm outline-none transition focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10 disabled:bg-gray-50"
                  />
                </div>

                {/* SLUG */}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#55564e]">
                    الرابط المختصر (Slug)
                    <span className="mr-1 text-red-500">*</span>
                  </label>

                  <input
                    value={form.slug}
                    onChange={(event) =>
                      updateForm("slug", makeSlug(event.target.value))
                    }
                    placeholder="mens-clothing"
                    dir="ltr"
                    maxLength={180}
                    required
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-left text-sm outline-none transition focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10 disabled:bg-gray-50"
                  />
                </div>

                {/* DESCRIPTION */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-[#55564e]">
                    وصف التصنيف
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    rows={3}
                    disabled={saving}
                    placeholder="اكتب وصفًا مختصرًا للتصنيف..."
                    className="w-full resize-y rounded-xl border border-black/[0.08] px-3 py-3 text-sm outline-none transition placeholder:text-gray-300 focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10 disabled:bg-gray-50"
                  />
                </div>

                {/* IMAGE UPLOAD */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-[#55564e]">
                    صورة التصنيف
                  </label>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/[0.12] bg-[#faf9f6] px-4 py-6 transition hover:border-[#85816d]">
                    <ImageIcon
                      size={25}
                      className="text-[#85816d]"
                    />

                    <span className="mt-3 text-xs font-bold text-[#55564e]">
                      اضغط لاختيار صورة
                    </span>

                    <span className="mt-1 text-[10px] text-gray-400">
                      JPG أو PNG أو WEBP - الحد الأقصى 5MB
                    </span>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={saving}
                      onChange={(event) => {
                        handleImageChange(
                          event.target.files?.[0],
                        );

                        event.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>

                  {imagePreview && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-black/[0.06] bg-[#f5f3ed]">
                        <img
                          src={imagePreview}
                          alt="معاينة صورة التصنيف"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#55564e]">
                          {selectedImage
                            ? selectedImage.name
                            : "الصورة الحالية"}
                        </p>

                        <p className="mt-1 text-[10px] text-gray-400">
                          {selectedImage
                            ? "سيتم رفع الصورة الجديدة عند الحفظ."
                            : "اختر صورة جديدة لاستبدال الصورة الحالية."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* STATUS */}

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/[0.07] bg-[#faf9f6] px-4 py-3">
                    <div>
                      <p className="text-xs font-bold">
                        تفعيل التصنيف
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        التصنيف النشط متاح للاستخدام في المتجر.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.is_active}
                      disabled={saving}
                      onChange={(event) =>
                        updateForm("is_active", event.target.checked)
                      }
                      className="h-4 w-4 accent-[#77735f]"
                    />
                  </label>
                </div>
              </div>

              {/* MODAL FOOTER */}

              <div className="flex flex-col-reverse gap-2 border-t border-black/[0.055] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-10 rounded-xl border border-black/[0.08] bg-white px-5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#252720] px-6 text-xs font-bold text-white transition hover:bg-[#3a3c33] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
                      جارٍ الحفظ...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingCategory
                        ? "حفظ التعديلات"
                        : "إنشاء التصنيف"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
