
import type { Knex } from "knex";
import db from "../../database/knex";

/**
 * Execute category operations inside a transaction.
 *
 * All repository operations receiving trx will participate
 * in the same transaction.
 *
 * Any thrown error automatically triggers rollback.
 */
export async function withCategoryTransaction<T>(
  callback: (trx: Knex.Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (trx) => {
    return callback(trx);
  });
}
