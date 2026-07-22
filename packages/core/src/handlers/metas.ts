import { and, desc, eq } from "drizzle-orm";
import { MetaAporteInputSchema, MetaInputSchema } from "@quitado/shared-types";
import type { Db } from "../db/client.js";
import { metaAportes, metas } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const listarMetas: Handler = async ({ db, session }) => {
  const rows = await db.select().from(metas).where(eq(metas.householdId, session!.householdId)).orderBy(metas.criadoEm);
  return { status: 200, body: rows };
};

export const criarMeta: Handler = async ({ db, body, session }) => {
  const input = MetaInputSchema.parse(body);
  const [row] = await db
    .insert(metas)
    .values({ householdId: session!.householdId, ...input, acumuladoCents: input.acumuladoCents ?? 0 })
    .returning();
  return { status: 201, body: row };
};

export const atualizarMeta: Handler<unknown, { id: string }> = async ({ db, body, params, session }) => {
  const input = MetaInputSchema.partial().parse(body);
  const [row] = await db
    .update(metas)
    .set({ ...input, atualizadoEm: new Date() })
    .where(and(eq(metas.id, params.id), eq(metas.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Meta não encontrada");
  return { status: 200, body: row };
};

export const removerMeta: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const [row] = await db
    .delete(metas)
    .where(and(eq(metas.id, params.id), eq(metas.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Meta não encontrada");
  return { status: 204, body: null };
};

async function obterMetaDoHousehold(db: Pick<Db, "select">, metaId: string, householdId: string) {
  const [meta] = await db.select().from(metas).where(and(eq(metas.id, metaId), eq(metas.householdId, householdId))).limit(1);
  if (!meta) throw new HttpError(404, "Meta não encontrada");
  return meta;
}

export const listarAportesMeta: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  await obterMetaDoHousehold(db, params.id, session!.householdId);
  const rows = await db
    .select()
    .from(metaAportes)
    .where(eq(metaAportes.metaId, params.id))
    .orderBy(desc(metaAportes.mesReferencia), desc(metaAportes.criadoEm));
  return { status: 200, body: rows };
};

/** Registra um aporte guardado num mês pra uma meta específica (histórico) e soma no acumulado dela. */
export const registrarAporteMeta: Handler<unknown, { id: string }> = async ({ db, body, params, session }) => {
  const householdId = session!.householdId;
  const metaId = params.id;
  const metaAtual = await obterMetaDoHousehold(db, metaId, householdId);
  const input = MetaAporteInputSchema.parse(body);

  const [aporte] = await db.insert(metaAportes).values({ ...input, metaId, householdId }).returning();
  const [meta] = await db
    .update(metas)
    .set({ acumuladoCents: metaAtual.acumuladoCents + input.valorCents, atualizadoEm: new Date() })
    .where(eq(metas.id, metaId))
    .returning();

  return { status: 201, body: { aporte, meta } };
};

/**
 * Edita um aporte já registrado (ex: corrigir valor ou mês) e reflete a
 * diferença no acumulado da meta — tudo numa transação pra não deixar aporte
 * e acumulado dessincronizados.
 */
export const editarAporteMeta: Handler<unknown, { id: string; aporteId: string }> = async ({ db, body, params, session }) => {
  const householdId = session!.householdId;
  const metaId = params.id;
  const input = MetaAporteInputSchema.partial().parse(body);

  return db.transaction(async (tx) => {
    const metaAtual = await obterMetaDoHousehold(tx, metaId, householdId);
    const [aporteAtual] = await tx
      .select()
      .from(metaAportes)
      .where(and(eq(metaAportes.id, params.aporteId), eq(metaAportes.metaId, metaId)))
      .limit(1);
    if (!aporteAtual) throw new HttpError(404, "Aporte não encontrado");

    const [aporte] = await tx.update(metaAportes).set(input).where(eq(metaAportes.id, params.aporteId)).returning();

    const deltaCents = (input.valorCents ?? aporteAtual.valorCents) - aporteAtual.valorCents;
    const [meta] = await tx
      .update(metas)
      .set({ acumuladoCents: Math.max(0, metaAtual.acumuladoCents + deltaCents), atualizadoEm: new Date() })
      .where(eq(metas.id, metaId))
      .returning();

    return { status: 200, body: { aporte, meta } };
  });
};

/** Remove um aporte do histórico e desconta o valor dele do acumulado da meta. */
export const excluirAporteMeta: Handler<unknown, { id: string; aporteId: string }> = async ({ db, params, session }) => {
  const householdId = session!.householdId;
  const metaId = params.id;
  return db.transaction(async (tx) => {
    const metaAtual = await obterMetaDoHousehold(tx, metaId, householdId);
    const [aporte] = await tx
      .delete(metaAportes)
      .where(and(eq(metaAportes.id, params.aporteId), eq(metaAportes.metaId, metaId)))
      .returning();
    if (!aporte) throw new HttpError(404, "Aporte não encontrado");

    const [meta] = await tx
      .update(metas)
      .set({ acumuladoCents: Math.max(0, metaAtual.acumuladoCents - aporte.valorCents), atualizadoEm: new Date() })
      .where(eq(metas.id, metaId))
      .returning();

    return { status: 200, body: { meta } };
  });
};
