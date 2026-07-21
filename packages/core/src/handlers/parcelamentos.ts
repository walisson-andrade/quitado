import { and, eq } from "drizzle-orm";
import { ParcelamentoInputSchema } from "@quitado/shared-types";
import { parcelamentos } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const listarParcelamentos: Handler = async ({ db, session }) => {
  const rows = await db
    .select()
    .from(parcelamentos)
    .where(eq(parcelamentos.householdId, session!.householdId))
    .orderBy(parcelamentos.mesInicio);
  return { status: 200, body: rows };
};

export const criarParcelamento: Handler = async ({ db, body, session }) => {
  const input = ParcelamentoInputSchema.parse(body);
  const [row] = await db.insert(parcelamentos).values({ ...input, householdId: session!.householdId }).returning();
  return { status: 201, body: row };
};

export const atualizarParcelamento: Handler<unknown, { id: string }> = async ({ db, body, params, session }) => {
  const input = ParcelamentoInputSchema.partial().parse(body);
  const [row] = await db
    .update(parcelamentos)
    .set({ ...input, atualizadoEm: new Date() })
    .where(and(eq(parcelamentos.id, params.id), eq(parcelamentos.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Parcelamento não encontrado");
  return { status: 200, body: row };
};

export const removerParcelamento: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const [row] = await db
    .delete(parcelamentos)
    .where(and(eq(parcelamentos.id, params.id), eq(parcelamentos.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Parcelamento não encontrado");
  return { status: 204, body: null };
};
