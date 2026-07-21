import { and, eq } from "drizzle-orm";
import { DespesaFixaOverrideInputSchema } from "@quitado/shared-types";
import { despesaFixaOverrides, despesasFixas } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const listarDespesaFixaOverrides: Handler = async ({ db, query, session }) => {
  const condicoes = [eq(despesasFixas.householdId, session!.householdId)];
  if (query.mes) condicoes.push(eq(despesaFixaOverrides.mesReferencia, query.mes));

  const rows = await db
    .select({
      id: despesaFixaOverrides.id,
      despesaFixaId: despesaFixaOverrides.despesaFixaId,
      mesReferencia: despesaFixaOverrides.mesReferencia,
      valorCents: despesaFixaOverrides.valorCents,
    })
    .from(despesaFixaOverrides)
    .innerJoin(despesasFixas, eq(despesasFixas.id, despesaFixaOverrides.despesaFixaId))
    .where(and(...condicoes));
  return { status: 200, body: rows };
};

/** Upsert por (despesaFixaId, mês) — cria ou atualiza o valor pontual daquele mês. */
export const upsertDespesaFixaOverride: Handler = async ({ db, body, session }) => {
  const input = DespesaFixaOverrideInputSchema.parse(body);

  const [despesa] = await db
    .select({ id: despesasFixas.id })
    .from(despesasFixas)
    .where(and(eq(despesasFixas.id, input.despesaFixaId), eq(despesasFixas.householdId, session!.householdId)))
    .limit(1);
  if (!despesa) throw new HttpError(404, "Despesa fixa não encontrada");

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

export const removerDespesaFixaOverride: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const [alvo] = await db
    .select({ id: despesaFixaOverrides.id })
    .from(despesaFixaOverrides)
    .innerJoin(despesasFixas, eq(despesasFixas.id, despesaFixaOverrides.despesaFixaId))
    .where(and(eq(despesaFixaOverrides.id, params.id), eq(despesasFixas.householdId, session!.householdId)))
    .limit(1);
  if (!alvo) throw new HttpError(404, "Override não encontrado");

  await db.delete(despesaFixaOverrides).where(eq(despesaFixaOverrides.id, params.id));
  return { status: 204, body: null };
};
