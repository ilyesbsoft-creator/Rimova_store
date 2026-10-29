
"use client";

import { useState } from "react";
import { motion, MotionConfig, AnimatePresence } from "motion/react";
import type { getProductById } from "@/backend/modules/products/product.service";
import type { getDeliveryOptions } from "@/backend/modules/delivery/delivery.service";

import OrderForm from "@/app/components/product/order-form";

type Product = NonNullable<
  Awaited<ReturnType<typeof getProductById>>
>;

type DeliveryOptions = NonNullable<
  Awaited<ReturnType<typeof getDeliveryOptions>>
>;

type ProductLandingProps = {
  product: Product;
  deliveryOptions: DeliveryOptions | null;
};

const smoothTransition = {
  duration: 0.8,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.12,
    },
  },
};

function ProductPrice({ price }: { price: number }) {
  return (
    <div>
      <p className="mb-2 text-sm text-gray-500">السعر</p>

      <p className="text-3xl font-black tracking-tight sm:text-4xl">
        {price.toLocaleString("fr-DZ")}{" "}
        <span className="text-xl font-bold text-[#85816d]">دج</span>
      </p>
    </div>
  );
}

export default function ProductLanding({
  product,
  deliveryOptions,
}: ProductLandingProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    null,
  );

  const mainImage =
    product.images.find((image) => image.id === selectedImageId) ??
    product.images.find((image) => Boolean(image.is_primary)) ??
    product.images[0];

  const productPrice = Number(product.price);

  return (
    <MotionConfig reducedMotion="user">
      <main
        dir="rtl"
        className="min-h-screen overflow-hidden bg-[#faf9f6] text-[#252720]"
      >
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={smoothTransition}
          className="relative z-20 border-b border-black/5 bg-[#faf9f6]"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
            <motion.a
              href="/"
              aria-label="RIMOVA - الصفحة الرئيسية"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="text-2xl font-black tracking-[0.12em] md:text-3xl"
            >
              RIMOVA
            </motion.a>

            <span className="hidden text-sm text-gray-500 sm:block">
              تجربة تسوّق مختلفة
            </span>

            <motion.a
              href="/"
              whileHover={{
                y: -2,
                backgroundColor: "#252720",
                color: "#ffffff",
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold"
            >
              الصفحة الرئيسية
            </motion.a>
          </div>
        </motion.header>

        {/* Product details */}
        <section className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-[#e8e4d8]/60 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-7xl items-start gap-6 px-6 py-8 md:grid-cols-2 md:gap-16 md:px-10 md:py-20">
            {/* Product images and mobile price */}
            <motion.div
              initial={{
                opacity: 0,
                y: 30,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              transition={{
                ...smoothTransition,
                delay: 0.1,
              }}
              className="min-w-0"
            >
              {/* Main image */}
              <motion.div
                whileHover={{
                  boxShadow: "0 24px 60px rgba(37, 39, 32, 0.07)",
                }}
                transition={{ duration: 0.4 }}
                className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[2rem] bg-[#e9e6dd] p-4 sm:p-8"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full border border-[#b5b09f]/50"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full border border-[#b5b09f]/40"
                />

                <AnimatePresence mode="wait">
                  {mainImage ? (
                    <motion.img
                      key={mainImage.id}
                      src={mainImage.image_url}
                      alt={mainImage.alt_text ?? product.name}
                      initial={{
                        opacity: 0,
                        scale: 0.96,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.98,
                      }}
                      transition={{
                        duration: 0.35,
                        ease: "easeOut",
                      }}
                      whileHover={{
                        scale: 1.035,
                      }}
                      className="relative z-10 h-full w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <motion.p
                      key="no-image"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="relative z-10 text-center text-gray-500"
                    >
                      لا توجد صورة لهذا المنتج حاليًا
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Image thumbnails */}
              {product.images.length > 1 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  role="group"
                  aria-label="صور إضافية للمنتج"
                  className="mt-4 flex gap-3 overflow-x-auto pb-2"
                >
                  {product.images.map((image) => {
                    const isSelected = mainImage?.id === image.id;

                    return (
                      <motion.button
                        key={image.id}
                        variants={fadeUp}
                        type="button"
                        onClick={() => setSelectedImageId(image.id)}
                        aria-label={`عرض صورة ${image.alt_text ?? product.name}`}
                        aria-pressed={isSelected}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-[#e9e6dd] transition-colors md:h-24 md:w-24 ${
                          isSelected
                            ? "border-[#85816d] ring-2 ring-[#85816d]/15"
                            : "border-black/5 hover:border-[#b5b09f]"
                        }`}
                      >
                        <img
                          src={image.image_url}
                          alt={image.alt_text ?? product.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}

              {/* Caption */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mt-3 text-xs text-gray-500"
              >
                اكتشف التفاصيل واختر ما يناسبك
              </motion.p>

              {/* Price: visible only on small screens, directly below images */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...smoothTransition, delay: 0.25 }}
                className="mt-5 border-y border-black/5 py-5 md:hidden"
              >
                <ProductPrice price={productPrice} />
              </motion.div>
            </motion.div>

            {/* Product information */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="min-w-0 md:pt-5"
            >
              <motion.p
                variants={fadeUp}
                className="flex items-center gap-3 text-sm font-semibold tracking-wide text-[#85816d]"
              >
                <span className="h-px w-8 bg-[#85816d]" />
                اكتشف منتجنا
              </motion.p>

              <motion.h1
                variants={fadeUp}
                className="mt-5 text-3xl font-black leading-[1.4] tracking-tight sm:text-4xl lg:text-5xl"
              >
                {product.name}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 whitespace-pre-line text-base leading-8 text-gray-600 md:text-lg"
              >
                {product.description ||
                  "لا يوجد وصف لهذا المنتج حاليًا."}
              </motion.p>

              {/* Price: visible only on desktop */}
              <motion.div
                variants={fadeUp}
                className="mt-7 hidden border-y border-black/5 py-6 md:block"
              >
                <ProductPrice price={productPrice} />
              </motion.div>

              {/* Order button */}
              <motion.div variants={fadeUp} className="mt-8">
                <motion.a
                  href="#order"
                  whileHover={{
                    y: -3,
                    backgroundColor: "#414438",
                    boxShadow: "0 12px 28px rgba(37, 39, 32, 0.14)",
                  }}
                  whileTap={{
                    scale: 0.98,
                    y: 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 24,
                  }}
                  className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#252720] px-8 py-4 font-bold text-white md:w-fit md:min-w-60"
                >
                  اطلب الآن

                  <motion.span
                    aria-hidden="true"
                    whileHover={{ x: -4 }}
                    className="inline-block"
                  >
                    ←
                  </motion.span>
                </motion.a>
              </motion.div>

              {/* Benefits */}
              <motion.div
                variants={staggerContainer}
                className="mt-9 grid grid-cols-2 gap-4 border-t border-black/5 pt-6 text-sm text-gray-600"
              >
                <motion.div
                  variants={fadeUp}
                  className="flex items-start gap-2"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9e6dd] text-[#77735f]">
                    ✓
                  </span>

                  <span className="leading-6">
                    معلومات توصيل واضحة
                  </span>
                </motion.div>

                <motion.div
                  variants={fadeUp}
                  className="flex items-start gap-2"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9e6dd] text-[#77735f]">
                    ✓
                  </span>

                  <span className="leading-6">
                    طلب سهل وسريع
                  </span>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Order section */}
        <OrderForm
          productId={product.id}
          productName={product.name}
          productPrice={productPrice}
          attributes={product.attributes}
          variants={product.variants}
          deliveryOptions={deliveryOptions}
        />

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
          className="bg-[#252720] px-6 py-8 text-white md:px-10"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <motion.a
              href="/"
              whileHover={{
                scale: 1.04,
                opacity: 0.8,
              }}
              className="text-xl font-black tracking-[0.12em]"
            >
              RIMOVA
            </motion.a>

            <p className="text-center text-sm text-white/60">
              © 2026 RIMOVA. جميع الحقوق محفوظة.
            </p>
          </div>
        </motion.footer>
      </main>
    </MotionConfig>
  );
}
