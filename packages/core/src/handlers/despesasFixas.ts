import { eq } from "drizzle-orm";
import { DespesaFixaInputSchema } from "@quitado/shared-types";
import { despesasFixas } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const listarDespesasFixas: Handler = async ({ db }) => {
  const rows = await db.select().from(despesasFixas).orderBy(despesasFixas.nome);
  return { status: 200, body: rows };
};

export const criarDespesaFixa: Handler = async ({ db, body }) => {
  const input = DespesaFixaInputSchema.parse(body);
  const [row] = await db.insert(despesasFixas).values(input).returning();
  return { status: 201, body: row };
};

export const atualizarDespesaFixa: Handler<unknown, { id: string }> = async ({ db, body, params }) => {
  const input = DespesaFixaInputSchema.partial().parse(body);
  const [row] = await db
    .update(despesasFixas)
    .set({ ...input, atualizadoEm: new Date() })
    .where(eq(despesasFixas.id, params.id))
    .returning();
  if (!row) throw new HttpError(404, "Despesa fixa não encontrada");
  return { status: 200, body: row };
};

export const removerDespesaFixa: Handler<unknown, { id: string }> = async ({ db, params }) => {
  const [row] = await db.delete(despesasFixas).where(eq(despesasFixas.id, params.id)).returning();
  if (!row) throw new HttpError(404, "Despesa fixa não encontrada");
  return { status: 204, body: null };
};
