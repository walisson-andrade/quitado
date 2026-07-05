import { MetaPoupancaSchema } from "@quitado/shared-types";
import { metaPoupanca } from "../db/schema.js";
import type { Handler } from "./types.js";

export const obterMetaPoupanca: Handler = async ({ db }) => {
  const [row] = await db.select().from(metaPoupanca).limit(1);
  return { status: 200, body: row ?? null };
};

export const atualizarMetaPoupanca: Handler = async ({ db, body }) => {
  const input = MetaPoupancaSchema.parse(body);
  const [row] = await db
    .insert(metaPoupanca)
    .values({ id: 1, ...input, atualizadoEm: new Date() })
    .onConflictDoUpdate({
      target: metaPoupanca.id,
      set: { ...input, atualizadoEm: new Date() },
    })
    .returning();
  return { status: 200, body: row };
};
