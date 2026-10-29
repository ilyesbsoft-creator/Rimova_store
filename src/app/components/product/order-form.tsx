
"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { getDeliveryOptions } from "@/backend/modules/delivery/delivery.service";
import type { getProductById } from "@/backend/modules/products/product.service";

type DeliveryOptions = NonNullable<
  Awaited<ReturnType<typeof getDeliveryOptions>>
>;

type Product = NonNullable<
  Awaited<ReturnType<typeof getProductById>>
>;

type OrderFormProps = {
  productId: string;
  productName: string;
  productPrice: number;
  attributes: Product["attributes"];
  variants: Product["variants"];
  deliveryOptions: DeliveryOptions | null;
};

type DeliveryMethod = "home" | "office";

type SelectedAttributeValues = Record<string, string>;

const inputClassName =
  "mt-2 block min-h-14 w-full rounded-2xl border border-[#d9d6cb] bg-white/90 px-4 text-sm text-[#252720] outline-none transition duration-200 placeholder:text-gray-400 hover:border-[#b5b09f] focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10 disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-gray-400";

const labelClassName = "block text-sm font-semibold text-[#35372e]";

function formatPrice(price: number) {
  return `${price.toLocaleString("fr-DZ")} دج`;
}

export default function OrderForm({
  productId,
  productName,
  productPrice,
  attributes,
  variants,
  deliveryOptions,
}: OrderFormProps) {
  const router = useRouter();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [wilayaId, setWilayaId] = useState("");
  const [communeId, setCommuneId] = useState("");

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("home");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState("");

  // تخزين اختيار المستخدم لكل خاصية على حدة.
  // مثال: { "color-attribute-id": "red-value-id", "size-attribute-id": "size-m-id" }
  const [selectedAttributeValues, setSelectedAttributeValues] =
    useState<SelectedAttributeValues>({});

  const [quantity, setQuantity] = useState(1);

  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const hasVariants = variants.length > 0;
  const hasAttributes = attributes.length > 0;

  // لا نعرض إلا الخصائص التي تستخدمها المتغيرات النشطة فعلًا.
  const availableAttributes = useMemo(
    () =>
      attributes
        .map((attribute) => ({
          ...attribute,
          values: attribute.values.filter((value) =>
            variants.some((variant) =>
              variant.attributes.some(
                (variantAttribute) =>
                  variantAttribute.id === attribute.id &&
                  variantAttribute.value_id === value.id,
              ),
            ),
          ),
        }))
        .filter((attribute) => attribute.values.length > 0),
    [attributes, variants],
  );

  // البحث عن المتغير الفعلي المطابق لجميع اختيارات المستخدم.
  const selectedVariant = useMemo(() => {
    if (!hasVariants || availableAttributes.length === 0) {
      return undefined;
    }

    const allAttributesSelected = availableAttributes.every(
      (attribute) =>
        Boolean(selectedAttributeValues[attribute.id]),
    );

    if (!allAttributesSelected) {
      return undefined;
    }

    return variants.find((variant) => {
      if (variant.attributes.length !== availableAttributes.length) {
        return false;
      }

      return availableAttributes.every((attribute) =>
        variant.attributes.some(
          (variantAttribute) =>
            variantAttribute.id === attribute.id &&
            variantAttribute.value_id ===
              selectedAttributeValues[attribute.id],
        ),
      );
    });
  }, [
    hasVariants,
    availableAttributes,
    selectedAttributeValues,
    variants,
  ]);

  const unitPrice = selectedVariant
    ? Number(selectedVariant.price ?? productPrice)
    : Number(productPrice);

  const availableStock = selectedVariant
    ? Math.max(0, Number(selectedVariant.stock_quantity) || 0)
    : null;

  const maxQuantity = hasVariants ? (availableStock ?? 0) : 99;

  const canOrderVariant =
    !hasVariants ||
    (selectedVariant !== undefined && (availableStock ?? 0) > 0);

  const subtotal = unitPrice * quantity;

  // يحدد ما إذا كان اختيار قيمة معينة سيؤدي إلى متغير متوفر.
  // يراعي الاختيارات الحالية لبقية الخصائص.
  function isAttributeValueAvailable(
    attributeId: string,
    valueId: string,
  ): boolean {
    return variants.some((variant) => {
      const stock = Math.max(
        0,
        Number(variant.stock_quantity) || 0,
      );

      if (stock < 1) {
        return false;
      }

      const matchesCurrentAttribute = variant.attributes.some(
        (variantAttribute) =>
          variantAttribute.id === attributeId &&
          variantAttribute.value_id === valueId,
      );

      if (!matchesCurrentAttribute) {
        return false;
      }

      // التأكد من توافق المتغير مع الاختيارات الحالية لبقية الخصائص.
      return availableAttributes.every((attribute) => {
        if (attribute.id === attributeId) {
          return true;
        }

        const selectedValueId = selectedAttributeValues[attribute.id];

        // الخصائص التي لم يختر المستخدم قيمتها لا تقيد البحث.
        if (!selectedValueId) {
          return true;
        }

        return variant.attributes.some(
          (variantAttribute) =>
            variantAttribute.id === attribute.id &&
            variantAttribute.value_id === selectedValueId,
        );
      });
    });
  }

  function handleAttributeChange(
    attributeId: string,
    valueId: string,
  ) {
    if (!isAttributeValueAvailable(attributeId, valueId)) {
      return;
    }

    setSelectedAttributeValues((current) => ({
      ...current,
      [attributeId]: valueId,
    }));

    setQuantity(1);
    setFeedback("");
    setOrderNumber("");
  }

  const selectedWilaya = useMemo(
    () =>
      deliveryOptions?.wilayas.find(
        (wilaya) => wilaya.id === wilayaId,
      ),
    [deliveryOptions, wilayaId],
  );

  const communes = selectedWilaya?.communes ?? [];

  const selectedCommune = communes.find(
    (commune) => commune.id === communeId,
  );

  const deliveryPrice =
    selectedCommune === undefined
      ? null
      : deliveryMethod === "home"
        ? selectedCommune.home_delivery_price
        : selectedCommune.office_delivery_price;

  const offices = selectedCommune?.delivery_offices ?? [];

  const selectedOffice = offices.find(
    (office) => office.id === selectedOfficeId,
  );

  const totalPrice =
    (hasVariants && !selectedVariant) ||
    deliveryPrice === null ||
    deliveryPrice === undefined
      ? null
      : subtotal + Number(deliveryPrice);

  const hasDeliveryOptions =
    deliveryOptions !== null &&
    deliveryOptions !== undefined &&
    deliveryOptions.wilayas.length > 0;

function resetOrderForm() {
  setFirstName("");
  setLastName("");
  setPhone("");

  setWilayaId("");
  setCommuneId("");

  setDeliveryMethod("home");
  setDeliveryAddress("");
  setSelectedOfficeId("");

  setSelectedAttributeValues({});
  setQuantity(1);

  setFeedback("");
}

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setFeedback("");
    setOrderNumber("");

    if (hasVariants && !hasAttributes) {
      setFeedback(
        "تعذر عرض خصائص هذا المنتج. يرجى المحاولة لاحقًا.",
      );
      return;
    }

    if (
      hasVariants &&
      availableAttributes.some(
        (attribute) => !selectedAttributeValues[attribute.id],
      )
    ) {
      setFeedback("يرجى اختيار قيمة لكل خصائص المنتج.");
      return;
    }

    if (hasVariants && !selectedVariant) {
      setFeedback(
        "التركيبة التي اخترتها غير متاحة. يرجى تغيير خيارات المنتج.",
      );
      return;
    }

    if (!canOrderVariant) {
      setFeedback("هذا الخيار غير متوفر حاليًا في المخزون.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setFeedback("يرجى اختيار كمية صحيحة.");
      return;
    }

    if (hasVariants && quantity > (availableStock ?? 0)) {
      setFeedback("الكمية المطلوبة تتجاوز المخزون المتوفر.");
      return;
    }

    if (!deliveryOptions || !selectedWilaya || !selectedCommune) {
      setFeedback("يرجى اختيار الولاية والبلدية.");
      return;
    }

    if (deliveryPrice === null || deliveryPrice === undefined) {
      setFeedback(
        "التوصيل غير متاح لهذا الخيار في البلدية المختارة.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_first_name: firstName.trim(),
          customer_last_name: lastName.trim(),
          customer_phone: phone.trim(),

          wilaya_id: wilayaId,
          commune_id: communeId,
          delivery_company_id: deliveryOptions.company.id,

          delivery_method:
            deliveryMethod === "home" ? "HOME" : "OFFICE",

          // عنوان المنزل اختياري.
          delivery_address:
            deliveryMethod === "home" && deliveryAddress.trim()
              ? deliveryAddress.trim()
              : null,

          // اختيار مكتب الاستلام اختياري.
          delivery_office_id:
            deliveryMethod === "office" && selectedOfficeId
              ? selectedOfficeId
              : null,

          customer_note: null,

          items: [
            {
              product_id: productId,
              product_variant_id: selectedVariant?.id ?? null,
              quantity,
            },
          ],
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "تعذر إنشاء الطلب. يرجى المحاولة مرة أخرى.";

        setFeedback(message);
        return;
      }

      if (
        !result ||
        typeof result !== "object" ||
        !("order_number" in result) ||
        typeof result.order_number !== "string"
      ) {
        setFeedback("تم استلام الرد، لكن تعذر قراءة رقم الطلب.");
        return;
      }

      // الاحتفاظ برقم الطلب وإظهار رسالة النجاح.
setOrderNumber(result.order_number);
setFeedback("تم إنشاء طلبك بنجاح!");

// تفريغ الحقول وإعادة النموذج إلى حالته الافتراضية.
resetOrderForm();

// إعادة جلب بيانات صفحة المنتج من الخادم.
router.refresh();

    } catch (error) {
      console.error("Failed to submit order:", error);

      setFeedback(
        "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجددًا.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="order"
      className="relative overflow-hidden border-t border-black/5 bg-[#e9e6dd]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full border border-[#b5b09f]/50"
      />

      <div className="relative mx-auto max-w-3xl px-5 py-14 sm:px-8 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-[2rem] border border-white/70 bg-[#faf9f6] shadow-[0_20px_60px_rgba(37,39,32,0.07)]"
        >
          <div className="border-b border-black/5 px-6 py-7 sm:px-9 sm:py-9">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#85816d]">
              RIMOVA · YOUR ORDER
            </p>

            <h2 className="mt-3 text-2xl font-black leading-relaxed sm:text-3xl">
              أكمل طلبك بكل سهولة
            </h2>

            <p className="mt-2 text-sm leading-7 text-gray-500">
              أدخل معلوماتك واختر مكان التوصيل لمعرفة التكلفة الإجمالية
              قبل تأكيد الطلب.
            </p>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#e9e6dd]/65 p-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">المنتج المختار</p>
                <p className="mt-1 truncate font-bold">{productName}</p>
              </div>

              <div className="shrink-0 text-left">
                <p className="text-lg font-black">
                  {hasVariants && !selectedVariant
                    ? "اختر الخيارات"
                    : formatPrice(unitPrice)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  للقطعة الواحدة
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-8 px-6 py-7 sm:px-9 sm:py-9"
          >
            {/* خيارات المنتج */}
            <section
              aria-labelledby="product-options-heading"
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9e6dd] text-sm font-black text-[#77735f]">
                  01
                </span>
                <div>
                  <h3 id="product-options-heading" className="font-bold">
                    خيارات المنتج
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {hasVariants
                      ? "اختر قيمة كل خاصية لتحديد المنتج المناسب."
                      : "حدد عدد القطع التي تريد طلبها."}
                  </p>
                </div>
              </div>

              {hasVariants && (
                <div className="space-y-6">
                  {availableAttributes.length > 0 ? (
                    availableAttributes.map((attribute) => (
                      <fieldset key={attribute.id}>
                        <legend className={labelClassName}>
                          {attribute.name}{" "}
                          <span className="text-red-600">*</span>
                        </legend>

                        <div className="mt-3 flex flex-wrap gap-2.5">
                          {attribute.values.map((value) => {
                            const isSelected =
                              selectedAttributeValues[attribute.id] ===
                              value.id;

                            const isAvailable =
                              isAttributeValueAvailable(
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
                                  handleAttributeChange(
                                    attribute.id,
                                    value.id,
                                  )
                                }
                                className={`relative min-h-11 rounded-xl border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85816d]/20 disabled:cursor-not-allowed disabled:opacity-40 ${
                                  isSelected
                                    ? "border-[#85816d] bg-[#85816d] text-white shadow-sm"
                                    : "border-[#d9d6cb] bg-white text-[#35372e] hover:border-[#85816d]"
                                }`}
                              >
                                {value.value}
                                {!isAvailable && (
                                  <span className="sr-only">
                                    {" "}
                                    — غير متوفر
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))
                  ) : (
                    <p
                      role="status"
                      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                    >
                      لا توجد خصائص قابلة للاختيار لهذا المنتج حاليًا.
                    </p>
                  )}

                  {selectedVariant ? (
                    <div
                      aria-live="polite"
                      className="rounded-2xl border border-[#d9d6cb] bg-white p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-gray-500">
                            الخيار المطابق
                          </p>
                          <p className="mt-1 font-bold">
                            {selectedVariant.attributes
                              .map(
                                (attribute) =>
                                  `${attribute.name}: ${attribute.value}`,
                              )
                              .join(" · ")}
                          </p>
                        </div>

                        <div className="text-left">
                          <p className="font-black text-[#77735f]">
                            {formatPrice(unitPrice)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {availableStock} قطعة متوفرة
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-6 text-gray-500">
                      اختر قيمة لكل خاصية. ستُحدَّد تركيبة المنتج وسعرها
                      ومخزونها تلقائيًا عند اكتمال اختياراتك.
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-[#d9d6cb] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <label
                      className={labelClassName}
                      htmlFor="order-quantity"
                    >
                      الكمية
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      {hasVariants
                        ? selectedVariant
                          ? `المتوفر من هذا الخيار: ${availableStock}`
                          : "اختر جميع الخصائص أولًا"
                        : "يمكنك تعديل الكمية حسب حاجتك"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="تقليل الكمية"
                      disabled={
                        quantity <= 1 || (hasVariants && !selectedVariant)
                      }
                      onClick={() =>
                        setQuantity((current) => Math.max(1, current - 1))
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d9d6cb] bg-white text-xl font-bold transition hover:border-[#85816d] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>

                    <input
                      id="order-quantity"
                      name="quantity"
                      type="number"
                      min={1}
                      max={maxQuantity}
                      step={1}
                      inputMode="numeric"
                      value={quantity}
                      disabled={hasVariants && !selectedVariant}
                      onChange={(event) => {
                        const nextQuantity = Number(event.target.value);

                        if (!Number.isFinite(nextQuantity)) return;

                        setQuantity(
                          nextQuantity < 1
                            ? 1
                            : Math.min(
                                Math.floor(nextQuantity),
                                maxQuantity || 1,
                              ),
                        );

                        setFeedback("");
                      }}
                      className="h-11 w-16 rounded-xl border border-[#d9d6cb] bg-white text-center font-bold text-[#252720] outline-none focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                      aria-label="عدد القطع"
                    />

                    <button
                      type="button"
                      aria-label="زيادة الكمية"
                      disabled={
                        quantity >= maxQuantity ||
                        (hasVariants && !selectedVariant)
                      }
                      onClick={() =>
                        setQuantity((current) =>
                          Math.min(maxQuantity, current + 1),
                        )
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d9d6cb] bg-white text-xl font-bold transition hover:border-[#85816d] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-black/5 pt-4">
                  <span className="text-sm text-gray-500">
                    مجموع المنتجات ({quantity})
                  </span>
                  <span className="text-lg font-black">
                    {hasVariants && !selectedVariant
                      ? "—"
                      : formatPrice(subtotal)}
                  </span>
                </div>
              </div>
            </section>

            <div className="h-px bg-black/5" />

            {/* معلومات الزبون */}
            <section aria-labelledby="customer-heading">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9e6dd] text-sm font-black text-[#77735f]">
                  02
                </span>
                <div>
                  <h3 id="customer-heading" className="font-bold">
                    معلومات الزبون
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    المعلومات الضرورية لتأكيد طلبك
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="customer-first-name"
                    className={labelClassName}
                  >
                    الاسم <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="customer-first-name"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="أدخل اسمك"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="customer-last-name"
                    className={labelClassName}
                  >
                    اللقب <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="customer-last-name"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="أدخل لقبك"
                    className={inputClassName}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="customer-phone"
                    className={labelClassName}
                  >
                    رقم الهاتف <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="customer-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    required
                    maxLength={30}
                    pattern="[+]?[0-9 ()-]{8,30}"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="05XX XX XX XX"
                    className={`${inputClassName} text-left`}
                  />
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    أدخل رقم هاتف صالحًا حتى تتمكن شركة التوصيل من التواصل
                    معك.
                  </p>
                </div>
              </div>
            </section>

            <div className="h-px bg-black/5" />

            {/* معلومات التوصيل */}
            <section aria-labelledby="delivery-heading">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9e6dd] text-sm font-black text-[#77735f]">
                  03
                </span>
                <div>
                  <h3 id="delivery-heading" className="font-bold">
                    معلومات التوصيل
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    اختر الولاية والبلدية وطريقة الاستلام
                  </p>
                </div>
              </div>

              {!hasDeliveryOptions ? (
                <div
                  role="status"
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900"
                >
                  بيانات التوصيل غير متاحة حاليًا. يرجى المحاولة لاحقًا.
                </div>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="delivery-wilaya"
                        className={labelClassName}
                      >
                        الولاية <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="delivery-wilaya"
                        name="wilayaId"
                        required
                        value={wilayaId}
                        onChange={(event) => {
                          setWilayaId(event.target.value);
                          setCommuneId("");
                          setSelectedOfficeId("");
                          setFeedback("");
                        }}
                        className={inputClassName}
                      >
                        <option value="">اختر الولاية</option>
                        {deliveryOptions!.wilayas.map((wilaya) => (
                          <option key={wilaya.id} value={wilaya.id}>
                            {wilaya.code} — {wilaya.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="delivery-commune"
                        className={labelClassName}
                      >
                        البلدية <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="delivery-commune"
                        name="communeId"
                        required
                        disabled={!wilayaId || communes.length === 0}
                        value={communeId}
                        onChange={(event) => {
                          setCommuneId(event.target.value);
                          setSelectedOfficeId("");
                          setFeedback("");
                        }}
                        className={inputClassName}
                      >
                        <option value="">
                          {!wilayaId
                            ? "اختر الولاية أولًا"
                            : communes.length === 0
                              ? "لا توجد بلديات متاحة"
                              : "اختر البلدية"}
                        </option>
                        {communes.map((commune) => (
                          <option key={commune.id} value={commune.id}>
                            {commune.code
                              ? `${commune.code} — ${commune.name}`
                              : commune.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className={labelClassName}>طريقة التوصيل</p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        aria-pressed={deliveryMethod === "home"}
                        onClick={() => {
                          setDeliveryMethod("home");
                          setSelectedOfficeId("");
                          setFeedback("");
                        }}
                        className={`rounded-2xl border p-4 text-right transition duration-200 ${
                          deliveryMethod === "home"
                            ? "border-[#85816d] bg-[#e9e6dd]/65 ring-2 ring-[#85816d]/10"
                            : "border-[#d9d6cb] bg-white hover:border-[#b5b09f]"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-bold">
                            التوصيل إلى المنزل
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              deliveryMethod === "home"
                                ? "border-[#85816d] bg-[#85816d]"
                                : "border-gray-300"
                            }`}
                            aria-hidden="true"
                          >
                            {deliveryMethod === "home" && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </span>
                        <span className="mt-2 block text-xs leading-5 text-gray-500">
                          استلم طلبك في عنوانك، ويمكنك ترك العنوان فارغًا.
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={deliveryMethod === "office"}
                        onClick={() => {
                          setDeliveryMethod("office");
                          setFeedback("");
                        }}
                        className={`rounded-2xl border p-4 text-right transition duration-200 ${
                          deliveryMethod === "office"
                            ? "border-[#85816d] bg-[#e9e6dd]/65 ring-2 ring-[#85816d]/10"
                            : "border-[#d9d6cb] bg-white hover:border-[#b5b09f]"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-bold">
                            الاستلام من المكتب
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              deliveryMethod === "office"
                                ? "border-[#85816d] bg-[#85816d]"
                                : "border-gray-300"
                            }`}
                            aria-hidden="true"
                          >
                            {deliveryMethod === "office" && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </span>
                        <span className="mt-2 block text-xs leading-5 text-gray-500">
                          يمكنك اختيار مكتب إن رغبت، دون إلزامك بذلك.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* العنوان اختياري */}
                  {deliveryMethod === "home" && (
                    <div className="mt-5">
                      <label
                        htmlFor="delivery-address"
                        className={labelClassName}
                      >
                        عنوان التوصيل{" "}
                        <span className="font-normal text-gray-400">
                          (اختياري)
                        </span>
                      </label>
                      <textarea
                        id="delivery-address"
                        name="deliveryAddress"
                        rows={3}
                        maxLength={500}
                        value={deliveryAddress}
                        onChange={(event) =>
                          setDeliveryAddress(event.target.value)
                        }
                        placeholder="أدخل عنوانك التفصيلي إن رغبت..."
                        className={`${inputClassName} min-h-24 resize-y py-4`}
                      />
                    </div>
                  )}

                  {/* عرض المكاتب عند اختيار OFFICE فقط */}
                  {deliveryMethod === "office" && selectedCommune && (
                    <div className="mt-5">
                      <p className={labelClassName}>
                        مكاتب الاستلام{" "}
                        <span className="font-normal text-gray-400">
                          (اختياري)
                        </span>
                      </p>

                      {offices.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {offices.map((office) => {
                            const isSelected =
                              selectedOfficeId === office.id;

                            return (
                              <button
                                key={office.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => {
                                  setSelectedOfficeId(
                                    isSelected ? "" : office.id,
                                  );
                                  setFeedback("");
                                }}
                                className={`block w-full rounded-2xl border p-4 text-right transition ${
                                  isSelected
                                    ? "border-[#85816d] bg-[#e9e6dd]/70 ring-2 ring-[#85816d]/10"
                                    : "border-[#d9d6cb] bg-white hover:border-[#b5b09f]"
                                }`}
                              >
                                <span className="flex items-start justify-between gap-3">
                                  <span className="font-bold">
                                    {office.name}
                                  </span>
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                      isSelected
                                        ? "border-[#85816d] bg-[#85816d] text-white"
                                        : "border-gray-300 text-transparent"
                                    }`}
                                    aria-hidden="true"
                                  >
                                    ✓
                                  </span>
                                </span>

                                {office.address && (
                                  <span className="mt-1 block text-sm leading-6 text-gray-500">
                                    {office.address}
                                  </span>
                                )}

                                {office.phone && (
                                  <span
                                    dir="ltr"
                                    className="mt-2 block text-left text-sm text-gray-600"
                                  >
                                    {office.phone}
                                  </span>
                                )}

                                {isSelected && (
                                  <span className="mt-2 block text-xs font-semibold text-[#77735f]">
                                    تم اختيار هذا المكتب
                                  </span>
                                )}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => setSelectedOfficeId("")}
                            disabled={!selectedOfficeId}
                            className="text-sm text-gray-500 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            متابعة دون اختيار مكتب
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-xl border border-[#d9d6cb] bg-white p-4 text-sm leading-6 text-gray-500">
                          لا توجد مكاتب متاحة في هذه البلدية. يمكنك
                          متابعة الطلب دون اختيار مكتب.
                        </p>
                      )}
                    </div>
                  )}

                  {/* سعر التوصيل والإجمالي */}
                  <div
                    aria-live="polite"
                    className="mt-6 rounded-2xl border border-[#d9d6cb] bg-white p-5 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold">سعر التوصيل</p>
                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          {selectedCommune
                            ? `${selectedCommune.name} · ${
                                deliveryMethod === "home"
                                  ? "إلى المنزل"
                                  : "إلى المكتب"
                              }`
                            : "اختر الولاية والبلدية لعرض السعر"}
                        </p>

                        {deliveryMethod === "office" &&
                          selectedOffice && (
                            <p className="mt-1 text-xs text-gray-500">
                              المكتب المختار: {selectedOffice.name}
                            </p>
                          )}
                      </div>

                      <p className="shrink-0 text-lg font-black text-[#77735f]">
                        {deliveryPrice === null ||
                        deliveryPrice === undefined
                          ? "—"
                          : formatPrice(Number(deliveryPrice))}
                      </p>
                    </div>

                    {selectedCommune &&
                      deliveryPrice !== null &&
                      deliveryPrice !== undefined &&
                      (!hasVariants || selectedVariant) && (
                        <>
                          <div className="my-5 h-px bg-black/5" />

                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-500">
                              مجموع المنتجات ({quantity})
                            </span>
                            <span className="font-semibold">
                              {formatPrice(subtotal)}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-500">
                              رسوم التوصيل
                            </span>
                            <span className="font-semibold">
                              {formatPrice(Number(deliveryPrice))}
                            </span>
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-4 border-t border-black/5 pt-5">
                            <span className="font-bold">الإجمالي</span>
                            <p className="text-2xl font-black">
                              {formatPrice(totalPrice!)}
                            </p>
                          </div>
                        </>
                      )}
                  </div>
                </>
              )}
            </section>

            {feedback && (
              <p
                role="status"
                className="rounded-xl border border-[#d9d6cb] bg-white p-4 text-sm leading-7 text-[#45473d]"
              >
                {feedback}
              </p>
            )}

            {orderNumber && (
              <div
                role="status"
                className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center"
              >
                <p className="font-bold text-green-800">
                  تم إنشاء طلبك بنجاح!
                </p>
                <p className="mt-2 text-sm text-green-700">
                  رقم الطلب
                </p>
                <p
                  dir="ltr"
                  className="mt-1 font-black tracking-wider text-green-900"
                >
                  {orderNumber}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !hasDeliveryOptions ||
                !canOrderVariant ||
                (hasVariants &&
                  availableAttributes.some(
                    (attribute) =>
                      !selectedAttributeValues[attribute.id],
                  ))
              }
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#252720] px-6 py-4 font-bold text-white transition duration-200 hover:bg-[#414438] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85816d]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "جارٍ إرسال الطلب..."
                : "تأكيد الطلب"}
              {!isSubmitting && <span aria-hidden="true">←</span>}
            </button>

            <p className="text-center text-xs leading-6 text-gray-500">
              يمكنك إرسال طلبك دون إدخال عنوان المنزل أو اختيار مكتب
              استلام.
            </p>
          </form>
        </motion.div>
      </div>
    </section>
  );
}