import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { MesReferenciaSchema } from "@quitado/shared-types";
import { gerarIntervaloMeses } from "@quitado/calc";
import type { Db } from "../db/client.js";
import { devedores, parcelasDevedor } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

const DevedorInputSchema = z.object({
  nome: z.string().min(1),
  corHex: z.string().nullable().optional(),
});

export const listarDevedores: Handler = async ({ db, session }) => {
  const rows = await db
    .select()
    .from(devedores)
    .where(and(eq(devedores.householdId, session!.householdId), eq(devedores.ativo, true)));
  return { status: 200, body: rows };
};

export const criarDevedor: Handler = async ({ db, body, session }) => {
  const input = DevedorInputSchema.parse(body);
  const [row] = await db.insert(devedores).values({ ...input, householdId: session!.householdId }).returning();
  return { status: 201, body: row };
};

export const listarParcelasDevedor: Handler = async ({ db, query, session }) => {
  const householdId = session!.householdId;
  const rows = query.devedorId
    ? await db
        .select()
        .from(parcelasDevedor)
        .where(and(eq(parcelasDevedor.householdId, householdId), eq(parcelasDevedor.devedorId, query.devedorId)))
    : await db.select().from(parcelasDevedor).where(eq(parcelasDevedor.householdId, householdId));
  return { status: 200, body: rows };
};

const ParcelaDevedorInputSchema = z.object({
  devedorId: z.string().uuid(),
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int().positive(),
});

async function verificarDevedorDoHousehold(db: Db, devedorId: string, householdId: string) {
  const [alvo] = await db
    .select({ id: devedores.id })
    .from(devedores)
    .where(and(eq(devedores.id, devedorId), eq(devedores.householdId, householdId)))
    .limit(1);
  if (!alvo) throw new HttpError(404, "Devedor não encontrado");
}

export const upsertParcelaDevedor: Handler = async ({ db, body, session }) => {
  const householdId = session!.householdId;
  const input = ParcelaDevedorInputSchema.parse(body);
  await verificarDevedorDoHousehold(db, input.devedorId, householdId);

  const [row] = await db
    .insert(parcelasDevedor)
    .values({ ...input, householdId })
    .onConflictDoUpdate({
      target: [parcelasDevedor.devedorId, parcelasDevedor.mesReferencia],
      set: { valorCents: input.valorCents },
    })
    .returning();
  return { status: 200, body: row };
};

const ParcelaDevedorLoteInputSchema = z.object({
  devedorId: z.string().uuid(),
  valorCents: z.number().int().positive(),
  mesInicio: MesReferenciaSchema,
  quantidadeMeses: z.number().int().positive().max(600),
});

/** Cria/atualiza N meses seguidos de uma vez — evita ter que adicionar parcela por parcela quando são muitos meses. */
export const upsertParcelasDevedorEmLote: Handler = async ({ db, body, session }) => {
  const householdId = session!.householdId;
  const input = ParcelaDevedorLoteInputSchema.parse(body);
  await verificarDevedorDoHousehold(db, input.devedorId, householdId);
  const meses = gerarIntervaloMeses(input.mesInicio, input.quantidadeMeses);

  const rows = await db
    .insert(parcelasDevedor)
    .values(meses.map((mesReferencia) => ({ householdId, devedorId: input.devedorId, mesReferencia, valorCents: input.valorCents })))
    .onConflictDoUpdate({
      target: [parcelasDevedor.devedorId, parcelasDevedor.mesReferencia],
      set: { valorCents: input.valorCents },
    })
    .returning();

  return { status: 200, body: rows };
};

export const marcarParcelaDevedor: Handler<{ status: "pendente" | "pago" }, { id: string }> = async ({
  db,
  body,
  params,
  session,
}) => {
  const status = z.enum(["pendente", "pago"]).parse(body.status);
  const [row] = await db
    .update(parcelasDevedor)
    .set({ status, pagoEm: status === "pago" ? new Date() : null })
    .where(and(eq(parcelasDevedor.id, params.id), eq(parcelasDevedor.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Parcela de devedor não encontrada");
  return { status: 200, body: row };
};

export const removerDevedor: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const [row] = await db
    .update(devedores)
    .set({ ativo: false })
    .where(and(eq(devedores.id, params.id), eq(devedores.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Devedor não encontrado");
  return { status: 200, body: row };
};
