import knexFactory from "knex";
import config from "../../../knexfile";

const db = knexFactory(config);

export default db;