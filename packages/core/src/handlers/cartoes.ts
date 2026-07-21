import { and, eq } from "drizzle-orm";
import { CartaoInputSchema } from "@quitado/shared-types";
import { cartoes } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const listarCartoes: Handler = async ({ db, session }) => {
  const rows = await db.select().from(cartoes).where(eq(cartoes.householdId, session!.householdId)).orderBy(cartoes.nome);
  return { status: 200, body: rows };
};

export const criarCartao: Handler = async ({ db, body, session }) => {
  const input = CartaoInputSchema.parse(body);
  const [row] = await db.insert(cartoes).values({ ...input, householdId: session!.householdId }).returning();
  return { status: 201, body: row };
};

export const atualizarCartao: Handler<unknown, { id: string }> = async ({ db, body, params, session }) => {
  const input = CartaoInputSchema.partial().parse(body);
  const [row] = await db
    .update(cartoes)
    .set(input)
    .where(and(eq(cartoes.id, params.id), eq(cartoes.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Cartão não encontrado");
  return { status: 200, body: row };
};

export const removerCartao: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const [row] = await db
    .delete(cartoes)
    .where(and(eq(cartoes.id, params.id), eq(cartoes.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Cartão não encontrado");
  return { status: 204, body: null };
};
