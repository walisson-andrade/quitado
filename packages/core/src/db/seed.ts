import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { appConfig } from "./schema.js";

/**
 * Seed mínimo de dev: só a linha única de app_config com uma senha padrão
 * (troque em produção). Dados financeiros reais (despesas, parcelamentos)
 * são inseridos pelo usuário via UI/importação de fatura, nunca hardcoded
 * aqui — são dados pessoais sensíveis, não fixture de código.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definido.");

  const devPassword = process.env.SEED_DEV_PASSWORD ?? "quitado-dev";
  const passwordHash = await bcrypt.hash(devPassword, 10);

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  await db
    .insert(appConfig)
    .values({ id: 1, passwordHash, eurBrlRate: "5.91" })
    .onConflictDoNothing();

  await pool.end();
  console.log(`Seed aplicado. Senha de dev: "${devPassword}" (mude via tela de configurações).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
