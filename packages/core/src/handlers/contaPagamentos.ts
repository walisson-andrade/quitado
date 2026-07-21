import { and, eq } from "drizzle-orm";
import { MarcarContaPagamentoInputSchema } from "@quitado/shared-types";
import { cartoes, contaPagamentos, despesasFixas, parcelamentos } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const listarContaPagamentos: Handler = async ({ db, query, session }) => {
  const householdId = session!.householdId;
  const rows = query.mes
    ? await db
        .select()
        .from(contaPagamentos)
        .where(and(eq(contaPagamentos.householdId, householdId), eq(contaPagamentos.mesReferencia, query.mes)))
    : await db.select().from(contaPagamentos).where(eq(contaPagamentos.householdId, householdId));
  return { status: 200, body: rows };
};

/** Upsert por (despesaFixaId, mês), (cartaoId, mês) ou (parcelamentoId, mês) — só um dos três por vez. */
export const marcarContaPagamento: Handler = async ({ db, body, session }) => {
  const householdId = session!.householdId;
  const input = MarcarContaPagamentoInputSchema.parse(body);
  const pagoEm = input.status === "pago" ? new Date() : null;

  if (input.despesaFixaId) {
    const [alvo] = await db
      .select({ id: despesasFixas.id })
      .from(despesasFixas)
      .where(and(eq(despesasFixas.id, input.despesaFixaId), eq(despesasFixas.householdId, householdId)))
      .limit(1);
    if (!alvo) throw new HttpError(404, "Despesa fixa não encontrada");

    const [row] = await db
      .insert(contaPagamentos)
      .values({ householdId, despesaFixaId: input.despesaFixaId, mesReferencia: input.mesReferencia, status: input.status, pagoEm })
      .onConflictDoUpdate({
        target: [contaPagamentos.despesaFixaId, contaPagamentos.mesReferencia],
        set: { status: input.status, pagoEm },
      })
      .returning();
    return { status: 200, body: row };
  }

  if (input.cartaoId) {
    const [alvo] = await db
      .select({ id: cartoes.id })
      .from(cartoes)
      .where(and(eq(cartoes.id, input.cartaoId), eq(cartoes.householdId, householdId)))
      .limit(1);
    if (!alvo) throw new HttpError(404, "Cartão não encontrado");

    const [row] = await db
      .insert(contaPagamentos)
      .values({ householdId, cartaoId: input.cartaoId, mesReferencia: input.mesReferencia, status: input.status, pagoEm })
      .onConflictDoUpdate({
        target: [contaPagamentos.cartaoId, contaPagamentos.mesReferencia],
        set: { status: input.status, pagoEm },
      })
      .returning();
    return { status: 200, body: row };
  }

  if (!input.parcelamentoId) throw new HttpError(400, "Informe despesaFixaId, cartaoId ou parcelamentoId");

  const [parcelamentoAlvo] = await db
    .select({ id: parcelamentos.id })
    .from(parcelamentos)
    .where(and(eq(parcelamentos.id, input.parcelamentoId), eq(parcelamentos.householdId, householdId)))
    .limit(1);
  if (!parcelamentoAlvo) throw new HttpError(404, "Parcelamento não encontrado");

  const [row] = await db
    .insert(contaPagamentos)
    .values({ householdId, parcelamentoId: input.parcelamentoId, mesReferencia: input.mesReferencia, status: input.status, pagoEm })
    .onConflictDoUpdate({
      target: [contaPagamentos.parcelamentoId, contaPagamentos.mesReferencia],
      set: { status: input.status, pagoEm },
    })
    .returning();
  return { status: 200, body: row };
};
