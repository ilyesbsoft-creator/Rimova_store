
"use strict";

/**
 * ============================================================
 * ALGERIA ADMINISTRATIVE DIVISIONS SQL GENERATOR
 * ============================================================
 *
 * Source:
 * https://github.com/me-yasserzaouag/algeria-wilayas-communes
 *
 * Input:
 *   data/wilayas.json
 *   data/communes.json
 *
 * Output:
 *   seed-algeria-69-wilayas.sql
 *
 * Database:
 *   MySQL 8+
 *
 * Tables:
 *   wilayas
 *   communes
 *
 * Requirements:
 *   Node.js 18+
 *   No external dependencies
 * ============================================================
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  dataDirectory: path.join(__dirname, "data"),

  wilayasFile: "wilayas.json",

  communesFile: "communes.json",

  outputFile: path.join(
    __dirname,
    "seed-algeria-69-wilayas.sql"
  ),

  expectedWilayas: 69,

  batchSize: 100,

  defaultActive: 1,
};

// ============================================================
// UTILITIES
// ============================================================

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");

    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Cannot read JSON file ${filePath}: ${error.message}`
    );
  }
}

function generateUUID() {
  return crypto.randomUUID();
}

function normalizeCode(value, length = 2) {
  return String(value).trim().padStart(length, "0");
}

function escapeSqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  const escaped = String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z");

  return `'${escaped}'`;
}

function chunkArray(items, size) {
  const chunks = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function validateArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(
      `${name} must contain a JSON array.`
    );
  }

  if (value.length === 0) {
    throw new Error(
      `${name} is empty.`
    );
  }
}

// ============================================================
// LOAD SOURCE DATA
// ============================================================

function loadSourceData() {
  console.log("\nLoading source files...\n");

  const wilayasPath = path.join(
    CONFIG.dataDirectory,
    CONFIG.wilayasFile
  );

  const communesPath = path.join(
    CONFIG.dataDirectory,
    CONFIG.communesFile
  );

  const wilayas = readJsonFile(wilayasPath);

  const communes = readJsonFile(communesPath);

  validateArray(wilayas, "Wilayas");

  validateArray(communes, "Communes");

  console.log(
    `Loaded ${wilayas.length} wilayas.`
  );

  console.log(
    `Loaded ${communes.length} communes.`
  );

  return {
    wilayas,
    communes,
  };
}

// ============================================================
// NORMALIZE WILAYAS
// ============================================================

function normalizeWilayas(sourceWilayas) {
  const result = [];

  const codes = new Set();

  for (const item of sourceWilayas) {
    const code = normalizeCode(item.code);

    const name = `${item.name} - ${item.name_ar}`;

    if (!/^\d{2}$/.test(code)) {
      throw new Error(
        `Invalid wilaya code: ${item.code}`
      );
    }

    if (!name || !String(name).trim()) {
      throw new Error(
        `Missing Arabic name for wilaya ${code}`
      );
    }

    if (codes.has(code)) {
      throw new Error(
        `Duplicate wilaya code: ${code}`
      );
    }

    codes.add(code);

    result.push({
      id: generateUUID(),
      code,
      name: String(name).trim(),
      is_active: CONFIG.defaultActive,
    });
  }

  result.sort(
    (a, b) => Number(a.code) - Number(b.code)
  );

  if (result.length !== CONFIG.expectedWilayas) {
    throw new Error(
      `Expected ${CONFIG.expectedWilayas} wilayas, found ${result.length}.`
    );
  }

  for (
    let i = 1;
    i <= CONFIG.expectedWilayas;
    i++
  ) {
    const expectedCode = normalizeCode(i);

    if (!codes.has(expectedCode)) {
      throw new Error(
        `Missing wilaya code: ${expectedCode}`
      );
    }
  }

  return result;
}

// ============================================================
// NORMALIZE COMMUNES
// ============================================================

// ============================================================
// NORMALIZE COMMUNES
// ============================================================

function normalizeCommunes(
  sourceCommunes,
  wilayas
) {
  const result = [];

  const wilayaCodes = new Set(
    wilayas.map((w) => w.code)
  );

  for (const item of sourceCommunes) {
    const wilayaCode = normalizeCode(
      item.wilaya_code
    );

    const communeCode = String(
      item.post_code ?? ""
    ).trim();

    const name = item.name;

    if (!wilayaCodes.has(wilayaCode)) {
      throw new Error(
        `Commune references unknown wilaya: ${wilayaCode}`
      );
    }

    if (!communeCode) {
      throw new Error(
        `Missing post_code for commune: ${name}`
      );
    }

    if (!name || !String(name).trim()) {
      throw new Error(
        `Missing Arabic name for commune code: ${communeCode}`
      );
    }

    result.push({
      id: generateUUID(),
      wilaya_code: wilayaCode,
      code: communeCode,
      name: String(name).trim(),
      is_active: CONFIG.defaultActive,
    });
  }

  return result;
}

// ============================================================
// SQL GENERATION
// ============================================================

function generateWilayasSQL(wilayas) {
  const lines = [];

  lines.push(
    "-- ========================================================"
  );

  lines.push(
    "-- 1. INSERT / UPDATE WILAYAS"
  );

  lines.push(
    "-- ========================================================"
  );

  for (
    const group of chunkArray(
      wilayas,
      CONFIG.batchSize
    )
  ) {
    lines.push("");

    lines.push(
      "INSERT INTO `wilayas`"
    );

    lines.push(
      "(`id`, `code`, `name`, `is_active`)"
    );

    lines.push("VALUES");

    const values = group.map((wilaya) => {
      return (
        `(${escapeSqlString(wilaya.id)}, ` +
        `${escapeSqlString(wilaya.code)}, ` +
        `${escapeSqlString(wilaya.name)}, ` +
        `${wilaya.is_active})`
      );
    });

    lines.push(values.join(",\n"));

    lines.push(
      "ON DUPLICATE KEY UPDATE"
    );

    lines.push(
      "`name` = VALUES(`name`),"
    );

    lines.push(
      "`is_active` = VALUES(`is_active`);"
    );
  }

  return lines.join("\n");
}

function generateCommunesSQL(communes) {
  const lines = [];

  lines.push("");

  lines.push(
    "-- ========================================================"
  );

  lines.push(
    "-- 2. INSERT / UPDATE COMMUNES"
  );

  lines.push(
    "-- ========================================================"
  );

  for (
    const group of chunkArray(
      communes,
      CONFIG.batchSize
    )
  ) {
    lines.push("");

    lines.push(
      "INSERT INTO `communes`"
    );

    lines.push(
      "(`id`, `wilaya_id`, `code`, `name`, `is_active`)"
    );

    lines.push("VALUES");

    const values = group.map((commune) => {
      const wilayaSubquery =
        "(SELECT w.`id` " +
        "FROM `wilayas` AS w " +
        `WHERE w.\`code\` = ${escapeSqlString(commune.wilaya_code)} ` +
        "LIMIT 1)";

      return (
        `(${escapeSqlString(commune.id)}, ` +
        `${wilayaSubquery}, ` +
        `${escapeSqlString(commune.code)}, ` +
        `${escapeSqlString(commune.name)}, ` +
        `${commune.is_active})`
      );
    });

    lines.push(values.join(",\n"));

    lines.push(
      "ON DUPLICATE KEY UPDATE"
    );

    lines.push(
      "`wilaya_id` = VALUES(`wilaya_id`),"
    );

    lines.push(
      "`name` = VALUES(`name`),"
    );

    lines.push(
      "`is_active` = VALUES(`is_active`);"
    );
  }

  return lines.join("\n");
}

// ============================================================
// VERIFICATION SQL
// ============================================================

function generateVerificationSQL() {
  return `
-- ========================================================
-- 3. DATA VERIFICATION
-- ========================================================

-- Total wilayas
SELECT
    COUNT(*) AS total_wilayas
FROM wilayas;

-- Total communes
SELECT
    COUNT(*) AS total_communes
FROM communes;

-- Number of communes per wilaya
SELECT
    w.code AS wilaya_code,
    w.name AS wilaya_name,
    COUNT(c.id) AS communes_count
FROM wilayas w
LEFT JOIN communes c
    ON c.wilaya_id = w.id
GROUP BY
    w.id,
    w.code,
    w.name
ORDER BY
    CAST(w.code AS UNSIGNED);

-- Communes without a valid wilaya
SELECT
    c.id,
    c.code,
    c.name
FROM communes c
LEFT JOIN wilayas w
    ON w.id = c.wilaya_id
WHERE w.id IS NULL;

`;
}

// ============================================================
// BUILD COMPLETE SQL FILE
// ============================================================

function buildSQL(wilayas, communes) {
  const sections = [];

  sections.push(`
-- ============================================================
-- ALGERIA ADMINISTRATIVE DIVISIONS
-- 69 WILAYAS
-- ALL COMMUNES PRESENT IN SOURCE JSON
-- ============================================================

-- Source:
-- https://github.com/me-yasserzaouag/algeria-wilayas-communes
--
-- Generated automatically with Node.js.
--
-- Arabic names are stored in the name columns.
-- Wilaya codes are stored as two-character strings.
-- Commune codes are stored as strings.
--
-- IMPORTANT:
-- Run this script after creating the two tables.
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

START TRANSACTION;

`);

  sections.push(
    generateWilayasSQL(wilayas)
  );

  sections.push(
    generateCommunesSQL(communes)
  );

  sections.push(
    generateVerificationSQL()
  );

  sections.push(`
-- ============================================================
-- FINISH
-- ============================================================

COMMIT;
`);

  return sections.join("\n");
}

// ============================================================
// MAIN
// ============================================================

function main() {
  try {
    console.log(
      "=========================================="
    );

    console.log(
      " ALGERIA SQL GENERATOR"
    );

    console.log(
      "=========================================="
    );

    const source = loadSourceData();

    console.log("\nValidating wilayas...");

    const wilayas = normalizeWilayas(
      source.wilayas
    );

    console.log(
      `Validated ${wilayas.length} wilayas.`
    );

    console.log("\nValidating communes...");

    const communes = normalizeCommunes(
      source.communes,
      wilayas
    );

    console.log(
      `Validated ${communes.length} communes.`
    );

    console.log("\nGenerating SQL...");

    const sql = buildSQL(
      wilayas,
      communes
    );

    fs.writeFileSync(
      CONFIG.outputFile,
      sql,
      "utf8"
    );

    console.log("\n==========================================");

    console.log("SQL FILE GENERATED SUCCESSFULLY");

    console.log("==========================================");

    console.log(
      `Wilayas: ${wilayas.length}`
    );

    console.log(
      `Communes: ${communes.length}`
    );

    console.log(
      `Output: ${CONFIG.outputFile}`
    );

    console.log("==========================================\n");

  } catch (error) {
    console.error("\nERROR:");

    console.error(error.message);

    console.error(
      "\nSQL generation aborted. No SQL file was generated."
    );

    process.exitCode = 1;
  }
}

main();
