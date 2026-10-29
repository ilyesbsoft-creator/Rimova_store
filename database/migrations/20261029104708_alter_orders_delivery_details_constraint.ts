import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE orders
    DROP CHECK chk_orders_delivery_details
  `);

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT chk_orders_delivery_details
    CHECK (
      (
        delivery_method = 'HOME'
        AND delivery_office_id IS NULL
      )
      OR
      (
        delivery_method = 'OFFICE'
      )
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE orders
    DROP CHECK chk_orders_delivery_details
  `);

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT chk_orders_delivery_details
    CHECK (
      (
        delivery_method = 'HOME'
        AND delivery_address IS NOT NULL
        AND delivery_office_id IS NULL
      )
      OR
      (
        delivery_method = 'OFFICE'
        AND delivery_office_id IS NOT NULL
      )
    )
  `);
}