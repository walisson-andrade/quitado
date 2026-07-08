import { eq } from "drizzle-orm";
import { CartaoInputSchema } from "@quitado/shared-types";
import { cartoes } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const listarCartoes: Handler = async ({ db }) => {
  const rows = await db.select().from(cartoes).orderBy(cartoes.nome);
  return { status: 200, body: rows };
};

export const criarCartao: Handler = async ({ db, body }) => {
  const input = CartaoInputSchema.parse(body);
  const [row] = await db.insert(cartoes).values(input).returning();
  return { status: 201, body: row };
};

export const atualizarCartao: Handler<unknown, { id: string }> = async ({ db, body, params }) => {
  const input = CartaoInputSchema.partial().parse(body);
  const [row] = await db.update(cartoes).set(input).where(eq(cartoes.id, params.id)).returning();
  if (!row) throw new HttpError(404, "Cartão não encontrado");
  return { status: 200, body: row };
};

export const removerCartao: Handler<unknown, { id: string }> = async ({ db, params }) => {
  const [row] = await db.delete(cartoes).where(eq(cartoes.id, params.id)).returning();
  if (!row) throw new HttpError(404, "Cartão não encontrado");
  return { status: 204, body: null };
};
