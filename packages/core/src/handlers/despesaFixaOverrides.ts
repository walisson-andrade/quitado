import { eq } from "drizzle-orm";
import { DespesaFixaOverrideInputSchema } from "@quitado/shared-types";
import { despesaFixaOverrides } from "../db/schema.js";
import type { Handler } from "./types.js";

export const listarDespesaFixaOverrides: Handler = async ({ db, query }) => {
  const rows = query.mes
    ? await db.select().from(despesaFixaOverrides).where(eq(despesaFixaOverrides.mesReferencia, query.mes))
    : await db.select().from(despesaFixaOverrides);
  return { status: 200, body: rows };
};

/** Upsert por (despesaFixaId, mês) — cria ou atualiza o valor pontual daquele mês. */
export const upsertDespesaFixaOverride: Handler = async ({ db, body }) => {
  const input = DespesaFixaOverrideInputSchema.parse(body);
  const [row] = await db
    .insert(despesaFixaOverrides)
    .values(input)
    .onConflictDoUpdate({
      target: [despesaFixaOverrides.despesaFixaId, despesaFixaOverrides.mesReferencia],
      set: { valorCents: input.valorCents },
    })
    .returning();
  return { status: 200, body: row };
};

export const removerDespesaFixaOverride: Handler<unknown, { id: string }> = async ({ db, params }) => {
  await db.delete(despesaFixaOverrides).where(eq(despesaFixaOverrides.id, params.id));
  return { status: 204, body: null };
};
