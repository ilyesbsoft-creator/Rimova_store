
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

type IconName =
  | "dashboard"
  | "products"
  | "orders"
  | "delivery"
  | "customers"
  | "reports"
  | "admins"
  | "settings"
  | "search"
  | "bell"
  | "menu"
  | "close"
  | "chevron"
  | "logout"
  | "user"
  | "external";

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" />
        <rect x="13" y="10" width="8" height="11" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
      </>
    ),
    products: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 8 9 5 9-5M3 16l9 5 9-5" />
        <path d="M3 8v8m18-8v8M12 13v8" />
      </>
    ),
    orders: (
      <>
        <path d="M5 4h14l1 17H4L5 4Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2M8 12h8" />
      </>
    ),
    delivery: (
      <>
        <path d="M3 6h12v12H3zM15 10h4l3 4v4h-7z" />
        <circle cx="7.5" cy="19" r="2" />
        <circle cx="18.5" cy="19" r="2" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a4 4 0 0 1 0 8m2 3a6 6 0 0 1 4 6" />
      </>
    ),
    reports: (
      <>
        <path d="M4 20V10m5 10V4m5 16v-7m5 7V7" />
        <path d="M2 21h20" />
      </>
    ),
    admins: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-2a7 7 0 0 1 14 0v2M19 8v6m-3-3h6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4L5 15a8 8 0 0 1 0-2l-1.4-1.1L5 9.5l1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6m0-6-9 9" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {paths[name]}
    </svg>
  );
}

const navigation = [
  {
    title: "القائمة الرئيسية",
    items: [
      { label: "الرئيسية", href: "/admin/dashboard", icon: "dashboard" as const },
    ],
  },
  {
    title: "إدارة المتجر",
    items: [
      { label: "المنتجات", href: "/admin/products", icon: "products" as const },
      { label: "الطلبات", href: "/admin/orders", icon: "orders" as const },
      { label: "التوصيل", href: "/admin/delivery", icon: "delivery" as const },
      { label: "العملاء", href: "/admin/customers", icon: "customers" as const },
    ],
  },
  {
    title: "الإدارة والتحليل",
    items: [
      { label: "التقارير", href: "/admin/reports", icon: "reports" as const },
      { label: "المسؤولون", href: "/admin/users", icon: "admins" as const },
      { label: "الإعدادات", href: "/admin/settings", icon: "settings" as const },
    ],
  },
];

type Admin = {
  username: string;
  email: string;
};

export default function AdminShell({
  children,
  admin,
}: {
  children: ReactNode;
  admin: Admin;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));

async function handleLogout() {
  if (loggingOut) return;

  setLoggingOut(true);

  try {
    const response = await fetch("/api/admin/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Logout failed.");
    }

    router.replace("/admin/login");
    router.refresh();
  } catch (error) {
    console.error("[AdminShell] Logout error:", error);
    setLoggingOut(false);
  }
}

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#faf9f6] text-[#252720]"
    >
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            type="button"
            aria-label="إغلاق القائمة"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{
          width: collapsed ? 88 : 270,
          x: sidebarOpen ? 0 : undefined,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={`fixed inset-y-0 right-0 z-50 flex flex-col border-l border-black/[0.06] bg-white ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } lg:translate-x-0`}
        style={{ width: collapsed ? 88 : 270 }}
      >
        {/* Brand */}
        <div className="flex h-[82px] shrink-0 items-center justify-between border-b border-black/[0.06] px-6">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#252720] text-sm font-black tracking-wider text-white">
              R
            </span>

            {!collapsed && (
              <span className="text-xl font-black tracking-[0.13em]">
                RIMOVA
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-400 hover:bg-[#f4f2ec] lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-7">
          {navigation.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.13em] text-[#a09c8e]">
                  {group.title}
                </p>
              )}

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all ${
                        active
                          ? "bg-[#252720] text-white shadow-sm"
                          : "text-[#77776e] hover:bg-[#f5f3ed] hover:text-[#252720]"
                      }`}
                    >
                      <Icon name={item.icon} size={19} />
                      {!collapsed && <span>{item.label}</span>}
                      {active && !collapsed && (
                        <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[#d7d1bd]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t border-black/[0.06] p-4">
          <div className="rounded-2xl bg-[#f5f3ed] p-3">
            {!collapsed ? (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#77735f]">
                    <Icon name="user" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{admin.username}</p>
                    <p className="mt-1 text-[10px] text-gray-500">
                      RIMOVA Management
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] leading-5 text-gray-500">
                  لوحة تحكم متجرك في مكان واحد.
                </p>
              </>
            ) : (
              <div className="flex justify-center text-[#77735f]">
                <Icon name="user" />
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main area */}
      <div
        className={`min-h-screen transition-[margin] duration-300 ${
          collapsed ? "lg:mr-[88px]" : "lg:mr-[270px]"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[82px] items-center justify-between gap-4 border-b border-black/[0.06] bg-[#faf9f6]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-black/[0.07] bg-white p-2.5 text-[#55564e] lg:hidden"
              aria-label="فتح القائمة"
            >
              <Icon name="menu" />
            </button>

            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="hidden rounded-xl border border-black/[0.07] bg-white p-2.5 text-[#77735f] transition hover:bg-[#f4f2ec] lg:flex"
              aria-label="طي القائمة الجانبية"
            >
              <Icon name="menu" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold sm:text-base">
                لوحة الإدارة
              </p>
              <p className="mt-1 hidden text-[11px] text-gray-400 sm:block">
                RIMOVA / MANAGEMENT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative hidden w-52 md:block xl:w-64">
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="search" size={17} />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث في لوحة الإدارة..."
                className="h-10 w-full rounded-xl border border-black/[0.07] bg-white pr-10 pl-3 text-xs outline-none transition focus:border-[#85816d] focus:ring-4 focus:ring-[#85816d]/10"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  setProfileOpen(false);
                }}
                aria-label="الإشعارات"
                aria-expanded={notificationsOpen}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.07] bg-white text-[#77735f] transition hover:bg-[#f4f2ec]"
              >
                <Icon name="bell" size={19} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#a17d55]" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute left-0 top-14 z-50 w-72 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-xl sm:w-80"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">الإشعارات</p>
                      <span className="rounded-full bg-[#f1eee5] px-2 py-1 text-[10px] text-[#77735f]">
                        تجريبي
                      </span>
                    </div>
                    <div className="mt-4 rounded-xl bg-[#f8f7f3] p-3">
                      <p className="text-xs font-semibold">
                        ستظهر إشعارات الطلبات والتحديثات هنا
                      </p>
                      <p className="mt-2 text-[11px] leading-5 text-gray-400">
                        سيتم ربط مركز الإشعارات بالنظام لاحقًا.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
                aria-expanded={profileOpen}
                className="flex h-10 items-center gap-2 rounded-xl border border-black/[0.07] bg-white px-2.5 transition hover:bg-[#f4f2ec] sm:px-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#252720] text-white">
                  <Icon name="user" size={15} />
                </span>
                <span className="hidden text-xs font-bold sm:block">
                  {admin.username}
                </span>
                <span className="hidden text-gray-400 sm:block">
                  <Icon name="chevron" size={14} />
                </span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 top-14 z-50 w-52 rounded-2xl border border-black/[0.07] bg-white p-2 shadow-xl"
                  >
                    <div className="border-b border-black/[0.06] px-3 py-3">
                      <p className="text-xs font-bold">حساب المسؤول</p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        RIMOVA Administration
                      </p>
                    </div>
                    <Link
                      href="/admin/settings"
                      onClick={() => setProfileOpen(false)}
                      className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-gray-600 hover:bg-[#f5f3ed]"
                    >
                      <Icon name="settings" size={16} />
                      الإعدادات
                    </Link>
<button
  type="button"
  onClick={handleLogout}
  disabled={loggingOut}
  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
>
  <Icon name="logout" size={16} />
  {loggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
