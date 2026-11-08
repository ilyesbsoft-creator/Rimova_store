"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { getDeliveryOptions } from "@/backend/modules/delivery/delivery.service";
import type { getProductById } from "@/backend/modules/products/product.service";
import { House, MapPin, X, Images, Check } from "lucide-react";
import Image from "next/image";

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

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("home");

  const [wilayaId, setWilayaId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState("");

  // تخزين اختيار المستخدم لكل خاصية على حدة.
  const [selectedAttributeValues, setSelectedAttributeValues] =
    useState<SelectedAttributeValues>({});

  const [quantity, setQuantity] = useState(1);

  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  // التحكم في نافذة اختيار المتغيرات بالصور.
  const [isVariantGalleryOpen, setIsVariantGalleryOpen] =
    useState(false);

  const hasVariants = variants.length > 0;
  const hasAttributes = attributes.length > 0;

  // إغلاق النافذة باستخدام Escape ومنع تمرير الصفحة خلفها.
  useEffect(() => {
    if (!isVariantGalleryOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVariantGalleryOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVariantGalleryOpen]);

  // لا نعرض إلا الخصائص التي تستخدمها المتغيرات فعلًا.
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

  // المتغيرات المتوفرة في المخزون لعرضها في معرض الصور.
  const availableImageVariants = useMemo(
    () =>
      variants.filter(
        (variant) =>
          Math.max(0, Number(variant.stock_quantity) || 0) > 0,
      ),
    [variants],
  );

  // البحث عن المتغير الفعلي المطابق لجميع اختيارات المستخدم.
  const selectedVariant = useMemo(() => {
    if (!hasVariants || availableAttributes.length === 0) {
      return undefined;
    }

    const allAttributesSelected = availableAttributes.every(
      (attribute) => Boolean(selectedAttributeValues[attribute.id]),
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

    setSelectedAttributeValues((current) => {
      // إذا كانت القيمة محددة بالفعل، نلغي تحديدها.
      if (current[attributeId] === valueId) {
        const updated = { ...current };
        delete updated[attributeId];
        return updated;
      }

      // وإلا نحدد القيمة الجديدة.
      return {
        ...current,
        [attributeId]: valueId,
      };
    });

    setQuantity(1);
    setFeedback("");
    setOrderNumber("");
  }

  // تحديد المتغير مباشرة من خلال الضغط على صورته.
  function handleVariantImageSelect(variantId: string) {
    const variant = availableImageVariants.find(
      (item) => item.id === variantId,
    );

    if (!variant) return;

    const nextSelections: SelectedAttributeValues = {};

    for (const attribute of variant.attributes) {
      nextSelections[attribute.id] = attribute.value_id;
    }

    setSelectedAttributeValues(nextSelections);
    setQuantity(1);
    setFeedback("");
    setOrderNumber("");

    // إغلاق نافذة الصور بعد اختيار المتغير.
    setIsVariantGalleryOpen(false);
  }

  // الولاية المختارة.
  const selectedWilaya = useMemo(
    () =>
      deliveryOptions?.wilayas.find(
        (wilaya) => wilaya.id === wilayaId,
      ),
    [deliveryOptions, wilayaId],
  );

  // البلديات والمكاتب التابعة للولاية المختارة.
  const communes = selectedWilaya?.home_delivery.communes ?? [];

  const offices = selectedWilaya?.office_delivery.offices ?? [];

  const selectedCommune = communes.find(
    (commune) => commune.id === communeId,
  );

  const selectedOffice = offices.find(
    (office) => office.id === selectedOfficeId,
  );

  // سعر التوصيل يعتمد على الولاية وطريقة التوصيل فقط.
  const deliveryPrice =
    selectedWilaya === undefined
      ? null
      : deliveryMethod === "home"
        ? selectedWilaya.home_delivery.price
        : selectedWilaya.office_delivery.price;

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

    setDeliveryMethod("home");
    setWilayaId("");
    setCommuneId("");
    setDeliveryAddress("");
    setSelectedOfficeId("");

    setSelectedAttributeValues({});
    setQuantity(1);

    setFeedback("");
  }

  function handleDeliveryMethodChange(method: DeliveryMethod) {
    setDeliveryMethod(method);

    setCommuneId("");
    setSelectedOfficeId("");
    setDeliveryAddress("");

    setFeedback("");
  }

  function handleWilayaChange(nextWilayaId: string) {
    setWilayaId(nextWilayaId);

    setCommuneId("");
    setSelectedOfficeId("");

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

    if (!deliveryOptions || !selectedWilaya) {
      setFeedback("يرجى اختيار طريقة التوصيل والولاية.");
      return;
    }

    if (deliveryMethod === "home" && !selectedCommune) {
      setFeedback("يرجى اختيار البلدية.");
      return;
    }

    if (deliveryMethod === "office" && !selectedOffice) {
      setFeedback("يرجى اختيار مكتب الاستلام.");
      return;
    }

    if (deliveryPrice === null || deliveryPrice === undefined) {
      setFeedback(
        "التوصيل غير متاح للولاية المختارة بطريقة التوصيل هذه.",
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

          ...(deliveryMethod === "home"
            ? { commune_id: communeId }
            : {}),

          delivery_company_id: deliveryOptions.company.id,

          delivery_method:
            deliveryMethod === "home" ? "HOME" : "OFFICE",

          ...(deliveryMethod === "home"
            ? {
                delivery_address: deliveryAddress.trim() || null,
              }
            : {
                delivery_office_id: selectedOfficeId,
              }),

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

      const createdOrderNumber = result.order_number;

      resetOrderForm();

      setOrderNumber(createdOrderNumber);
      setFeedback("تم إنشاء طلبك بنجاح!");

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
              أدخل معلوماتك واختر طريقة التوصيل والولاية لمعرفة
              التكلفة الإجمالية قبل تأكيد الطلب.
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
                                <span className="inline-flex items-center gap-2">
                                  {value.value}

                                  {attribute.type === "color" &&
                                    value.color_code && (
                                      <span
                                        aria-hidden="true"
                                        className="h-6 w-6 shrink-0 rounded-full border border-black/15 shadow-inner"
                                        style={{
                                          backgroundColor: value.color_code,
                                        }}
                                      />
                                    )}
                                </span>

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

                  {/* زر فتح معرض الصور - لا يعرض الصور داخل الصفحة */}
                  {availableImageVariants.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsVariantGalleryOpen(true)}
                      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[#d9d6cb] bg-white p-4 text-right transition duration-200 hover:border-[#85816d] hover:bg-[#e9e6dd]/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85816d]/15"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e9e6dd] text-[#85816d] transition group-hover:bg-[#85816d] group-hover:text-white">
                          <Images size={21} strokeWidth={1.8} />
                        </span>

                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[#35372e]">
                            الاختيار بواسطة الصور
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {selectedVariant
                              ? "يمكنك تغيير الخيار المختار من الصور"
                              : "تصفح الصور واختر الموديل المناسب"}
                          </span>
                        </span>
                      </span>

                      <span className="shrink-0 text-xs font-semibold text-[#85816d] transition group-hover:translate-x-[-2px]">
                        عرض الخيارات ←
                      </span>
                    </button>
                  )}

                  {/* تفاصيل المتغير المختار */}
                  {selectedVariant ? (
                    <div
                      aria-live="polite"
                      className="overflow-hidden rounded-2xl border border-[#d9d6cb] bg-white"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
                        <div className="relative aspect-square w-full overflow-hidden bg-[#e9e6dd]/50 sm:aspect-auto sm:min-h-36">
                          {selectedVariant.image_url ? (
                            <Image
                              src={selectedVariant.image_url}
                              alt={`${productName} - ${selectedVariant.attributes
                                .map((attribute) => attribute.value)
                                .join(" - ")}`}
                              fill
                              unoptimized
                              sizes="(max-width: 640px) 100vw, 144px"
                              className="object-contain p-4"
                            />
                          ) : (
                            <div className="flex h-full min-h-36 items-center justify-center">
                              <div className="text-center">
                                <span className="text-3xl text-[#85816d]">
                                  ◇
                                </span>
                                <p className="mt-2 text-xs text-gray-400">
                                  لا توجد صورة لهذا الخيار
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-col justify-center p-4 sm:p-5">
                          <div>
                            <p className="text-xs font-semibold text-[#85816d]">
                              الخيار المختار
                            </p>

                            <p className="mt-2 font-bold leading-7 text-[#252720]">
                              {selectedVariant.attributes
                                .map(
                                  (attribute) =>
                                    `${attribute.name}: ${attribute.value}`,
                                )
                                .join(" · ")}
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
                            <div>
                              <p className="text-xs text-gray-500">
                                سعر القطعة
                              </p>
                              <p className="mt-1 font-black text-[#77735f]">
                                {formatPrice(unitPrice)}
                              </p>
                            </div>

                            <div className="text-left">
                              <p className="text-xs text-gray-500">
                                المخزون المتوفر
                              </p>
                              <p className="mt-1 text-sm font-bold">
                                {availableStock} قطعة
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-green-700">
                            <span className="h-2 w-2 rounded-full bg-green-600" />
                            تم تحديد هذا الخيار بنجاح
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-6 text-gray-500">
                      اختر قيمة لكل خاصية أو استخدم الاختيار بواسطة الصور.
                      سيتم تحديث السعر والمخزون والصورة تلقائيًا.
                    </p>
                  )}
                </div>
              )}

              {/* الكمية */}
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
                    أدخل رقم هاتف صالحًا حتى تتمكن شركة التوصيل من
                    التواصل معك.
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
                    اختر طريقة التوصيل أولًا، ثم الولاية
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
                  {/* اختيار طريقة التوصيل */}
                  <div>
                    <p className={labelClassName}>
                      طريقة التوصيل{" "}
                      <span className="text-red-600">*</span>
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        aria-pressed={deliveryMethod === "home"}
                        onClick={() =>
                          handleDeliveryMethodChange("home")
                        }
                        className={`rounded-2xl border p-4 text-right transition duration-200 ${
                          deliveryMethod === "home"
                            ? "border-[#85816d] bg-[#e9e6dd]/65 ring-2 ring-[#85816d]/10"
                            : "border-[#d9d6cb] bg-white hover:border-[#b5b09f]"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 font-bold">
                            <House
                              size={25}
                              strokeWidth={2}
                              className="text-[#85816d]"
                            />
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
                          استلم طلبك في عنوانك. يمكنك ترك العنوان التفصيلي
                          فارغًا.
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={deliveryMethod === "office"}
                        onClick={() =>
                          handleDeliveryMethodChange("office")
                        }
                        className={`rounded-2xl border p-4 text-right transition duration-200 ${
                          deliveryMethod === "office"
                            ? "border-[#85816d] bg-[#e9e6dd]/65 ring-2 ring-[#85816d]/10"
                            : "border-[#d9d6cb] bg-white hover:border-[#b5b09f]"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 font-bold">
                            <MapPin
                              size={25}
                              strokeWidth={2}
                              className="text-[#85816d]"
                            />
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
                          اختر مكتب الاستلام المناسب من مكاتب الولاية.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* اختيار الولاية */}
                  <div className="mt-6">
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
                      onChange={(event) =>
                        handleWilayaChange(event.target.value)
                      }
                      className={inputClassName}
                    >
                      <option value="">اختر الولاية</option>
                      {deliveryOptions.wilayas.map((wilaya) => (
                        <option key={wilaya.id} value={wilaya.id}>
                          {wilaya.code} — {wilaya.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* تفاصيل التوصيل إلى المنزل */}
                  {deliveryMethod === "home" && selectedWilaya && (
                    <div className="mt-5 space-y-5">
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
                          disabled={communes.length === 0}
                          value={communeId}
                          onChange={(event) => {
                            setCommuneId(event.target.value);
                            setFeedback("");
                          }}
                          className={inputClassName}
                        >
                          <option value="">
                            {communes.length === 0
                              ? "لا توجد بلديات متاحة"
                              : "اختر البلدية"}
                          </option>

                          {communes.map((commune) => (
                            <option key={commune.id} value={commune.id}>
                              {commune.code
                                ? `${commune.name}`
                                : commune.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
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
                    </div>
                  )}

                  {/* اختيار مكتب الاستلام */}
                  {deliveryMethod === "office" && selectedWilaya && (
                    <div className="mt-5">
                      <p className={labelClassName}>
                        مكتب الاستلام{" "}
                        <span className="text-red-600">*</span>
                      </p>

                      <p className="mt-1 text-xs leading-6 text-gray-500">
                        تظهر هنا جميع مكاتب شركة التوصيل الموجودة في
                        ولاية {selectedWilaya.name}، بغض النظر عن البلدية
                        التابعة لها.
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
                                  setSelectedOfficeId(office.id);
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
                        </div>
                      ) : (
                        <p className="mt-3 rounded-xl border border-[#d9d6cb] bg-white p-4 text-sm leading-6 text-gray-500">
                          لا توجد مكاتب استلام متاحة في هذه الولاية
                          حاليًا.
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
                          {!selectedWilaya
                            ? "اختر الولاية لعرض سعر التوصيل"
                            : `${selectedWilaya.name} · ${
                                deliveryMethod === "home"
                                  ? "إلى المنزل"
                                  : "إلى مكتب الاستلام"
                              }`}
                        </p>

                        {deliveryMethod === "home" &&
                          selectedCommune && (
                            <p className="mt-1 text-xs text-gray-500">
                              البلدية: {selectedCommune.name}
                            </p>
                          )}

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

                    {selectedWilaya &&
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
              عنوان المنزل التفصيلي اختياري، لكن يجب اختيار بلدية
              للتوصيل إلى المنزل أو مكتب محدد للاستلام من المكتب.
            </p>
          </form>
        </motion.div>
      </div>

      {/* نافذة اختيار المتغيرات بالصور */}
      {isVariantGalleryOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#252720]/65 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setIsVariantGalleryOpen(false)}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="variant-gallery-title"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-[#faf9f6] shadow-[0_25px_100px_rgba(0,0,0,0.25)]"
          >
            {/* رأس النافذة */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/5 px-5 py-5 sm:px-7 sm:py-6">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-[#85816d]">
                  RIMOVA · SELECT YOUR STYLE
                </p>

                <h3
                  id="variant-gallery-title"
                  className="mt-2 text-lg font-black text-[#252720] sm:text-xl"
                >
                  اختر الموديل المناسب لك
                </h3>

                <p className="mt-1 text-xs leading-6 text-gray-500">
                  اضغط على الصورة لاختيار المتغير وتحديث خصائص المنتج تلقائيًا.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsVariantGalleryOpen(false)}
                aria-label="إغلاق نافذة الصور"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9d6cb] bg-white text-[#55574c] transition hover:border-[#85816d] hover:bg-[#e9e6dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85816d]/20"
              >
                <X size={19} />
              </button>
            </div>

            {/* محتوى النافذة */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              {availableImageVariants.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {availableImageVariants.map((variant) => {
                    const isSelected =
                      selectedVariant?.id === variant.id;

                    const variantDescription =
                      variant.attributes
                        .map((attribute) => attribute.value)
                        .join(" · ");

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          handleVariantImageSelect(variant.id)
                        }
                        className={`group overflow-hidden rounded-2xl border text-right transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85816d]/20 ${
                          isSelected
                            ? "border-[#85816d] bg-[#e9e6dd]/60 ring-2 ring-[#85816d]/20"
                            : "border-[#d9d6cb] bg-white hover:border-[#85816d] hover:shadow-md"
                        }`}
                      >
                        {/* صورة المتغير */}
                        <div className="relative aspect-square w-full overflow-hidden bg-[#e9e6dd]/40">
                          {variant.image_url ? (
                            <Image
                              src={variant.image_url}
                              alt={`${productName} - ${variantDescription}`}
                              fill
                              unoptimized
                              sizes="(max-width: 640px) 50vw, 220px"
                              className="object-contain p-3 transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center">
                              <span className="text-4xl text-[#85816d]">
                                ◇
                              </span>
                              <span className="mt-2 text-xs text-gray-400">
                                لا توجد صورة
                              </span>
                            </div>
                          )}

                          {isSelected && (
                            <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#85816d] text-white shadow-md">
                              <Check size={16} strokeWidth={2.5} />
                            </span>
                          )}
                        </div>

                        {/* معلومات المتغير */}
                        <div className="p-3 sm:p-4">
                          <p className="line-clamp-2 min-h-10 text-xs font-bold leading-5 text-[#35372e] sm:text-sm">
                            {variantDescription || "خيار المنتج"}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3">
                            <span className="text-sm font-black text-[#77735f]">
                              {formatPrice(
                                Number(variant.price ?? productPrice),
                              )}
                            </span>

                            <span className="text-[10px] text-gray-500 sm:text-xs">
                              متوفر: {variant.stock_quantity}
                            </span>
                          </div>

                          {isSelected && (
                            <p className="mt-3 text-xs font-bold text-[#77735f]">
                              هذا هو اختيارك الحالي
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-[#d9d6cb] bg-white p-5 text-center text-sm text-gray-500">
                  لا توجد خيارات متوفرة حاليًا.
                </p>
              )}
            </div>

            {/* أسفل النافذة */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/5 bg-white/70 px-5 py-4 sm:px-7">
              <p className="text-xs text-gray-500">
                {availableImageVariants.length} خيارات متوفرة
              </p>

              <button
                type="button"
                onClick={() => setIsVariantGalleryOpen(false)}
                className="rounded-full bg-[#252720] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#414438] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85816d]/30"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}