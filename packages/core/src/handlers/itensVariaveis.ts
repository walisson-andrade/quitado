import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { MesReferenciaSchema } from "@quitado/shared-types";
import { itensVariaveis } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

const ItemVariavelInputSchema = z.object({
  nome: z.string().min(1),
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int(),
});

export const listarItensVariaveis: Handler = async ({ db, query, session }) => {
  const householdId = session!.householdId;
  const rows = query.mes
    ? await db
        .select()
        .from(itensVariaveis)
        .where(and(eq(itensVariaveis.householdId, householdId), eq(itensVariaveis.mesReferencia, query.mes)))
    : await db.select().from(itensVariaveis).where(eq(itensVariaveis.householdId, householdId));
  return { status: 200, body: rows };
};

export const upsertItemVariavel: Handler = async ({ db, body, session }) => {
  const householdId = session!.householdId;
  const input = ItemVariavelInputSchema.parse(body);
  const [row] = await db
    .insert(itensVariaveis)
    .values({ ...input, householdId })
    .onConflictDoUpdate({
      target: [itensVariaveis.householdId, itensVariaveis.nome, itensVariaveis.mesReferencia],
      set: { valorCents: input.valorCents },
    })
    .returning();
  return { status: 200, body: row };
};

export const removerItemVariavel: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const [row] = await db
    .delete(itensVariaveis)
    .where(and(eq(itensVariaveis.id, params.id), eq(itensVariaveis.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Item variável não encontrado");
  return { status: 204, body: null };
};
