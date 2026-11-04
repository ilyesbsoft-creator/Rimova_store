
"use client";


import Link from "next/link";
import { Tags } from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

type Product = {
  id: string;
  category_id: string;
  category_name: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  stock_quantity: number;
  sku: string | null;
  is_active: boolean | number;
  primary_image_url: string | null;
  created_at?: string;
  updated_at?: string;
};

type Category = {
  id: string;
  name: string;
  is_active?: boolean | number;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

type ProductForm = {
  name: string;
  slug: string;
  category_id: string;
  description: string;
  price: string;
  stock_quantity: string;
  sku: string;
  is_active: boolean;
};

type Filters = {
  search: string;
  category_id: string;
  status: string;
  sort_by: string;
  sort_order: "asc" | "desc";
};

const PAGE_SIZE = 20;

const initialForm: ProductForm = {
  name: "",
  slug: "",
  category_id: "",
  description: "",
  price: "",
  stock_quantity: "0",
  sku: "",
  is_active: true,
};

const initialFilters: Filters = {
  search: "",
  category_id: "",
  status: "",
  sort_by: "created_at",
  sort_order: "desc",
};


type ProductImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean | number;
};

type ValueDraft = {
  key: string;
  id?: string;
  value: string;
  original?: string;
};

type AttributeDraft = {
  key: string;
  id?: string;
  name: string;
  original?: string;
  values: ValueDraft[];
};

type VariantDraft = {
  key: string;
  id?: string;
  sku: string;
  price: string;
  stock_quantity: string;
  is_active: boolean;
  // true = SKU يُقترح تلقائيًا من SKU المنتج وقيم الخصائص.
  skuAuto: boolean;
  // attribute key -> value key
  selection: Record<string, string>;
  // نرسل الخصائص للباكند فقط إذا غيّرها المستخدم.
  selectionTouched: boolean;
  original?: {
    sku: string;
    price: string;
    stock_quantity: string;
    is_active: boolean;
  };
};

type PendingFile = {
  key: string;
  file: File;
  preview: string;
};

type PendingUrl = {
  key: string;
  url: string;
};

type RemovedState = {
  attributes: string[];
  values: { attributeId: string; id: string }[];
  variants: { id: string; needsZeroStock: boolean }[];
};

const MAX_IMAGES_PER_REQUEST = 20;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_GENERATED_VARIANTS = 100;

const emptyRemoved: RemovedState = {
  attributes: [],
  values: [],
  variants: [],
};

let keyCounter = 0;

function newKey(prefix: string) {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter}`;
}

function makeValueDraft(value = ""): ValueDraft {
  return { key: newKey("val"), value };
}

function makeVariantDraft(
  selection: Record<string, string> = {},
): VariantDraft {
  return {
    key: newKey("variant"),
    sku: "",
    price: "",
    stock_quantity: "0",
    is_active: true,
    skuAuto: true,
    selection,
    selectionTouched: true,
  };
}

// رموز مختصرة لقيم شائعة (ألوان ومقاسات) بالإنجليزية والعربية.
const VALUE_CODE_DICTIONARY: Record<string, string> = {
  black: "BLK",
  white: "WHT",
  red: "RED",
  blue: "BLU",
  green: "GRN",
  yellow: "YLW",
  gray: "GRY",
  grey: "GRY",
  pink: "PNK",
  brown: "BRN",
  orange: "ORG",
  purple: "PRP",
  beige: "BEG",
  navy: "NVY",
  small: "S",
  medium: "M",
  large: "L",
  "x-large": "XL",
  "extra large": "XL",
  "xx-large": "XXL",
  أسود: "BLK",
  اسود: "BLK",
  أبيض: "WHT",
  ابيض: "WHT",
  أحمر: "RED",
  احمر: "RED",
  أزرق: "BLU",
  ازرق: "BLU",
  أخضر: "GRN",
  اخضر: "GRN",
  أصفر: "YLW",
  اصفر: "YLW",
  رمادي: "GRY",
  وردي: "PNK",
  بني: "BRN",
  برتقالي: "ORG",
  بنفسجي: "PRP",
  بيج: "BEG",
  صغير: "S",
  متوسط: "M",
  كبير: "L",
};

function abbreviateValue(value: string, index: number) {
  const normalized = value.trim().toLowerCase();

  if (VALUE_CODE_DICTIONARY[normalized]) {
    return VALUE_CODE_DICTIONARY[normalized];
  }

  const latin = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  // قيمة غير لاتينية وغير موجودة في القاموس: رمز برقم ترتيبها.
  if (!latin) return `V${index + 1}`;

  if (latin.length <= 3) return latin.toUpperCase();

  // الحرف الأول + الحروف الساكنة التالية، بحد أقصى 3 أحرف.
  const rest = latin.slice(1).replace(/[aeiou]/g, "");

  return (latin[0] + rest).slice(0, 3).toUpperCase();
}

// RIM-SHIRT-001 -> RIM-SHIRT (حذف الرقم التسلسلي الأخير)
function baseSkuFromProductSku(productSku: string) {
  const trimmed = productSku.trim().toUpperCase();
  const stripped = trimmed.replace(/[-_\s]?\d+$/, "");

  return stripped || trimmed;
}

function suggestVariantSku(
  productSku: string,
  attributes: AttributeDraft[],
  variant: VariantDraft,
) {
  const codes = attributes
    .map((attribute) => {
      const index = attribute.values.findIndex(
        (value) => value.key === variant.selection[attribute.key],
      );

      return index >= 0
        ? abbreviateValue(attribute.values[index].value, index)
        : "";
    })
    .filter(Boolean);

  if (codes.length === 0) return "";

  return [baseSkuFromProductSku(productSku), ...codes]
    .filter(Boolean)
    .join("-")
    .slice(0, 100);
}

function selectionSignature(selection: Record<string, string>) {
  return Object.keys(selection)
    .filter((key) => selection[key])
    .sort()
    .map((key) => `${key}:${selection[key]}`)
    .join("|");
}

function extractData<T>(payload: any): T {
  // فك غلاف successResponse مرة واحدة فقط.
  return (
    payload &&
    typeof payload === "object" &&
    "data" in payload
      ? payload.data
      : payload
  ) as T;
}


async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const fieldErrors = payload?.errors?.fieldErrors;

    const details =
      fieldErrors && typeof fieldErrors === "object"
        ? Object.entries(fieldErrors)
            .map(
              ([field, messages]) =>
                `${field}: ${
                  Array.isArray(messages)
                    ? messages.join(", ")
                    : String(messages)
                }`,
            )
            .join(" | ")
        : "";

    const message =
      payload?.message ||
      payload?.error?.message ||
      "حدث خطأ أثناء تنفيذ العملية.";

    throw new Error(details ? `${message} (${details})` : message);
  }

  return payload as T;
}

function formatPrice(value: number | string) {
  return new Intl.NumberFormat("ar-DZ", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function isActive(value: boolean | number) {
  return value === true || value === 1;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "حدث خطأ غير متوقع.";
}

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-");
}

function Icon({
  name,
  size = 19,
}: {
  name:
    | "plus"
    | "search"
    | "filter"
    | "edit"
    | "trash"
    | "image"
    | "package"
    | "chevron"
    | "close"
    | "refresh"
    | "box"
    | "alert"
    | "link"
    | "check";
  size?: number;
}) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16M7 12h10m-7 6h4" />
        <circle cx="8" cy="6" r="1" />
        <circle cx="15" cy="12" r="1" />
      </>
    ),
    edit: (
      <>
        <path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
    package: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
      </>
    ),
    box: (
      <>
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    link: (
      <>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {paths[name]}
    </svg>
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
        {required && (
          <span className="mr-1 text-red-500">*</span>
        )}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-[#252720] outline-none transition placeholder:text-gray-300 focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    total_pages: 0,
  });

  const [filters, setFilters] =
    useState<Filters>(initialFilters);

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [form, setForm] = useState<ProductForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(
    null,
  );

  const [searchInput, setSearchInput] = useState("");

  // ---- حالة الصور والخصائص والمتغيرات داخل نافذة المنتج ----
  const [modalError, setModalError] = useState("");
  const [detailsReady, setDetailsReady] = useState(true);

  const [existingImages, setExistingImages] = useState<
    ProductImage[]
  >([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>(
    [],
  );
  const [pendingUrls, setPendingUrls] = useState<PendingUrl[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [imageBusyId, setImageBusyId] = useState<string | null>(
    null,
  );

  const [attributes, setAttributes] = useState<AttributeDraft[]>(
    [],
  );
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [removed, setRemoved] =
    useState<RemovedState>(emptyRemoved);

  const [serverVariantCount, setServerVariantCount] = useState(0);
  const [serverStock, setServerStock] = useState(0);

  const detailsToken = useRef(0);

  const [linkProduct, setLinkProduct] = useState<Product | null>(
    null,
  );
  const [linkCopied, setLinkCopied] = useState(false);

  const activeCategories = useMemo(
    () =>
      categories.filter((category) =>
        category.is_active === undefined
          ? true
          : isActive(category.is_active),
      ),
    [categories],
  );

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);

    try {
      const payload = await apiRequest<any>(
        "/api/admin/categories",
      );

      const result = extractData<any>(payload);

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.categories)
            ? result.categories
            : [];

      setCategories(list);
    } catch (error) {
      console.error("Categories loading error:", error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sort_by", filters.sort_by);
      params.set("sort_order", filters.sort_order);

      if (filters.search.trim()) {
        params.set("search", filters.search.trim());
      }

      if (filters.category_id) {
        params.set("category_id", filters.category_id);
      }

      if (filters.status === "active") {
        params.set("is_active", "true");
      } else if (filters.status === "inactive") {
        params.set("is_active", "false");
      }

      const payload = await apiRequest<any>(
        `/api/admin/products?${params.toString()}`,
      );

      const result = extractData<any>(payload);

      // نتيجة الخدمة: { data: Product[], pagination: {...} }
      const list = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.products)
          ? result.products
          : [];

      setProducts(list);

      if (result?.pagination) {
        setPagination(result.pagination);
      } else {
        setPagination({
          total: list.length,
          page,
          limit: PAGE_SIZE,
          total_pages: 1,
        });
      }
    } catch (error) {
      setError(getErrorMessage(error));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

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

  function resetExtras() {
    detailsToken.current += 1;

    pendingFiles.forEach((item) =>
      URL.revokeObjectURL(item.preview),
    );

    setPendingFiles([]);
    setPendingUrls([]);
    setUrlInput("");
    setExistingImages([]);
    setAttributes([]);
    setVariants([]);
    setRemoved(emptyRemoved);
    setServerVariantCount(0);
    setServerStock(0);
    setModalError("");
    setDetailsReady(true);
    setImageBusyId(null);
  }

  /**
   * GET /api/admin/products/:id
   * يعيد المنتج مع images و variants و attributes (وقيم كل خاصية).
   */
  async function loadDetails(
    productId: string,
    imagesOnly = false,
  ) {
    const token = detailsToken.current;

    const payload = await apiRequest<any>(
      `/api/admin/products/${productId}`,
    );

    // تجاهل الاستجابة إذا أُغلقت النافذة أو فُتح منتج آخر.
    if (token !== detailsToken.current) return;

    const details = extractData<any>(payload);

    setExistingImages(
      Array.isArray(details?.images) ? details.images : [],
    );

    if (imagesOnly) return;

    const loadedAttributes: AttributeDraft[] = (
      Array.isArray(details?.attributes) ? details.attributes : []
    ).map((attribute: any) => ({
      key: attribute.id,
      id: attribute.id,
      name: attribute.name ?? "",
      original: attribute.name ?? "",
      values: (Array.isArray(attribute.values)
        ? attribute.values
        : []
      ).map((value: any) => ({
        key: value.id,
        id: value.id,
        value: value.value ?? "",
        original: value.value ?? "",
      })),
    }));

    const loadedVariants: VariantDraft[] = (
      Array.isArray(details?.variants) ? details.variants : []
    ).map((variant: any) => {
      const snapshot = {
        sku: variant.sku ?? "",
        price:
          variant.price === null || variant.price === undefined
            ? ""
            : String(Number(variant.price)),
        stock_quantity: String(variant.stock_quantity ?? 0),
        is_active: isActive(variant.is_active),
      };

      // attribute_values: [{ attribute_id, attribute_value_id, ... }]
      const selection: Record<string, string> = {};

      for (const item of Array.isArray(variant.attribute_values)
        ? variant.attribute_values
        : []) {
        if (item?.attribute_id && item?.attribute_value_id) {
          selection[item.attribute_id] = item.attribute_value_id;
        }
      }

      return {
        key: variant.id,
        id: variant.id,
        ...snapshot,
        skuAuto: false,
        selection,
        selectionTouched: false,
        original: snapshot,
      };
    });

    setAttributes(loadedAttributes);
    setVariants(loadedVariants);
    setRemoved(emptyRemoved);
    setServerVariantCount(loadedVariants.length);
    setServerStock(Number(details?.stock_quantity ?? 0));
  }

  function openCreateModal() {
    resetExtras();
    setEditingProduct(null);
    setForm(initialForm);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    resetExtras();
    setEditingProduct(product);

    setForm({
      name: product.name,
      slug: product.slug,
      category_id: product.category_id,
      description: product.description ?? "",
      price: String(product.price),
      stock_quantity: String(product.stock_quantity ?? 0),
      sku: product.sku ?? "",
      is_active: isActive(product.is_active),
    });

    setServerStock(Number(product.stock_quantity ?? 0));
    setDetailsReady(false);
    setModalOpen(true);

    const token = detailsToken.current;

    loadDetails(product.id)
      .then(() => {
        if (token === detailsToken.current) setDetailsReady(true);
      })
      .catch((error) => {
        if (token === detailsToken.current) {
          setModalError(
            `تعذر تحميل صور وخصائص ومتغيرات المنتج: ${getErrorMessage(error)}`,
          );
        }
      });
  }

  function closeModal() {
    if (saving) return;

    resetExtras();
    setModalOpen(false);
    setEditingProduct(null);
    setForm(initialForm);
  }

  /* ----------------------------- الصور ----------------------------- */

  function handleFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    const room =
      MAX_IMAGES_PER_REQUEST -
      pendingFiles.length -
      pendingUrls.length;

    const accepted: PendingFile[] = [];
    const problems: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        problems.push(`الملف "${file.name}" ليس صورة.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        problems.push(
          `الصورة "${file.name}" أكبر من 10 ميغابايت.`,
        );
        continue;
      }

      if (accepted.length >= room) {
        problems.push(
          `الحد الأقصى ${MAX_IMAGES_PER_REQUEST} صورة في كل عملية حفظ.`,
        );
        break;
      }

      accepted.push({
        key: newKey("file"),
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setPendingFiles((current) => [...current, ...accepted]);
    setModalError(problems.join(" "));
  }

  function removePendingFile(key: string) {
    setPendingFiles((current) => {
      const target = current.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.key !== key);
    });
  }

  function addPendingUrl() {
    const value = urlInput.trim();
    if (!value) return;

    try {
      const parsed = new URL(value);

      if (
        parsed.protocol !== "https:" &&
        parsed.protocol !== "http:"
      ) {
        throw new Error("invalid protocol");
      }
    } catch {
      setModalError("رابط الصورة غير صالح (يجب أن يبدأ بـ http أو https).");
      return;
    }

    if (
      pendingFiles.length + pendingUrls.length >=
      MAX_IMAGES_PER_REQUEST
    ) {
      setModalError(
        `الحد الأقصى ${MAX_IMAGES_PER_REQUEST} صورة في كل عملية حفظ.`,
      );
      return;
    }

    setPendingUrls((current) => [
      ...current,
      { key: newKey("url"), url: value },
    ]);
    setUrlInput("");
    setModalError("");
  }

  async function makeImagePrimary(image: ProductImage) {
    if (!editingProduct || saving) return;

    setImageBusyId(image.id);
    setModalError("");

    try {
      await apiRequest(
        `/api/admin/products/${editingProduct.id}/images/${image.id}/primary`,
        { method: "PATCH" },
      );

      await loadDetails(editingProduct.id, true);
      void loadProducts();
    } catch (error) {
      setModalError(getErrorMessage(error));
    } finally {
      setImageBusyId(null);
    }
  }

  async function deleteExistingImage(image: ProductImage) {
    if (!editingProduct || saving) return;

    if (!window.confirm("هل تريد حذف هذه الصورة نهائيًا؟")) {
      return;
    }

    setImageBusyId(image.id);
    setModalError("");

    try {
      await apiRequest(
        `/api/admin/products/${editingProduct.id}/images/${image.id}`,
        { method: "DELETE" },
      );

      await loadDetails(editingProduct.id, true);
      void loadProducts();
    } catch (error) {
      setModalError(getErrorMessage(error));
    } finally {
      setImageBusyId(null);
    }
  }

  /* ---------------------------- الخصائص ---------------------------- */

  function addAttribute() {
    setAttributes((current) => [
      ...current,
      {
        key: newKey("attr"),
        name: "",
        values: [makeValueDraft()],
      },
    ]);
  }

  function updateAttributeName(key: string, name: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.key === key ? { ...attribute, name } : attribute,
      ),
    );
  }

  function removeAttributeDraft(attribute: AttributeDraft) {
    if (
      attribute.id &&
      !window.confirm(
        `حذف الخاصية "${attribute.name}" وجميع قيمها عند الحفظ؟`,
      )
    ) {
      return;
    }

    if (attribute.id) {
      const attributeId = attribute.id;

      setRemoved((current) => ({
        ...current,
        attributes: [...current.attributes, attributeId],
      }));
    }

    setAttributes((current) =>
      current.filter((item) => item.key !== attribute.key),
    );

    setVariants((current) =>
      current.map((variant) => {
        if (!(attribute.key in variant.selection)) return variant;

        const selection = { ...variant.selection };
        delete selection[attribute.key];

        return { ...variant, selection };
      }),
    );
  }

  function addValue(attributeKey: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.key === attributeKey
          ? {
              ...attribute,
              values: [...attribute.values, makeValueDraft()],
            }
          : attribute,
      ),
    );
  }

  function updateValue(
    attributeKey: string,
    valueKey: string,
    text: string,
  ) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.key === attributeKey
          ? {
              ...attribute,
              values: attribute.values.map((value) =>
                value.key === valueKey
                  ? { ...value, value: text }
                  : value,
              ),
            }
          : attribute,
      ),
    );
  }

  function removeValueDraft(
    attribute: AttributeDraft,
    value: ValueDraft,
  ) {
    if (value.id && attribute.id) {
      const attributeId = attribute.id;
      const valueId = value.id;

      setRemoved((current) => ({
        ...current,
        values: [
          ...current.values,
          { attributeId, id: valueId },
        ],
      }));
    }

    setAttributes((current) =>
      current.map((item) =>
        item.key === attribute.key
          ? {
              ...item,
              values: item.values.filter(
                (entry) => entry.key !== value.key,
              ),
            }
          : item,
      ),
    );

    setVariants((current) =>
      current.map((variant) =>
        variant.selection[attribute.key] === value.key
          ? {
              ...variant,
              selection: {
                ...variant.selection,
                [attribute.key]: "",
              },
            }
          : variant,
      ),
    );
  }

  /* ---------------------------- المتغيرات ---------------------------- */

  function getCleanedAttributes(): AttributeDraft[] {
    return attributes
      .map((attribute) => ({
        ...attribute,
        name: attribute.name.trim(),
        values: attribute.values
          .map((value) => ({
            ...value,
            value: value.value.trim(),
          }))
          .filter((value) => value.id || value.value),
      }))
      .filter(
        (attribute) =>
          attribute.id ||
          attribute.name ||
          attribute.values.length > 0,
      );
  }

  function addVariant() {
    setVariants((current) => [...current, makeVariantDraft()]);
  }

  function updateVariantDraft(
    key: string,
    patch: Partial<VariantDraft>,
  ) {
    setVariants((current) =>
      current.map((variant) =>
        variant.key === key ? { ...variant, ...patch } : variant,
      ),
    );
  }

  function setVariantSelection(
    variant: VariantDraft,
    attributeKey: string,
    valueKey: string,
  ) {
    updateVariantDraft(variant.key, {
      selection: {
        ...variant.selection,
        [attributeKey]: valueKey,
      },
      selectionTouched: true,
    });
  }

  function removeVariantDraft(variant: VariantDraft) {
    if (variant.id) {
      if (Number(variant.stock_quantity) !== 0) {
        setModalError(
          "لا يمكن حذف متغير له مخزون. اجعل مخزونه 0 أولًا ثم احذفه.",
        );
        return;
      }

      const variantId = variant.id;
      const needsZeroStock =
        Number(variant.original?.stock_quantity ?? 0) > 0;

      setRemoved((current) => ({
        ...current,
        variants: [
          ...current.variants,
          { id: variantId, needsZeroStock },
        ],
      }));
    }

    setVariants((current) =>
      current.filter((item) => item.key !== variant.key),
    );
    setModalError("");
  }

  function generateVariants() {
    const groups = getCleanedAttributes()
      .map((attribute) => ({
        key: attribute.key,
        values: attribute.values.filter((value) => value.value),
      }))
      .filter((group) => group.values.length > 0);

    if (groups.length === 0) {
      setModalError("أضف خاصية واحدة على الأقل بقيمة واحدة أولًا.");
      return;
    }

    let combos: Record<string, string>[] = [{}];

    for (const group of groups) {
      combos = combos.flatMap((combo) =>
        group.values.map((value) => ({
          ...combo,
          [group.key]: value.key,
        })),
      );

      if (combos.length > MAX_GENERATED_VARIANTS) {
        setModalError(
          `عدد التركيبات كبير جدًا (الحد ${MAX_GENERATED_VARIANTS}).`,
        );
        return;
      }
    }

    const existing = new Set(
      variants.map((variant) =>
        selectionSignature(variant.selection),
      ),
    );

    const fresh = combos.filter(
      (combo) => !existing.has(selectionSignature(combo)),
    );

    if (fresh.length === 0) {
      setModalError("جميع التركيبات موجودة بالفعل.");
      return;
    }

    setVariants((current) => [
      ...current,
      ...fresh.map((combo) => makeVariantDraft(combo)),
    ]);
    setModalError("");
  }

  // SKU الفعلي للمتغير: الاقتراح التلقائي ما لم يكتب المستخدم قيمة بنفسه.
  function getEffectiveSku(
    variant: VariantDraft,
    cleaned: AttributeDraft[] = getCleanedAttributes(),
  ) {
    return variant.skuAuto
      ? suggestVariantSku(form.sku, cleaned, variant)
      : variant.sku.trim();
  }

  function getVariantTitle(
    variant: VariantDraft,
    index: number,
  ) {
    {
      const labels = getCleanedAttributes()
        .map((attribute) =>
          attribute.values.find(
            (value) => value.key === variant.selection[attribute.key],
          )?.value,
        )
        .filter(Boolean);

      if (labels.length > 0) return labels.join(" / ");
    }

    return variant.id
      ? variant.sku || `متغير محفوظ ${index + 1}`
      : `متغير جديد ${index + 1}`;
  }

  const variantsTotalStock = variants.reduce(
    (sum, variant) => sum + (Number(variant.stock_quantity) || 0),
    0,
  );

  function updateForm<K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateExtras(): string | null {
    const cleaned = getCleanedAttributes();

    const seenNames = new Set<string>();

    for (const attribute of cleaned) {
      if (!attribute.name) {
        return "اسم الخاصية مطلوب (أو احذف الخاصية الفارغة).";
      }

      const lowered = attribute.name.toLowerCase();

      if (seenNames.has(lowered)) {
        return `الخاصية "${attribute.name}" مكررة.`;
      }

      seenNames.add(lowered);

      if (attribute.values.length === 0) {
        return `أضف قيمة واحدة على الأقل للخاصية "${attribute.name}".`;
      }

      const seenValues = new Set<string>();

      for (const value of attribute.values) {
        if (!value.value) {
          return `توجد قيمة فارغة في الخاصية "${attribute.name}".`;
        }

        const loweredValue = value.value.toLowerCase();

        if (seenValues.has(loweredValue)) {
          return `القيمة "${value.value}" مكررة في الخاصية "${attribute.name}".`;
        }

        seenValues.add(loweredValue);
      }
    }

    for (const [index, variant] of variants.entries()) {
      const title = getVariantTitle(variant, index);
      const stockValue = Number(variant.stock_quantity);

      if (
        variant.stock_quantity.trim() === "" ||
        !Number.isInteger(stockValue) ||
        stockValue < 0
      ) {
        return `مخزون المتغير "${title}" يجب أن يكون عددًا صحيحًا غير سالب.`;
      }

      if (variant.price.trim() !== "") {
        const variantPrice = Number(variant.price);

        if (!Number.isFinite(variantPrice) || variantPrice <= 0) {
          return `سعر المتغير "${title}" يجب أن يكون أكبر من صفر.`;
        }
      } else if (variant.original?.price) {
        return `لا يمكن إزالة سعر المتغير "${title}" بعد تحديده؛ أدخل سعرًا جديدًا.`;
      }

      if (
        !variant.id &&
        Object.values(variant.selection).filter(Boolean).length === 0
      ) {
        return `اختر قيمة خاصية واحدة على الأقل للمتغير "${title}".`;
      }
    }

    const signatures = new Set<string>();

    for (const variant of variants) {
      const signature = selectionSignature(variant.selection);
      if (!signature) continue;

      if (signatures.has(signature)) {
        return "يوجد متغيران بنفس تركيبة الخصائص.";
      }

      signatures.add(signature);
    }

    const skuSet = new Set<string>();

    for (const variant of variants) {
      const sku = getEffectiveSku(variant, cleaned).toLowerCase();
      if (!sku) continue;

      if (skuSet.has(sku)) {
        return `يوجد متغيران بنفس الـ SKU: ${sku.toUpperCase()}. عدّل أحدهما.`;
      }

      skuSet.add(sku);
    }

    const totalImages = pendingFiles.length + pendingUrls.length;

    if (totalImages > MAX_IMAGES_PER_REQUEST) {
      return `الحد الأقصى ${MAX_IMAGES_PER_REQUEST} صورة في كل عملية حفظ.`;
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError("");

    if (!detailsReady) {
      setModalError("يرجى انتظار اكتمال تحميل بيانات المنتج.");
      return;
    }

    if (!form.category_id) {
      setModalError("يرجى اختيار تصنيف المنتج.");
      return;
    }

    if (!form.name.trim() || !form.slug.trim()) {
      setModalError("اسم المنتج والرابط المختصر مطلوبان.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock_quantity);

    if (!Number.isFinite(price) || price <= 0) {
      setModalError("يرجى إدخال سعر أكبر من صفر.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setModalError("المخزون يجب أن يكون عددًا صحيحًا غير سالب.");
      return;
    }

    const extrasError = validateExtras();

    if (extrasError) {
      setModalError(extrasError);
      return;
    }

    const cleanedAttributes = getCleanedAttributes();
    const willHaveVariants = variants.length > 0;
    const hadVariants = serverVariantCount > 0;

    const baseBody: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      category_id: form.category_id,
      description: form.description.trim() || null,
      price,
      sku: form.sku.trim() || null,
      is_active: form.is_active,
    };

    setSaving(true);
    setError("");
    setNotice("");

    let stage = "بيانات المنتج";
    let productId: string | null = editingProduct?.id ?? null;
    let createdProduct: Product | null = null;
    let progressed = false;

    try {
      /* 1) بيانات المنتج */
      if (editingProduct) {
        const body = { ...baseBody };

        // الباكند يمنع تعديل مخزون المنتج مباشرة إذا كان لديه متغيرات.
        if (!hadVariants && !willHaveVariants) {
          body.stock_quantity = stock;
        }

        await apiRequest(
          `/api/admin/products/${editingProduct.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          },
        );

        progressed = true;

        // أول متغير يتطلب أن يكون المخزون المباشر للمنتج صفرًا.
        if (!hadVariants && willHaveVariants && serverStock > 0) {
          await apiRequest(
            `/api/admin/products/${editingProduct.id}/stock`,
            {
              method: "PATCH",
              body: JSON.stringify({ stock_quantity: 0 }),
            },
          );
        }
      } else {
        const payload = await apiRequest<any>(
          "/api/admin/products",
          {
            method: "POST",
            body: JSON.stringify({
              ...baseBody,
              stock_quantity: willHaveVariants ? 0 : stock,
            }),
          },
        );

        const created = extractData<any>(payload);
        createdProduct = (created?.product ?? null) as Product | null;
        productId = createdProduct?.id ?? null;

        if (!productId) {
          throw new Error("تعذر قراءة معرّف المنتج الجديد.");
        }

        progressed = true;
      }

      const id = productId as string;

      /* 2) الصور */
      if (pendingFiles.length > 0 || pendingUrls.length > 0) {
        stage = "الصور";

        const formData = new FormData();

        pendingFiles.forEach((item) =>
          formData.append("images", item.file),
        );

        if (pendingUrls.length > 0) {
          formData.append(
            "image_urls",
            JSON.stringify(
              pendingUrls.map((item) => ({
                image_url: item.url,
              })),
            ),
          );
        }

        await apiRequest(`/api/admin/products/${id}/images`, {
          method: "POST",
          body: formData,
        });

        pendingFiles.forEach((item) =>
          URL.revokeObjectURL(item.preview),
        );
        setPendingFiles([]);
        setPendingUrls([]);
      }

      /* 3) الخصائص وقيمها */
      stage = "الخصائص";

      const valueIdByKey = new Map<string, string>();

      const removedAttributeIds = new Set(removed.attributes);

      for (const item of removed.values) {
        if (removedAttributeIds.has(item.attributeId)) continue;

        await apiRequest(
          `/api/admin/products/${id}/attributes/${item.attributeId}/values/${item.id}`,
          { method: "DELETE" },
        );
      }

      for (const attributeId of removed.attributes) {
        await apiRequest(
          `/api/admin/products/${id}/attributes/${attributeId}`,
          { method: "DELETE" },
        );
      }

      for (const attribute of cleanedAttributes) {
        let attributeId = attribute.id;

        if (!attributeId) {
          const payload = await apiRequest<any>(
            `/api/admin/products/${id}/attributes`,
            {
              method: "POST",
              body: JSON.stringify({ name: attribute.name }),
            },
          );

          attributeId = extractData<any>(payload)?.id as
            | string
            | undefined;

          if (!attributeId) {
            throw new Error("تعذر قراءة معرّف الخاصية الجديدة.");
          }
        } else if (attribute.name !== (attribute.original ?? "")) {
          await apiRequest(
            `/api/admin/products/${id}/attributes/${attributeId}`,
            {
              method: "PATCH",
              body: JSON.stringify({ name: attribute.name }),
            },
          );
        }

        for (const value of attribute.values) {
          if (!value.id) {
            const payload = await apiRequest<any>(
              `/api/admin/products/${id}/attributes/${attributeId}/values`,
              {
                method: "POST",
                body: JSON.stringify({ value: value.value }),
              },
            );

            const createdValueId = extractData<any>(payload)?.id as
              | string
              | undefined;

            if (!createdValueId) {
              throw new Error("تعذر قراءة معرّف القيمة الجديدة.");
            }

            valueIdByKey.set(value.key, createdValueId);
          } else {
            if (value.value !== (value.original ?? "")) {
              await apiRequest(
                `/api/admin/products/${id}/attributes/${attributeId}/values/${value.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ value: value.value }),
                },
              );
            }

            valueIdByKey.set(value.key, value.id);
          }
        }
      }

      /* 4) المتغيرات والمخزون */
      stage = "المتغيرات";

      const selectedValueIds = (variant: VariantDraft) =>
        cleanedAttributes
          .map((attribute) =>
            valueIdByKey.get(variant.selection[attribute.key] ?? ""),
          )
          .filter((valueId): valueId is string => Boolean(valueId));

      for (const item of removed.variants) {
        // الباكند يرفض حذف متغير مخزونه أكبر من صفر.
        if (item.needsZeroStock) {
          await apiRequest(
            `/api/admin/products/${id}/variants/${item.id}/stock`,
            {
              method: "PATCH",
              body: JSON.stringify({ stock_quantity: 0 }),
            },
          );
        }

        await apiRequest(
          `/api/admin/products/${id}/variants/${item.id}`,
          { method: "DELETE" },
        );
      }

      for (const variant of variants) {
        if (variant.id) {
          const original = variant.original;
          const patch: Record<string, unknown> = {};

          const effectiveSku = getEffectiveSku(
            variant,
            cleanedAttributes,
          );

          if (effectiveSku !== (original?.sku ?? "")) {
            patch.sku = effectiveSku || null;
          }

          if (
            variant.price.trim() !== "" &&
            Number(variant.price) !== Number(original?.price || 0)
          ) {
            patch.price = Number(variant.price);
          }

          if (variant.stock_quantity !== original?.stock_quantity) {
            patch.stock_quantity = Number(variant.stock_quantity);
          }

          if (variant.is_active !== original?.is_active) {
            patch.is_active = variant.is_active;
          }

          if (variant.selectionTouched) {
            patch.attribute_value_ids = selectedValueIds(variant);
          }

          if (Object.keys(patch).length > 0) {
            await apiRequest(
              `/api/admin/products/${id}/variants/${variant.id}`,
              {
                method: "PATCH",
                body: JSON.stringify(patch),
              },
            );
          }
        } else {
          await apiRequest(`/api/admin/products/${id}/variants`, {
            method: "POST",
            body: JSON.stringify({
              sku:
                getEffectiveSku(variant, cleanedAttributes) || null,
              ...(variant.price.trim() !== ""
                ? { price: Number(variant.price) }
                : {}),
              stock_quantity: Number(variant.stock_quantity),
              is_active: variant.is_active,
              attribute_value_ids: selectedValueIds(variant),
            }),
          });
        }
      }

      // حُذفت كل المتغيرات: نعيد المخزون المباشر للمنتج بالقيمة المدخلة.
      if (hadVariants && !willHaveVariants) {
        await apiRequest(`/api/admin/products/${id}/stock`, {
          method: "PATCH",
          body: JSON.stringify({ stock_quantity: stock }),
        });
      }

      resetExtras();
      setModalOpen(false);
      setEditingProduct(null);
      setForm(initialForm);

      setNotice(
        editingProduct
          ? "تم تحديث بيانات المنتج بنجاح."
          : "تم إنشاء المنتج بنجاح.",
      );

      await loadProducts();
    } catch (error) {
      const message = getErrorMessage(error);

      if (progressed && productId) {
        // المنتج موجود فعلًا: ننتقل لوضع التعديل ونعيد تحميل الحالة الفعلية.
        if (!editingProduct && createdProduct) {
          setEditingProduct(createdProduct);
        }

        setModalError(
          stage === "بيانات المنتج"
            ? message
            : `تعذر إكمال مرحلة «${stage}»: ${message}. تم حفظ المراحل السابقة وأُعيد تحميل البيانات من الخادم، راجعها ثم احفظ مجددًا.`,
        );

        try {
          await loadDetails(productId);
        } catch {
          /* يبقى الخطأ الأصلي ظاهرًا */
        }

        void loadProducts();
      } else {
        setModalError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  function getProductUrl(product: Product) {
    return `${window.location.origin}/product/${product.id}`;
  }

  async function copyProductLink(url: string) {
    let copied = false;

    try {
      // واجهة الحافظة تعمل فقط في https أو localhost.
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const area = document.createElement("textarea");
      area.value = url;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();

      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }

      document.body.removeChild(area);
    }

    setLinkCopied(copied);

    if (copied) {
      window.setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المنتج "${product.name}"؟\nسيتم حذف بياناته التابعة أيضًا.`,
    );

    if (!confirmed) return;

    setDeletingId(product.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/api/admin/products/${product.id}`,
        { method: "DELETE" },
      );

      setNotice("تم حذف المنتج بنجاح.");

      if (products.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadProducts();
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  function resetFilters() {
    setSearchInput("");
    setFilters(initialFilters);
    setPage(1);
  }

  const firstItem =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;

  const lastItem = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-[1600px] space-y-6"
    >
      {/* Page heading */}
<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
  <div>
    <div className="flex items-center gap-2 text-[11px] text-gray-400">
      <span>إدارة المتجر</span>
      <Icon name="chevron" size={13} />
      <span className="font-semibold text-[#85816d]">
        المنتجات
      </span>
    </div>

    <h1 className="mt-3 text-2xl font-black tracking-tight">
      المنتجات
    </h1>

    <p className="mt-2 text-xs text-gray-400">
      إدارة منتجات المتجر ومتابعة الأسعار والمخزون.
    </p>
  </div>

  <div className="flex items-center gap-2">
    <Link
      href="/admin/categories"
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e9e6dd] bg-white px-4 text-xs font-bold text-[#252720] transition hover:bg-[#faf9f6]"
    >
      <Tags size={18} />
      التصنيفات
    </Link>

    <button
      type="button"
      onClick={openCreateModal}
      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#252720] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#3a3c33]"
    >
      <Icon name="plus" size={17} />
      إضافة منتج جديد
    </button>
  </div>
</div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <Icon name="alert" size={17} />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="إغلاق"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-[#dce4d5] bg-[#f2f6ef] px-4 py-3 text-xs text-[#52674a]">
          <Icon name="check" size={17} />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="إغلاق"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              إجمالي المنتجات
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f1e9] text-[#77735f]">
              <Icon name="package" />
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tabular-nums">
            {pagination.total.toLocaleString("ar-DZ")}
          </p>
          <p className="mt-1 text-[10px] text-gray-400">
            عدد المنتجات المسجلة في المتجر
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              منتجات نشطة في الصفحة
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3eb] text-[#66805e]">
              <Icon name="check" />
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tabular-nums">
            {products.filter((item) => isActive(item.is_active)).length}
          </p>
          <p className="mt-1 text-[10px] text-gray-400">
            من المنتجات المعروضة حاليًا
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              منتجات غير نشطة في الصفحة
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4eee8] text-[#a17d55]">
              <Icon name="box" />
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tabular-nums">
            {products.filter((item) => !isActive(item.is_active)).length}
          </p>
          <p className="mt-1 text-[10px] text-gray-400">
            من المنتجات المعروضة حاليًا
          </p>
        </div>
      </div>

      {/* Products table */}
      <section className="overflow-hidden rounded-2xl border border-black/[0.055] bg-white">
        {/* Filters */}
        <div className="border-b border-black/[0.055] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-sm font-bold">
                قائمة المنتجات
              </h2>
              <p className="mt-1 text-[11px] text-gray-400">
                عرض وإدارة جميع المنتجات المسجلة.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadProducts()}
              disabled={loading}
              className="flex h-9 items-center justify-center gap-2 self-start rounded-xl border border-black/[0.07] px-3 text-[11px] font-semibold text-[#77735f] transition hover:bg-[#f5f3ed] disabled:opacity-50 xl:self-auto"
            >
              <Icon name="refresh" size={15} />
              تحديث القائمة
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="search" size={17} />
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="ابحث بالاسم أو SKU أو الرابط..."
                className={`${inputClass} pr-10 text-xs`}
              />
            </div>

            {/* Category */}
            <select
              value={filters.category_id}
              onChange={(event) =>
                updateFilter("category_id", event.target.value)
              }
              disabled={categoriesLoading}
              className={`${inputClass} text-xs`}
            >
              <option value="">جميع التصنيفات</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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

            {/* Sorting */}
            <select
              value={`${filters.sort_by}:${filters.sort_order}`}
              onChange={(event) => {
                const [sort_by, sort_order] =
                  event.target.value.split(":");

                setFilters((current) => ({
                  ...current,
                  sort_by,
                  sort_order: sort_order as "asc" | "desc",
                }));
                setPage(1);
              }}
              className={`${inputClass} text-xs`}
            >
              <option value="created_at:desc">
                الأحدث أولًا
              </option>
              <option value="created_at:asc">
                الأقدم أولًا
              </option>
              <option value="name:asc">
                الاسم: تصاعدي
              </option>
              <option value="name:desc">
                الاسم: تنازلي
              </option>
              <option value="price:asc">
                السعر: من الأقل للأعلى
              </option>
              <option value="price:desc">
                السعر: من الأعلى للأقل
              </option>
              <option value="stock_quantity:asc">
                المخزون: من الأقل للأعلى
              </option>
              <option value="stock_quantity:desc">
                المخزون: من الأعلى للأقل
              </option>
            </select>
          </div>

          {(filters.category_id ||
            filters.status ||
            filters.search) && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 text-[11px] font-semibold text-[#85816d] transition hover:text-[#252720]"
            >
              مسح عوامل التصفية
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-right">
            <thead>
              <tr className="bg-[#faf9f6] text-[10px] text-gray-400">
                <th className="px-5 py-4 font-semibold">
                  المنتج
                </th>
                <th className="px-5 py-4 font-semibold">
                  التصنيف
                </th>
                <th className="px-5 py-4 font-semibold">
                  السعر
                </th>
                <th className="px-5 py-4 font-semibold">
                  المخزون
                </th>
                <th className="px-5 py-4 font-semibold">
                  SKU
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
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-xs text-gray-400"
                  >
                    <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-[#e5e2d8] border-t-[#85816d]" />
                    جارٍ تحميل المنتجات...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f3ed] text-[#85816d]">
                        <Icon name="package" size={25} />
                      </span>
                      <p className="mt-4 text-sm font-bold">
                        لا توجد منتجات
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        لم يتم العثور على منتجات تطابق عوامل البحث.
                      </p>
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-4 text-xs font-bold text-[#85816d] hover:text-[#252720]"
                      >
                        إضافة أول منتج
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="text-xs transition hover:bg-[#faf9f6]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-[220px] items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/[0.05] bg-[#f5f3ed]">
                          {product.primary_image_url ? (
                            <img
                              src={product.primary_image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Icon
                              name="image"
                              size={20}
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-bold text-[#252720]">
                            {product.name}
                          </p>
                          <p className="mt-1 max-w-[220px] truncate text-[10px] text-gray-400">
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {product.category_name || "—"}
                    </td>

                    <td className="px-5 py-4 font-bold tabular-nums">
                      {formatPrice(product.price)}
                      <span className="mr-1 text-[10px] font-normal text-gray-400">
                        دج
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          Number(product.stock_quantity) <= 5
                            ? "font-bold text-[#b77943]"
                            : "font-semibold text-[#55564e]"
                        }
                      >
                        {Number(product.stock_quantity || 0).toLocaleString("ar-DZ")}
                      </span>
                      <span className="mr-1 text-[10px] text-gray-400">
                        قطعة
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px] text-gray-400">
                      {product.sku || "—"}
                    </td>

                    <td className="px-5 py-4">
                      {isActive(product.is_active) ? (
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
                          onClick={() => {
                            setLinkCopied(false);
                            setLinkProduct(product);
                          }}
                          title="رابط المنتج"
                          className="rounded-lg p-2 text-[#77735f] transition hover:bg-[#f1efe8]"
                        >
                          <Icon name="link" size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          title="تعديل المنتج"
                          className="rounded-lg p-2 text-[#77735f] transition hover:bg-[#f1efe8]"
                        >
                          <Icon name="edit" size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(product)}
                          disabled={deletingId === product.id}
                          title="حذف المنتج"
                          className="rounded-lg p-2 text-[#b0786b] transition hover:bg-red-50 disabled:opacity-40"
                        >
                          {deletingId === product.id ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                          ) : (
                            <Icon name="trash" size={16} />
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
            منتج
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
              <Icon name="chevron" size={14} />
              السابق
            </button>

            <span className="min-w-20 text-center text-[11px] font-bold tabular-nums">
              {page} / {Math.max(pagination.total_pages, 1)}
            </span>

            <button
              type="button"
              disabled={
                page >= pagination.total_pages || loading
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    pagination.total_pages,
                    current + 1,
                  ),
                )
              }
              className="flex h-9 items-center gap-1 rounded-lg border border-black/[0.07] px-3 text-[11px] font-semibold text-gray-500 transition hover:bg-[#f5f3ed] disabled:cursor-not-allowed disabled:opacity-35"
            >
              التالي
              <span className="rotate-180">
                <Icon name="chevron" size={14} />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Product link popup */}
      {linkProduct && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLinkProduct(null);
            }
          }}
        >
          <div className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-sm font-black">رابط المنتج</h2>
                <p className="mt-1 truncate text-[11px] text-gray-400">
                  {linkProduct.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLinkProduct(null)}
                className="rounded-xl bg-[#f5f3ed] p-2 text-gray-500 transition hover:bg-[#ebe8df]"
                aria-label="إغلاق"
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <input
                readOnly
                dir="ltr"
                value={getProductUrl(linkProduct)}
                onFocus={(event) => event.target.select()}
                className={`${inputClass} text-left text-xs`}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void copyProductLink(getProductUrl(linkProduct))
                  }
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#252720] px-4 text-xs font-bold text-white transition hover:bg-[#3a3c33]"
                >
                  <Icon name={linkCopied ? "check" : "link"} size={16} />
                  {linkCopied ? "تم النسخ" : "نسخ الرابط"}
                </button>

                <a
                  href={getProductUrl(linkProduct)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-semibold text-[#77735f] transition hover:bg-[#f5f3ed]"
                >
                  فتح الصفحة
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.055] px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-base font-black">
                  {editingProduct
                    ? "تعديل المنتج"
                    : "إضافة منتج جديد"}
                </h2>
                <p className="mt-1 text-[11px] text-gray-400">
                  أدخل المعلومات الأساسية للمنتج.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl bg-[#f5f3ed] p-2 text-gray-500 transition hover:bg-[#ebe8df]"
                aria-label="إغلاق"
              >
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7">
                {modalError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:col-span-2">
                    <Icon name="alert" size={17} />
                    <span className="flex-1 leading-6">
                      {modalError}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalError("")}
                      aria-label="إغلاق"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                )}

                {!detailsReady && !modalError && (
                  <div className="flex items-center gap-2 rounded-xl bg-[#faf9f6] px-4 py-3 text-[11px] text-gray-400 sm:col-span-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#e5e2d8] border-t-[#85816d]" />
                    جارٍ تحميل صور وخصائص ومتغيرات المنتج...
                  </div>
                )}

                <Field label="اسم المنتج" required>
                  <input
                    value={form.name}
                    onChange={(event) => {
                      const name = event.target.value;

                      setForm((current) => ({
                        ...current,
                        name,
                        slug: editingProduct
                          ? current.slug
                          : makeSlug(name),
                      }));
                    }}
                    placeholder="مثال: قميص قطني"
                    className={inputClass}
                    required
                    maxLength={200}
                  />
                </Field>

                <Field label="الرابط المختصر (Slug)" required>
                  <input
                    value={form.slug}
                    onChange={(event) =>
                      updateForm("slug", makeSlug(event.target.value))
                    }
                    placeholder="cotton-shirt"
                    dir="ltr"
                    className={`${inputClass} text-left`}
                    required
                    maxLength={220}
                  />
                </Field>

                <Field label="التصنيف" required>
                  <select
                    value={form.category_id}
                    onChange={(event) =>
                      updateForm("category_id", event.target.value)
                    }
                    className={inputClass}
                    required
                    disabled={categoriesLoading}
                  >
                    <option value="">
                      اختر التصنيف
                    </option>
                    {activeCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="السعر (دج)" required>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      updateForm("price", event.target.value)
                    }
                    placeholder="0.00"
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="رمز المنتج (SKU)">
                  <input
                    value={form.sku}
                    onChange={(event) =>
                      updateForm("sku", event.target.value)
                    }
                    placeholder="RM-001"
                    dir="ltr"
                    className={`${inputClass} text-left`}
                  />
                </Field>

                <Field label="الكمية في المخزون">
                  {variants.length > 0 ? (
                    <>
                      <input
                        type="number"
                        value={variantsTotalStock}
                        readOnly
                        disabled
                        className={`${inputClass} bg-[#faf9f6]`}
                      />
                      <span className="mt-1.5 block text-[10px] text-gray-400">
                        يُحسب تلقائيًا من مجموع مخزون المتغيرات.
                      </span>
                    </>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock_quantity}
                      onChange={(event) =>
                        updateForm(
                          "stock_quantity",
                          event.target.value,
                        )
                      }
                      className={inputClass}
                    />
                  )}
                </Field>

                <div className="sm:col-span-2">
                  <Field label="وصف المنتج">
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm(
                          "description",
                          event.target.value,
                        )
                      }
                      rows={4}
                      placeholder="اكتب وصفًا مختصرًا للمنتج..."
                      className="w-full resize-y rounded-xl border border-black/[0.08] bg-white px-3 py-3 text-sm outline-none transition placeholder:text-gray-300 focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10"
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/[0.07] bg-[#faf9f6] px-4 py-3">
                    <div>
                      <p className="text-xs font-bold">
                        تفعيل المنتج
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        المنتج النشط يكون متاحًا للعرض في المتجر.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) =>
                        updateForm(
                          "is_active",
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4 accent-[#77735f]"
                    />
                  </label>
                </div>

                {/* ===== الصور ===== */}
                <div className="space-y-4 rounded-xl border border-black/[0.07] p-4 sm:col-span-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold">
                        صور المنتج
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        ارفع صورًا من جهازك أو أضف روابط خارجية (حتى{" "}
                        {MAX_IMAGES_PER_REQUEST} صورة في كل حفظ، وبحد
                        أقصى 10 ميغابايت للصورة). الصورة الرئيسية
                        الأولى تُحدَّد تلقائيًا.
                      </p>
                    </div>

                    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-black/[0.07] px-3 text-[11px] font-semibold text-[#77735f] transition hover:bg-[#f5f3ed]">
                      <Icon name="image" size={15} />
                      رفع صور
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFilesSelected}
                      />
                    </label>
                  </div>

                  {(existingImages.length > 0 ||
                    pendingFiles.length > 0 ||
                    pendingUrls.length > 0) && (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {existingImages.map((image) => (
                        <div
                          key={image.id}
                          className="overflow-hidden rounded-xl border border-black/[0.06] bg-[#f5f3ed]"
                        >
                          <div className="relative aspect-square">
                            <img
                              src={image.image_url}
                              alt={image.alt_text || "صورة المنتج"}
                              className="h-full w-full object-cover"
                            />

                            {isActive(image.is_primary) && (
                              <span className="absolute right-1.5 top-1.5 rounded-full bg-[#252720] px-2 py-0.5 text-[9px] font-bold text-white">
                                رئيسية
                              </span>
                            )}

                            {imageBusyId === image.id && (
                              <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#e5e2d8] border-t-[#85816d]" />
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1 bg-white px-1.5 py-1">
                            <button
                              type="button"
                              onClick={() => void makeImagePrimary(image)}
                              disabled={
                                isActive(image.is_primary) ||
                                imageBusyId !== null ||
                                saving
                              }
                              className="text-[10px] font-semibold text-[#77735f] disabled:opacity-35"
                            >
                              جعلها رئيسية
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void deleteExistingImage(image)
                              }
                              disabled={imageBusyId !== null || saving}
                              title="حذف الصورة"
                              className="rounded-md p-1 text-[#b0786b] hover:bg-red-50 disabled:opacity-35"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {pendingFiles.map((item) => (
                        <div
                          key={item.key}
                          className="overflow-hidden rounded-xl border border-dashed border-[#85816d]/40 bg-[#f5f3ed]"
                        >
                          <div className="relative aspect-square">
                            <img
                              src={item.preview}
                              alt={item.file.name}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-[#85816d] px-2 py-0.5 text-[9px] font-bold text-white">
                              جديدة
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 bg-white px-1.5 py-1">
                            <span className="truncate text-[10px] text-gray-400">
                              {item.file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePendingFile(item.key)}
                              title="إزالة"
                              className="rounded-md p-1 text-[#b0786b] hover:bg-red-50"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {pendingUrls.map((item) => (
                        <div
                          key={item.key}
                          className="overflow-hidden rounded-xl border border-dashed border-[#85816d]/40 bg-[#f5f3ed]"
                        >
                          <div className="relative aspect-square">
                            <img
                              src={item.url}
                              alt="صورة من رابط"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-[#85816d] px-2 py-0.5 text-[9px] font-bold text-white">
                              رابط
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 bg-white px-1.5 py-1">
                            <span
                              dir="ltr"
                              className="truncate text-[10px] text-gray-400"
                            >
                              {item.url}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingUrls((current) =>
                                  current.filter(
                                    (entry) => entry.key !== item.key,
                                  ),
                                )
                              }
                              title="إزالة"
                              className="rounded-md p-1 text-[#b0786b] hover:bg-red-50"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="url"
                      dir="ltr"
                      value={urlInput}
                      onChange={(event) =>
                        setUrlInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addPendingUrl();
                        }
                      }}
                      placeholder="https://example.com/image.jpg"
                      className={`${inputClass} text-left text-xs`}
                    />
                    <button
                      type="button"
                      onClick={addPendingUrl}
                      className="h-11 shrink-0 rounded-xl border border-black/[0.08] px-4 text-xs font-semibold text-[#77735f] transition hover:bg-[#f5f3ed]"
                    >
                      إضافة رابط
                    </button>
                  </div>
                </div>

                {/* ===== الخصائص ===== */}
                <div className="space-y-4 rounded-xl border border-black/[0.07] p-4 sm:col-span-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold">
                        خصائص المنتج
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        مثل: اللون (أحمر، أزرق) أو المقاس (S، M، L).
                        تُستخدم هذه القيم لبناء المتغيرات.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addAttribute}
                      className="flex h-9 items-center gap-2 rounded-xl border border-black/[0.07] px-3 text-[11px] font-semibold text-[#77735f] transition hover:bg-[#f5f3ed]"
                    >
                      <Icon name="plus" size={15} />
                      إضافة خاصية
                    </button>
                  </div>

                  {attributes.length === 0 ? (
                    <p className="rounded-xl bg-[#faf9f6] px-4 py-5 text-center text-[11px] text-gray-400">
                      لا توجد خصائص لهذا المنتج.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {attributes.map((attribute) => (
                        <div
                          key={attribute.key}
                          className="space-y-3 rounded-xl bg-[#faf9f6] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              value={attribute.name}
                              onChange={(event) =>
                                updateAttributeName(
                                  attribute.key,
                                  event.target.value,
                                )
                              }
                              placeholder="اسم الخاصية، مثال: اللون"
                              maxLength={150}
                              className={`${inputClass} h-10 text-xs font-semibold`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeAttributeDraft(attribute)
                              }
                              title="حذف الخاصية"
                              className="rounded-lg p-2 text-[#b0786b] transition hover:bg-red-50"
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {attribute.values.map((value) => (
                              <div
                                key={value.key}
                                className="flex items-center rounded-lg border border-black/[0.08] bg-white"
                              >
                                <input
                                  value={value.value}
                                  onChange={(event) =>
                                    updateValue(
                                      attribute.key,
                                      value.key,
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      addValue(attribute.key);
                                    }
                                  }}
                                  placeholder="قيمة"
                                  maxLength={150}
                                  className="h-9 w-28 rounded-lg bg-transparent px-2.5 text-xs outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeValueDraft(attribute, value)
                                  }
                                  title="حذف القيمة"
                                  className="px-2 text-gray-400 hover:text-red-500"
                                >
                                  <Icon name="close" size={13} />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => addValue(attribute.key)}
                              className="flex h-9 items-center gap-1 rounded-lg border border-dashed border-[#85816d]/50 px-3 text-[11px] font-semibold text-[#77735f] transition hover:bg-white"
                            >
                              <Icon name="plus" size={13} />
                              قيمة
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ===== المتغيرات والمخزون ===== */}
                <div className="space-y-4 rounded-xl border border-black/[0.07] p-4 sm:col-span-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold">
                        المتغيرات والمخزون
                      </p>
                      <p className="mt-1 text-[10px] leading-5 text-gray-400">
                        كل متغير هو تركيبة من الخصائص (مثل: أحمر / M) بمخزون
                        وسعر اختياري خاص به. عند وجود متغيرات يصبح مخزون
                        المنتج مجموع مخزونها.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={generateVariants}
                        className="flex h-9 items-center gap-2 rounded-xl border border-black/[0.07] px-3 text-[11px] font-semibold text-[#77735f] transition hover:bg-[#f5f3ed]"
                      >
                        <Icon name="refresh" size={15} />
                        توليد التركيبات
                      </button>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="flex h-9 items-center gap-2 rounded-xl border border-black/[0.07] px-3 text-[11px] font-semibold text-[#77735f] transition hover:bg-[#f5f3ed]"
                      >
                        <Icon name="plus" size={15} />
                        إضافة متغير
                      </button>
                    </div>
                  </div>

                  {variants.length === 0 ? (
                    <p className="rounded-xl bg-[#faf9f6] px-4 py-5 text-center text-[11px] text-gray-400">
                      لا توجد متغيرات. سيُستخدم حقل «الكمية في المخزون» أعلاه.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {variants.map((variant, index) => (
                        <div
                          key={variant.key}
                          className="space-y-3 rounded-xl bg-[#faf9f6] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-xs font-bold">
                                {getVariantTitle(variant, index)}
                              </span>
                              {!variant.id && (
                                <span className="shrink-0 rounded-full bg-[#85816d] px-2 py-0.5 text-[9px] font-bold text-white">
                                  جديد
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeVariantDraft(variant)}
                              title="حذف المتغير"
                              className="rounded-lg p-2 text-[#b0786b] transition hover:bg-red-50"
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </div>

                          {attributes.some(
                            (attribute) =>
                              attribute.values.some(
                                (value) => value.value.trim(),
                              ),
                          ) && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {attributes.map((attribute) => {
                                const options = attribute.values.filter(
                                  (value) => value.value.trim(),
                                );

                                if (options.length === 0) return null;

                                return (
                                  <Field
                                    key={attribute.key}
                                    label={
                                      attribute.name.trim() ||
                                      "خاصية بدون اسم"
                                    }
                                  >
                                    <select
                                      value={
                                        variant.selection[attribute.key] ??
                                        ""
                                      }
                                      onChange={(event) =>
                                        setVariantSelection(
                                          variant,
                                          attribute.key,
                                          event.target.value,
                                        )
                                      }
                                      className={`${inputClass} h-10 text-xs`}
                                    >
                                      <option value="">—</option>
                                      {options.map((value) => (
                                        <option
                                          key={value.key}
                                          value={value.key}
                                        >
                                          {value.value}
                                        </option>
                                      ))}
                                    </select>
                                  </Field>
                                );
                              })}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <Field label="المخزون">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={variant.stock_quantity}
                                onChange={(event) =>
                                  updateVariantDraft(variant.key, {
                                    stock_quantity: event.target.value,
                                  })
                                }
                                className={`${inputClass} h-10 text-xs`}
                              />
                            </Field>

                            <Field label="السعر (اختياري)">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.price}
                                onChange={(event) =>
                                  updateVariantDraft(variant.key, {
                                    price: event.target.value,
                                  })
                                }
                                placeholder="سعر المنتج"
                                className={`${inputClass} h-10 text-xs`}
                              />
                            </Field>

                            <Field label="SKU">
                              <input
                                value={getEffectiveSku(variant)}
                                onChange={(event) =>
                                  updateVariantDraft(variant.key, {
                                    sku: event.target.value,
                                    skuAuto: false,
                                  })
                                }
                                placeholder={
                                  variant.skuAuto
                                    ? "يُقترح بعد اختيار الخصائص"
                                    : ""
                                }
                                dir="ltr"
                                maxLength={100}
                                className={`${inputClass} h-10 text-left text-xs`}
                              />
                              {!variant.skuAuto && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateVariantDraft(variant.key, {
                                      skuAuto: true,
                                    })
                                  }
                                  className="mt-1.5 text-[10px] font-semibold text-[#85816d] hover:text-[#252720]"
                                >
                                  استخدم الاقتراح التلقائي
                                </button>
                              )}
                            </Field>

                            <label className="flex cursor-pointer items-end gap-2 pb-3 text-xs font-semibold text-[#55564e]">
                              <input
                                type="checkbox"
                                checked={variant.is_active}
                                onChange={(event) =>
                                  updateVariantDraft(variant.key, {
                                    is_active: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-[#77735f]"
                              />
                              نشط
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
                  disabled={saving || !detailsReady}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#252720] px-6 text-xs font-bold text-white transition hover:bg-[#3a3c33] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {saving
                    ? "جارٍ الحفظ..."
                    : editingProduct
                      ? "حفظ التعديلات"
                      : "إنشاء المنتج"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
