import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

/**
 * Supabase é Postgres padrão — mesmo driver e mesma connection string em
 * dev e produção, sem precisar de um driver especial de serverless (ao
 * contrário do Neon). Use a connection string do "Transaction pooler" do
 * Supabase (porta 6543) tanto localmente quanto na Vercel.
 */
function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Defina DATABASE_URL no ambiente (connection string do Supabase).");
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  return drizzle(pool, { schema });
}

export const db = createDb();
export type Db = typeof db;
