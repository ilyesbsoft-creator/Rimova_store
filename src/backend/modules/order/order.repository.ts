
import db from "../../database/knex";
import type { Knex } from "knex";

type DatabaseConnection = Knex | Knex.Transaction;

export type NewOrderRow = {
  id: string;
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  wilaya_id: string;
  commune_id: string;
  delivery_company_id: string;
  delivery_method: "HOME" | "OFFICE";
  delivery_office_id: string | null;
  delivery_address: string | null;
  delivery_fee: number;
  subtotal: number;
  total_amount: number;
  status: "PENDING";
  customer_note: string | null;
};

export type NewOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_variant_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
};

export type OrderProductRow = {
  id: string;
  name: string;
  sku: string | null;
  price: string | number;
  stock_quantity: number;
  is_active: boolean | number;
};

export type OrderVariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  price: string | number | null;
  stock_quantity: number;
  is_active: boolean | number;
};

export type OrderDeliveryRateRow = {
  price: string | number;
};

export async function findActiveProductForOrder(
  productId: string,
  trx: Knex.Transaction
): Promise<OrderProductRow | undefined> {
  return trx<OrderProductRow>("products")
    .select(
      "id",
      "name",
      "sku",
      "price",
      "stock_quantity",
      "is_active"
    )
    .where("id", productId)
    .where("is_active", true)
    .forUpdate()
    .first();
}

export async function findActiveVariantForOrder(
  productId: string,
  variantId: string,
  trx: Knex.Transaction
): Promise<OrderVariantRow | undefined> {
  return trx<OrderVariantRow>("product_variants")
    .select(
      "id",
      "product_id",
      "sku",
      "price",
      "stock_quantity",
      "is_active"
    )
    .where("id", variantId)
    .where("product_id", productId)
    .where("is_active", true)
    .forUpdate()
    .first();
}

export async function decreaseProductStock(
  productId: string,
  quantity: number,
  trx: Knex.Transaction
): Promise<void> {
  const affectedRows = await trx("products")
    .where("id", productId)
    .where("stock_quantity", ">=", quantity)
    .decrement("stock_quantity", quantity);

  if (affectedRows !== 1) {
    throw new Error("INSUFFICIENT_STOCK");
  }
}

export async function decreaseVariantStock(
  variantId: string,
  quantity: number,
  trx: Knex.Transaction
): Promise<void> {
  const affectedRows = await trx("product_variants")
    .where("id", variantId)
    .where("stock_quantity", ">=", quantity)
    .decrement("stock_quantity", quantity);

  if (affectedRows !== 1) {
    throw new Error("INSUFFICIENT_STOCK");
  }
}

export async function findActiveDeliveryCompany(
  companyId: string,
  trx: Knex.Transaction
) {
  return trx("delivery_companies")
    .select("id", "name")
    .where("id", companyId)
    .where("is_active", true)
    .first();
}

export async function findActiveCommuneInWilaya(
  communeId: string,
  wilayaId: string,
  trx: Knex.Transaction
) {
  return trx("communes as c")
    .join("wilayas as w", "w.id", "c.wilaya_id")
    .select("c.id", "c.wilaya_id")
    .where("c.id", communeId)
    .where("c.wilaya_id", wilayaId)
    .where("c.is_active", true)
    .where("w.is_active", true)
    .first();
}

export async function findActiveHomeDeliveryRate(
  companyId: string,
  communeId: string,
  trx: Knex.Transaction
): Promise<OrderDeliveryRateRow | undefined> {
  return trx<OrderDeliveryRateRow>("home_delivery_rates")
    .select("price")
    .where("delivery_company_id", companyId)
    .where("commune_id", communeId)
    .where("is_active", true)
    .first();
}

export async function findActiveOfficeDeliveryRate(
  companyId: string,
  communeId: string,
  trx: Knex.Transaction
): Promise<OrderDeliveryRateRow | undefined> {
  return trx<OrderDeliveryRateRow>("office_delivery_rates")
    .select("price")
    .where("delivery_company_id", companyId)
    .where("commune_id", communeId)
    .where("is_active", true)
    .first();
}

export async function findActiveDeliveryOffice(
  officeId: string,
  companyId: string,
  communeId: string,
  trx: Knex.Transaction
) {
  return trx("delivery_offices")
    .select("id", "name", "address")
    .where("id", officeId)
    .where("delivery_company_id", companyId)
    .where("commune_id", communeId)
    .where("is_active", true)
    .first();
}

export async function insertOrder(
  order: NewOrderRow,
  trx: Knex.Transaction
): Promise<void> {
  await trx("orders").insert(order);
}

export async function insertOrderItems(
  items: NewOrderItemRow[],
  trx: Knex.Transaction
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  await trx("order_items").insert(items);
}
