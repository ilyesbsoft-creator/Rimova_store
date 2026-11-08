import db from "../../database/knex";
import type { Knex } from "knex";

type DatabaseConnection = Knex | Knex.Transaction;

export type GlobalAttributeRow = {
  id: string;
  name: string;
  type: string;
  created_at: Date | string;
};

export type CreateGlobalAttributeInput = {
  id: string;
  name: string;
  type: string;
};

export type UpdateGlobalAttributeInput = {
  name: string;
  type: string;
};

const TABLE = "global_attributes";

export async function findAllGlobalAttributes(
  connection: DatabaseConnection = db
): Promise<GlobalAttributeRow[]> {
  return connection<GlobalAttributeRow>(TABLE)
    .select("*")
    .orderBy("created_at", "desc");
}

export async function findGlobalAttributeById(
  id: string,
  connection: DatabaseConnection = db
): Promise<GlobalAttributeRow | undefined> {
  return connection<GlobalAttributeRow>(TABLE)
    .where({ id })
    .first();
}

export async function findGlobalAttributeByName(
  name: string,
  connection: DatabaseConnection = db
): Promise<GlobalAttributeRow | undefined> {
  return connection<GlobalAttributeRow>(TABLE)
    .whereRaw("LOWER(name) = LOWER(?)", [name])
    .first();
}

export async function createGlobalAttribute(
  input: CreateGlobalAttributeInput,
  connection: DatabaseConnection = db
): Promise<void> {
  await connection(TABLE).insert(input);
}

export async function updateGlobalAttribute(
  id: string,
  input: UpdateGlobalAttributeInput,
  connection: DatabaseConnection = db
): Promise<number> {
  return connection(TABLE)
    .where({ id })
    .update(input);
}

export async function deleteGlobalAttribute(
  id: string,
  connection: DatabaseConnection = db
): Promise<number> {
  return connection(TABLE)
    .where({ id })
    .delete();
}