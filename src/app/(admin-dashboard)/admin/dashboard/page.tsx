
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";

type Period = "today" | "week" | "month" | "year";

type Order = {
  id: string;
  customer: string;
  date: string;
  amount: number;
  status: "completed" | "pending" | "processing" | "cancelled";
};

const periods: { label: string; value: Period }[] = [
  { label: "اليوم", value: "today" },
  { label: "7 أيام", value: "week" },
  { label: "30 يومًا", value: "month" },
  { label: "هذا العام", value: "year" },
];

const statistics = [
  {
    title: "إجمالي المبيعات",
    value: "1,284,500",
    unit: "دج",
    change: "+12.8%",
    positive: true,
    icon: "wallet",
    description: "مقارنة بالفترة السابقة",
  },
  {
    title: "إجمالي الطلبات",
    value: "248",
    unit: "طلب",
    change: "+8.4%",
    positive: true,
    icon: "shopping",
    description: "مقارنة بالفترة السابقة",
  },
  {
    title: "العملاء",
    value: "1,642",
    unit: "عميل",
    change: "+5.2%",
    positive: true,
    icon: "users",
    description: "مقارنة بالفترة السابقة",
  },
  {
    title: "متوسط قيمة الطلب",
    value: "5,179",
    unit: "دج",
    change: "-2.1%",
    positive: false,
    icon: "chart",
    description: "مقارنة بالفترة السابقة",
  },
];

const orders: Order[] = [
  {
    id: "#RM-10248",
    customer: "محمد أمين",
    date: "30 أكتوبر 2026",
    amount: 12500,
    status: "processing",
  },
  {
    id: "#RM-10247",
    customer: "سارة بن عيسى",
    date: "30 أكتوبر 2026",
    amount: 8400,
    status: "pending",
  },
  {
    id: "#RM-10246",
    customer: "ياسين قادري",
    date: "29 أكتوبر 2026",
    amount: 15800,
    status: "completed",
  },
  {
    id: "#RM-10245",
    customer: "نور الهدى",
    date: "29 أكتوبر 2026",
    amount: 6200,
    status: "completed",
  },
  {
    id: "#RM-10244",
    customer: "عبد الرحمن",
    date: "28 أكتوبر 2026",
    amount: 9700,
    status: "cancelled",
  },
];

const products = [
  {
    name: "منتج تجريبي أول",
    category: "الفئة الأولى",
    sales: 86,
    percentage: 86,
    price: "4,500 دج",
  },
  {
    name: "منتج تجريبي ثانٍ",
    category: "الفئة الثانية",
    sales: 72,
    percentage: 72,
    price: "3,800 دج",
  },
  {
    name: "منتج تجريبي ثالث",
    category: "الفئة الأولى",
    sales: 58,
    percentage: 58,
    price: "6,200 دج",
  },
  {
    name: "منتج تجريبي رابع",
    category: "الفئة الثالثة",
    sales: 41,
    percentage: 41,
    price: "2,900 دج",
  },
];

const chartData: Record<
  Period,
  { labels: string[]; values: number[]; previous: number[] }
> = {
  today: {
    labels: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
    values: [12, 25, 19, 48, 37, 72, 62],
    previous: [8, 18, 15, 31, 28, 43, 39],
  },
  week: {
    labels: ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"],
    values: [24, 39, 32, 65, 48, 82, 71],
    previous: [18, 29, 25, 43, 39, 58, 52],
  },
  month: {
    labels: ["1", "5", "10", "15", "20", "25", "30"],
    values: [28, 42, 35, 70, 56, 88, 76],
    previous: [20, 31, 29, 48, 41, 63, 54],
  },
  year: {
    labels: ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر"],
    values: [32, 45, 39, 62, 54, 73, 65, 84, 72, 94],
    previous: [22, 34, 31, 48, 42, 57, 51, 66, 60, 75],
  },
};

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<string, React.ReactNode> = {
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M3 9h18M16 15h2" />
        <path d="M7 5V3h10v2" />
      </>
    ),
    shopping: (
      <>
        <path d="M5 4h14l1 17H4L5 4Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0M16 5a4 4 0 0 1 0 7m2 3a6 6 0 0 1 4 6" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 3 6-7" />
      </>
    ),
    arrow: <path d="m7 14 5-5 5 5" />,
    down: <path d="m7 10 5 5 5-5" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    package: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="M3 8v8l9 5 9-5V8M12 13v8" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
  };

  return <svg {...common} aria-hidden="true">{paths[name] ?? null}</svg>;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("en-US")} دج`;
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const config = {
    completed: {
      label: "مكتمل",
      className: "bg-[#e9f2e9] text-[#557653]",
      dot: "bg-[#6b9468]",
    },
    pending: {
      label: "قيد الانتظار",
      className: "bg-[#f5efe1] text-[#a17d45]",
      dot: "bg-[#bd995e]",
    },
    processing: {
      label: "قيد المعالجة",
      className: "bg-[#e9edf3] text-[#637b9a]",
      dot: "bg-[#7891b2]",
    },
    cancelled: {
      label: "ملغي",
      className: "bg-[#f5e9e7] text-[#a56c63]",
      dot: "bg-[#b47b71]",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10px] font-bold ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function SalesChart({ period }: { period: Period }) {
  const data = chartData[period];

  const width = 700;
  const height = 245;
  const paddingX = 12;
  const paddingY = 16;
  const usableHeight = height - paddingY * 2;
  const usableWidth = width - paddingX * 2;

  const getPoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x =
          paddingX +
          (index / (values.length - 1)) * usableWidth;
        const y = height - paddingY - (value / 100) * usableHeight;
        return `${x},${y}`;
      })
      .join(" ");

  const currentPoints = getPoints(data.values);
  const previousPoints = getPoints(data.previous);

  const firstPoint = currentPoints.split(" ")[0];
//  const lastPoint = currentPoints.split(" ").at(-1);

  const areaPath = `M ${firstPoint} L ${currentPoints
    .split(" ")
    .slice(1)
    .join(" L ")} L ${width - paddingX},${height - paddingY} L ${paddingX},${height - paddingY} Z`;

  return (
    <div className="mt-5">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-7 pt-1">
          {[100, 75, 50, 25, 0].map((value) => (
            <div
              key={value}
              className="flex items-center gap-3"
            >
              <span className="w-7 text-[9px] tabular-nums text-gray-400">
                {value}
              </span>
              <div className="h-px flex-1 border-t border-dashed border-[#e9e7df]" />
            </div>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="relative z-10 h-[230px] w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label="مخطط توضيحي للمبيعات"
        >
          <defs>
            <linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#85816d" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#85816d" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#sales-area)" />

          <polyline
            points={previousPoints}
            fill="none"
            stroke="#c9c5b9"
            strokeWidth="2"
            strokeDasharray="5 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          <polyline
            points={currentPoints}
            fill="none"
            stroke="#77735f"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {data.values.map((value, index) => {
            const x =
              paddingX +
              (index / (data.values.length - 1)) * usableWidth;
            const y = height - paddingY - (value / 100) * usableHeight;

            return (
              <g key={`${data.labels[index]}-${value}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill="#fff"
                  stroke="#77735f"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mr-10 mt-1 flex justify-between">
        {data.labels.map((label) => (
          <span
            key={label}
            className="text-[9px] text-gray-400 sm:text-[10px]"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesFilter =
        orderFilter === "all" || order.status === orderFilter;

      const matchesSearch =
        order.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.customer.toLowerCase().includes(orderSearch.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [orderFilter, orderSearch]);

  return (
    <div className="space-y-7">
      {/* Demo notice */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#e8dfc9] bg-[#f5f0e3] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-[#8b7958]">
            <Icon name="clock" size={15} />
          </span>
          <p className="text-xs font-semibold text-[#74664d]">
            أنت تعرض الآن نسخة تجريبية من لوحة التحكم.
          </p>
        </div>
        <span className="text-[10px] font-bold tracking-wide text-[#9b8967]">
          DEMO DATA
        </span>
      </div>

      {/* Page title */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-[0.15em] text-[#85816d]">
            OVERVIEW / 01
          </p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            مرحبًا بك في لوحة التحكم
          </h1>
          <p className="mt-2 text-xs leading-6 text-gray-500 sm:text-sm">
            إليك نظرة عامة على أداء متجرك ونشاطه.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-black/[0.07] bg-white px-3.5 py-2.5">
          <span className="text-[#85816d]">
            <Icon name="calendar" size={17} />
          </span>
          <span className="text-xs font-semibold text-gray-600">
            الجمعة، 30 أكتوبر 2026
          </span>
        </div>
      </motion.section>

      {/* Statistics */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">ملخص المتجر</h2>
            <p className="mt-1 text-[11px] text-gray-400">
              أهم مؤشرات الأداء
            </p>
          </div>
          <span className="rounded-lg bg-white px-3 py-2 text-[10px] text-gray-500 ring-1 ring-black/[0.06]">
            بيانات تجريبية
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statistics.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.07 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-black/[0.055] bg-white p-5 shadow-[0_3px_15px_rgba(37,39,32,0.025)] transition-shadow hover:shadow-[0_10px_30px_rgba(37,39,32,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  {item.title}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f0e9] text-[#77735f]">
                  <Icon name={item.icon} size={19} />
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight tabular-nums">
                  {item.value}
                </span>
                <span className="text-[10px] text-gray-400">
                  {item.unit}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${
                    item.positive
                      ? "bg-[#edf3eb] text-[#64805d]"
                      : "bg-[#f7ece9] text-[#a46d62]"
                  }`}
                >
                  {item.positive ? (
                    <Icon name="arrow" size={12} />
                  ) : (
                    <Icon name="down" size={12} />
                  )}
                  {item.change}
                </span>
                <span className="text-[10px] text-gray-400">
                  {item.description}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sales chart and summary */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
        <div className="min-w-0 rounded-2xl border border-black/[0.055] bg-white p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold">تحليل المبيعات</h2>
              <p className="mt-1 text-[11px] text-gray-400">
                مقارنة أداء المبيعات خلال الفترة المحددة
              </p>
            </div>

            <div className="flex flex-wrap gap-1 rounded-xl bg-[#f5f3ed] p-1">
              {periods.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-bold transition ${
                    period === item.value
                      ? "bg-[#252720] text-white shadow-sm"
                      : "text-gray-500 hover:text-[#252720]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-gray-400">إجمالي المبيعات</p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                428,650 <span className="text-xs font-medium text-gray-400">دج</span>
              </p>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#77735f]" />
                الفترة الحالية
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-[#c9c5b9]" />
                الفترة السابقة
              </span>
            </div>
          </div>

          <SalesChart period={period} />
        </div>

        {/* Quick summary */}
        <div className="flex flex-col gap-5">
          <div className="flex-1 rounded-2xl bg-[#252720] p-6 text-white">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white/65">
                معدل إتمام الطلبات
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#d4d0c3]">
                <Icon name="chart" size={18} />
              </span>
            </div>

            <div className="mt-7 flex items-end justify-between">
              <p className="text-4xl font-black tabular-nums">84.6%</p>
              <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] text-[#d9d5c8]">
                +4.2%
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[84.6%] rounded-full bg-[#b5b09f]" />
            </div>

            <p className="mt-3 text-[10px] leading-5 text-white/45">
              نسبة الطلبات المكتملة من إجمالي الطلبات التجريبية.
            </p>
          </div>

          <div className="rounded-2xl border border-black/[0.055] bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold">حالة الطلبات</p>
                <p className="mt-1 text-[10px] text-gray-400">
                  توزيع الطلبات التجريبية
                </p>
              </div>
              <span className="text-[#85816d]">
                <Icon name="shopping" size={19} />
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {[
                { label: "مكتملة", value: 145, percent: 58, color: "bg-[#81977a]" },
                { label: "قيد المعالجة", value: 54, percent: 22, color: "bg-[#8a9bb0]" },
                { label: "قيد الانتظار", value: 32, percent: 13, color: "bg-[#c2a575]" },
                { label: "ملغاة", value: 17, percent: 7, color: "bg-[#ba8880]" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-[10px]">
                    <span className="font-semibold text-gray-600">{item.label}</span>
                    <span className="tabular-nums text-gray-400">{item.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f0eb]">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent orders */}
      <section className="overflow-hidden rounded-2xl border border-black/[0.055] bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-black/[0.055] p-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-sm font-bold">أحدث الطلبات</h2>
            <p className="mt-1 text-[11px] text-gray-400">
              متابعة آخر العمليات المسجلة في المتجر
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="ابحث برقم الطلب أو العميل..."
              className="h-9 min-w-0 rounded-lg border border-black/[0.07] px-3 text-[11px] outline-none focus:border-[#85816d] sm:w-52"
            />

            <select
              value={orderFilter}
              onChange={(event) => setOrderFilter(event.target.value)}
              className="h-9 rounded-lg border border-black/[0.07] bg-white px-3 text-[11px] outline-none focus:border-[#85816d]"
              aria-label="تصفية الطلبات حسب الحالة"
            >
              <option value="all">كل الحالات</option>
              <option value="completed">مكتملة</option>
              <option value="processing">قيد المعالجة</option>
              <option value="pending">قيد الانتظار</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-right">
            <thead>
              <tr className="bg-[#faf9f6] text-[10px] text-gray-400">
                <th className="px-6 py-4 font-semibold">رقم الطلب</th>
                <th className="px-6 py-4 font-semibold">العميل</th>
                <th className="px-6 py-4 font-semibold">التاريخ</th>
                <th className="px-6 py-4 font-semibold">المبلغ</th>
                <th className="px-6 py-4 font-semibold">الحالة</th>
                <th className="px-6 py-4 font-semibold">الإجراء</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.045]">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="text-xs transition hover:bg-[#faf9f6]"
                >
                  <td className="px-6 py-4 font-bold text-[#77735f]">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {order.customer}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {order.date}
                  </td>
                  <td className="px-6 py-4 font-bold tabular-nums">
                    {formatCurrency(order.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      title="عرض تفاصيل الطلب - سيتم تفعيله لاحقًا"
                      disabled
                      className="rounded-lg p-2 text-gray-400 opacity-50"
                    >
                      <Icon name="more" size={18} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-xs text-gray-400"
                  >
                    لا توجد طلبات تطابق البحث أو الفلتر المحدد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-black/[0.055] px-6 py-4">
          <p className="text-[10px] text-gray-400">
            عرض {filteredOrders.length} من {orders.length} طلبات تجريبية
          </p>
          <span className="text-[10px] font-semibold text-[#85816d]">
            DEMO
          </span>
        </div>
      </section>

      {/* Best selling products */}
      <section className="rounded-2xl border border-black/[0.055] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">المنتجات الأكثر مبيعًا</h2>
            <p className="mt-1 text-[11px] text-gray-400">
              ترتيب توضيحي للمنتجات حسب عدد المبيعات
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f0e9] text-[#77735f]">
            <Icon name="package" />
          </span>
        </div>

        <div className="mt-6 space-y-5">
          {products.map((product, index) => (
            <div
              key={product.name}
              className="flex items-center gap-3 sm:gap-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ed] text-xs font-black text-[#85816d]">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="truncate text-xs font-bold">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {product.category}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold tabular-nums">
                      {product.sales} مبيعة
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {product.price}
                    </p>
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f0eb]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${product.percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="h-full rounded-full bg-[#85816d]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-black/[0.055] pt-5 sm:flex-row">
        <p className="text-[10px] text-gray-400">
          © 2026 RIMOVA. جميع الحقوق محفوظة.
        </p>
        <p className="text-[10px] text-gray-400">
          RIMOVA ADMINISTRATION · DEMO VERSION
        </p>
      </footer>
    </div>
  );
}
