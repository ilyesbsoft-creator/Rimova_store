import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import type { Knex } from "knex";

dotenv.config({ path: ".env.local" });

const caPath = process.env.DB_SSL_CA;

if (!caPath || !fs.existsSync(path.resolve(caPath))) {
  throw new Error("MySQL CA certificate was not found.");
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
      ca: fs.readFileSync(path.resolve(caPath), "utf8"),
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