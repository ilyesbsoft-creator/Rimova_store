"use client";

import Link from "next/link";
import { motion, MotionConfig } from "motion/react";

const smoothTransition = {
  duration: 0.8,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.2,
    },
  },
};

export default function AboutPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main
        dir="rtl"
        className="relative flex min-h-screen flex-col overflow-hidden bg-[#faf9f6] text-[#20231f]"
      >
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={smoothTransition}
          className="relative z-20 border-b border-black/5"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
            <Link
              href="/"
              aria-label="RIMOVA - الصفحة الرئيسية"
              className="text-2xl font-black tracking-[0.12em] md:text-3xl"
            >
              RIMOVA
            </Link>
            <span className="hidden text-sm text-gray-500 sm:block">
              تجربة تسوّق مختلفة
            </span>
            <Link
              href="/#products"
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[#252720] hover:text-white"
            >
              اكتشف المنتجات
            </Link>
          </div>
        </motion.header>

        <section className="relative flex flex-1 items-center">
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#e8e4d8] blur-3xl"
          />

          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-6 py-16 md:grid-cols-2 md:px-10 md:py-24">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.p
                variants={fadeUp}
                className="mb-6 flex items-center gap-3 text-sm font-semibold tracking-wide text-[#77735f]"
              >
                <span className="h-px w-10 bg-[#77735f]" />
                ABOUT RIMOVA
              </motion.p>

              <motion.h1
                variants={fadeUp}
                className="max-w-xl text-5xl font-black leading-[1.35] tracking-tight sm:text-6xl lg:text-7xl"
              >
                مساحة لاختياراتك،
                <span className="mt-2 block text-[#85816d]">بأسلوبك الخاص.</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-7 max-w-lg text-base leading-8 text-gray-600 md:text-lg"
              >
                نرحب بك في RIMOVA. نعمل على تقديم تجربة واضحة وسهلة تساعدك
                على اكتشاف المنتجات واتخاذ قرارك بكل راحة. نؤمن أن تجربة
                التسوق تبدأ من التفاصيل الصغيرة، وتكتمل باختيار يناسب ذوقك
                واحتياجاتك.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-10">
                <Link
                  href="/#products"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#252720] px-8 py-4 font-bold text-white transition-colors hover:bg-[#414438]"
                >
                  تصفّح المنتجات <span aria-hidden="true">←</span>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 45, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto w-full max-w-lg"
            >
              <motion.div
                whileHover={{ boxShadow: "0 25px 60px rgba(37, 39, 32, 0.08)" }}
                transition={{ duration: 0.5 }}
                className="relative flex aspect-[4/5] max-h-[580px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#e9e6dd] p-8 sm:p-12"
              >
                <motion.div
                  aria-hidden="true"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                  className="absolute -left-20 top-20 h-64 w-64 rounded-full border border-[#b5b09f]/60"
                />
                <motion.div
                  aria-hidden="true"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
                  className="absolute -left-8 top-32 h-48 w-48 rounded-full border border-[#b5b09f]/60"
                />
                <motion.div
                  aria-hidden="true"
                  animate={{ y: [0, -12, 0], scale: [1, 1.035, 1] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-[#d4d0c3]"
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
                    className="inline-block text-2xl text-[#77735f]"
                    aria-hidden="true"
                  >
                    ✳
                  </motion.span>
                </div>

                <div className="relative z-10 py-10 text-center">
                  <motion.p
                    initial={{ opacity: 0, letterSpacing: "0.1em" }}
                    animate={{ opacity: 1, letterSpacing: "0.3em" }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="text-sm text-[#77735f]"
                  >
                    YOUR STYLE
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-5 text-5xl font-black tracking-[0.12em] sm:text-6xl"
                  >
                    RIMOVA
                  </motion.p>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 64 }}
                    transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
                    className="mx-auto mt-6 h-px bg-[#a29d8b]"
                  />
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 1.35 }}
                    className="mt-5 text-sm text-[#77735f]"
                  >
                    البساطة تصنع الفرق
                  </motion.p>
                </div>

                <div className="relative z-10 flex items-end justify-between">
                  <span className="text-xs text-[#77735f]">اكتشف ما يناسبك</span>
                  <motion.span
                    animate={{ x: [0, -5, 0], y: [0, 5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block text-3xl text-[#77735f]"
                    aria-hidden="true"
                  >
                    ↙
                  </motion.span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: [0, -5, 0], scale: 1 }}
                transition={{
                  opacity: { duration: 0.7, delay: 1.1 },
                  scale: { duration: 0.7, delay: 1.1 },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.1 },
                }}
                className="absolute -bottom-5 -right-3 rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-lg sm:-right-6"
              >
                <p className="text-sm font-bold">مرحبًا بك في عائلتنا</p>
                <p className="mt-1 text-xs text-gray-500">تجربة تبدأ بك</p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="border-t border-black/5 bg-white"
        >
          <motion.div
            variants={staggerContainer}
            className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-10"
          >
            <motion.div variants={fadeUp}>
              <p className="text-xs font-semibold tracking-[0.2em] text-[#85816d]">
                OUR APPROACH
              </p>
              <h2 className="mt-3 text-2xl font-bold">تجربة تسوّق واضحة ومريحة</h2>
            </motion.div>
            <motion.p variants={fadeUp} className="max-w-xl leading-8 text-gray-600">
              نحرص على أن يكون اكتشاف المنتجات وقراءة تفاصيلها والوصول إلى
              اختيارك تجربة بسيطة ومنظمة، من أول زيارة وحتى إتمام طلبك.
            </motion.p>
          </motion.div>
        </motion.section>

        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="bg-[#252720] px-6 py-7 text-white"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <Link href="/" className="text-xl font-black tracking-[0.12em]">
              RIMOVA
            </Link>
            <p className="text-center text-sm text-white/60">
              © 2026 RIMOVA. جميع الحقوق محفوظة.
            </p>
          </div>
        </motion.footer>
      </main>
    </MotionConfig>
  );
}
