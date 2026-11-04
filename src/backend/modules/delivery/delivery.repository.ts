import db from "../../database/knex";
import type { Knex } from "knex";

type DatabaseConnection = Knex | Knex.Transaction;

/* =========================================================
   TYPES
========================================================= */

export type DeliveryCompanyRow = {
  id: string;
  name: string;
  phone: string | null;
  website_url: string | null;
  is_active: boolean | number;
  created_at?: Date;
  updated_at?: Date;
};

export type WilayaRow = {
  id: string;
  code: string;
  name: string;
};

export type CommuneRow = {
  id: string;
  wilaya_id: string;
  code: string | null;
  name: string;
};

export type DeliveryOfficeRow = {
  id: string;
  delivery_company_id: string;
  commune_id: string;

  // المعرف الخارجي للمكتب لدى شركة التوصيل
  external_office_id: string | null;

  name: string;
  address: string;
  phone: string | null;
  is_active?: boolean | number;
  created_at?: Date;
  updated_at?: Date;
};

export type HomeDeliveryRateRow = {
  id: string;
  delivery_company_id: string;
  wilaya_id: string;
  price: string | number;
  is_active?: boolean | number;
  updated_at?: Date;
};

export type OfficeDeliveryRateRow = {
  id: string;
  delivery_company_id: string;
  wilaya_id: string;
  price: string | number;
  is_active?: boolean | number;
  updated_at?: Date;
};

/* =========================================================
   DELIVERY COMPANY
========================================================= */

export type CreateDeliveryCompanyData = {
  id: string;
  name: string;
  phone?: string | null;
  website_url?: string | null;
  is_active?: boolean;
};

export type UpdateDeliveryCompanyData = {
  name?: string;
  phone?: string | null;
  website_url?: string | null;
  is_active?: boolean;
};

export async function findAllDeliveryCompanies(
  connection: DatabaseConnection = db
): Promise<DeliveryCompanyRow[]> {
  return connection<DeliveryCompanyRow>("delivery_companies")
    .select(
      "id",
      "name",
      "phone",
      "website_url",
      "is_active",
      "created_at",
      "updated_at"
    )
    .orderBy("created_at", "desc");
}

export async function findDeliveryCompanyById(
  id: string,
  connection: DatabaseConnection = db
): Promise<DeliveryCompanyRow | undefined> {
  return connection<DeliveryCompanyRow>("delivery_companies")
    .select(
      "id",
      "name",
      "phone",
      "website_url",
      "is_active",
      "created_at",
      "updated_at"
    )
    .where({ id })
    .first();
}

export async function findActiveDeliveryCompany(
  connection: DatabaseConnection = db
): Promise<DeliveryCompanyRow | undefined> {
  return connection<DeliveryCompanyRow>("delivery_companies")
    .select(
      "id",
      "name",
      "phone",
      "website_url",
      "is_active"
    )
    .where("is_active", true)
    .orderBy("id", "asc")
    .first();
}

export async function createDeliveryCompany(
  data: CreateDeliveryCompanyData,
  connection: DatabaseConnection = db
): Promise<void> {
  await connection("delivery_companies").insert({
    id: data.id,
    name: data.name,
    phone: data.phone ?? null,
    website_url: data.website_url ?? null,
    is_active: data.is_active ?? false,
  });
}

export async function updateDeliveryCompany(
  id: string,
  data: UpdateDeliveryCompanyData,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("delivery_companies")
    .where({ id })
    .update(data);

  return Number(affectedRows);
}

export async function setDeliveryCompanyActive(
  id: string,
  isActive: boolean,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("delivery_companies")
    .where({ id })
    .update({ is_active: isActive });

  return Number(affectedRows);
}

export async function deleteDeliveryCompany(
  id: string,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("delivery_companies")
    .where({ id })
    .delete();

  return Number(affectedRows);
}

/* =========================================================
   WILAYAS
========================================================= */

export async function findAllWilayas(
  connection: DatabaseConnection = db
): Promise<WilayaRow[]> {
  return connection<WilayaRow>("wilayas")
    .select("id", "code", "name")
    .where("is_active", true)
    .orderBy("code", "asc");
}

/* =========================================================
   COMMUNES
========================================================= */

export async function findActiveCommunes(
  wilayaIds: string[],
  connection: DatabaseConnection = db
): Promise<CommuneRow[]> {
  if (wilayaIds.length === 0) {
    return [];
  }

  return connection<CommuneRow>("communes")
    .select("id", "wilaya_id", "code", "name")
    .whereIn("wilaya_id", wilayaIds)
    .where("is_active", true)
    .orderBy("code", "asc")
    .orderBy("name", "asc");
}

/* =========================================================
   DELIVERY OFFICES
========================================================= */

export type CreateDeliveryOfficeData = {
  id: string;
  delivery_company_id: string;
  commune_id: string;

  // اختياري: معرف المكتب لدى شركة التوصيل
  external_office_id?: string | null;

  name: string;
  address: string;
  phone?: string | null;
  is_active?: boolean;
};

export type UpdateDeliveryOfficeData = {
  commune_id?: string;

  // يمكن تعيين المعرف أو تغييره أو مسحه
  external_office_id?: string | null;

  name?: string;
  address?: string;
  phone?: string | null;
  is_active?: boolean;
};

/**
 * جلب جميع مكاتب التوصيل، مع إمكانية التصفية حسب الشركة.
 */
export async function findAllDeliveryOffices(
  companyId?: string,
  connection: DatabaseConnection = db
): Promise<DeliveryOfficeRow[]> {
  const query = connection<DeliveryOfficeRow>("delivery_offices")
    .select(
      "id",
      "delivery_company_id",
      "commune_id",
      "external_office_id",
      "name",
      "address",
      "phone",
      "is_active",
      "created_at",
      "updated_at"
    );

  if (companyId) {
    query.where("delivery_company_id", companyId);
  }

  return query.orderBy("name", "asc");
}

/**
 * جلب مكتب توصيل باستخدام المعرف الداخلي.
 */
export async function findDeliveryOfficeById(
  id: string,
  connection: DatabaseConnection = db
): Promise<DeliveryOfficeRow | undefined> {
  return connection<DeliveryOfficeRow>("delivery_offices")
    .select(
      "id",
      "delivery_company_id",
      "commune_id",
      "external_office_id",
      "name",
      "address",
      "phone",
      "is_active",
      "created_at",
      "updated_at"
    )
    .where({ id })
    .first();
}

/**
 * جلب مكاتب شركة توصيل الفعالة الموجودة في الولايات المحددة.
 */
export async function findActiveDeliveryOffices(
  companyId: string,
  wilayaIds: string[],
  connection: DatabaseConnection = db
): Promise<DeliveryOfficeRow[]> {
  if (wilayaIds.length === 0) {
    return [];
  }

  return connection<DeliveryOfficeRow>("delivery_offices as offices")
    .join(
      "communes",
      "communes.id",
      "offices.commune_id"
    )
    .select(
      "offices.id",
      "offices.delivery_company_id",
      "offices.commune_id",
      "offices.external_office_id",
      "offices.name",
      "offices.address",
      "offices.phone",
      "offices.is_active",
      "offices.created_at",
      "offices.updated_at"
    )
    .where("offices.delivery_company_id", companyId)
    .where("offices.is_active", true)
    .where("communes.is_active", true)
    .whereIn("communes.wilaya_id", wilayaIds)
    .orderBy("offices.name", "asc");
}

/**
 * إنشاء مكتب توصيل.
 */
export async function createDeliveryOffice(
  data: CreateDeliveryOfficeData,
  connection: DatabaseConnection = db
): Promise<void> {
  await connection("delivery_offices").insert({
    id: data.id,
    delivery_company_id: data.delivery_company_id,
    commune_id: data.commune_id,

    // يقبل null إذا لم توفر الشركة معرفًا خارجيًا
    external_office_id: data.external_office_id ?? null,

    name: data.name,
    address: data.address,
    phone: data.phone ?? null,
    is_active: data.is_active ?? true,
  });
}

/**
 * تحديث بيانات مكتب التوصيل.
 */
export async function updateDeliveryOffice(
  id: string,
  data: UpdateDeliveryOfficeData,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("delivery_offices")
    .where({ id })
    .update(data);

  return Number(affectedRows);
}

/**
 * تفعيل أو تعطيل مكتب التوصيل.
 */
export async function setDeliveryOfficeActive(
  id: string,
  isActive: boolean,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("delivery_offices")
    .where({ id })
    .update({ is_active: isActive });

  return Number(affectedRows);
}

/**
 * حذف مكتب التوصيل.
 */
export async function deleteDeliveryOffice(
  id: string,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("delivery_offices")
    .where({ id })
    .delete();

  return Number(affectedRows);
}

/* =========================================================
   HOME DELIVERY RATES
========================================================= */

export type CreateDeliveryRateData = {
  id: string;
  delivery_company_id: string;
  wilaya_id: string;
  price: number;
  is_active?: boolean;
};

export type UpdateDeliveryRateData = {
  price?: number;
  is_active?: boolean;
};

export async function findAllHomeDeliveryRates(
  companyId?: string,
  connection: DatabaseConnection = db
): Promise<HomeDeliveryRateRow[]> {
  const query = connection<HomeDeliveryRateRow>("home_delivery_rates")
    .select(
      "id",
      "delivery_company_id",
      "wilaya_id",
      "price",
      "is_active",
      "updated_at"
    );

  if (companyId) {
    query.where("delivery_company_id", companyId);
  }

  return query.orderBy("wilaya_id", "asc");
}

export async function findHomeDeliveryRateById(
  id: string,
  connection: DatabaseConnection = db
): Promise<HomeDeliveryRateRow | undefined> {
  return connection<HomeDeliveryRateRow>("home_delivery_rates")
    .select(
      "id",
      "delivery_company_id",
      "wilaya_id",
      "price",
      "is_active",
      "updated_at"
    )
    .where({ id })
    .first();
}

export async function findActiveHomeDeliveryRates(
  companyId: string,
  wilayaIds: string[],
  connection: DatabaseConnection = db
): Promise<HomeDeliveryRateRow[]> {
  if (wilayaIds.length === 0) {
    return [];
  }

  return connection<HomeDeliveryRateRow>("home_delivery_rates")
    .select(
      "id",
      "delivery_company_id",
      "wilaya_id",
      "price"
    )
    .where("delivery_company_id", companyId)
    .where("is_active", true)
    .whereIn("wilaya_id", wilayaIds);
}

export async function createHomeDeliveryRate(
  data: CreateDeliveryRateData,
  connection: DatabaseConnection = db
): Promise<void> {
  await connection("home_delivery_rates").insert({
    ...data,
    is_active: data.is_active ?? true,
  });
}

export async function updateHomeDeliveryRate(
  id: string,
  data: UpdateDeliveryRateData,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("home_delivery_rates")
    .where({ id })
    .update(data);

  return Number(affectedRows);
}

export async function deleteHomeDeliveryRate(
  id: string,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("home_delivery_rates")
    .where({ id })
    .delete();

  return Number(affectedRows);
}

/* =========================================================
   OFFICE DELIVERY RATES
========================================================= */

export async function findAllOfficeDeliveryRates(
  companyId?: string,
  connection: DatabaseConnection = db
): Promise<OfficeDeliveryRateRow[]> {
  const query = connection<OfficeDeliveryRateRow>("office_delivery_rates")
    .select(
      "id",
      "delivery_company_id",
      "wilaya_id",
      "price",
      "is_active",
      "updated_at"
    );

  if (companyId) {
    query.where("delivery_company_id", companyId);
  }

  return query.orderBy("wilaya_id", "asc");
}

export async function findOfficeDeliveryRateById(
  id: string,
  connection: DatabaseConnection = db
): Promise<OfficeDeliveryRateRow | undefined> {
  return connection<OfficeDeliveryRateRow>("office_delivery_rates")
    .select(
      "id",
      "delivery_company_id",
      "wilaya_id",
      "price",
      "is_active",
      "updated_at"
    )
    .where({ id })
    .first();
}

export async function findActiveOfficeDeliveryRates(
  companyId: string,
  wilayaIds: string[],
  connection: DatabaseConnection = db
): Promise<OfficeDeliveryRateRow[]> {
  if (wilayaIds.length === 0) {
    return [];
  }

  return connection<OfficeDeliveryRateRow>("office_delivery_rates")
    .select(
      "id",
      "delivery_company_id",
      "wilaya_id",
      "price"
    )
    .where("delivery_company_id", companyId)
    .where("is_active", true)
    .whereIn("wilaya_id", wilayaIds);
}

export async function createOfficeDeliveryRate(
  data: CreateDeliveryRateData,
  connection: DatabaseConnection = db
): Promise<void> {
  await connection("office_delivery_rates").insert({
    ...data,
    is_active: data.is_active ?? true,
  });
}

export async function updateOfficeDeliveryRate(
  id: string,
  data: UpdateDeliveryRateData,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("office_delivery_rates")
    .where({ id })
    .update(data);

  return Number(affectedRows);
}

export async function deleteOfficeDeliveryRate(
  id: string,
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("office_delivery_rates")
    .where({ id })
    .delete();

  return Number(affectedRows);
}

/* =========================================================
   DELIVERY COMPANY HELPERS
========================================================= */

export async function deactivateAllDeliveryCompanies(
  connection: DatabaseConnection = db
): Promise<number> {
  const affectedRows = await connection("delivery_companies")
    .where("is_active", true)
    .update({ is_active: false });

  return Number(affectedRows);
}