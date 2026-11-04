
import { randomUUID } from "node:crypto";

import db from "../../database/knex";

import {
  findActiveDeliveryCompany,
  findAllDeliveryCompanies,
  findDeliveryCompanyById,
  createDeliveryCompany,
  updateDeliveryCompany,
  setDeliveryCompanyActive,
  deleteDeliveryCompany,

  findAllWilayas,
  findActiveCommunes,

  findAllDeliveryOffices,
  findDeliveryOfficeById,
  findActiveDeliveryOffices,
  createDeliveryOffice,
  updateDeliveryOffice,
  setDeliveryOfficeActive,
  deleteDeliveryOffice,

  findAllHomeDeliveryRates,
  findHomeDeliveryRateById,
  findActiveHomeDeliveryRates,
  createHomeDeliveryRate,
  updateHomeDeliveryRate,
  deleteHomeDeliveryRate,

  findAllOfficeDeliveryRates,
  findOfficeDeliveryRateById,
  findActiveOfficeDeliveryRates,
  createOfficeDeliveryRate,
  updateOfficeDeliveryRate,
  deleteOfficeDeliveryRate,

  deactivateAllDeliveryCompanies,
  
  type CreateDeliveryCompanyData,
  type UpdateDeliveryCompanyData,
  type CreateDeliveryOfficeData,
  type UpdateDeliveryOfficeData,
  type CreateDeliveryRateData,
  type UpdateDeliveryRateData,
} from "./delivery.repository";

/* =========================================================
   HELPERS
========================================================= */

function requiredText(
  value: unknown,
  field: string
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function optionalText(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function validatePrice(price: number): void {
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new Error("Price must be a valid positive number or zero.");
  }
}

function ensureUpdated(
  affectedRows: number,
  entity: string
): void {
  if (!affectedRows) {
    throw new Error(`${entity} not found.`);
  }
}

async function ensureDeliveryCompanyExists(
  companyId: string
): Promise<void> {
  const company = await findDeliveryCompanyById(companyId);

  if (!company) {
    throw new Error("Delivery company not found.");
  }
}

async function ensureWilayaExists(
  wilayaId: string
): Promise<void> {
  const wilayas = await findAllWilayas();

  if (!wilayas.some((wilaya) => wilaya.id === wilayaId)) {
    throw new Error("Wilaya not found or inactive.");
  }
}

/* =========================================================
   STORE
   GET DELIVERY OPTIONS
========================================================= */

export async function getDeliveryOptions() {
  // 1. اختيار أول شركة توصيل نشطة باعتبارها الشركة الافتراضية.
  const company = await findActiveDeliveryCompany();

  if (!company) {
    return null;
  }

  // 2. جلب الولايات النشطة.
  const wilayas = await findAllWilayas();

  const wilayaIds = wilayas.map((wilaya) => wilaya.id);

  if (wilayaIds.length === 0) {
    return {
      company,
      wilayas: [],
    };
  }

  // 3. جلب بيانات التوصيل بالتوازي.
  const [
    communes,
    offices,
    homeRates,
    officeRates,
  ] = await Promise.all([
    findActiveCommunes(wilayaIds),
    findActiveDeliveryOffices(company.id, wilayaIds),
    findActiveHomeDeliveryRates(company.id, wilayaIds),
    findActiveOfficeDeliveryRates(company.id, wilayaIds),
  ]);

  // 4. البلديات حسب الولاية.
  const communesByWilaya = new Map<
    string,
    typeof communes
  >();

  for (const commune of communes) {
    const wilayaCommunes =
      communesByWilaya.get(commune.wilaya_id) ?? [];

    wilayaCommunes.push(commune);

    communesByWilaya.set(
      commune.wilaya_id,
      wilayaCommunes
    );
  }

  // 5. المكاتب حسب البلدية.
  const officesByCommune = new Map<
    string,
    typeof offices
  >();

  for (const office of offices) {
    const communeOffices =
      officesByCommune.get(office.commune_id) ?? [];

    communeOffices.push(office);

    officesByCommune.set(
      office.commune_id,
      communeOffices
    );
  }

  // 6. أسعار المنزل حسب الولاية.
  const homeRatesByWilaya = new Map(
    homeRates.map((rate) => [
      rate.wilaya_id,
      Number(rate.price),
    ])
  );

  // 7. أسعار المكتب حسب الولاية.
  const officeRatesByWilaya = new Map(
    officeRates.map((rate) => [
      rate.wilaya_id,
      Number(rate.price),
    ])
  );

  // 8. تجهيز الولايات.
  const wilayasWithDeliveryOptions = wilayas.map(
    (wilaya) => {
      const wilayaCommunes =
        communesByWilaya.get(wilaya.id) ?? [];

      const homeCommunes = wilayaCommunes.map(
        (commune) => ({
          id: commune.id,
          code: commune.code,
          name: commune.name,
        })
      );

      const deliveryOffices = wilayaCommunes.flatMap(
        (commune) =>
          (officesByCommune.get(commune.id) ?? []).map(
            (office) => ({
              id: office.id,
			  external_office_id: office.external_office_id,
              commune_id: office.commune_id,
              name: office.name,
              address: office.address,
              phone: office.phone,
            })
          )
      );

      return {
        id: wilaya.id,
        code: wilaya.code,
        name: wilaya.name,

        home_delivery: {
          price:
            homeRatesByWilaya.get(wilaya.id) ?? null,
          communes: homeCommunes,
        },

        office_delivery: {
          price:
            officeRatesByWilaya.get(wilaya.id) ?? null,
          offices: deliveryOffices,
        },
      };
    }
  );

  return {
    company,
    wilayas: wilayasWithDeliveryOptions,
  };
}

/* =========================================================
   ADMIN
   DELIVERY COMPANIES
========================================================= */

// GET ALL COMPANIES

export async function getAdminDeliveryCompanies() {
  return findAllDeliveryCompanies();
}

// GET COMPANY BY ID

export async function getAdminDeliveryCompanyById(
  id: string
) {
  return findDeliveryCompanyById(id);
}

// CREATE COMPANY

export async function createAdminDeliveryCompany(
  input: Omit<CreateDeliveryCompanyData, "id">
) {
  const name = requiredText(input.name, "name");

  const data: CreateDeliveryCompanyData = {
    id: randomUUID(),
    name,
    phone: optionalText(input.phone),
    website_url: optionalText(input.website_url),
    is_active: false,
  };

  await createDeliveryCompany(data);

  // إذا طلبنا إنشاء الشركة نشطة،
  // يتم تفعيلها بعد إنشائها.
  if (input.is_active) {
    await activateAdminDeliveryCompany(data.id);
  }

  return findDeliveryCompanyById(data.id);
}

// UPDATE COMPANY

export async function updateAdminDeliveryCompany(
  id: string,
  input: UpdateDeliveryCompanyData
) {
  const company = await findDeliveryCompanyById(id);

  if (!company) {
    throw new Error("Delivery company not found.");
  }

  const data: UpdateDeliveryCompanyData = {};

  if (input.name !== undefined) {
    data.name = requiredText(input.name, "name");
  }

  if (input.phone !== undefined) {
    data.phone = optionalText(input.phone);
  }

  if (input.website_url !== undefined) {
    data.website_url = optionalText(input.website_url);
  }

  if (Object.keys(data).length > 0) {
    const affectedRows = await updateDeliveryCompany(
      id,
      data
    );

    ensureUpdated(affectedRows, "Delivery company");
  }

  return findDeliveryCompanyById(id);
}

// ACTIVATE COMPANY
// Only one company can be active.

export async function activateAdminDeliveryCompany(
  id: string
) {
  return db.transaction(async (trx) => {
    const company = await findDeliveryCompanyById(
      id,
      trx
    );

    if (!company) {
      throw new Error("Delivery company not found.");
    }

    // تعطيل جميع الشركات.
   await deactivateAllDeliveryCompanies(trx);

    // تفعيل الشركة المطلوبة.
    const affectedRows = await setDeliveryCompanyActive(
      id,
      true,
      trx
    );

    ensureUpdated(affectedRows, "Delivery company");

    return findDeliveryCompanyById(id, trx);
  });
}

// DEACTIVATE COMPANY

export async function deactivateAdminDeliveryCompany(
  id: string
) {
  const company = await findDeliveryCompanyById(id);

  if (!company) {
    throw new Error("Delivery company not found.");
  }

  const affectedRows = await setDeliveryCompanyActive(
    id,
    false
  );

  ensureUpdated(affectedRows, "Delivery company");

  return findDeliveryCompanyById(id);
}

// DELETE COMPANY

export async function deleteAdminDeliveryCompany(
  id: string
) {
  const company = await findDeliveryCompanyById(id);

  if (!company) {
    throw new Error("Delivery company not found.");
  }

  const affectedRows = await deleteDeliveryCompany(id);

  ensureUpdated(affectedRows, "Delivery company");

  return { success: true };
}

/* =========================================================
   ADMIN
   WILAYAS & COMMUNES
========================================================= */

export async function getAdminDeliveryWilayas() {
  return findAllWilayas();
}

export async function getAdminDeliveryCommunes(
  wilayaIds: string[]
) {
  return findActiveCommunes(wilayaIds);
}

/* =========================================================
   ADMIN
   DELIVERY OFFICES
========================================================= */

// GET ALL OFFICES

export async function getAdminDeliveryOffices(
  companyId?: string
) {
  if (companyId) {
    await ensureDeliveryCompanyExists(companyId);
  }

  return findAllDeliveryOffices(companyId);
}

// GET OFFICE BY ID

export async function getAdminDeliveryOfficeById(
  id: string
) {
  return findDeliveryOfficeById(id);
}

// CREATE OFFICE

export async function createAdminDeliveryOffice(
  input: Omit<CreateDeliveryOfficeData, "id">
) {
  await ensureDeliveryCompanyExists(
    input.delivery_company_id
  );

  const data: CreateDeliveryOfficeData = {
    id: randomUUID(),
    delivery_company_id: input.delivery_company_id,
    commune_id: requiredText(input.commune_id, "commune_id"),
	external_office_id: optionalText(input.external_office_id),
    name: requiredText(input.name, "name"),
    address: requiredText(input.address, "address"),
    phone: optionalText(input.phone),
    is_active: input.is_active ?? true,
  };

  await createDeliveryOffice(data);

  return findDeliveryOfficeById(data.id);
}

// UPDATE OFFICE

export async function updateAdminDeliveryOffice(
  id: string,
  input: UpdateDeliveryOfficeData
) {
  const office = await findDeliveryOfficeById(id);

  if (!office) {
    throw new Error("Delivery office not found.");
  }

  const data: UpdateDeliveryOfficeData = {};

  if (input.commune_id !== undefined) {
    data.commune_id = requiredText(
      input.commune_id,
      "commune_id"
    );
  }
  
if (input.external_office_id !== undefined) {
  data.external_office_id = optionalText(
    input.external_office_id
  );
}  

  if (input.name !== undefined) {
    data.name = requiredText(input.name, "name");
  }

  if (input.address !== undefined) {
    data.address = requiredText(input.address, "address");
  }

  if (input.phone !== undefined) {
    data.phone = optionalText(input.phone);
  }

  if (input.is_active !== undefined) {
    data.is_active = input.is_active;
  }

  if (Object.keys(data).length > 0) {
    const affectedRows = await updateDeliveryOffice(
      id,
      data
    );

    ensureUpdated(affectedRows, "Delivery office");
  }

  return findDeliveryOfficeById(id);
}

// ACTIVATE / DEACTIVATE OFFICE

export async function setAdminDeliveryOfficeActive(
  id: string,
  isActive: boolean
) {
  const office = await findDeliveryOfficeById(id);

  if (!office) {
    throw new Error("Delivery office not found.");
  }

  const affectedRows = await setDeliveryOfficeActive(
    id,
    isActive
  );

  ensureUpdated(affectedRows, "Delivery office");

  return findDeliveryOfficeById(id);
}

// DELETE OFFICE

export async function deleteAdminDeliveryOffice(
  id: string
) {
  const office = await findDeliveryOfficeById(id);

  if (!office) {
    throw new Error("Delivery office not found.");
  }

  const affectedRows = await deleteDeliveryOffice(id);

  ensureUpdated(affectedRows, "Delivery office");

  return { success: true };
}

/* =========================================================
   ADMIN
   HOME DELIVERY RATES
========================================================= */

// GET ALL HOME RATES

export async function getAdminHomeDeliveryRates(
  companyId?: string
) {
  if (companyId) {
    await ensureDeliveryCompanyExists(companyId);
  }

  return findAllHomeDeliveryRates(companyId);
}

// GET HOME RATE BY ID

export async function getAdminHomeDeliveryRateById(
  id: string
) {
  return findHomeDeliveryRateById(id);
}

// CREATE HOME RATE

export async function createAdminHomeDeliveryRate(
  input: Omit<CreateDeliveryRateData, "id">
) {
  await ensureDeliveryCompanyExists(
    input.delivery_company_id
  );

  await ensureWilayaExists(input.wilaya_id);

  validatePrice(input.price);

  const data: CreateDeliveryRateData = {
    id: randomUUID(),
    delivery_company_id: input.delivery_company_id,
    wilaya_id: input.wilaya_id,
    price: input.price,
    is_active: input.is_active ?? true,
  };

  await createHomeDeliveryRate(data);

  return findHomeDeliveryRateById(data.id);
}

// UPDATE HOME RATE

export async function updateAdminHomeDeliveryRate(
  id: string,
  input: UpdateDeliveryRateData
) {
  const rate = await findHomeDeliveryRateById(id);

  if (!rate) {
    throw new Error("Home delivery rate not found.");
  }

  const data: UpdateDeliveryRateData = {};

  if (input.price !== undefined) {
    validatePrice(input.price);
    data.price = input.price;
  }

  if (input.is_active !== undefined) {
    data.is_active = input.is_active;
  }

  if (Object.keys(data).length > 0) {
    const affectedRows = await updateHomeDeliveryRate(
      id,
      data
    );

    ensureUpdated(affectedRows, "Home delivery rate");
  }

  return findHomeDeliveryRateById(id);
}

// ACTIVATE / DEACTIVATE HOME RATE

export async function setAdminHomeDeliveryRateActive(
  id: string,
  isActive: boolean
) {
  return updateAdminHomeDeliveryRate(id, {
    is_active: isActive,
  });
}

// DELETE HOME RATE

export async function deleteAdminHomeDeliveryRate(
  id: string
) {
  const rate = await findHomeDeliveryRateById(id);

  if (!rate) {
    throw new Error("Home delivery rate not found.");
  }

  const affectedRows = await deleteHomeDeliveryRate(id);

  ensureUpdated(affectedRows, "Home delivery rate");

  return { success: true };
}

/* =========================================================
   ADMIN
   OFFICE DELIVERY RATES
========================================================= */

// GET ALL OFFICE RATES

export async function getAdminOfficeDeliveryRates(
  companyId?: string
) {
  if (companyId) {
    await ensureDeliveryCompanyExists(companyId);
  }

  return findAllOfficeDeliveryRates(companyId);
}

// GET OFFICE RATE BY ID

export async function getAdminOfficeDeliveryRateById(
  id: string
) {
  return findOfficeDeliveryRateById(id);
}

// CREATE OFFICE RATE

export async function createAdminOfficeDeliveryRate(
  input: Omit<CreateDeliveryRateData, "id">
) {
  await ensureDeliveryCompanyExists(
    input.delivery_company_id
  );

  await ensureWilayaExists(input.wilaya_id);

  validatePrice(input.price);

  const data: CreateDeliveryRateData = {
    id: randomUUID(),
    delivery_company_id: input.delivery_company_id,
    wilaya_id: input.wilaya_id,
    price: input.price,
    is_active: input.is_active ?? true,
  };

  await createOfficeDeliveryRate(data);

  return findOfficeDeliveryRateById(data.id);
}

// UPDATE OFFICE RATE

export async function updateAdminOfficeDeliveryRate(
  id: string,
  input: UpdateDeliveryRateData
) {
  const rate = await findOfficeDeliveryRateById(id);

  if (!rate) {
    throw new Error("Office delivery rate not found.");
  }

  const data: UpdateDeliveryRateData = {};

  if (input.price !== undefined) {
    validatePrice(input.price);
    data.price = input.price;
  }

  if (input.is_active !== undefined) {
    data.is_active = input.is_active;
  }

  if (Object.keys(data).length > 0) {
    const affectedRows = await updateOfficeDeliveryRate(
      id,
      data
    );

    ensureUpdated(affectedRows, "Office delivery rate");
  }

  return findOfficeDeliveryRateById(id);
}

// ACTIVATE / DEACTIVATE OFFICE RATE

export async function setAdminOfficeDeliveryRateActive(
  id: string,
  isActive: boolean
) {
  return updateAdminOfficeDeliveryRate(id, {
    is_active: isActive,
  });
}

// DELETE OFFICE RATE

export async function deleteAdminOfficeDeliveryRate(
  id: string
) {
  const rate = await findOfficeDeliveryRateById(id);

  if (!rate) {
    throw new Error("Office delivery rate not found.");
  }

  const affectedRows = await deleteOfficeDeliveryRate(id);

  ensureUpdated(affectedRows, "Office delivery rate");

  return { success: true };
}
