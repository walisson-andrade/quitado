import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { households, householdConfig, householdMembers, users } from "../schema.js";

/**
 * Script one-off pra rodar UMA VEZ em produção, depois que o dono original
 * (você) fizer o primeiro login via Google — ver migração
 * `0010_multi_usuario_households.sql`, que atribuiu todo dado pré-existente
 * a um household "bootstrap" com uuid fixo.
 *
 * O primeiro login via Google, sem convite, sempre cria um household NOVO
 * pro usuário (fluxo normal de auto-provisionamento). Esse script desfaz
 * esse household recém-criado e liga o usuário ao household bootstrap no
 * lugar, pra ele enxergar os dados que já existiam antes da migração.
 *
 * Uso: node --env-file=.env ./node_modules/tsx/dist/cli.mjs
 *      src/db/scripts/ligar-dono-ao-household-bootstrap.ts seu-email@gmail.com
 */
const HOUSEHOLD_BOOTSTRAP_ID = "00f411dc-57bb-4b11-8b88-7cd614687a58";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Uso: ligar-dono-ao-household-bootstrap.ts <email>");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definido.");

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const [bootstrap] = await db.select().from(households).where(eq(households.id, HOUSEHOLD_BOOTSTRAP_ID)).limit(1);
  if (!bootstrap) throw new Error(`Household bootstrap ${HOUSEHOLD_BOOTSTRAP_ID} não encontrado — rodou a migração 0010?`);

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error(`Usuário com email "${email}" não encontrado — faça login com o Google uma vez antes de rodar este script.`);

  const [membroAtual] = await db.select().from(householdMembers).where(eq(householdMembers.userId, user.id)).limit(1);
  if (!membroAtual) throw new Error(`Usuário "${email}" não tem household ainda — algo deu errado no primeiro login.`);

  if (membroAtual.householdId === HOUSEHOLD_BOOTSTRAP_ID) {
    console.log(`"${email}" já está no household bootstrap. Nada a fazer.`);
    await pool.end();
    return;
  }

  const householdAutoCriadoId = membroAtual.householdId;

  await db.transaction(async (tx) => {
    await tx.delete(householdMembers).where(eq(householdMembers.userId, user.id));
    await tx.insert(householdMembers).values({ householdId: HOUSEHOLD_BOOTSTRAP_ID, userId: user.id, papel: "dono" });
    // O household auto-criado no primeiro login não tem mais nenhum membro —
    // remove ele (e a config vazia que veio junto) pra não sobrar lixo.
    await tx.delete(householdConfig).where(eq(householdConfig.householdId, householdAutoCriadoId));
    await tx.delete(households).where(eq(households.id, householdAutoCriadoId));
  });

  await pool.end();
  console.log(
    `"${email}" agora está ligado ao household bootstrap (${HOUSEHOLD_BOOTSTRAP_ID}), que tem todos os dados pré-existentes.\n` +
      `A sessão atual no navegador ainda aponta pro household antigo (que acabamos de apagar) — faça logout e login de novo pra pegar uma sessão válida.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
