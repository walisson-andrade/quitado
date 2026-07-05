import { eq } from "drizzle-orm";
import { ParcelamentoInputSchema } from "@quitado/shared-types";
import { parcelamentos } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const listarParcelamentos: Handler = async ({ db }) => {
  const rows = await db.select().from(parcelamentos).orderBy(parcelamentos.mesInicio);
  return { status: 200, body: rows };
};

export const criarParcelamento: Handler = async ({ db, body }) => {
  const input = ParcelamentoInputSchema.parse(body);
  const [row] = await db.insert(parcelamentos).values(input).returning();
  return { status: 201, body: row };
};

export const atualizarParcelamento: Handler<unknown, { id: string }> = async ({ db, body, params }) => {
  const input = ParcelamentoInputSchema.partial().parse(body);
  const [row] = await db
    .update(parcelamentos)
    .set({ ...input, atualizadoEm: new Date() })
    .where(eq(parcelamentos.id, params.id))
    .returning();
  if (!row) throw new HttpError(404, "Parcelamento não encontrado");
  return { status: 200, body: row };
};

export const removerParcelamento: Handler<unknown, { id: string }> = async ({ db, params }) => {
  const [row] = await db.delete(parcelamentos).where(eq(parcelamentos.id, params.id)).returning();
  if (!row) throw new HttpError(404, "Parcelamento não encontrado");
  return { status: 204, body: null };
};
