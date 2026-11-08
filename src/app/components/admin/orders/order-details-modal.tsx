
"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpDown,
  LoaderCircle,
  Package,
  Phone,
  ShoppingBag,
  Truck,
  UserRound,
  X,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  Minus,
  Check,
  ChevronLeft,
  AlertCircle,
  Boxes,
  RefreshCw,
} from "lucide-react";
import type { getProductById } from "@/backend/modules/products/product.service";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type Product = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

type DeliveryMethod = "HOME" | "OFFICE";

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

type Order = {
  id: string;
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  wilaya_id: string;
  wilaya_name?: string | null;
  commune_id: string;
  commune_name?: string | null;
  delivery_company_id?: string | null;
  delivery_company_name?: string | null;
  delivery_method: DeliveryMethod;
  delivery_office_id?: string | null;
  delivery_office_name?: string | null;
  delivery_address?: string | null;
  delivery_fee: number | string;
  subtotal: number | string;
  total_amount: number | string;
  status: OrderStatus;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
};

type ItemInput = {
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
};

type OrderDetailsModalProps = {
  order: Order;
  loading: boolean;
  savingItems: boolean;
  onClose: () => void;
  onEditCustomer: (order: Order) => void;
  onChangeStatus: (order: Order) => void;
  onAddItem: (input: ItemInput) => Promise<void>;
  onUpdateItem: (itemId: string, input: ItemInput) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
};

type ProductListItem = {
  id: string;
  name: string;
  price: number | string;
  primary_image_url?: string | null;
  sku?: string | null;
};

type SelectedAttributeValues = Record<string, string>;

type EditorMode = "add" | "edit";

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "حدث خطأ غير متوقع. يرجى المحاولة مجددًا.";
}

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
};

async function apiRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "same-origin",
  });

  const body = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | T
    | null;

  if (!response.ok) {
    const errorBody = body as ApiResponse<T> | null;

    throw new Error(
      errorBody?.message ||
        errorBody?.error ||
        `تعذر تنفيذ الطلب (${response.status})`,
    );
  }

  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    body.data !== undefined
  ) {
    return body.data as T;
  }

  return body as T;
}

function getProductFromResponse(result: unknown): Product {
  const payload = result as {
    product?: Product;
    data?: Product;
  };

  const product = payload?.product ?? payload?.data ?? result;

  if (
    !product ||
    typeof product !== "object" ||
    !("id" in product) ||
    !("variants" in product) ||
    !("attributes" in product)
  ) {
    throw new Error("بيانات المنتج المستلمة غير صالحة.");
  }

  return product as Product;
}

function getProductsFromResponse(result: unknown): ProductListItem[] {
  const payload = result as {
    products?: ProductListItem[];
    items?: ProductListItem[];
    data?: ProductListItem[];
  };

  if (Array.isArray(result)) return result as ProductListItem[];

  return payload?.products ?? payload?.items ?? payload?.data ?? [];
}

const EDITABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
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

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#faf9f6] text-[#85816d]">
        <ShoppingBag className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-base font-bold text-[#252720]">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-[#85816d]">
        {description}
      </p>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#171812]/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.2)] ${
          wide ? "max-w-5xl" : "max-w-xl"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#eeeae1] bg-white px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#252720]">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-sm text-[#85816d]">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 rounded-xl p-2 text-[#85816d] transition hover:bg-[#faf9f6] hover:text-[#252720]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          {children}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Package;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9e6dd] text-[#77735f]">
        <Icon className="h-5 w-5" />
      </span>

      <div>
        <h3 className="font-bold text-[#252720]">{title}</h3>
        {description && (
          <p className="mt-1 text-xs leading-5 text-[#85816d]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-[#85816d]">{label}</span>
      <span className="text-left font-medium text-[#252720]">
        {children}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Product Variant Selector                          */
/* -------------------------------------------------------------------------- */
function ProductVariantSelector({
  product,
  initialQuantity,
  initialAttributeValues,
  reservedVariantId,
  reservedQuantity,
  onQuantityChange,
  onSelectionChange,
}: {
  product: Product;
  initialQuantity: number;
  initialAttributeValues: SelectedAttributeValues;
  reservedVariantId: string | null;
  reservedQuantity: number;
  onQuantityChange: (quantity: number) => void;
  onSelectionChange: (
    variantId: string | null,
    unitPrice: number,
    stock: number | null,
    attributes: SelectedAttributeValues,
  ) => void;
}) {
//	console.log("initialAttributeValues = ",initialAttributeValues);
  const [selectedAttributeValues, setSelectedAttributeValues] =
    useState<SelectedAttributeValues>(initialAttributeValues);

  const [quantity, setQuantity] = useState(initialQuantity);

  const hasVariants = product.variants.length > 0;

  const availableAttributes = useMemo(
    () =>
      product.attributes
        .map((attribute) => ({
          ...attribute,
          values: attribute.values.filter((value) =>
            product.variants.some((variant) =>
              (variant.attribute_values ?? []).some(
                (variantAttribute) =>
                  variantAttribute.attribute_id === attribute.id &&
                  variantAttribute.attribute_value_id === value.id,
              ),
            ),
          ),
        }))
        .filter((attribute) => attribute.values.length > 0),
    [product.attributes, product.variants],
  );

  const selectedVariant = useMemo(() => {
    if (!hasVariants || availableAttributes.length === 0) {
      return undefined;
    }

    const allSelected = availableAttributes.every((attribute) =>
      Boolean(selectedAttributeValues[attribute.id]),
    );

    if (!allSelected) return undefined;

    return product.variants.find((variant) => {
      const variantAttributes = variant.attribute_values ?? [];

      if (variantAttributes.length !== availableAttributes.length) {
        return false;
      }

      return availableAttributes.every((attribute) =>
        variantAttributes.some(
          (variantAttribute) =>
            variantAttribute.attribute_id === attribute.id &&
            variantAttribute.attribute_value_id ===
              selectedAttributeValues[attribute.id],
        ),
      );
    });
  }, [
    hasVariants,
    availableAttributes,
    selectedAttributeValues,
    product.variants,
  ]);

  const unitPrice = selectedVariant
    ? Number(selectedVariant.price ?? product.price)
    : Number(product.price);

  const availableStock = selectedVariant
    ? Math.max(0, Number(selectedVariant.stock_quantity) || 0)
    : null;

  const maxQuantity =
    selectedVariant && selectedVariant.id === reservedVariantId
      ? (availableStock ?? 0) + reservedQuantity
      : hasVariants
        ? (availableStock ?? 0)
        : 99;

  const canSelectVariant =
    !hasVariants ||
    (selectedVariant !== undefined && maxQuantity > 0);

  const subtotal = unitPrice * quantity;

  const getEffectiveStock = (
    variant: Product["variants"][number],
  ) => {
    const stock = Math.max(0, Number(variant.stock_quantity) || 0);

    return variant.id === reservedVariantId
      ? stock + reservedQuantity
      : stock;
  };

  function isAttributeValueAvailable(
    attributeId: string,
    valueId: string,
  ): boolean {
    return product.variants.some((variant) => {
      if (getEffectiveStock(variant) < 1) return false;

      const variantAttributes = variant.attribute_values ?? [];

      const matchesCurrentAttribute = variantAttributes.some(
        (variantAttribute) =>
          variantAttribute.attribute_id === attributeId &&
          variantAttribute.attribute_value_id === valueId,
      );

      if (!matchesCurrentAttribute) return false;

      return availableAttributes.every((attribute) => {
        if (attribute.id === attributeId) return true;

        const selectedValueId = selectedAttributeValues[attribute.id];

        if (!selectedValueId) return true;

        return variantAttributes.some(
          (variantAttribute) =>
            variantAttribute.attribute_id === attribute.id &&
            variantAttribute.attribute_value_id === selectedValueId,
        );
      });
    });
  }

  const updateQuantity = useCallback(
    (nextQuantity: number, maximum: number) => {
      const next = Math.min(maximum, Math.max(1, nextQuantity));

      setQuantity(next);
      onQuantityChange(next);
    },
    [onQuantityChange],
  );

function handleAttributeChange(attributeId: string, valueId: string) {
  if (!isAttributeValueAvailable(attributeId, valueId)) return;

  const next = { ...selectedAttributeValues };

  if (next[attributeId] === valueId) {
    delete next[attributeId];
  } else {
    next[attributeId] = valueId;
  }

  setSelectedAttributeValues(next);

  setQuantity(1);
  onQuantityChange(1);
}

  useEffect(() => {
    if (!hasVariants) {
      onSelectionChange(null, Number(product.price), null, {});
      return;
    }

    if (availableAttributes.length === 0 || !selectedVariant) {
      onSelectionChange(
        null,
        Number(product.price),
        null,
        selectedAttributeValues,
      );
      return;
    }

    onSelectionChange(
      selectedVariant.id,
      Number(selectedVariant.price ?? product.price),
      Math.max(0, Number(selectedVariant.stock_quantity) || 0),
      selectedAttributeValues,
    );
  }, [
    hasVariants,
    availableAttributes.length,
    selectedVariant,
    selectedAttributeValues,
    product.price,
    onSelectionChange,
  ]);

  const canIncrease = quantity < maxQuantity;

  return (
    <div className="space-y-6">
      {hasVariants && availableAttributes.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            هذا المنتج يحتوي على متغيرات، لكن لا توجد خصائص قابلة للاختيار.
            يرجى مراجعة إعدادات المنتج.
          </p>
        </div>
      )}

      {availableAttributes.map((attribute) => (
        <fieldset key={attribute.id}>
          <legend className="mb-3 text-sm font-bold text-[#252720]">
            {attribute.name}
            <span className="mr-1 text-red-500">*</span>
          </legend>

          <div className="flex flex-wrap gap-2.5">
            {attribute.values.map((value) => {
              const isSelected =
                selectedAttributeValues[attribute.id] === value.id;

              const isAvailable = isAttributeValueAvailable(
                attribute.id,
                value.id,
              );

              return (
                <button
                  key={value.id}
                  type="button"
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  onClick={() =>
                    handleAttributeChange(attribute.id, value.id)
                  }
                  className={`group relative inline-flex min-h-11 min-w-16 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85816d]/15 disabled:cursor-not-allowed ${
                    isSelected
                      ? "border-[#252720] bg-[#252720] text-white shadow-sm"
                      : isAvailable
                        ? "border-[#e5e2d9] bg-white text-[#45463f] hover:border-[#85816d] hover:bg-[#faf9f6]"
                        : "border-[#eeeae1] bg-[#faf9f6] text-[#c4c0b5] line-through opacity-60"
                  }`}
                >
{isSelected && <Check className="h-3.5 w-3.5" />}

<span className="inline-flex items-center gap-2">
  {value.value}

  {attribute.type === "color" && value.color_code && (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-full border border-black/15 shadow-inner"
      style={{
        backgroundColor: value.color_code,
      }}
    />
  )}
</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {hasVariants && (
        <div className="overflow-hidden rounded-2xl border border-[#e9e6dd] bg-[#faf9f6]">
{selectedVariant ? (
  <div className="grid grid-cols-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
    {/* صورة المتغير */}
    <div className="relative aspect-square w-full overflow-hidden bg-white sm:aspect-auto sm:min-h-36">
      {selectedVariant.image_url ? (
        <Image
          src={selectedVariant.image_url}
          alt={`${product.name} - ${(selectedVariant.attribute_values ?? [])
            .map((attribute) => attribute.attribute_value)
            .join(" - ")}`}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 144px"
          className="object-contain p-4"
        />
      ) : (
        <div className="flex h-full min-h-36 flex-col items-center justify-center text-[#85816d]">
          <Package className="h-8 w-8" />
          <p className="mt-2 text-xs text-gray-400">
            لا توجد صورة لهذا الخيار
          </p>
        </div>
      )}
    </div>

    {/* تفاصيل المتغير */}
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9e6dd] px-4 py-4">
        <div className="min-w-0">
          <p className="text-xs text-[#85816d]">
            التركيبة المختارة
          </p>

          <p className="mt-1 font-bold leading-7 text-[#252720]">
            {(selectedVariant.attribute_values ?? [])
              .map(
                (attribute) =>
                  `${attribute.attribute_name}: ${attribute.attribute_value}`,
              )
              .join(" · ")}
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#69654f] ring-1 ring-[#e5e2d9]">
          {selectedVariant.sku
            ? `SKU: ${selectedVariant.sku}`
            : "متغير محدد"}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#e9e6dd]">
        <div className="p-4">
          <p className="text-xs text-[#85816d]">سعر الوحدة</p>
          <p className="mt-1 text-lg font-black text-[#252720]">
            {formatMoney(unitPrice)}
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs text-[#85816d]">
            المخزون المتاح
          </p>
          <p className="mt-1 text-lg font-black text-[#252720]">
            {availableStock} قطعة
          </p>

          {reservedVariantId === selectedVariant.id &&
            reservedQuantity > 0 && (
              <p className="mt-1 text-[11px] text-[#85816d]">
                يشمل {reservedQuantity} قطعة من هذا الطلب
              </p>
            )}
        </div>
      </div>
    </div>
  </div>
) : (
  <div className="flex items-start gap-3 p-4">
    <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-[#85816d]" />
    <p className="text-sm leading-6 text-[#85816d]">
      اختر قيمة لكل خاصية لتحديد المتغير المطابق وسعره ومخزونه وصورته.
    </p>
  </div>
)}
        </div>
      )}

      {!hasVariants && (
        <div className="flex items-center justify-between rounded-xl bg-[#faf9f6] p-4">
          <span className="text-sm text-[#85816d]">سعر الوحدة</span>
          <span className="font-bold text-[#252720]">
            {formatMoney(unitPrice)}
          </span>
        </div>
      )}

      <section className="rounded-2xl border border-[#e9e6dd] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-[#252720]">الكمية</h4>
            <p className="mt-1 text-xs text-[#85816d]">
              {hasVariants
                ? selectedVariant
                  ? `الحد الأقصى لهذه التركيبة: ${maxQuantity}`
                  : "اختر خصائص المنتج أولًا"
                : "حدد عدد القطع المطلوبة"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="تقليل الكمية"
              disabled={quantity <= 1 || !canSelectVariant}
              onClick={() => updateQuantity(quantity - 1, maxQuantity)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e2d9] text-[#45463f] transition hover:border-[#85816d] hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>

            <input
              type="number"
              min={1}
              max={maxQuantity}
              step={1}
              value={quantity}
              disabled={!canSelectVariant}
              onChange={(event) => {
                const value = Number(event.target.value);

                if (!Number.isInteger(value) || value < 1) return;

                updateQuantity(value, maxQuantity);
              }}
              className="h-10 w-20 rounded-xl border border-[#e5e2d9] text-center text-sm font-bold text-[#252720] outline-none focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10 disabled:bg-gray-50"
            />

            <button
              type="button"
              aria-label="زيادة الكمية"
              disabled={!canIncrease || !canSelectVariant}
              onClick={() => updateQuantity(quantity + 1, maxQuantity)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e2d9] text-[#45463f] transition hover:border-[#85816d] hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#eeeae1] pt-4">
          <span className="text-sm font-medium text-[#85816d]">
            إجمالي العنصر
          </span>
          <span className="text-xl font-black text-[#252720]">
            {formatMoney(subtotal)}
          </span>
        </div>
      </section>

      {hasVariants && !canSelectVariant && (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          يرجى اختيار تركيبة متوفرة في المخزون.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Product Item Editor                              */
/* -------------------------------------------------------------------------- */

function OrderItemEditor({
  orderId,
  item,
  onClose,
  onAddItem,
  onUpdateItem,
}: {
  orderId: string;
  item?: OrderItem;
  onClose: () => void;
  onAddItem: (input: ItemInput) => Promise<void>;
  onUpdateItem: (itemId: string, input: ItemInput) => Promise<void>;
}) {
  const mode: EditorMode = item ? "edit" : "add";

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    item?.product_variant_id ?? null,
  );
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [selectedStock, setSelectedStock] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);

  const [initialAttributeValues, setInitialAttributeValues] =
    useState<SelectedAttributeValues>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

const handleSelectionChange = useCallback(
  (
    variantId: string | null,
    price: number,
    stock: number | null,
    attributes: SelectedAttributeValues,
  ) => {
    setSelectedVariantId(variantId);
    setSelectedPrice(price);
    setSelectedStock(stock);
    setInitialAttributeValues(attributes);
  },
  [],
);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setProductsLoading(true);

      try {
        const result = await apiRequest<unknown>(
          "/api/admin/products?is_active=true&limit=100&page=1",
        );

        if (!cancelled) {
          setProducts(getProductsFromResponse(result));
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadProduct = useCallback(
    async (productId: string) => {
      setProductLoading(true);
      setError("");

      try {
        const result = await apiRequest<unknown>(
          `/api/admin/products/${productId}`,
        );

        const product = getProductFromResponse(result);

        let selectedValues: SelectedAttributeValues = {};
        let currentVariantId: string | null = null;
        let currentPrice = Number(product.price);
        let currentStock: number | null = null;

        // استعادة خصائص المتغير الحالي عند تعديل العنصر نفسه.
// استعادة خصائص المتغير الحالي عند تعديل العنصر نفسه.
if (
  item &&
  item.product_id === productId &&
  item.product_variant_id
) {
  const currentVariant = product.variants.find(
    (variant) => variant.id === item.product_variant_id,
  );

  if (currentVariant) {
    for (const variantAttribute of currentVariant.attribute_values ?? []) {
      selectedValues[variantAttribute.attribute_id] =
        variantAttribute.attribute_value_id;
    }

    currentVariantId = currentVariant.id;
    currentPrice = Number(
      currentVariant.price ?? product.price,
    );
    currentStock = Math.max(
      0,
      Number(currentVariant.stock_quantity) || 0,
    );
  }
}

        setInitialAttributeValues(selectedValues);
        setSelectedVariantId(currentVariantId);
        setSelectedPrice(currentPrice);
        setSelectedStock(currentStock);
        setQuantity(
          item?.product_id === productId ? item.quantity : 1,
        );
        setSelectedProduct(product);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setProductLoading(false);
      }
    },
    [item],
  );

  useEffect(() => {
    if (mode !== "edit" || !item?.product_id) return;

    void loadProduct(item.product_id);
  }, [mode, item?.product_id, loadProduct]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    if (!search) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(search),
    );
  }, [products, productSearch]);

  function handleChangeProduct() {
    setSelectedProduct(null);
    setSelectedVariantId(null);
    setSelectedPrice(0);
    setSelectedStock(null);
    setInitialAttributeValues({});
    setQuantity(1);
    setProductSearch("");
    setError("");
  }

  async function handleSave() {
    if (!selectedProduct) {
      setError("يرجى اختيار منتج.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("يرجى إدخال كمية صحيحة.");
      return;
    }

    if (
      selectedProduct.variants.length > 0 &&
      !selectedVariantId
    ) {
      setError("يرجى اختيار جميع خصائص المنتج.");
      return;
    }

    // المخزون الذي يمكن استخدامه عند تعديل المتغير نفسه:
    // المتوفر حاليًا + كمية العنصر المحجوزة في الطلب.
    const isSameReservedVariant =
      Boolean(item?.product_variant_id) &&
      item?.product_id === selectedProduct.id &&
      item?.product_variant_id === selectedVariantId;

    const allowedStock =
      selectedStock === null
        ? null
        : selectedStock +
          (isSameReservedVariant ? Number(item?.quantity ?? 0) : 0);

    if (allowedStock !== null && quantity > allowedStock) {
      setError(
        `الكمية المطلوبة تتجاوز الحد المتاح (${allowedStock} قطعة).`,
      );
      return;
    }

    setSaving(true);
    setError("");

    const input: ItemInput = {
      product_id: selectedProduct.id,
      product_variant_id: selectedVariantId,
      quantity,
    };

    try {
      if (item) {
        await onUpdateItem(item.id, input);
      } else {
        await onAddItem(input);
      }

      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const isReadyToSave =
    Boolean(selectedProduct) &&
    !productLoading &&
    (!selectedProduct || selectedProduct.variants.length === 0 ||
      Boolean(selectedVariantId));

  return (
    <Modal
      title={item ? "تعديل عنصر الطلب" : "إضافة منتج إلى الطلب"}
      subtitle={`الطلب #${orderId}`}
      wide
      onClose={saving ? () => {} : onClose}
    >
      <div className="space-y-6">
        {!selectedProduct ? (
          <section className="space-y-5">
            <div>
              <SectionHeading
                icon={Search}
                title="اختيار المنتج"
                description="ابحث عن المنتج الذي تريد إضافته إلى الطلب."
              />

              <div className="relative mt-5">
                <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#85816d]" />

                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="ابحث باسم المنتج..."
                  className={`${inputClass} h-12 pr-11`}
                  autoFocus
                />
              </div>
            </div>

            {productsLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e9e6dd] py-14">
                <LoaderCircle className="h-7 w-7 animate-spin text-[#85816d]" />
                <p className="mt-3 text-sm text-[#85816d]">
                  جارٍ تحميل المنتجات...
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-[#e9e6dd]">
                <EmptyState
                  title="لا توجد منتجات"
                  description="لم يتم العثور على منتجات مطابقة للبحث."
                />
              </div>
            ) : (
              <div className="max-h-[460px] space-y-2 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => void loadProduct(product.id)}
                    disabled={productLoading}
                    className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[#e9e6dd] bg-white p-4 text-right transition hover:border-[#b5b09f] hover:bg-[#faf9f6] disabled:opacity-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#faf9f6] text-[#85816d] transition group-hover:bg-[#e9e6dd]">
                        <Package className="h-5 w-5" />
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate font-bold text-[#252720]">
                          {product.name}
                        </span>

                        {product.sku && (
                          <span className="mt-1 block text-xs text-[#85816d]">
                            SKU: {product.sku}
                          </span>
                        )}

                        <span className="mt-1.5 block text-sm font-bold text-[#69654f]">
                          {formatMoney(product.price)}
                        </span>
                      </span>
                    </div>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#252720] text-white transition group-hover:bg-[#45463f]">
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : productLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#85816d]" />
            <p className="mt-3 text-sm text-[#85816d]">
              جارٍ تحميل تفاصيل المنتج...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#e9e6dd] bg-[#faf9f6] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#85816d]">
                    <Package className="h-6 w-6" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs text-[#85816d]">المنتج المختار</p>
                    <h3 className="mt-1 font-bold text-[#252720]">
                      {selectedProduct.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#85816d]">
                      السعر الأساسي: {formatMoney(selectedProduct.price)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleChangeProduct}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#e5e2d9] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#69654f] transition hover:border-[#85816d] hover:bg-[#fdfcf9]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  تغيير المنتج
                </button>
              </div>
            </section>

            <section className="space-y-5">
              <SectionHeading
                icon={Boxes}
                title="خصائص المنتج"
                description="اختر التركيبة المطلوبة من خلال تحديد قيمة كل خاصية."
              />

              <ProductVariantSelector
                key={`${selectedProduct.id}-${item?.id ?? "new"}`}
                product={selectedProduct}
                initialQuantity={quantity}
                initialAttributeValues={initialAttributeValues}
                reservedVariantId={
                  item?.product_id === selectedProduct.id
                    ? item.product_variant_id
                    : null
                }
                reservedQuantity={
                  item?.product_id === selectedProduct.id
                    ? item.quantity
                    : 0
                }
                onQuantityChange={setQuantity}
                onSelectionChange={handleSelectionChange}
              />
            </section>

            <section className="rounded-2xl border border-[#e9e6dd] bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[#85816d]">ملخص العنصر</p>
                  <p className="mt-1 font-semibold text-[#252720]">
                    {quantity} × {formatMoney(selectedPrice)}
                  </p>
                </div>

                <div className="text-left">
                  <p className="text-xs text-[#85816d]">الإجمالي</p>
                  <p className="mt-1 text-xl font-black text-[#252720]">
                    {formatMoney(selectedPrice * quantity)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm leading-6 text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#eeeae1] pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#e5e2d9] px-5 py-3 text-sm font-semibold text-[#45463f] transition hover:bg-[#faf9f6] disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isReadyToSave}
            className="inline-flex items-center gap-2 rounded-xl bg-[#252720] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#45463f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : item ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {saving
              ? "جارٍ الحفظ..."
              : item
                ? "حفظ التعديلات"
                : "إضافة إلى الطلب"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Order Details Modal                              */
/* -------------------------------------------------------------------------- */

export function OrderDetailsModal({
  order,
  loading,
  savingItems,
  onClose,
  onEditCustomer,
  onChangeStatus,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: OrderDetailsModalProps) {
  const [editorItem, setEditorItem] = useState<OrderItem | null>(null);
  const [showAddEditor, setShowAddEditor] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [itemError, setItemError] = useState("");

  const canEditItems = EDITABLE_STATUSES.includes(order.status);
  const items = order.items ?? [];

  async function handleRemoveItem(item: OrderItem) {
    if (items.length <= 1) {
      setItemError("لا يمكن حذف المنتج الأخير من الطلب.");
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${item.product_name}" من الطلب؟`,
    );

    if (!confirmed) return;

    setRemovingItemId(item.id);
    setItemError("");

    try {
      await onRemoveItem(item.id);
    } catch (err) {
      setItemError(getErrorMessage(err));
    } finally {
      setRemovingItemId(null);
    }
  }

  return (
    <>
      <Modal
        title={`تفاصيل الطلب #${order.order_number}`}
        subtitle={`تاريخ الطلب: ${formatDate(order.created_at)}`}
        wide
        onClose={onClose}
      >
        {loading ? (
          <div className="flex flex-col items-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#85816d]" />
            <p className="mt-4 text-sm text-[#85816d]">
              جارٍ تحميل تفاصيل الطلب...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order header */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#faf9f6] p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-[#85816d]">الحالة الحالية</p>
                <div className="mt-2">
                  <StatusBadge status={order.status} />
                </div>
              </div>

              <div className="sm:text-left">
                <p className="text-sm text-[#85816d]">المبلغ الإجمالي</p>
                <p className="mt-1 text-2xl font-black text-[#252720]">
                  {formatMoney(order.total_amount)}
                </p>
              </div>
            </div>

            {/* Customer and delivery */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#e9e6dd] p-5">
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-[#85816d]" />
                  <h3 className="font-bold text-[#252720]">
                    بيانات العميل
                  </h3>
                </div>

                <p className="mt-5 font-semibold text-[#252720]">
                  {order.customer_first_name} {order.customer_last_name}
                </p>

                <p
                  dir="ltr"
                  className="mt-3 flex items-center justify-end gap-2 text-sm text-[#85816d]"
                >
                  {order.customer_phone}
                  <Phone className="h-4 w-4" />
                </p>

                <button
                  type="button"
                  onClick={() => onEditCustomer(order)}
                  className="mt-4 text-sm font-semibold text-[#69654f] transition hover:underline"
                >
                  تعديل بيانات العميل
                </button>
              </section>

              <section className="rounded-2xl border border-[#e9e6dd] p-5">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#85816d]" />
                  <h3 className="font-bold text-[#252720]">
                    معلومات التوصيل
                  </h3>
                </div>

                <div className="mt-5 space-y-3">
                  <InfoRow label="طريقة التوصيل">
                    {order.delivery_method === "HOME"
                      ? "توصيل للمنزل"
                      : "توصيل للمكتب"}
                  </InfoRow>

                  <InfoRow label="الولاية">
                    {order.wilaya_name || "—"}
                  </InfoRow>

                  <InfoRow label="البلدية">
                    {order.commune_name || "—"}
                  </InfoRow>

                  <InfoRow label="شركة التوصيل">
                    {order.delivery_company_name || "—"}
                  </InfoRow>

                  {order.delivery_method === "OFFICE" && (
                    <InfoRow label="مكتب التوصيل">
                      {order.delivery_office_name || "—"}
                    </InfoRow>
                  )}

                  {order.delivery_address && (
                    <div className="border-t border-[#eeeae1] pt-3">
                      <p className="text-sm text-[#85816d]">العنوان</p>
                      <p className="mt-1 text-sm leading-6 text-[#252720]">
                        {order.delivery_address}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Order items */}
            <section className="overflow-hidden rounded-2xl border border-[#e9e6dd]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeae1] p-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#85816d]" />
                  <h3 className="font-bold text-[#252720]">
                    منتجات الطلب
                  </h3>
                  <span className="rounded-full bg-[#faf9f6] px-2.5 py-1 text-xs font-semibold text-[#85816d]">
                    {items.length}
                  </span>
                </div>

                {canEditItems && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemError("");
                      setShowAddEditor(true);
                    }}
                    disabled={savingItems}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#252720] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#45463f] disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة منتج
                  </button>
                )}
              </div>

              {!canEditItems && (
                <div className="border-b border-[#eeeae1] bg-[#faf9f6] px-4 py-3 text-xs leading-5 text-[#85816d]">
                  لا يمكن تعديل منتجات الطلب بعد انتقاله إلى هذه الحالة.
                </div>
              )}

              {items.length === 0 ? (
                <EmptyState
                  title="لا توجد تفاصيل للمنتجات"
                  description="لم تُرجع استجابة تفاصيل الطلب قائمة المنتجات."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-right">
                    <thead className="bg-[#faf9f6] text-xs text-[#85816d]">
                      <tr>
                        <th className="px-4 py-3.5">المنتج</th>
                        <th className="px-4 py-3.5">سعر الوحدة</th>
                        <th className="px-4 py-3.5">الكمية</th>
                        <th className="px-4 py-3.5">الإجمالي</th>
                        {canEditItems && (
                          <th className="px-4 py-3.5">الإجراءات</th>
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#f0eee7]">
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="transition hover:bg-[#fdfcf9]"
                        >
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#252720]">
                              {item.product_name}
                            </p>

                            {item.product_sku && (
                              <p className="mt-1 text-xs text-[#aaa79c]">
                                SKU: {item.product_sku}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#45463f]">
                            {formatMoney(item.unit_price)}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#45463f]">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-4 text-sm font-bold text-[#252720]">
                            {formatMoney(item.line_total)}
                          </td>

                          {canEditItems && (
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemError("");
                                    setEditorItem(item);
                                  }}
                                  disabled={
                                    savingItems ||
                                    removingItemId === item.id
                                  }
                                  title="تعديل المنتج"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e9e6dd] text-[#69654f] transition hover:bg-[#faf9f6] disabled:opacity-40"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleRemoveItem(item)}
                                  disabled={
                                    savingItems ||
                                    removingItemId === item.id ||
                                    items.length <= 1
                                  }
                                  title="حذف المنتج"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {removingItemId === item.id ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {savingItems && (
                <div className="flex items-center justify-center gap-2 border-t border-[#eeeae1] bg-[#faf9f6] px-4 py-3 text-xs text-[#85816d]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  جارٍ تحديث منتجات الطلب...
                </div>
              )}
            </section>

            {itemError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {itemError}
              </div>
            )}

            {/* Totals */}
            <section className="mr-auto max-w-sm space-y-3 rounded-2xl border border-[#e9e6dd] p-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[#85816d]">المجموع الفرعي</span>
                <span className="font-medium text-[#252720]">
                  {formatMoney(order.subtotal)}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[#85816d]">تكلفة التوصيل</span>
                <span className="font-medium text-[#252720]">
                  {formatMoney(order.delivery_fee)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-t border-[#eeeae1] pt-3">
                <span className="font-bold text-[#252720]">
                  الإجمالي النهائي
                </span>
                <span className="text-lg font-black text-[#252720]">
                  {formatMoney(order.total_amount)}
                </span>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-3 border-t border-[#eeeae1] pt-5">
              <button
                type="button"
                onClick={() => onChangeStatus(order)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#252720] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#45463f]"
              >
                <ArrowUpDown className="h-4 w-4" />
                تغيير الحالة
              </button>
            </div>
          </div>
        )}
      </Modal>

      {showAddEditor && (
        <OrderItemEditor
          orderId={order.order_number}
          onClose={() => setShowAddEditor(false)}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
        />
      )}

      {editorItem && (
        <OrderItemEditor
          orderId={order.order_number}
          item={editorItem}
          onClose={() => setEditorItem(null)}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
        />
      )}
    </>
  );
}
