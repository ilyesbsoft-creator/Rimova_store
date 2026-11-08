"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
};

type Product = {
  id: string;
  category_id: string;
  category_name: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  is_active: boolean | number;
  primary_image_url: string | null;
};

type ApiPayload<T> = {
  data?: T;
  message?: string;
  error?: string;
};

const smoothTransition = {
  duration: 0.75,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

function extractCategories(payload: ApiPayload<Category[] | { data?: Category[] }>) {
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function extractProducts(
  payload: ApiPayload<{ data?: Product[]; pagination?: unknown } | Product[]>,
) {
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && !Array.isArray(payload.data) && Array.isArray(payload.data.data)) {
    return payload.data.data;
  }
  return [];
}

function formatPrice(price: number | string) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "السعر عند الطلب";

  return `${new Intl.NumberFormat("ar-DZ", {
    maximumFractionDigits: 0,
  }).format(amount)} دج`;
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <motion.article
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className="group overflow-hidden rounded-[1.6rem] border border-black/[0.06] bg-white"
    >
      <Link
        href={`/product/${product.id}`}
        aria-label={`عرض ${product.name}`}
        className="block"
      >
        <div className="relative aspect-[4/4.5] overflow-hidden bg-[#eeece5]">
          {product.primary_image_url ? (
            // The image URL comes from the product variant stored by the backend.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.primary_image_url}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_42%,#dedacd_0%,#eeece5_55%,#f7f6f2_100%)]">
              <span className="text-5xl text-[#a7a18f]" aria-hidden="true">
                ✳
              </span>
            </div>
          )}

          <span className="absolute right-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#686553] backdrop-blur">
            {product.category_name || "RIMOVA"}
          </span>
        </div>

        <div className="p-5">
          <h3 className="line-clamp-1 text-base font-bold text-[#252720] transition-colors group-hover:text-[#85816d]">
            {product.name}
          </h3>

          {product.description ? (
            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-[#85816d]">
              {product.description}
            </p>
          ) : (
            <p className="mt-2 min-h-10 text-sm leading-6 text-[#a29d8b]">
              اكتشف تفاصيل هذا المنتج.
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="font-bold text-[#252720]">
              {formatPrice(product.price)}
            </span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f1efe9] text-lg text-[#555747] transition-all group-hover:bg-[#252720] group-hover:text-white">
              ←
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-black/[0.06] bg-white">
      <div className="aspect-[4/4.5] animate-pulse bg-[#e9e6dd]" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#e9e6dd]" />
        <div className="h-3 w-full animate-pulse rounded bg-[#f0eee8]" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-[#e9e6dd]" />
      </div>
    </div>
  );
}

export default function StoreHome() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [reloadProducts, setReloadProducts] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("تعذر تحميل التصنيفات.");

        const payload = (await response.json()) as ApiPayload<
          Category[] | { data?: Category[] }
        >;

        setCategories(extractCategories(payload));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load storefront categories:", error);
        }
      } finally {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      }
    }

    void loadCategories();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setProductsLoading(true);
      setProductsError("");

      const params = new URLSearchParams({
        page: "1",
        limit: "8",
        is_active: "true",
        sort_by: "created_at",
        sort_order: "desc",
      });

      if (selectedCategoryId) {
        params.set("category_id", selectedCategoryId);
      }

      try {
        const response = await fetch(`/api/products?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("تعذر تحميل المنتجات حاليًا. حاول مرة أخرى.");
        }

        const payload = (await response.json()) as ApiPayload<
          { data?: Product[]; pagination?: unknown } | Product[]
        >;

        setProducts(extractProducts(payload));
      } catch (error) {
        if (!controller.signal.aborted) {
          setProductsError(
            error instanceof Error
              ? error.message
              : "حدث خطأ أثناء تحميل المنتجات.",
          );
          setProducts([]);
        }
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false);
      }
    }

    void loadProducts();

    return () => controller.abort();
  }, [selectedCategoryId, reloadProducts]);

  return (
    <MotionConfig reducedMotion="user">
      <main
        dir="rtl"
        className="min-h-screen overflow-hidden bg-[#faf9f6] text-[#252720]"
      >
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={smoothTransition}
          className="relative z-20 border-b border-black/[0.06] bg-[#faf9f6]/90 backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-10">
            <Link
              href="/"
              aria-label="RIMOVA - الصفحة الرئيسية"
              className="text-2xl font-black tracking-[0.12em] sm:text-3xl"
            >
              RIMOVA
            </Link>

            <nav className="hidden items-center gap-8 text-sm text-[#777568] md:flex">
              <a href="#categories" className="transition-colors hover:text-[#252720]">
                التصنيفات
              </a>
              <a href="#products" className="transition-colors hover:text-[#252720]">
                المنتجات
              </a>
              <Link href="/about" className="transition-colors hover:text-[#252720]">
                من نحن
              </Link>
            </nav>

            <motion.a
              href="#products"
              whileHover={{ y: -2, backgroundColor: "#414438" }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full bg-[#252720] px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              تسوّق الآن
            </motion.a>
          </div>
        </motion.header>

        {/* Hero */}
        <section className="relative">
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.65, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-[#e8e4d8] blur-3xl"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 md:grid-cols-2 md:py-24 lg:px-10">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="relative z-10"
            >
              <motion.p
                variants={fadeUp}
                className="mb-6 flex items-center gap-3 text-sm font-semibold tracking-wide text-[#85816d]"
              >
                <span className="h-px w-10 bg-[#85816d]" />
                اكتشف مجموعة RIMOVA
              </motion.p>

              <motion.h1
                variants={fadeUp}
                className="max-w-xl text-5xl font-black leading-[1.35] tracking-tight sm:text-6xl lg:text-7xl"
              >
                اختياراتك،
                <span className="mt-1 block text-[#85816d]">بأسلوبك الخاص.</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-7 max-w-lg text-base leading-8 text-[#777568] md:text-lg"
              >
                اكتشف منتجات RIMOVA، تصفّح التصنيفات واختر ما يناسب ذوقك
                بكل سهولة. تجربة تسوّق واضحة تبدأ من هنا.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-4">
                <motion.a
                  href="#products"
                  whileHover={{ y: -4, scale: 1.02, backgroundColor: "#414438" }}
                  whileTap={{ scale: 0.97, y: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="inline-flex min-h-14 items-center gap-3 rounded-full bg-[#252720] px-8 py-4 font-bold text-white shadow-sm"
                >
                  اكتشف المنتجات
                  <span aria-hidden="true">←</span>
                </motion.a>

                <Link
                  href="/about"
                  className="text-sm font-semibold text-[#777568] transition-colors hover:text-[#252720]"
                >
                  تعرّف على RIMOVA
                </Link>
              </motion.div>
            </motion.div>

            {/* Brand visual, preserving the original animated panel style */}
            <motion.div
              initial={{ opacity: 0, y: 38, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...smoothTransition, delay: 0.18 }}
              className="relative mx-auto w-full max-w-lg"
            >
              <motion.div
                whileHover={{ boxShadow: "0 25px 60px rgba(37, 39, 32, 0.10)" }}
                className="relative flex aspect-[4/4.5] max-h-[560px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#e9e6dd] p-8 sm:p-12"
              >
                <motion.div
                  aria-hidden="true"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                  className="absolute -left-20 top-16 h-64 w-64 rounded-full border border-[#b5b09f]/60"
                />
                <motion.div
                  aria-hidden="true"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
                  className="absolute -left-8 top-28 h-48 w-48 rounded-full border border-[#b5b09f]/60"
                />
                <motion.div
                  aria-hidden="true"
                  animate={{ y: [0, -12, 0], scale: [1, 1.035, 1] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-20 bottom-12 h-72 w-72 rounded-full bg-[#d4d0c3]"
                />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.25em] text-[#77735f]">
                    EST. RIMOVA
                  </span>
                  <motion.span
                    animate={{ rotate: 180 }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    }}
                    className="text-2xl text-[#77735f]"
                    aria-hidden="true"
                  >
                    ✳
                  </motion.span>
                </div>

                <div className="relative z-10 py-10 text-center">
                  <motion.p
                    initial={{ opacity: 0, letterSpacing: "0.1em" }}
                    animate={{ opacity: 1, letterSpacing: "0.3em" }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="text-sm text-[#77735f]"
                  >
                    YOUR STYLE
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-5 text-5xl font-black tracking-[0.12em] sm:text-6xl"
                  >
                    RIMOVA
                  </motion.p>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 64 }}
                    transition={{ duration: 0.8, delay: 1 }}
                    className="mx-auto mt-6 h-px bg-[#a29d8b]"
                  />
                  <p className="mt-5 text-sm text-[#77735f]">البساطة تصنع الفرق</p>
                </div>

                <div className="relative z-10 flex items-end justify-between">
                  <span className="text-xs text-[#77735f]">اكتشف ما يناسبك</span>
                  <motion.span
                    animate={{ x: [0, -5, 0], y: [0, 5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-3xl text-[#77735f]"
                    aria-hidden="true"
                  >
                    ↙
                  </motion.span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-5 -right-3 rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-lg sm:-right-6"
              >
                <p className="text-sm font-bold">مرحبًا بك في عائلتنا</p>
                <p className="mt-1 text-xs text-gray-500">تجربة تبدأ بك</p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="scroll-mt-8 border-y border-black/[0.05] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="mb-9 flex flex-wrap items-end justify-between gap-4"
            >
              <div>
                <motion.p variants={fadeUp} className="text-xs font-semibold tracking-[0.2em] text-[#85816d]">
                  SHOP BY CATEGORY
                </motion.p>
                <motion.h2 variants={fadeUp} className="mt-3 text-2xl font-bold sm:text-3xl">
                  تسوّق حسب التصنيف
                </motion.h2>
                <motion.p variants={fadeUp} className="mt-3 text-sm leading-7 text-[#85816d]">
                  اختر التصنيف الذي تبحث عنه واكتشف المنتجات المتاحة.
                </motion.p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCategoryId("")}
                className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                  selectedCategoryId
                    ? "border-black/10 text-[#777568] hover:bg-[#f5f3ee]"
                    : "border-[#252720] bg-[#252720] text-white"
                }`}
              >
                جميع المنتجات
              </button>
            </motion.div>

            {categoriesLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-[1.4rem] bg-[#eeece5]" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {categories.map((category, index) => (
                  <motion.button
                    key={category.id}
                    type="button"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...smoothTransition, delay: index * 0.06 }}
                    whileHover={{ y: -5 }}
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-[1.4rem] border p-5 text-right transition-colors ${
                      selectedCategoryId === category.id
                        ? "border-[#85816d] bg-[#e9e6dd]"
                        : "border-black/[0.05] bg-[#faf9f6] hover:bg-[#f0eee8]"
                    }`}
                  >
                    {category.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.image_url}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-20 transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute left-4 top-3 text-3xl text-[#b5b09f]" aria-hidden="true">
                        ✳
                      </span>
                    )}
                    <span className="relative z-10 text-xs font-semibold tracking-wide text-[#85816d]">
                      CATEGORY {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="relative z-10 mt-7 text-lg font-bold text-[#252720]">
                      {category.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-[#faf9f6] px-6 py-8 text-center text-sm text-[#85816d]">
                لا توجد تصنيفات متاحة حاليًا.
              </p>
            )}
          </div>
        </section>

        {/* Products */}
        <section id="products" className="scroll-mt-8">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="mb-9 flex flex-wrap items-end justify-between gap-4"
            >
              <div>
                <motion.p variants={fadeUp} className="text-xs font-semibold tracking-[0.2em] text-[#85816d]">
                  THE COLLECTION
                </motion.p>
                <motion.h2 variants={fadeUp} className="mt-3 text-2xl font-bold sm:text-3xl">
                  {selectedCategoryId
                    ? categories.find((item) => item.id === selectedCategoryId)?.name || "منتجات التصنيف"
                    : "اكتشف منتجاتنا"}
                </motion.h2>
                <motion.p variants={fadeUp} className="mt-3 text-sm leading-7 text-[#85816d]">
                  اختيارات RIMOVA المتاحة حاليًا.
                </motion.p>
              </div>

              {selectedCategoryId && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId("")}
                  className="text-sm font-semibold text-[#85816d] underline underline-offset-4 hover:text-[#252720]"
                >
                  إزالة التصفية
                </button>
              )}
            </motion.div>

            {productsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductSkeleton key={index} />
                ))}
              </div>
            ) : productsError ? (
              <div className="rounded-2xl border border-red-900/10 bg-white px-6 py-10 text-center">
                <p className="text-sm text-[#777568]">{productsError}</p>
                <button
                  type="button"
                  onClick={() => setReloadProducts((current) => current + 1)}
                  className="mt-4 rounded-full bg-[#252720] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : products.length > 0 ? (
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.08 }}
                className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4"
              >
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </motion.div>
            ) : (
              <div className="rounded-[1.6rem] border border-black/[0.05] bg-white px-6 py-14 text-center">
                <span className="text-3xl text-[#a7a18f]" aria-hidden="true">✳</span>
                <h3 className="mt-4 font-bold">لا توجد منتجات لعرضها حاليًا</h3>
                <p className="mt-2 text-sm text-[#85816d]">
                  جرّب تصنيفًا آخر أو عد لاحقًا لاكتشاف المنتجات الجديدة.
                </p>
                {selectedCategoryId && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId("")}
                    className="mt-5 rounded-full bg-[#252720] px-6 py-3 text-sm font-semibold text-white"
                  >
                    عرض جميع المنتجات
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* About teaser */}
        <section className="border-t border-black/[0.05] bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[#85816d]">ABOUT RIMOVA</p>
              <h2 className="mt-3 text-2xl font-bold">مساحة لاختياراتك الخاصة</h2>
            </div>
            <p className="max-w-xl leading-8 text-[#777568]">
              نعمل على تقديم تجربة واضحة وسهلة تساعدك على اكتشاف المنتجات
              واتخاذ قرارك بكل راحة.
            </p>
            <Link
              href="/about"
              className="shrink-0 rounded-full border border-black/15 px-6 py-3 text-sm font-semibold transition-colors hover:bg-[#252720] hover:text-white"
            >
              المزيد عن RIMOVA
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#252720] px-5 py-8 text-white sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <Link href="/" className="text-xl font-black tracking-[0.12em]">
              RIMOVA
            </Link>
            <div className="flex items-center gap-6 text-sm text-white/60">
              <Link href="/about" className="transition-colors hover:text-white">من نحن</Link>
              <a href="#categories" className="transition-colors hover:text-white">التصنيفات</a>
              <a href="#products" className="transition-colors hover:text-white">المنتجات</a>
            </div>
            <p className="text-center text-xs text-white/50">
              © 2026 RIMOVA. جميع الحقوق محفوظة.
            </p>
          </div>
        </footer>
      </main>
    </MotionConfig>
  );
}
