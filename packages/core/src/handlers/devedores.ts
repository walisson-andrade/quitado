import { eq } from "drizzle-orm";
import { z } from "zod";
import { MesReferenciaSchema } from "@quitado/shared-types";
import { gerarIntervaloMeses } from "@quitado/calc";
import { devedores, parcelasDevedor } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

const DevedorInputSchema = z.object({
  nome: z.string().min(1),
  corHex: z.string().nullable().optional(),
});

export const listarDevedores: Handler = async ({ db }) => {
  const rows = await db.select().from(devedores).where(eq(devedores.ativo, true));
  return { status: 200, body: rows };
};

export const criarDevedor: Handler = async ({ db, body }) => {
  const input = DevedorInputSchema.parse(body);
  const [row] = await db.insert(devedores).values(input).returning();
  return { status: 201, body: row };
};

export const listarParcelasDevedor: Handler = async ({ db, query }) => {
  const rows = query.devedorId
    ? await db.select().from(parcelasDevedor).where(eq(parcelasDevedor.devedorId, query.devedorId))
    : await db.select().from(parcelasDevedor);
  return { status: 200, body: rows };
};

const ParcelaDevedorInputSchema = z.object({
  devedorId: z.string().uuid(),
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int().positive(),
});

export const upsertParcelaDevedor: Handler = async ({ db, body }) => {
  const input = ParcelaDevedorInputSchema.parse(body);
  const [row] = await db
    .insert(parcelasDevedor)
    .values(input)
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
export const upsertParcelasDevedorEmLote: Handler = async ({ db, body }) => {
  const input = ParcelaDevedorLoteInputSchema.parse(body);
  const meses = gerarIntervaloMeses(input.mesInicio, input.quantidadeMeses);

  const rows = await db
    .insert(parcelasDevedor)
    .values(meses.map((mesReferencia) => ({ devedorId: input.devedorId, mesReferencia, valorCents: input.valorCents })))
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
}) => {
  const status = z.enum(["pendente", "pago"]).parse(body.status);
  const [row] = await db
    .update(parcelasDevedor)
    .set({ status, pagoEm: status === "pago" ? new Date() : null })
    .where(eq(parcelasDevedor.id, params.id))
    .returning();
  if (!row) throw new HttpError(404, "Parcela de devedor não encontrada");
  return { status: 200, body: row };
};

export const removerDevedor: Handler<unknown, { id: string }> = async ({ db, params }) => {
  const [row] = await db
    .update(devedores)
    .set({ ativo: false })
    .where(eq(devedores.id, params.id))
    .returning();
  if (!row) throw new HttpError(404, "Devedor não encontrado");
  return { status: 200, body: row };
};
