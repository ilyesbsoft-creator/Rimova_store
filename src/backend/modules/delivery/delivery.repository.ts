
import db from "../../database/knex";
import type { Knex } from "knex";

type DatabaseConnection = Knex | Knex.Transaction;

export type DeliveryCompanyRow = {
  id: string;
  name: string;
  phone: string | null;
  website_url: string | null;
  is_active: boolean | number;
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
  name: string;
  address: string;
  phone: string | null;
};

export type DeliveryRateRow = {
  id: string;
  delivery_company_id: string;
  commune_id: string;
  price: string | number;
};

export async function findFirstActiveDeliveryCompany(
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

export async function findActiveWilayas(
  connection: DatabaseConnection = db
): Promise<WilayaRow[]> {
  return connection<WilayaRow>("wilayas")
    .select("id", "code", "name")
    .where("is_active", true)
    .orderBy("name", "asc");
}

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
    .orderBy("name", "asc");
}

export async function findActiveDeliveryOffices(
  companyId: string,
  connection: DatabaseConnection = db
): Promise<DeliveryOfficeRow[]> {
  return connection<DeliveryOfficeRow>("delivery_offices")
    .select(
      "id",
      "delivery_company_id",
      "commune_id",
      "name",
      "address",
      "phone"
    )
    .where("delivery_company_id", companyId)
    .where("is_active", true)
    .orderBy("name", "asc");
}

export async function findActiveHomeDeliveryRates(
  companyId: string,
  connection: DatabaseConnection = db
): Promise<DeliveryRateRow[]> {
  return connection<DeliveryRateRow>("home_delivery_rates")
    .select(
      "id",
      "delivery_company_id",
      "commune_id",
      "price"
    )
    .where("delivery_company_id", companyId)
    .where("is_active", true);
}

export async function findActiveOfficeDeliveryRates(
  companyId: string,
  connection: DatabaseConnection = db
): Promise<DeliveryRateRow[]> {
  return connection<DeliveryRateRow>("office_delivery_rates")
    .select(
      "id",
      "delivery_company_id",
      "commune_id",
      "price"
    )
    .where("delivery_company_id", companyId)
    .where("is_active", true);
}
