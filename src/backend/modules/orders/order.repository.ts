
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


/* =========================================================
   ADMIN ORDER MANAGEMENT
========================================================= */

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export type AdminOrderFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  delivery_method?: "HOME" | "OFFICE";
  delivery_company_id?: string;
  wilaya_id?: string;
  commune_id?: string;
  date_from?: string;
  date_to?: string;
  sort?: "newest" | "oldest" | "total_asc" | "total_desc";
};

export type AdminOrderRow = {
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
  delivery_fee: string | number;
  subtotal: string | number;
  total_amount: string | number;
  status: OrderStatus;
  customer_note: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  wilaya_name?: string;
  commune_name?: string;
  delivery_company_name?: string;
  delivery_office_name?: string | null;
};

export type AdminOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: string | number;
  line_total: string | number;
  created_at: Date | string;
};

export type AdminOrderDetails = AdminOrderRow & {
  items: AdminOrderItemRow[];
};

export type UpdateOrderCustomerData = {
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone?: string;
  customer_note?: string | null;
};

export type OrderStatisticsRow = {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  total_revenue: string | number;
  delivered_revenue: string | number;
};

export type OrderInventoryRow = {
  id: string;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: number;
};

/* =========================================================
   ADMIN ORDER QUERIES
========================================================= */

function buildAdminOrdersQuery(
  connection: DatabaseConnection,
  filters: AdminOrderFilters
) {
  const query = connection("orders as o")
    .leftJoin("wilayas as w", "w.id", "o.wilaya_id")
    .leftJoin("communes as c", "c.id", "o.commune_id")
    .leftJoin(
      "delivery_companies as dc",
      "dc.id",
      "o.delivery_company_id"
    )
    .leftJoin(
      "delivery_offices as do",
      "do.id",
      "o.delivery_office_id"
    )
    .select(
      "o.*",
      "w.name as wilaya_name",
      "c.name as commune_name",
      "dc.name as delivery_company_name",
      "do.name as delivery_office_name"
    );

  if (filters.status) {
    query.where("o.status", filters.status);
  }

  if (filters.delivery_method) {
    query.where("o.delivery_method", filters.delivery_method);
  }

  if (filters.delivery_company_id) {
    query.where(
      "o.delivery_company_id",
      filters.delivery_company_id
    );
  }

  if (filters.wilaya_id) {
    query.where("o.wilaya_id", filters.wilaya_id);
  }

  if (filters.commune_id) {
    query.where("o.commune_id", filters.commune_id);
  }

  if (filters.date_from) {
    query.where("o.created_at", ">=", filters.date_from);
  }

  if (filters.date_to) {
    query.where("o.created_at", "<=", filters.date_to);
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;

    query.where((builder) => {
      builder
        .where("o.order_number", "like", search)
        .orWhere("o.customer_first_name", "like", search)
        .orWhere("o.customer_last_name", "like", search)
        .orWhere("o.customer_phone", "like", search);
    });
  }

  return query;
}

export async function findOrdersPaginated(
  filters: AdminOrderFilters
) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const baseQuery = buildAdminOrdersQuery(db, filters);

  const countQuery = db("orders as o").count({
    total: "o.id",
  });

  if (filters.status) {
    countQuery.where("o.status", filters.status);
  }

  if (filters.delivery_method) {
    countQuery.where("o.delivery_method", filters.delivery_method);
  }

  if (filters.delivery_company_id) {
    countQuery.where(
      "o.delivery_company_id",
      filters.delivery_company_id
    );
  }

  if (filters.wilaya_id) {
    countQuery.where("o.wilaya_id", filters.wilaya_id);
  }

  if (filters.commune_id) {
    countQuery.where("o.commune_id", filters.commune_id);
  }

  if (filters.date_from) {
    countQuery.where("o.created_at", ">=", filters.date_from);
  }

  if (filters.date_to) {
    countQuery.where("o.created_at", "<=", filters.date_to);
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;

    countQuery.where((builder) => {
      builder
        .where("o.order_number", "like", search)
        .orWhere("o.customer_first_name", "like", search)
        .orWhere("o.customer_last_name", "like", search)
        .orWhere("o.customer_phone", "like", search);
    });
  }

  const sort = filters.sort ?? "newest";

  switch (sort) {
    case "oldest":
      baseQuery.orderBy("o.created_at", "asc");
      break;

    case "total_asc":
      baseQuery.orderBy("o.total_amount", "asc");
      break;

    case "total_desc":
      baseQuery.orderBy("o.total_amount", "desc");
      break;

    default:
      baseQuery.orderBy("o.created_at", "desc");
  }

  const [orders, countResult] = await Promise.all([
    baseQuery.limit(limit).offset(offset),
    countQuery.first(),
  ]);

  return {
    data: orders as AdminOrderRow[],
    pagination: {
      page,
      limit,
      total: Number(countResult?.total ?? 0),
      total_pages: Math.ceil(
        Number(countResult?.total ?? 0) / limit
      ),
    },
  };
}

/* =========================================================
   ORDER DETAILS
========================================================= */

export async function findAdminOrderById(
  orderId: string,
  connection: DatabaseConnection = db
): Promise<AdminOrderRow | undefined> {
  return connection("orders as o")
    .leftJoin("wilayas as w", "w.id", "o.wilaya_id")
    .leftJoin("communes as c", "c.id", "o.commune_id")
    .leftJoin(
      "delivery_companies as dc",
      "dc.id",
      "o.delivery_company_id"
    )
    .leftJoin(
      "delivery_offices as do",
      "do.id",
      "o.delivery_office_id"
    )
    .select(
      "o.*",
      "w.name as wilaya_name",
      "c.name as commune_name",
      "dc.name as delivery_company_name",
      "do.name as delivery_office_name"
    )
    .where("o.id", orderId)
    .first();
}

export async function findOrderForUpdate(
  orderId: string,
  trx: Knex.Transaction
): Promise<AdminOrderRow | undefined> {
  return trx<AdminOrderRow>("orders")
    .where("id", orderId)
    .forUpdate()
    .first();
}

export async function findAdminOrderItems(
  orderId: string,
  connection: DatabaseConnection = db
): Promise<AdminOrderItemRow[]> {
  return connection<AdminOrderItemRow>("order_items")
    .select("*")
    .where("order_id", orderId)
    .orderBy("created_at", "asc");
}

export async function findOrderInventoryItems(
  orderId: string,
  trx: Knex.Transaction
): Promise<OrderInventoryRow[]> {
  return trx<OrderInventoryRow>("order_items")
    .select(
      "id",
      "product_id",
      "product_variant_id",
      "quantity"
    )
    .where("order_id", orderId)
    .forUpdate();
}

/* =========================================================
   ORDER UPDATES
========================================================= */

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  trx: Knex.Transaction
): Promise<void> {
  await trx("orders")
    .where("id", orderId)
    .update({
      status,
      updated_at: trx.fn.now(),
    });
}

export async function updateOrderCustomer(
  orderId: string,
  data: UpdateOrderCustomerData,
  trx: Knex.Transaction
): Promise<void> {
  await trx("orders")
    .where("id", orderId)
    .update({
      ...data,
      updated_at: trx.fn.now(),
    });
}

/* =========================================================
   INVENTORY RESTORATION
========================================================= */

export async function increaseProductStock(
  productId: string,
  quantity: number,
  trx: Knex.Transaction
): Promise<void> {
  await trx("products")
    .where("id", productId)
    .increment("stock_quantity", quantity);
}

export async function increaseVariantStock(
  variantId: string,
  quantity: number,
  trx: Knex.Transaction
): Promise<void> {
  await trx("product_variants")
    .where("id", variantId)
    .increment("stock_quantity", quantity);
}

/* =========================================================
   ORDER ITEMS ADMIN OPERATIONS
========================================================= */

export async function findOrderItemForUpdate(
  itemId: string,
  orderId: string,
  trx: Knex.Transaction
): Promise<AdminOrderItemRow | undefined> {
  return trx<AdminOrderItemRow>("order_items")
    .where("id", itemId)
    .where("order_id", orderId)
    .forUpdate()
    .first();
}

export async function insertAdminOrderItem(
  item: NewOrderItemRow,
  trx: Knex.Transaction
): Promise<void> {
  await trx("order_items").insert(item);
}

export async function updateAdminOrderItemQuantity(
  itemId: string,
  orderId: string,
  quantity: number,
  trx: Knex.Transaction
): Promise<void> {
  await trx("order_items")
    .where("id", itemId)
    .where("order_id", orderId)
    .update({ quantity });
}

export async function deleteAdminOrderItem(
  itemId: string,
  orderId: string,
  trx: Knex.Transaction
): Promise<void> {
  await trx("order_items")
    .where("id", itemId)
    .where("order_id", orderId)
    .delete();
}

export async function calculateOrderSubtotal(
  orderId: string,
  trx: Knex.Transaction
): Promise<number> {
  const result = await trx("order_items")
    .where("order_id", orderId)
    .sum({ subtotal: trx.raw("quantity * unit_price") })
    .first();

  return Number(result?.subtotal ?? 0);
}

/* =========================================================
   ORDER STATISTICS
========================================================= */

export async function findOrderStatistics(
  dateFrom?: string,
  dateTo?: string
): Promise<OrderStatisticsRow> {
  const query = db("orders");

  if (dateFrom) {
    query.where("created_at", ">=", dateFrom);
  }

  if (dateTo) {
    query.where("created_at", "<=", dateTo);
  }

  const result = await query
    .select(
      db.raw("COUNT(*) as total_orders"),
      db.raw(
        "SUM(status = 'PENDING') as pending_orders"
      ),
      db.raw(
        "SUM(status = 'CONFIRMED') as confirmed_orders"
      ),
      db.raw(
        "SUM(status = 'PROCESSING') as processing_orders"
      ),
      db.raw(
        "SUM(status = 'SHIPPED') as shipped_orders"
      ),
      db.raw(
        "SUM(status = 'DELIVERED') as delivered_orders"
      ),
      db.raw(
        "SUM(status = 'CANCELLED') as cancelled_orders"
      ),
      db.raw(
        "SUM(status = 'RETURNED') as returned_orders"
      ),
      db.raw(
        "COALESCE(SUM(total_amount), 0) as total_revenue"
      ),
      db.raw(
        "COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total_amount ELSE 0 END), 0) as delivered_revenue"
      )
    )
    .first();

  return {
    total_orders: Number(result?.total_orders ?? 0),
    pending_orders: Number(result?.pending_orders ?? 0),
    confirmed_orders: Number(result?.confirmed_orders ?? 0),
    processing_orders: Number(result?.processing_orders ?? 0),
    shipped_orders: Number(result?.shipped_orders ?? 0),
    delivered_orders: Number(result?.delivered_orders ?? 0),
    cancelled_orders: Number(result?.cancelled_orders ?? 0),
    returned_orders: Number(result?.returned_orders ?? 0),
    total_revenue: Number(result?.total_revenue ?? 0),
    delivered_revenue: Number(result?.delivered_revenue ?? 0),
  };
}

/* =========================================================
   UPDATE ORDER DELIVERY
========================================================= */

export type UpdateOrderDeliveryData = {
  wilaya_id: string;
  commune_id: string;
  delivery_company_id: string;
  delivery_method: "HOME" | "OFFICE";
  delivery_office_id: string | null;
  delivery_address: string | null;
  delivery_fee: number;
  total_amount: number;
};

export async function updateOrderDelivery(
  orderId: string,
  data: UpdateOrderDeliveryData,
  trx: Knex.Transaction
): Promise<void> {
  await trx("orders")
    .where("id", orderId)
    .update({
      wilaya_id: data.wilaya_id,
      commune_id: data.commune_id,
      delivery_company_id: data.delivery_company_id,
      delivery_method: data.delivery_method,
      delivery_office_id: data.delivery_office_id,
      delivery_address: data.delivery_address,
      delivery_fee: data.delivery_fee,
      total_amount: data.total_amount,
      updated_at: trx.fn.now(),
    });
}
