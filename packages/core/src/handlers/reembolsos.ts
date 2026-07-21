import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { MesReferenciaSchema } from "@quitado/shared-types";
import { devedores, reembolsos } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

const ReembolsoInputSchema = z.object({
  descricao: z.string().min(1),
  valorCents: z.number().int().positive(),
  mesReferencia: MesReferenciaSchema,
  devedorId: z.string().uuid().nullable().optional(),
});

export const listarReembolsos: Handler = async ({ db, query, session }) => {
  const householdId = session!.householdId;
  const rows = query.mes
    ? await db.select().from(reembolsos).where(and(eq(reembolsos.householdId, householdId), eq(reembolsos.mesReferencia, query.mes)))
    : await db.select().from(reembolsos).where(eq(reembolsos.householdId, householdId));
  return { status: 200, body: rows };
};

export const criarReembolso: Handler = async ({ db, body, session }) => {
  const householdId = session!.householdId;
  const input = ReembolsoInputSchema.parse(body);

  if (input.devedorId) {
    const [alvo] = await db
      .select({ id: devedores.id })
      .from(devedores)
      .where(and(eq(devedores.id, input.devedorId), eq(devedores.householdId, householdId)))
      .limit(1);
    if (!alvo) throw new HttpError(404, "Devedor não encontrado");
  }

  const [row] = await db.insert(reembolsos).values({ ...input, householdId }).returning();
  return { status: 201, body: row };
};

export const removerReembolso: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const [row] = await db
    .delete(reembolsos)
    .where(and(eq(reembolsos.id, params.id), eq(reembolsos.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Reembolso não encontrado");
  return { status: 204, body: null };
};
