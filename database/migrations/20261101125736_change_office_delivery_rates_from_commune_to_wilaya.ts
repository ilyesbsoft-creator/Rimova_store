import type { Knex } from "knex";

const TABLE = "office_delivery_rates";

// =========================================================
// HELPERS
// =========================================================

async function exists(
  knex: Knex,
  tableName: string
): Promise<boolean> {
  const result = await knex.raw(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return Number(result[0][0].total) > 0;
}

async function hasColumn(
  knex: Knex,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const result = await knex.raw(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  return Number(result[0][0].total) > 0;
}

async function hasIndex(
  knex: Knex,
  tableName: string,
  indexName: string
): Promise<boolean> {
  const result = await knex.raw(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
    `,
    [tableName, indexName]
  );

  return Number(result[0][0].total) > 0;
}

async function hasForeignKey(
  knex: Knex,
  tableName: string,
  constraintName: string
): Promise<boolean> {
  const result = await knex.raw(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `,
    [tableName, constraintName]
  );

  return Number(result[0][0].total) > 0;
}

// =========================================================
// UP
// =========================================================

export async function up(knex: Knex): Promise<void> {
  if (!(await exists(knex, TABLE))) {
    return;
  }

  // -------------------------------------------------------
  // 1. التأكد من أن الجدول فارغ
  // -------------------------------------------------------

  const countResult = await knex(TABLE).count("* as total").first();

  if (Number(countResult?.total ?? 0) > 0) {
    throw new Error(
      "Cannot migrate office_delivery_rates: the table must be empty."
    );
  }

  // -------------------------------------------------------
  // 2. حذف Foreign Key القديم الخاص بالبلدية إن وُجد
  // -------------------------------------------------------

  if (await hasForeignKey(knex, TABLE, "fk_office_rates_commune")) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP FOREIGN KEY fk_office_rates_commune
    `);
  }

  // -------------------------------------------------------
  // 3. إضافة Index مستقل لشركة التوصيل
  // -------------------------------------------------------

  if (
    !(await hasIndex(
      knex,
      TABLE,
      "idx_office_rates_company"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD INDEX idx_office_rates_company (delivery_company_id)
    `);
  }

  // -------------------------------------------------------
  // 4. حذف Unique Index القديم
  // -------------------------------------------------------

  if (
    await hasIndex(
      knex,
      TABLE,
      "uq_office_rate_company_commune"
    )
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP INDEX uq_office_rate_company_commune
    `);
  }

  // -------------------------------------------------------
  // 5. حذف Index البلدية القديم إن وُجد
  // -------------------------------------------------------

  if (await hasIndex(knex, TABLE, "fk_office_rates_commune")) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP INDEX fk_office_rates_commune
    `);
  }

  // -------------------------------------------------------
  // 6. حذف commune_id
  // -------------------------------------------------------

  if (await hasColumn(knex, TABLE, "commune_id")) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP COLUMN commune_id
    `);
  }

  // -------------------------------------------------------
  // 7. إضافة wilaya_id
  // -------------------------------------------------------

  if (!(await hasColumn(knex, TABLE, "wilaya_id"))) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD COLUMN wilaya_id VARCHAR(36)
      COLLATE utf8mb4_0900_ai_ci NOT NULL
      AFTER delivery_company_id
    `);
  }

  // -------------------------------------------------------
  // 8. إضافة Unique Index للشركة والولاية
  // -------------------------------------------------------

  if (
    !(await hasIndex(
      knex,
      TABLE,
      "uq_office_rate_company_wilaya"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD UNIQUE INDEX uq_office_rate_company_wilaya
      (delivery_company_id, wilaya_id)
    `);
  }

  // -------------------------------------------------------
  // 9. إضافة Index للولاية
  // -------------------------------------------------------

  if (
    !(await hasIndex(
      knex,
      TABLE,
      "idx_office_rates_wilaya"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD INDEX idx_office_rates_wilaya (wilaya_id)
    `);
  }

  // -------------------------------------------------------
  // 10. إضافة Foreign Key إلى wilayas
  // -------------------------------------------------------

  if (
    !(await hasForeignKey(
      knex,
      TABLE,
      "fk_office_rates_wilaya"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD CONSTRAINT fk_office_rates_wilaya
      FOREIGN KEY (wilaya_id)
      REFERENCES wilayas(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
    `);
  }

  // -------------------------------------------------------
  // 11. التأكد من وجود Foreign Key لشركة التوصيل
  // -------------------------------------------------------

  if (
    !(await hasForeignKey(
      knex,
      TABLE,
      "fk_office_rates_company"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD CONSTRAINT fk_office_rates_company
      FOREIGN KEY (delivery_company_id)
      REFERENCES delivery_companies(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
    `);
  }
}

// =========================================================
// DOWN
// =========================================================

export async function down(knex: Knex): Promise<void> {
  if (!(await exists(knex, TABLE))) {
    return;
  }

  // -------------------------------------------------------
  // 1. التأكد من أن الجدول فارغ
  // -------------------------------------------------------

  const countResult = await knex(TABLE).count("* as total").first();

  if (Number(countResult?.total ?? 0) > 0) {
    throw new Error(
      "Cannot rollback office_delivery_rates migration: the table must be empty."
    );
  }

  // -------------------------------------------------------
  // 2. حذف Foreign Key الخاص بالولاية
  // -------------------------------------------------------

  if (
    await hasForeignKey(
      knex,
      TABLE,
      "fk_office_rates_wilaya"
    )
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP FOREIGN KEY fk_office_rates_wilaya
    `);
  }

  // -------------------------------------------------------
  // 3. حذف Index الولاية
  // -------------------------------------------------------

  if (await hasIndex(knex, TABLE, "idx_office_rates_wilaya")) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP INDEX idx_office_rates_wilaya
    `);
  }

  // -------------------------------------------------------
  // 4. حذف Unique Index الجديد
  // -------------------------------------------------------

  if (
    await hasIndex(
      knex,
      TABLE,
      "uq_office_rate_company_wilaya"
    )
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP INDEX uq_office_rate_company_wilaya
    `);
  }

  // -------------------------------------------------------
  // 5. حذف wilaya_id
  // -------------------------------------------------------

  if (await hasColumn(knex, TABLE, "wilaya_id")) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP COLUMN wilaya_id
    `);
  }

  // -------------------------------------------------------
  // 6. إعادة commune_id
  // -------------------------------------------------------

  if (!(await hasColumn(knex, TABLE, "commune_id"))) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD COLUMN commune_id VARCHAR(36)
      COLLATE utf8mb4_0900_ai_ci NOT NULL
      AFTER delivery_company_id
    `);
  }

  // -------------------------------------------------------
  // 7. إعادة Unique Index القديم
  // -------------------------------------------------------

  if (
    !(await hasIndex(
      knex,
      TABLE,
      "uq_office_rate_company_commune"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD UNIQUE INDEX uq_office_rate_company_commune
      (delivery_company_id, commune_id)
    `);
  }

  // -------------------------------------------------------
  // 8. حذف Index الشركة المضاف في up
  // -------------------------------------------------------

  if (await hasIndex(knex, TABLE, "idx_office_rates_company")) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      DROP INDEX idx_office_rates_company
    `);
  }

  // -------------------------------------------------------
  // 9. إعادة Foreign Key الخاص بالبلدية
  // -------------------------------------------------------

  if (
    !(await hasForeignKey(
      knex,
      TABLE,
      "fk_office_rates_commune"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD CONSTRAINT fk_office_rates_commune
      FOREIGN KEY (commune_id)
      REFERENCES communes(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
    `);
  }

  // -------------------------------------------------------
  // 10. التأكد من وجود Foreign Key لشركة التوصيل
  // -------------------------------------------------------

  if (
    !(await hasForeignKey(
      knex,
      TABLE,
      "fk_office_rates_company"
    ))
  ) {
    await knex.raw(`
      ALTER TABLE ${TABLE}
      ADD CONSTRAINT fk_office_rates_company
      FOREIGN KEY (delivery_company_id)
      REFERENCES delivery_companies(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
    `);
  }
}