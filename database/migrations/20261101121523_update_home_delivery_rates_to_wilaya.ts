
import type { Knex } from "knex";

/* =========================================================
   HELPERS
========================================================= */

async function exists(
  knex: Knex,
  sql: string,
  bindings: Knex.RawBinding[]
): Promise<boolean> {
  const [rows] = await knex.raw(sql, bindings);
  return rows.length > 0;
}

async function hasColumn(
  knex: Knex,
  table: string,
  column: string
): Promise<boolean> {
  return exists(
    knex,
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );
}

async function hasIndex(
  knex: Knex,
  table: string,
  index: string
): Promise<boolean> {
  return exists(
    knex,
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [table, index]
  );
}

async function hasForeignKey(
  knex: Knex,
  table: string,
  constraint: string
): Promise<boolean> {
  return exists(
    knex,
    `SELECT 1
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [table, constraint]
  );
}

/* =========================================================
   UP
========================================================= */

export async function up(knex: Knex): Promise<void> {
  /* -------------------------------------------------------
     1. Remove old commune foreign key
  ------------------------------------------------------- */

  if (
    await hasForeignKey(
      knex,
      "home_delivery_rates",
      "fk_home_rates_commune"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP FOREIGN KEY fk_home_rates_commune
    `);
  }

  /* -------------------------------------------------------
     2. Preserve company foreign key index
  ------------------------------------------------------- */

  if (
    !(await hasIndex(
      knex,
      "home_delivery_rates",
      "idx_home_rates_company"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD INDEX idx_home_rates_company (delivery_company_id)
    `);
  }

  /* -------------------------------------------------------
     3. Remove old unique index
  ------------------------------------------------------- */

  if (
    await hasIndex(
      knex,
      "home_delivery_rates",
      "uq_home_rate_company_commune"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP INDEX uq_home_rate_company_commune
    `);
  }

  /* -------------------------------------------------------
     4. Remove old commune index
  ------------------------------------------------------- */

  if (
    await hasIndex(
      knex,
      "home_delivery_rates",
      "fk_home_rates_commune"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP INDEX fk_home_rates_commune
    `);
  }

  /* -------------------------------------------------------
     5. Remove commune_id
  ------------------------------------------------------- */

  if (
    await hasColumn(
      knex,
      "home_delivery_rates",
      "commune_id"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP COLUMN commune_id
    `);
  }

  /* -------------------------------------------------------
     6. Add wilaya_id
  ------------------------------------------------------- */

  if (
    !(await hasColumn(
      knex,
      "home_delivery_rates",
      "wilaya_id"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD COLUMN wilaya_id VARCHAR(36)
        COLLATE utf8mb4_0900_ai_ci
        NOT NULL AFTER delivery_company_id
    `);
  }

  /* -------------------------------------------------------
     7. Add unique company + wilaya index
  ------------------------------------------------------- */

  if (
    !(await hasIndex(
      knex,
      "home_delivery_rates",
      "uq_home_rate_company_wilaya"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD UNIQUE INDEX uq_home_rate_company_wilaya
      (delivery_company_id, wilaya_id)
    `);
  }

  /* -------------------------------------------------------
     8. Add wilaya index
  ------------------------------------------------------- */

  if (
    !(await hasIndex(
      knex,
      "home_delivery_rates",
      "idx_home_rates_wilaya"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD INDEX idx_home_rates_wilaya (wilaya_id)
    `);
  }

  /* -------------------------------------------------------
     9. Add wilaya foreign key
  ------------------------------------------------------- */

  if (
    !(await hasForeignKey(
      knex,
      "home_delivery_rates",
      "fk_home_rates_wilaya"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD CONSTRAINT fk_home_rates_wilaya
      FOREIGN KEY (wilaya_id)
      REFERENCES wilayas(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
    `);
  }

  /* -------------------------------------------------------
     10. Allow duplicate commune postal codes
  ------------------------------------------------------- */

  if (
    await hasIndex(
      knex,
      "communes",
      "uq_communes_code"
    )
  ) {
    await knex.raw(`
      ALTER TABLE communes
      DROP INDEX uq_communes_code
    `);
  }

  if (
    !(await hasIndex(
      knex,
      "communes",
      "idx_communes_code"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE communes
      ADD INDEX idx_communes_code (code)
    `);
  }
}

/* =========================================================
   DOWN
========================================================= */

export async function down(knex: Knex): Promise<void> {
  /* -------------------------------------------------------
     1. Remove wilaya foreign key
  ------------------------------------------------------- */

  if (
    await hasForeignKey(
      knex,
      "home_delivery_rates",
      "fk_home_rates_wilaya"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP FOREIGN KEY fk_home_rates_wilaya
    `);
  }

  /* -------------------------------------------------------
     2. Remove new indexes
  ------------------------------------------------------- */

  if (
    await hasIndex(
      knex,
      "home_delivery_rates",
      "uq_home_rate_company_wilaya"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP INDEX uq_home_rate_company_wilaya
    `);
  }

  if (
    await hasIndex(
      knex,
      "home_delivery_rates",
      "idx_home_rates_wilaya"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP INDEX idx_home_rates_wilaya
    `);
  }

  /* -------------------------------------------------------
     3. Remove wilaya_id
  ------------------------------------------------------- */

  if (
    await hasColumn(
      knex,
      "home_delivery_rates",
      "wilaya_id"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP COLUMN wilaya_id
    `);
  }

  /* -------------------------------------------------------
     4. Restore commune_id
  ------------------------------------------------------- */

  if (
    !(await hasColumn(
      knex,
      "home_delivery_rates",
      "commune_id"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD COLUMN commune_id VARCHAR(36)
        COLLATE utf8mb4_0900_ai_ci
        NOT NULL AFTER delivery_company_id
    `);
  }

  /* -------------------------------------------------------
     5. Restore company + commune unique index
  ------------------------------------------------------- */

  if (
    !(await hasIndex(
      knex,
      "home_delivery_rates",
      "uq_home_rate_company_commune"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD UNIQUE INDEX uq_home_rate_company_commune
      (delivery_company_id, commune_id)
    `);
  }

  /* -------------------------------------------------------
     6. Restore commune index
  ------------------------------------------------------- */

  if (
    !(await hasIndex(
      knex,
      "home_delivery_rates",
      "fk_home_rates_commune"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD INDEX fk_home_rates_commune (commune_id)
    `);
  }

  /* -------------------------------------------------------
     7. Restore commune foreign key
  ------------------------------------------------------- */

  if (
    !(await hasForeignKey(
      knex,
      "home_delivery_rates",
      "fk_home_rates_commune"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      ADD CONSTRAINT fk_home_rates_commune
      FOREIGN KEY (commune_id)
      REFERENCES communes(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
    `);
  }

  /* -------------------------------------------------------
     8. Remove temporary company index
  ------------------------------------------------------- */

  if (
    await hasIndex(
      knex,
      "home_delivery_rates",
      "idx_home_rates_company"
    )
  ) {
    await knex.raw(`
      ALTER TABLE home_delivery_rates
      DROP INDEX idx_home_rates_company
    `);
  }

  /* -------------------------------------------------------
     9. Restore unique commune codes
  ------------------------------------------------------- */

  if (
    await hasIndex(
      knex,
      "communes",
      "idx_communes_code"
    )
  ) {
    await knex.raw(`
      ALTER TABLE communes
      DROP INDEX idx_communes_code
    `);
  }

  if (
    !(await hasIndex(
      knex,
      "communes",
      "uq_communes_code"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE communes
      ADD UNIQUE INDEX uq_communes_code (code)
    `);
  }
}
