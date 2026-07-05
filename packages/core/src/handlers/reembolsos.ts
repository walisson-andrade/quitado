import { eq } from "drizzle-orm";
import { z } from "zod";
import { MesReferenciaSchema } from "@quitado/shared-types";
import { reembolsos } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

const ReembolsoInputSchema = z.object({
  descricao: z.string().min(1),
  valorCents: z.number().int().positive(),
  mesReferencia: MesReferenciaSchema,
  devedorId: z.string().uuid().nullable().optional(),
});

export const listarReembolsos: Handler = async ({ db, query }) => {
  const rows = query.mes
    ? await db.select().from(reembolsos).where(eq(reembolsos.mesReferencia, query.mes))
    : await db.select().from(reembolsos);
  return { status: 200, body: rows };
};

export const criarReembolso: Handler = async ({ db, body }) => {
  const input = ReembolsoInputSchema.parse(body);
  const [row] = await db.insert(reembolsos).values(input).returning();
  return { status: 201, body: row };
};

export const removerReembolso: Handler<unknown, { id: string }> = async ({ db, params }) => {
  const [row] = await db.delete(reembolsos).where(eq(reembolsos.id, params.id)).returning();
  if (!row) throw new HttpError(404, "Reembolso não encontrado");
  return { status: 204, body: null };
};
