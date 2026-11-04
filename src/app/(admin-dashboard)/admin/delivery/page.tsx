
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type Tab = "companies" | "offices" | "rates";
type RateType = "HOME" | "OFFICE";
type ModalType = "company" | "office" | "rate" | null;

type DeliveryCompany = {
  id: string;
  name: string;
  phone: string | null;
  website_url: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
};

type Wilaya = {
  id: string;
  code: string;
  name: string;
};

type Commune = {
  id: string;
  wilaya_id: string;
  code: string | null;
  name: string;
};

type DeliveryOffice = {
  id: string;
  delivery_company_id: string;
  commune_id: string;
  external_office_id: string | null;
  name: string;
  address: string;
  phone: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
};

type DeliveryRate = {
  id: string;
  delivery_company_id: string;
  wilaya_id: string;
  price: string | number;
  is_active: boolean | number;
  updated_at?: string;
};

type CompanyForm = {
  name: string;
  phone: string;
  website_url: string;
  is_active: boolean;
};

type OfficeForm = {
  delivery_company_id: string;
  wilaya_id: string;
  commune_id: string;
  external_office_id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
};

type RateForm = {
  delivery_company_id: string;
  wilaya_id: string;
  price: string;
  is_active: boolean;
};

type ApiResponse<T> = {
  data?: T;
  message?: string;
  code?: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const API = "/api/admin/delivery";

const EMPTY_COMPANY_FORM: CompanyForm = {
  name: "",
  phone: "",
  website_url: "",
  is_active: false,
};

const EMPTY_OFFICE_FORM: OfficeForm = {
  delivery_company_id: "",
  wilaya_id: "",
  commune_id: "",
  external_office_id: "",
  name: "",
  address: "",
  phone: "",
  is_active: true,
};

const EMPTY_RATE_FORM: RateForm = {
  delivery_company_id: "",
  wilaya_id: "",
  price: "",
  is_active: true,
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const isActive = (value: boolean | number | undefined) =>
  value === true || value === 1;

const formatPrice = (value: string | number) =>
  `${Number(value).toLocaleString("fr-DZ")} دج`;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "حدث خطأ غير متوقع.";

/* =========================================================
   API HELPERS
========================================================= */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  let result: ApiResponse<T> | null = null;

  try {
    result = await response.json();
  } catch {
    throw new Error("تعذر قراءة استجابة الخادم.");
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.code ||
        `حدث خطأ أثناء تنفيذ الطلب (${response.status}).`
    );
  }

  return result?.data as T;
}

function queryString(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 6h11v11H3z" />
          <path d="M14 10h4l3 3v4h-7z" />
          <circle cx="7.5" cy="18" r="1.5" />
          <circle cx="17.5" cy="18" r="1.5" />
        </svg>
      );

    case "building":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 7h2M14 7h2M9 11h2M14 11h2M10 21v-5h4v5" />
        </svg>
      );

    case "map":
      return (
        <svg {...common}>
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );

    case "wallet":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="15" rx="2" />
          <path d="M3 9h18M16 14h2" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11z" />
        </svg>
      );

    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m7 10 5 5 5-5" />
        </svg>
      );

    case "phone":
      return (
        <svg {...common}>
          <path d="M7 3h3l2 5-2 1.5a14 14 0 0 0 4.5 4.5L16 12l5 2v3c0 1.1-.9 2-2 2C10 19 5 14 5 5c0-1.1.9-2 2-2z" />
        </svg>
      );

    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );

    default:
      return null;
  }
}

function StatusBadge({
  active,
  activeText = "نشط",
  inactiveText = "غير نشط",
}: {
  active: boolean;
  activeText?: string;
  inactiveText?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        active
          ? "bg-[#e8f3e9] text-[#367447]"
          : "bg-[#f1efeb] text-[#85816d]"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-[#4c9460]" : "bg-[#aaa596]"
        )}
      />
      {active ? activeText : inactiveText}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-[#252720] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3b3e35] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e9e6dd] bg-white px-4 py-2.5 text-sm font-semibold text-[#55564d] transition hover:bg-[#faf9f6] disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[#34362e]">
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#999589]">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#e9e6dd] bg-white px-3.5 py-3 text-sm text-[#252720] outline-none transition placeholder:text-[#aaa69a] focus:border-[#85816d] focus:ring-2 focus:ring-[#85816d]/10";

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f1eb] text-[#85816d]">
        <Icon name="truck" className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-[#34362e]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#999589]">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-[#85816d]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#e9e6dd] border-t-[#85816d]" />
      جارٍ تحميل البيانات...
    </div>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#171812]/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        dir="rtl"
        className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-[#e9e6dd] bg-[#faf9f6] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#e9e6dd] bg-white px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-[#252720]">{title}</h2>
            <p className="mt-1 text-sm text-[#999589]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#85816d] transition hover:bg-[#f3f1eb]"
            aria-label="إغلاق"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function DeliveryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("companies");
  const [rateType, setRateType] = useState<RateType>("HOME");

  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [offices, setOffices] = useState<DeliveryOffice[]>([]);
  const [homeRates, setHomeRates] = useState<DeliveryRate[]>([]);
  const [officeRates, setOfficeRates] = useState<DeliveryRate[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [wilayaFilter, setWilayaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modal, setModal] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [companyForm, setCompanyForm] =
    useState<CompanyForm>(EMPTY_COMPANY_FORM);

  const [officeForm, setOfficeForm] =
    useState<OfficeForm>(EMPTY_OFFICE_FORM);

  const [rateForm, setRateForm] =
    useState<RateForm>(EMPTY_RATE_FORM);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [companyData, wilayaData] = await Promise.all([
        apiRequest<DeliveryCompany[]>(`${API}/companies`),
        apiRequest<Wilaya[]>(`${API}/wilayas`),
      ]);

      const safeCompanies = companyData ?? [];
      const safeWilayas = wilayaData ?? [];

      setCompanies(safeCompanies);
      setWilayas(safeWilayas);

      const [
        communeData,
        officeData,
        homeRateData,
        officeRateData,
      ] = await Promise.all([
        safeWilayas.length
          ? apiRequest<Commune[]>(
              `${API}/communes${queryString({
                wilaya_ids: safeWilayas.map((item) => item.id).join(","),
              })}`
            )
          : Promise.resolve([]),

        apiRequest<DeliveryOffice[]>(`${API}/offices`),
        apiRequest<DeliveryRate[]>(`${API}/home-rates`),
        apiRequest<DeliveryRate[]>(`${API}/office-rates`),
      ]);

      setCommunes(communeData ?? []);
      setOffices(officeData ?? []);
      setHomeRates(homeRateData ?? []);
      setOfficeRates(officeRateData ?? []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const notifySuccess = (message: string) => {
    setSuccess(message);
    setError("");
    window.setTimeout(() => setSuccess(""), 4000);
  };

  const notifyError = (message: string) => {
    setError(message);
    setSuccess("");
  };

  /* =======================================================
     LOOKUPS
  ======================================================= */

  const companyById = useMemo(
    () => new Map(companies.map((item) => [item.id, item])),
    [companies]
  );

  const wilayaById = useMemo(
    () => new Map(wilayas.map((item) => [item.id, item])),
    [wilayas]
  );

  const communeById = useMemo(
    () => new Map(communes.map((item) => [item.id, item])),
    [communes]
  );

  const getCompanyName = (id: string) =>
    companyById.get(id)?.name ?? "شركة غير معروفة";

  const getWilayaName = (id: string) =>
    wilayaById.get(id)?.name ?? "ولاية غير معروفة";

  const getCommuneName = (id: string) =>
    communeById.get(id)?.name ?? "بلدية غير معروفة";


  const activeCompanies = companies.filter((item) =>
    isActive(item.is_active)
  );

  const activeCompany = activeCompanies[0];

  const filteredOffices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return offices.filter((office) => {
      const companyMatch =
        companyFilter === "all" ||
        office.delivery_company_id === companyFilter;

      const commune = communeById.get(office.commune_id);
      const wilayaMatch =
        wilayaFilter === "all" ||
        commune?.wilaya_id === wilayaFilter;

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive(office.is_active)) ||
        (statusFilter === "inactive" && !isActive(office.is_active));

      const textMatch =
        !term ||
        [
          office.name,
          office.address,
          office.phone ?? "",
          getCompanyName(office.delivery_company_id),
          commune?.name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return companyMatch && wilayaMatch && statusMatch && textMatch;
    });
  }, [
    offices,
    search,
    companyFilter,
    wilayaFilter,
    statusFilter,
    communeById,
    companyById,
  ]);

  const currentRates =
    rateType === "HOME" ? homeRates : officeRates;

  const filteredRates = useMemo(() => {
    const term = search.trim().toLowerCase();

    return currentRates.filter((rate) => {
      const companyMatch =
        companyFilter === "all" ||
        rate.delivery_company_id === companyFilter;

      const wilayaMatch =
        wilayaFilter === "all" || rate.wilaya_id === wilayaFilter;

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive(rate.is_active)) ||
        (statusFilter === "inactive" && !isActive(rate.is_active));

      const textMatch =
        !term ||
        [
          getCompanyName(rate.delivery_company_id),
          getWilayaName(rate.wilaya_id),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return companyMatch && wilayaMatch && statusMatch && textMatch;
    });
  }, [
    currentRates,
    search,
    companyFilter,
    wilayaFilter,
    statusFilter,
    companyById,
    wilayaById,
  ]);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();

    return companies.filter((company) => {
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive(company.is_active)) ||
        (statusFilter === "inactive" && !isActive(company.is_active));

      const textMatch =
        !term ||
        [company.name, company.phone ?? "", company.website_url ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return statusMatch && textMatch;
    });
  }, [companies, search, statusFilter]);

  const officeCommunes = useMemo(
    () =>
      communes.filter(
        (commune) => commune.wilaya_id === officeForm.wilaya_id
      ),
    [communes, officeForm.wilaya_id]
  );

  /* =======================================================
     MODAL HELPERS
  ======================================================= */

  const closeModal = () => {

    setModal(null);
    setEditingId(null);
    setCompanyForm(EMPTY_COMPANY_FORM);
    setOfficeForm(EMPTY_OFFICE_FORM);
    setRateForm(EMPTY_RATE_FORM);
  };

  const openCreateCompany = () => {
    setEditingId(null);
    setCompanyForm(EMPTY_COMPANY_FORM);
    setModal("company");
  };

  const openEditCompany = (company: DeliveryCompany) => {
    setEditingId(company.id);
    setCompanyForm({
      name: company.name,
      phone: company.phone ?? "",
      website_url: company.website_url ?? "",
      is_active: isActive(company.is_active),
    });
    setModal("company");
  };

  const openCreateOffice = () => {
    setEditingId(null);
    setOfficeForm({
      ...EMPTY_OFFICE_FORM,
      delivery_company_id: activeCompany?.id ?? companies[0]?.id ?? "",
    });
    setModal("office");
  };

const openEditOffice = (office: DeliveryOffice) => {
  const commune = communeById.get(office.commune_id);

  setEditingId(office.id);
  setOfficeForm({
    delivery_company_id: office.delivery_company_id,
    wilaya_id: commune?.wilaya_id ?? "",
    commune_id: office.commune_id,
    external_office_id: office.external_office_id ?? "",
    name: office.name,
    address: office.address,
    phone: office.phone ?? "",
    is_active: isActive(office.is_active),
  });
  setModal("office");
};

  const openCreateRate = () => {
    setEditingId(null);
    setRateForm({
      ...EMPTY_RATE_FORM,
      delivery_company_id: activeCompany?.id ?? companies[0]?.id ?? "",
    });
    setModal("rate");
  };

  const openEditRate = (rate: DeliveryRate) => {
    setEditingId(rate.id);
    setRateForm({
      delivery_company_id: rate.delivery_company_id,
      wilaya_id: rate.wilaya_id,
      price: String(rate.price),
      is_active: isActive(rate.is_active),
    });
    setModal("rate");
  };

  /* =======================================================
     SAVE COMPANY
  ======================================================= */

  const saveCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyForm.name.trim()) {
      notifyError("يرجى إدخال اسم شركة التوصيل.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: companyForm.name.trim(),
        phone: companyForm.phone.trim() || null,
        website_url: companyForm.website_url.trim() || null,
        is_active: companyForm.is_active,
      };

      if (editingId) {
        await apiRequest(
          `${API}/companies/${editingId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              name: payload.name,
              phone: payload.phone,
              website_url: payload.website_url,
            }),
          }
        );

        if (
          companyForm.is_active !==
          isActive(companies.find((item) => item.id === editingId)?.is_active)
        ) {
          await apiRequest(`${API}/companies/${editingId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: companyForm.is_active }),
          });
        }

        notifySuccess("تم تحديث بيانات شركة التوصيل بنجاح.");
      } else {
        await apiRequest(`${API}/companies`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        notifySuccess("تمت إضافة شركة التوصيل بنجاح.");
      }

      closeModal();
      await loadData();
    } catch (saveError) {
      notifyError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     SAVE OFFICE
  ======================================================= */

  const saveOffice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !officeForm.delivery_company_id ||
      !officeForm.commune_id ||
      !officeForm.name.trim() ||
      !officeForm.address.trim()
    ) {
      notifyError("يرجى إكمال الحقول المطلوبة للمكتب.");
      return;
    }

    setSaving(true);

    try {
const payload = {
  delivery_company_id: officeForm.delivery_company_id,
  commune_id: officeForm.commune_id,
  external_office_id: officeForm.external_office_id.trim() || null,
  name: officeForm.name.trim(),
  address: officeForm.address.trim(),
  phone: officeForm.phone.trim() || null,
  is_active: officeForm.is_active,
};

      if (editingId) {
        await apiRequest(`${API}/offices/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            commune_id: payload.commune_id,
			external_office_id: payload.external_office_id,
            name: payload.name,
            address: payload.address,
            phone: payload.phone,
            is_active: payload.is_active,
          }),
        });

        notifySuccess("تم تحديث بيانات المكتب بنجاح.");
      } else {
        await apiRequest(`${API}/offices`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        notifySuccess("تمت إضافة المكتب بنجاح.");
      }

      closeModal();
      await loadData();
    } catch (saveError) {
      notifyError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     SAVE RATE
  ======================================================= */

  const saveRate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const price = Number(rateForm.price);

    if (
      !rateForm.delivery_company_id ||
      !rateForm.wilaya_id ||
      rateForm.price.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      notifyError("يرجى اختيار الشركة والولاية وإدخال سعر صحيح.");
      return;
    }

    setSaving(true);

    try {
      const endpoint =
        rateType === "HOME" ? "home-rates" : "office-rates";

      const payload = {
        delivery_company_id: rateForm.delivery_company_id,
        wilaya_id: rateForm.wilaya_id,
        price,
        is_active: rateForm.is_active,
      };

      if (editingId) {
        await apiRequest(`${API}/${endpoint}/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            price: payload.price,
            is_active: payload.is_active,
          }),
        });

        notifySuccess("تم تحديث سعر التوصيل بنجاح.");
      } else {
        await apiRequest(`${API}/${endpoint}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        notifySuccess("تمت إضافة سعر التوصيل بنجاح.");
      }

      closeModal();
      await loadData();
    } catch (saveError) {
      notifyError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     STATUS / DELETE ACTIONS
  ======================================================= */

  const toggleCompany = async (company: DeliveryCompany) => {
    const nextStatus = !isActive(company.is_active);

    if (
      nextStatus &&
      activeCompany &&
      activeCompany.id !== company.id
    ) {
      const confirmed = window.confirm(
        `تفعيل ${company.name} سيؤدي إلى تعطيل ${activeCompany.name}. هل تريد المتابعة؟`
      );

      if (!confirmed) return;
    }

    try {
      await apiRequest(`${API}/companies/${company.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextStatus }),
      });

      notifySuccess(
        nextStatus
          ? "تم تفعيل شركة التوصيل."
          : "تم تعطيل شركة التوصيل."
      );

      await loadData();
    } catch (actionError) {
      notifyError(getErrorMessage(actionError));
    }
  };

  const toggleOffice = async (office: DeliveryOffice) => {
    try {
      await apiRequest(`${API}/offices/${office.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: !isActive(office.is_active),
        }),
      });

      notifySuccess("تم تحديث حالة المكتب.");
      await loadData();
    } catch (actionError) {
      notifyError(getErrorMessage(actionError));
    }
  };

  const toggleRate = async (rate: DeliveryRate) => {
    const endpoint =
      rateType === "HOME" ? "home-rates" : "office-rates";

    try {
      await apiRequest(`${API}/${endpoint}/${rate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: !isActive(rate.is_active),
        }),
      });

      notifySuccess("تم تحديث حالة السعر.");
      await loadData();
    } catch (actionError) {
      notifyError(getErrorMessage(actionError));
    }
  };

  const deleteCompany = async (company: DeliveryCompany) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف شركة "${company.name}"؟`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`${API}/companies/${company.id}`, {
        method: "DELETE",
      });

      notifySuccess("تم حذف شركة التوصيل.");
      await loadData();
    } catch (actionError) {
      notifyError(getErrorMessage(actionError));
    }
  };

  const deleteOffice = async (office: DeliveryOffice) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المكتب "${office.name}"؟`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`${API}/offices/${office.id}`, {
        method: "DELETE",
      });

      notifySuccess("تم حذف المكتب.");
      await loadData();
    } catch (actionError) {
      notifyError(getErrorMessage(actionError));
    }
  };

  const deleteRate = async (rate: DeliveryRate) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف سعر ${getWilayaName(rate.wilaya_id)}؟`
    );

    if (!confirmed) return;

    const endpoint =
      rateType === "HOME" ? "home-rates" : "office-rates";

    try {
      await apiRequest(`${API}/${endpoint}/${rate.id}`, {
        method: "DELETE",
      });

      notifySuccess("تم حذف سعر التوصيل.");
      await loadData();
    } catch (actionError) {
      notifyError(getErrorMessage(actionError));
    }
  };

  /* =======================================================
     SUMMARY
  ======================================================= */

  const activeOfficeCount = offices.filter((item) =>
    isActive(item.is_active)
  ).length;

  const activeHomeRateCount = homeRates.filter((item) =>
    isActive(item.is_active)
  ).length;

  const activeOfficeRateCount = officeRates.filter((item) =>
    isActive(item.is_active)
  ).length;

  const summaryItems = [
    {
      label: "شركات التوصيل",
      value: companies.length,
      detail: `${activeCompanies.length} شركة نشطة`,
      icon: "truck",
    },
    {
      label: "مكاتب التوصيل",
      value: offices.length,
      detail: `${activeOfficeCount} مكتب نشط`,
      icon: "building",
    },
    {
      label: "أسعار المنزل",
      value: homeRates.length,
      detail: `${activeHomeRateCount} سعر نشط`,
      icon: "wallet",
    },
    {
      label: "أسعار المكتب",
      value: officeRates.length,
      detail: `${activeOfficeRateCount} سعر نشط`,
      icon: "map",
    },
  ];

  /* =======================================================
     PAGE CONTENT
  ======================================================= */

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: string;
    count: number;
  }> = [
    {
      id: "companies",
      label: "شركات التوصيل",
      icon: "truck",
      count: companies.length,
    },
    {
      id: "offices",
      label: "المكاتب",
      icon: "building",
      count: offices.length,
    },
    {
      id: "rates",
      label: "أسعار التوصيل",
      icon: "wallet",
      count: homeRates.length + officeRates.length,
    },
  ];

  const currentSearchPlaceholder =
    activeTab === "companies"
      ? "ابحث باسم الشركة أو الهاتف..."
      : activeTab === "offices"
        ? "ابحث باسم المكتب أو العنوان..."
        : "ابحث باسم الولاية أو الشركة...";

  const currentCount =
    activeTab === "companies"
      ? filteredCompanies.length
      : activeTab === "offices"
        ? filteredOffices.length
        : filteredRates.length;

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf9f6] pb-12">
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-[#999589]">
              <span>لوحة التحكم</span>
              <span>/</span>
              <span className="text-[#55564d]">إدارة التوصيل</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#252720] sm:text-3xl">
              إدارة التوصيل
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#85816d]">
              إدارة شركات التوصيل والمكاتب وأسعار الشحن حسب الولايات.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton onClick={() => void loadData()}>
              <Icon name="refresh" className="h-4 w-4" />
              تحديث البيانات
            </SecondaryButton>

            {activeTab === "companies" && (
              <PrimaryButton onClick={openCreateCompany}>
                <Icon name="plus" className="h-4 w-4" />
                إضافة شركة
              </PrimaryButton>
            )}

            {activeTab === "offices" && (
              <PrimaryButton
                onClick={openCreateOffice}
                disabled={companies.length === 0 || wilayas.length === 0}
              >
                <Icon name="plus" className="h-4 w-4" />
                إضافة مكتب
              </PrimaryButton>
            )}

            {activeTab === "rates" && (
              <PrimaryButton
                onClick={openCreateRate}
                disabled={companies.length === 0 || wilayas.length === 0}
              >
                <Icon name="plus" className="h-4 w-4" />
                إضافة سعر
              </PrimaryButton>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS */}

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="إغلاق التنبيه"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <span className="flex items-center gap-2">
              <Icon name="check" className="h-4 w-4" />
              {success}
            </span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="إغلاق التنبيه"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ACTIVE COMPANY NOTICE */}

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#e9e6dd] bg-white p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f1efe8] text-[#85816d]">
              <Icon name="truck" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#34362e]">
                شركة التوصيل المعتمدة حاليًا
              </p>
              <p className="mt-1 text-sm text-[#85816d]">
                {activeCompany
                  ? activeCompany.name
                  : "لا توجد شركة توصيل نشطة حاليًا"}
              </p>
            </div>
          </div>

          <StatusBadge
            active={Boolean(activeCompany)}
            activeText="الخدمة مفعّلة"
            inactiveText="لا توجد خدمة مفعّلة"
          />
        </div>

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#e9e6dd] bg-white p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#85816d] sm:text-sm">
                  {item.label}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f1eb] text-[#85816d]">
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
              </div>

              <p className="mt-4 text-2xl font-bold tabular-nums text-[#252720]">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-[#aaa69a]">{item.detail}</p>
            </div>
          ))}
        </div>

        {/* MAIN PANEL */}

        <section className="overflow-hidden rounded-2xl border border-[#e9e6dd] bg-white">
          {/* TABS */}

          <div className="border-b border-[#e9e6dd] px-4 pt-4 sm:px-5">
            <div className="flex gap-2 overflow-x-auto pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearch("");
                    setCompanyFilter("all");
                    setWilayaFilter("all");
                    setStatusFilter("all");
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4",
                    activeTab === tab.id
                      ? "border-[#252720] text-[#252720]"
                      : "border-transparent text-[#999589] hover:text-[#55564d]"
                  )}
                >
                  <Icon name={tab.icon} className="h-4 w-4" />
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                      activeTab === tab.id
                        ? "bg-[#f1efe8] text-[#55564d]"
                        : "bg-[#f7f6f2] text-[#aaa69a]"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* RATES SUB TABS */}

          {activeTab === "rates" && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0eee8] bg-[#fdfcf9] px-4 py-3 sm:px-5">
              <div className="flex rounded-xl bg-[#f1efe8] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setRateType("HOME");
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className={cn(
                    "rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm",
                    rateType === "HOME"
                      ? "bg-white text-[#252720] shadow-sm"
                      : "text-[#85816d]"
                  )}
                >
                  التوصيل للمنزل
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRateType("OFFICE");
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className={cn(
                    "rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm",
                    rateType === "OFFICE"
                      ? "bg-white text-[#252720] shadow-sm"
                      : "text-[#85816d]"
                  )}
                >
                  التوصيل للمكتب
                </button>
              </div>

              <p className="text-xs text-[#999589]">
                يتم تحديد السعر حسب شركة التوصيل والولاية.
              </p>
            </div>
          )}

          {/* FILTERS */}

          <div className="flex flex-col gap-3 border-b border-[#f0eee8] p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <Icon
                  name="search"
                  className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa69a]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={currentSearchPlaceholder}
                  className={cn(inputClass, "pr-10")}
                />
              </div>

              {activeTab !== "companies" && (
                <select
                  value={companyFilter}
                  onChange={(event) => setCompanyFilter(event.target.value)}
                  className={cn(inputClass, "lg:w-52")}
                >
                  <option value="all">جميع الشركات</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              )}

              {activeTab !== "companies" && (
                <select
                  value={wilayaFilter}
                  onChange={(event) => setWilayaFilter(event.target.value)}
                  className={cn(inputClass, "lg:w-48")}
                >
                  <option value="all">جميع الولايات</option>
                  {wilayas.map((wilaya) => (
                    <option key={wilaya.id} value={wilaya.id}>
                      {wilaya.code} - {wilaya.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={cn(inputClass, "lg:w-40")}
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">غير نشط فقط</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[#999589]">
                عرض <strong className="text-[#55564d]">{currentCount}</strong> نتيجة
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCompanyFilter("all");
                  setWilayaFilter("all");
                  setStatusFilter("all");
                }}
                className="text-xs font-semibold text-[#85816d] transition hover:text-[#252720]"
              >
                مسح عوامل التصفية
              </button>
            </div>
          </div>

          {/* TABLE CONTENT */}

          {loading ? (
            <LoadingState />
          ) : (
            <>
              {/* COMPANIES TABLE */}

              {activeTab === "companies" && (
                filteredCompanies.length === 0 ? (
                  <EmptyState
                    title="لا توجد شركات توصيل"
                    description="أضف شركة التوصيل الأولى للبدء في إعداد خدمات الشحن."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-right">
                      <thead className="bg-[#faf9f6] text-xs font-semibold text-[#85816d]">
                        <tr>
                          <th className="px-5 py-4">الشركة</th>
                          <th className="px-5 py-4">رقم الهاتف</th>
                          <th className="px-5 py-4">الموقع الإلكتروني</th>
                          <th className="px-5 py-4">الحالة</th>
                          <th className="px-5 py-4">الإجراءات</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#f0eee8]">
                        {filteredCompanies.map((company) => (
                          <tr
                            key={company.id}
                            className="transition hover:bg-[#fdfcf9]"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1efe8] text-[#85816d]">
                                  <Icon name="truck" className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-[#34362e]">
                                    {company.name}
                                  </p>
                                  {activeCompany?.id === company.id && (
                                    <p className="mt-1 text-[11px] font-medium text-[#54805c]">
                                      الشركة المعتمدة
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-[#66675d]">
                              {company.phone || "—"}
                            </td>

                            <td className="px-5 py-4 text-sm text-[#66675d]">
                              {company.website_url ? (
                                <a
                                  href={company.website_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#85816d] underline decoration-[#d4d0c4] underline-offset-4 hover:text-[#252720]"
                                >
                                  زيارة الموقع
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge active={isActive(company.is_active)} />
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditCompany(company)}
                                  title="تعديل"
                                  className="rounded-lg p-2 text-[#85816d] transition hover:bg-[#f1efe8] hover:text-[#252720]"
                                >
                                  <Icon name="edit" className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void toggleCompany(company)}
                                  title={isActive(company.is_active) ? "تعطيل" : "تفعيل"}
                                  className={cn(
                                    "rounded-lg px-2.5 py-2 text-xs font-semibold transition",
                                    isActive(company.is_active)
                                      ? "text-[#9a6b45] hover:bg-[#faf1e9]"
                                      : "text-[#477a51] hover:bg-[#e8f3e9]"
                                  )}
                                >
                                  {isActive(company.is_active) ? "تعطيل" : "تفعيل"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void deleteCompany(company)}
                                  title="حذف"
                                  className="rounded-lg p-2 text-[#b47770] transition hover:bg-red-50 hover:text-red-700"
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* OFFICES TABLE */}

              {activeTab === "offices" && (
                filteredOffices.length === 0 ? (
                  <EmptyState
                    title="لا توجد مكاتب توصيل"
                    description="أضف مكاتب شركات التوصيل وحدد البلدية التي يوجد فيها كل مكتب."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-right">
                      <thead className="bg-[#faf9f6] text-xs font-semibold text-[#85816d]">
                        <tr>
                          <th className="px-5 py-4">المكتب</th>
						  <th className="px-5 py-4">المعرّف الخارجي</th>
                          <th className="px-5 py-4">شركة التوصيل</th>
                          <th className="px-5 py-4">الولاية والبلدية</th>
                          <th className="px-5 py-4">الهاتف</th>
                          <th className="px-5 py-4">الحالة</th>
                          <th className="px-5 py-4">الإجراءات</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#f0eee8]">
                        {filteredOffices.map((office) => {
                          const commune = communeById.get(office.commune_id);

                          return (
                            <tr
                              key={office.id}
                              className="transition hover:bg-[#fdfcf9]"
                            >
                              <td className="px-5 py-4">
                                <p className="text-sm font-bold text-[#34362e]">
                                  {office.name}
                                </p>
                                <p className="mt-1 max-w-xs truncate text-xs text-[#999589]">
                                  {office.address}
                                </p>
                              </td>
							  
<td className="px-5 py-4">
  <span
    dir="ltr"
    className="inline-flex rounded-lg bg-[#f3f1eb] px-2.5 py-1.5 font-mono text-xs text-[#66675d]"
  >
    {office.external_office_id || "—"}
  </span>
</td>							  

                              <td className="px-5 py-4 text-sm text-[#66675d]">
                                {getCompanyName(office.delivery_company_id)}
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-[#55564d]">
                                  {commune
                                    ? getWilayaName(commune.wilaya_id)
                                    : "—"}
                                </p>
                                <p className="mt-1 text-xs text-[#999589]">
                                  {getCommuneName(office.commune_id)}
                                </p>
                              </td>

                              <td className="px-5 py-4 text-sm text-[#66675d]">
                                {office.phone || "—"}
                              </td>

                              <td className="px-5 py-4">
                                <StatusBadge active={isActive(office.is_active)} />
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditOffice(office)}
                                    title="تعديل"
                                    className="rounded-lg p-2 text-[#85816d] transition hover:bg-[#f1efe8] hover:text-[#252720]"
                                  >
                                    <Icon name="edit" className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void toggleOffice(office)}
                                    className={cn(
                                      "rounded-lg px-2 py-2 text-xs font-semibold transition",
                                      isActive(office.is_active)
                                        ? "text-[#9a6b45] hover:bg-[#faf1e9]"
                                        : "text-[#477a51] hover:bg-[#e8f3e9]"
                                    )}
                                  >
                                    {isActive(office.is_active) ? "تعطيل" : "تفعيل"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void deleteOffice(office)}
                                    title="حذف"
                                    className="rounded-lg p-2 text-[#b47770] transition hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Icon name="trash" className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* RATES TABLE */}

              {activeTab === "rates" && (
                filteredRates.length === 0 ? (
                  <EmptyState
                    title="لا توجد أسعار مسجلة"
                    description="أضف سعر التوصيل لكل ولاية وشركة. يمكنك تحديد سعر مختلف للمنزل والمكتب."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-right">
                      <thead className="bg-[#faf9f6] text-xs font-semibold text-[#85816d]">
                        <tr>
                          <th className="px-5 py-4">الولاية</th>
                          <th className="px-5 py-4">شركة التوصيل</th>
                          <th className="px-5 py-4">نوع التوصيل</th>
                          <th className="px-5 py-4">السعر</th>
                          <th className="px-5 py-4">الحالة</th>
                          <th className="px-5 py-4">الإجراءات</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#f0eee8]">
                        {filteredRates.map((rate) => (
                          <tr
                            key={rate.id}
                            className="transition hover:bg-[#fdfcf9]"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-[#34362e]">
                                {getWilayaName(rate.wilaya_id)}
                              </p>
                              <p className="mt-1 text-xs text-[#999589]">
                                {wilayaById.get(rate.wilaya_id)?.code ?? "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm text-[#66675d]">
                              {getCompanyName(rate.delivery_company_id)}
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-[#f1efe8] px-2.5 py-1.5 text-xs font-semibold text-[#66675d]">
                                {rateType === "HOME" ? "توصيل للمنزل" : "توصيل للمكتب"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-bold tabular-nums text-[#252720]">
                                {formatPrice(rate.price)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge active={isActive(rate.is_active)} />
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditRate(rate)}
                                  title="تعديل"
                                  className="rounded-lg p-2 text-[#85816d] transition hover:bg-[#f1efe8] hover:text-[#252720]"
                                >
                                  <Icon name="edit" className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void toggleRate(rate)}
                                  className={cn(
                                    "rounded-lg px-2 py-2 text-xs font-semibold transition",
                                    isActive(rate.is_active)
                                      ? "text-[#9a6b45] hover:bg-[#faf1e9]"
                                      : "text-[#477a51] hover:bg-[#e8f3e9]"
                                  )}
                                >
                                  {isActive(rate.is_active) ? "تعطيل" : "تفعيل"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void deleteRate(rate)}
                                  title="حذف"
                                  className="rounded-lg p-2 text-[#b47770] transition hover:bg-red-50 hover:text-red-700"
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}

          {/* TABLE FOOTER */}

          {!loading && currentCount > 0 && (
            <div className="flex flex-col justify-between gap-2 border-t border-[#f0eee8] bg-[#fdfcf9] px-4 py-3 text-xs text-[#999589] sm:flex-row sm:items-center sm:px-5">
              <span>
                إجمالي النتائج: {currentCount}
              </span>
              <span>RIMOVA · إدارة التوصيل</span>
            </div>
          )}
        </section>

        {/* BUSINESS RULE INFO */}

        <div className="rounded-2xl border border-[#e9e6dd] bg-[#f5f3ed] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#85816d]">
              <Icon name="map" className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#44463d]">
                كيف تتم إدارة أسعار التوصيل؟
              </h3>
              <p className="mt-1 text-xs leading-6 text-[#85816d]">
                سعر التوصيل للمنزل وسعر التوصيل للمكتب يُحددان بشكل مستقل
                حسب شركة التوصيل والولاية. أما المكتب فيُربط ببلدية محددة
                داخل الولاية، وتُستخدم بيانات الولايات والبلديات من إعدادات
                النظام.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
         COMPANY MODAL
      ===================================================== */}

      {modal === "company" && (
        <ModalShell
          title={editingId ? "تعديل شركة التوصيل" : "إضافة شركة توصيل"}
          description="أدخل المعلومات الأساسية لشركة التوصيل."
          onClose={closeModal}
        >
          <form onSubmit={saveCompany} className="space-y-5 p-5 sm:p-6">
            <Field label="اسم الشركة" required>
              <input
                value={companyForm.name}
                onChange={(event) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="مثال: Yalidine"
                className={inputClass}
                required
              />
            </Field>

            <Field label="رقم الهاتف">
              <input
                value={companyForm.phone}
                onChange={(event) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                placeholder="رقم هاتف الشركة"
                className={inputClass}
                dir="ltr"
              />
            </Field>

            <Field label="الموقع الإلكتروني">
              <input
                type="url"
                value={companyForm.website_url}
                onChange={(event) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    website_url: event.target.value,
                  }))
                }
                placeholder="https://example.com"
                className={inputClass}
                dir="ltr"
              />
            </Field>

            <div className="rounded-xl border border-[#e9e6dd] bg-white p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#34362e]">
                    تفعيل الشركة
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#999589]">
                    لا يمكن أن تكون أكثر من شركة واحدة نشطة في الوقت نفسه.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={companyForm.is_active}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#252720]"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#e9e6dd] pt-4 sm:flex-row">
              <SecondaryButton
                onClick={closeModal}
                disabled={saving}
                className="flex-1"
              >
                إلغاء
              </SecondaryButton>

              <PrimaryButton
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة الشركة"}
              </PrimaryButton>
            </div>
          </form>
        </ModalShell>
      )}

      {/* =====================================================
         OFFICE MODAL
      ===================================================== */}

      {modal === "office" && (
        <ModalShell
          title={editingId ? "تعديل مكتب التوصيل" : "إضافة مكتب توصيل"}
          description="حدد شركة التوصيل وموقع المكتب ومعلومات الاتصال."
          onClose={closeModal}
        >
          <form onSubmit={saveOffice} className="space-y-5 p-5 sm:p-6">
            <Field label="شركة التوصيل" required>
              <select
                value={officeForm.delivery_company_id}
                onChange={(event) =>
                  setOfficeForm((prev) => ({
                    ...prev,
                    delivery_company_id: event.target.value,
                  }))
                }
                className={inputClass}
                required
              >
                <option value="">اختر شركة التوصيل</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="الولاية" required>
                <select
                  value={officeForm.wilaya_id}
                  onChange={(event) =>
                    setOfficeForm((prev) => ({
                      ...prev,
                      wilaya_id: event.target.value,
                      commune_id: "",
                    }))
                  }
                  className={inputClass}
                  required
                >
                  <option value="">اختر الولاية</option>
                  {wilayas.map((wilaya) => (
                    <option key={wilaya.id} value={wilaya.id}>
                      {wilaya.code} - {wilaya.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="البلدية" required>
                <select
                  value={officeForm.commune_id}
                  onChange={(event) =>
                    setOfficeForm((prev) => ({
                      ...prev,
                      commune_id: event.target.value,
                    }))
                  }
                  className={inputClass}
                  disabled={!officeForm.wilaya_id}
                  required
                >
                  <option value="">
                    {officeForm.wilaya_id
                      ? "اختر البلدية"
                      : "اختر الولاية أولاً"}
                  </option>
                  {officeCommunes.map((commune) => (
                    <option key={commune.id} value={commune.id}>
                      {commune.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {officeForm.wilaya_id && officeCommunes.length === 0 && (
              <p className="text-xs text-amber-700">
                لا توجد بلديات نشطة مسجلة لهذه الولاية.
              </p>
            )}

            <Field label="اسم المكتب" required>
              <input
                value={officeForm.name}
                onChange={(event) =>
                  setOfficeForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="اسم مكتب التوصيل"
                className={inputClass}
                required
              />
            </Field>

<Field
  label="معرّف المكتب لدى شركة التوصيل"
  hint="اختياري — مثل Stop Desk ID المستخدم في API شركة التوصيل."
>
  <input
    value={officeForm.external_office_id}
    onChange={(event) =>
      setOfficeForm((prev) => ({
        ...prev,
        external_office_id: event.target.value,
      }))
    }
    placeholder="مثال: 12345"
    className={inputClass}
  />
</Field>

            <Field label="العنوان" required>
              <textarea
                value={officeForm.address}
                onChange={(event) =>
                  setOfficeForm((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                placeholder="العنوان الكامل للمكتب"
                className={cn(inputClass, "min-h-24 resize-y")}
                required
              />
            </Field>

            <Field label="رقم الهاتف">
              <input
                value={officeForm.phone}
                onChange={(event) =>
                  setOfficeForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                placeholder="رقم هاتف المكتب"
                className={inputClass}
                dir="ltr"
              />
            </Field>

            <div className="rounded-xl border border-[#e9e6dd] bg-white p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#34362e]">
                    تفعيل المكتب
                  </p>
                  <p className="mt-1 text-xs text-[#999589]">
                    المكاتب غير النشطة لن تظهر للعميل.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={officeForm.is_active}
                  onChange={(event) =>
                    setOfficeForm((prev) => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#252720]"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#e9e6dd] pt-4 sm:flex-row">
              <SecondaryButton
                onClick={closeModal}
                disabled={saving}
                className="flex-1"
              >
                إلغاء
              </SecondaryButton>

              <PrimaryButton
                type="submit"
                disabled={saving || officeCommunes.length === 0 && !editingId}
                className="flex-1"
              >
                {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة المكتب"}
              </PrimaryButton>
            </div>
          </form>
        </ModalShell>
      )}

      {/* =====================================================
         RATE MODAL
      ===================================================== */}

      {modal === "rate" && (
        <ModalShell
          title={editingId ? "تعديل سعر التوصيل" : "إضافة سعر توصيل"}
          description={
            rateType === "HOME"
              ? "حدد سعر التوصيل إلى المنزل حسب الشركة والولاية."
              : "حدد سعر التوصيل إلى مكتب الشركة حسب الشركة والولاية."
          }
          onClose={closeModal}
        >
          <form onSubmit={saveRate} className="space-y-5 p-5 sm:p-6">
            <div className="rounded-xl border border-[#e9e6dd] bg-white p-4">
              <p className="text-xs text-[#999589]">نوع التوصيل</p>
              <p className="mt-1 text-sm font-bold text-[#34362e]">
                {rateType === "HOME" ? "التوصيل إلى المنزل" : "التوصيل إلى المكتب"}
              </p>
            </div>

            <Field label="شركة التوصيل" required>
              <select
                value={rateForm.delivery_company_id}
                onChange={(event) =>
                  setRateForm((prev) => ({
                    ...prev,
                    delivery_company_id: event.target.value,
                  }))
                }
                className={inputClass}
                required
                disabled={Boolean(editingId)}
              >
                <option value="">اختر شركة التوصيل</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {editingId && (
                <p className="text-xs text-[#999589]">
                  لا يمكن تغيير الشركة المرتبطة بالسعر بعد إنشائه.
                </p>
              )}
            </Field>

            <Field label="الولاية" required>
              <select
                value={rateForm.wilaya_id}
                onChange={(event) =>
                  setRateForm((prev) => ({
                    ...prev,
                    wilaya_id: event.target.value,
                  }))
                }
                className={inputClass}
                required
                disabled={Boolean(editingId)}
              >
                <option value="">اختر الولاية</option>
                {wilayas.map((wilaya) => (
                  <option key={wilaya.id} value={wilaya.id}>
                    {wilaya.code} - {wilaya.name}
                  </option>
                ))}
              </select>
              {editingId && (
                <p className="text-xs text-[#999589]">
                  لا يمكن تغيير الولاية المرتبطة بالسعر بعد إنشائه.
                </p>
              )}
            </Field>

            <Field
              label="سعر التوصيل بالدينار الجزائري"
              required
              hint="يمكن إدخال صفر إذا كان التوصيل مجانيًا."
            >
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rateForm.price}
                  onChange={(event) =>
                    setRateForm((prev) => ({
                      ...prev,
                      price: event.target.value,
                    }))
                  }
                  placeholder="مثال: 500"
                  className={cn(inputClass, "pl-14")}
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#85816d]">
                  دج
                </span>
              </div>
            </Field>

            <div className="rounded-xl border border-[#e9e6dd] bg-white p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#34362e]">
                    تفعيل السعر
                  </p>
                  <p className="mt-1 text-xs text-[#999589]">
                    السعر غير النشط لا يُستخدم في حساب تكلفة الطلب.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={rateForm.is_active}
                  onChange={(event) =>
                    setRateForm((prev) => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#252720]"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#e9e6dd] pt-4 sm:flex-row">
              <SecondaryButton
                onClick={closeModal}
                disabled={saving}
                className="flex-1"
              >
                إلغاء
              </SecondaryButton>

              <PrimaryButton
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة السعر"}
              </PrimaryButton>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
