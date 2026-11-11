
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import type { Knex } from "knex";

dotenv.config({ path: ".env.local" });

const caValue = process.env.DB_SSL_CA;

if (!caValue) {
  throw new Error("DB_SSL_CA environment variable is missing.");
}

let caCertificate: string;

if (caValue.includes("-----BEGIN CERTIFICATE-----")) {
  // Production: Certificate content from Vercel Environment Variables
  caCertificate = caValue.replace(/\\n/g, "\n");
} else {
  // Local: Certificate file path
  const caPath = path.resolve(process.cwd(), caValue);

  if (!fs.existsSync(caPath)) {
    throw new Error(`MySQL CA certificate was not found: ${caPath}`);
  }

  caCertificate = fs.readFileSync(caPath, "utf8");
}

const config: Knex.Config = {
  client: "mysql2",

  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    ssl: {
      ca: caCertificate,
      rejectUnauthorized: true,
    },
  },

  migrations: {
    directory: "./database/migrations",
    extension: "ts",
  },

  seeds: {
    directory: "./database/seeds",
    extension: "ts",
  },
};

export default config;
