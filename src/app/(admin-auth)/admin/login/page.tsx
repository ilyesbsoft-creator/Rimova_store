"use client";

import { useState, type FormEvent } from "react";
import { motion, MotionConfig } from "motion/react";
import { useRouter } from "next/navigation";

const smoothTransition = {
  duration: 0.8,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 24,
  },
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
      delayChildren: 0.1,
    },
  },
};

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v3" />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a15 15 0 0 1-3.2 4.1" />
      <path d="M6.2 6.2C4.1 7.6 3 10 3 12s3.5 7 9 7c1 0 2-.2 2.9-.5" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);	
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState("");

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (isLoading) return;

  setIsLoading(true);
  setMessage("");

  try {
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        identifier: email.trim(),
        password,
        rememberMe,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(
        data.message || "تعذر تسجيل الدخول. تحقق من بياناتك وحاول مجددًا.",
      );
      return;
    }

    router.replace("/admin/dashboard");
    router.refresh();
  } catch {
    setMessage("حدث خطأ أثناء الاتصال بالخادم. حاول مجددًا.");
  } finally {
    setIsLoading(false);
  }
}

  return (
    <MotionConfig reducedMotion="user">
      <main
        dir="rtl"
        className="relative flex min-h-screen flex-col overflow-hidden bg-[#faf9f6] text-[#252720] selection:bg-[#dcd7c8] selection:text-[#252720]"
      >
        {/* Decorative background */}

        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#e9e5d9] blur-3xl"
        />

        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1.5, delay: 0.2 }}
          className="pointer-events-none absolute -bottom-48 -left-40 h-[450px] w-[450px] rounded-full bg-[#e5e1d5] blur-3xl"
        />

        {/* Header */}

        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={smoothTransition}
          className="relative z-10 border-b border-black/[0.06]"
        >
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
            <a
              href="/"
              aria-label="RIMOVA - الصفحة الرئيسية"
              className="text-2xl font-black tracking-[0.12em] transition-opacity hover:opacity-70 sm:text-3xl"
            >
              RIMOVA
            </a>

            <div className="flex items-center gap-2.5 rounded-full border border-black/[0.07] bg-white/60 px-3.5 py-2 sm:px-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#252720] text-white">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>

              <span className="text-xs font-semibold sm:text-sm">
                فضاء الإدارة
              </span>
            </div>
          </div>
        </motion.header>

        {/* Main content */}

        <section className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Login form */}

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="mx-auto w-full max-w-md"
            >
              <motion.div variants={fadeUp} className="mb-8">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e3dfd3] bg-white shadow-sm">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-7 w-7 text-[#77735f]"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <circle cx="9" cy="10" r="2.2" />
                    <path d="M5.5 16c.7-2 2-3 3.5-3s2.8 1 3.5 3M15 9h3M15 13h3" />
                  </svg>
                </div>

                <p className="mb-3 flex items-center gap-3 text-xs font-bold tracking-[0.16em] text-[#85816d]">
                  <span className="h-px w-8 bg-[#aaa58f]" />
                  RIMOVA ADMINISTRATION
                </p>

                <h1 className="text-3xl font-black leading-[1.5] tracking-tight sm:text-4xl">
                  مرحبًا بعودتك
                </h1>

                <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">
                  سجّل دخولك إلى حساب الإدارة لمتابعة متجرك وإدارة عملياته.
                </p>
              </motion.div>

              <motion.form
                variants={fadeUp}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Email */}

                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-2.5 block text-sm font-bold"
                  >
                    البريد الإلكتروني
                  </label>

                  <div className="group relative">
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#969181] transition-colors group-focus-within:text-[#252720]">
                      <MailIcon />
                    </span>

                    <input
                      id="admin-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      dir="ltr"
                      placeholder="admin@rimova.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setMessage("");
                      }}
                      required
                      className="h-14 w-full rounded-xl border border-[#e4e1d8] bg-white/80 pe-12 ps-4 text-left text-sm outline-none transition-all placeholder:text-gray-400 hover:border-[#c9c4b5] focus:border-[#85816d] focus:bg-white focus:ring-4 focus:ring-[#85816d]/10"
                    />
                  </div>
                </div>

                {/* Password */}

                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <label
                      htmlFor="admin-password"
                      className="text-sm font-bold"
                    >
                      كلمة المرور
                    </label>

                    <span className="text-xs text-gray-400">
                      بيانات حسابك الخاصة
                    </span>
                  </div>

                  <div className="group relative">
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#969181] transition-colors group-focus-within:text-[#252720]">
                      <LockIcon />
                    </span>

                    <input
                      id="admin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      dir="ltr"
                      placeholder="أدخل كلمة المرور"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setMessage("");
                      }}
                      required
                      className="h-14 w-full rounded-xl border border-[#e4e1d8] bg-white/80 pe-12 ps-12 text-left text-sm outline-none transition-all placeholder:text-gray-400 hover:border-[#c9c4b5] focus:border-[#85816d] focus:bg-white focus:ring-4 focus:ring-[#85816d]/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                      }
                      aria-pressed={showPassword}
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#f3f1eb] hover:text-[#252720] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#85816d]"
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                </div>

                {/* Remember me */}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-[#252720]"
                    />
                    تذكرني
                  </label>

                  <span className="text-xs text-gray-400">
                    دخول مخصص للمخولين
                  </span>
                </div>

                {/* Status message */}

                {message && (
                  <motion.div
                    role="status"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#e4dfd1] bg-[#f1eee5] px-4 py-3 text-sm leading-6 text-[#625d4d]"
                  >
                    {message}
                  </motion.div>
                )}

                {/* Submit */}
<motion.button
  type="submit"
  disabled={isLoading}
  whileHover={
    !isLoading
      ? {
          y: -2,
          backgroundColor: "#414438",
          boxShadow: "0 12px 28px rgba(37,39,32,0.12)",
        }
      : undefined
  }
  whileTap={!isLoading ? { scale: 0.985 } : undefined}
  transition={{ duration: 0.25 }}
  className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#252720] px-5 font-bold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85816d]/25 disabled:cursor-not-allowed disabled:opacity-60"
>
  {isLoading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}

  <motion.span
    aria-hidden="true"
    className="inline-flex"
    whileHover={!isLoading ? { x: -4 } : undefined}
    transition={{ duration: 0.2 }}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  </motion.span>
</motion.button>
              </motion.form>

              {/* Security note */}

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mt-7 flex items-start gap-3 rounded-xl border border-black/[0.05] bg-white/50 p-4"
              >
                <span className="mt-0.5 text-[#85816d]">
                  <LockIcon />
                </span>

                <div>
                  <p className="text-xs font-bold text-[#44453d]">
                    مساحة إدارية خاصة
                  </p>

                  <p className="mt-1 text-xs leading-6 text-gray-500">
                    الدخول مخصص لحسابات الإدارة المعتمدة. لا تشارك بيانات
                    تسجيل الدخول مع أي شخص آخر.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* Brand panel */}

            <motion.aside
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...smoothTransition, delay: 0.15 }}
              className="relative hidden w-full lg:block"
            >
              <motion.div
                whileHover={{
                  boxShadow: "0 30px 70px rgba(37,39,32,0.10)",
                }}
                transition={{ duration: 0.5 }}
                className="relative flex min-h-[570px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#e9e6dd] p-9 xl:p-12"
              >
                {/* Decorative rings */}

                <motion.div
                  aria-hidden="true"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 100,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="pointer-events-none absolute -left-28 top-28 h-80 w-80 rounded-full border border-[#b5b09f]/70"
                />

                <motion.div
                  aria-hidden="true"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 80,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="pointer-events-none absolute -left-12 top-44 h-60 w-60 rounded-full border border-[#b5b09f]/70"
                />

                <motion.div
                  aria-hidden="true"
                  animate={{
                    y: [0, -12, 0],
                    scale: [1, 1.03, 1],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#d4d0c3]"
                />

                {/* Panel header */}

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.25em] text-[#77735f]">
                    RIMOVA / MANAGEMENT
                  </span>

                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: 180 }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    }}
                    className="text-3xl text-[#77735f]"
                  >
                    ✳
                  </motion.span>
                </div>

                {/* Main typography */}

                <div className="relative z-10 py-12 text-center">
                  <motion.p
                    initial={{ opacity: 0, letterSpacing: "0.1em" }}
                    animate={{ opacity: 1, letterSpacing: "0.28em" }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="text-xs text-[#77735f]"
                  >
                    YOUR STORE. YOUR VISION.
                  </motion.p>

                  <motion.h2
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...smoothTransition, delay: 0.3 }}
                    className="mt-6 text-5xl font-black tracking-[0.12em] xl:text-6xl"
                  >
                    RIMOVA
                  </motion.h2>

                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 64 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                    className="mx-auto mt-7 h-px bg-[#a29d8b]"
                  />

                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.8 }}
                    className="mt-6 text-lg font-semibold text-[#555448]"
                  >
                    كل التفاصيل في مكان واحد
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1 }}
                    className="mx-auto mt-4 max-w-xs text-sm leading-8 text-[#77735f]"
                  >
                    مساحة عمل منظمة لإدارة المنتجات والطلبات ومتابعة نمو
                    متجرك بكل بساطة.
                  </motion.p>
                </div>

                {/* Panel footer */}

                <div className="relative z-10 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#45463c]">
                      البساطة تصنع الفرق
                    </p>

                    <p className="mt-2 text-xs text-[#77735f]">
                      RIMOVA ADMINISTRATION
                    </p>
                  </div>

                  <motion.span
                    aria-hidden="true"
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="text-3xl text-[#77735f]"
                  >
                    ↙
                  </motion.span>
                </div>
              </motion.div>

              {/* Floating badge */}

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: [0, -4, 0] }}
                transition={{
                  opacity: { duration: 0.7, delay: 0.8 },
                  y: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.8,
                  },
                }}
                className="absolute -bottom-5 -right-5 rounded-2xl border border-black/[0.05] bg-white px-5 py-4 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0eee7] text-[#77735f]">
                    <LockIcon />
                  </span>

                  <div>
                    <p className="text-sm font-bold">إدارة بثقة</p>
                    <p className="mt-1 text-xs text-gray-500">
                      مساحة مخصصة لفريقك
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.aside>
          </div>
        </section>

        {/* Footer */}

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-10 border-t border-black/[0.06] bg-white/40 px-5 py-5"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
            <a
              href="/"
              className="text-sm font-black tracking-[0.12em] transition-opacity hover:opacity-60"
            >
              RIMOVA
            </a>

            <p className="text-center text-xs leading-6 text-gray-500">
              © 2026 RIMOVA. جميع الحقوق محفوظة.
            </p>

            <span className="text-xs text-gray-400">
              فضاء الإدارة
            </span>
          </div>
        </motion.footer>
      </main>
    </MotionConfig>
  );
}
