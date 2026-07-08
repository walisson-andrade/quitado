import { eq } from "drizzle-orm";
import { MarcarContaPagamentoInputSchema } from "@quitado/shared-types";
import { contaPagamentos } from "../db/schema.js";
import type { Handler } from "./types.js";

export const listarContaPagamentos: Handler = async ({ db, query }) => {
  const rows = query.mes
    ? await db.select().from(contaPagamentos).where(eq(contaPagamentos.mesReferencia, query.mes))
    : await db.select().from(contaPagamentos);
  return { status: 200, body: rows };
};

/** Upsert por (despesaFixaId, mês), (cartaoId, mês) ou (parcelamentoId, mês) — só um dos três por vez. */
export const marcarContaPagamento: Handler = async ({ db, body }) => {
  const input = MarcarContaPagamentoInputSchema.parse(body);
  const pagoEm = input.status === "pago" ? new Date() : null;

  if (input.despesaFixaId) {
    const [row] = await db
      .insert(contaPagamentos)
      .values({ despesaFixaId: input.despesaFixaId, mesReferencia: input.mesReferencia, status: input.status, pagoEm })
      .onConflictDoUpdate({
        target: [contaPagamentos.despesaFixaId, contaPagamentos.mesReferencia],
        set: { status: input.status, pagoEm },
      })
      .returning();
    return { status: 200, body: row };
  }

  if (input.cartaoId) {
    const [row] = await db
      .insert(contaPagamentos)
      .values({ cartaoId: input.cartaoId, mesReferencia: input.mesReferencia, status: input.status, pagoEm })
      .onConflictDoUpdate({
        target: [contaPagamentos.cartaoId, contaPagamentos.mesReferencia],
        set: { status: input.status, pagoEm },
      })
      .returning();
    return { status: 200, body: row };
  }

  const [row] = await db
    .insert(contaPagamentos)
    .values({ parcelamentoId: input.parcelamentoId, mesReferencia: input.mesReferencia, status: input.status, pagoEm })
    .onConflictDoUpdate({
      target: [contaPagamentos.parcelamentoId, contaPagamentos.mesReferencia],
      set: { status: input.status, pagoEm },
    })
    .returning();
  return { status: 200, body: row };
};
