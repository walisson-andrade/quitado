import { and, desc, eq } from "drizzle-orm";
import { MetaAporteInputSchema, MetaPoupancaSchema } from "@quitado/shared-types";
import { metaPoupanca, metaPoupancaAportes } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

export const obterMetaPoupanca: Handler = async ({ db, session }) => {
  const [row] = await db.select().from(metaPoupanca).where(eq(metaPoupanca.householdId, session!.householdId)).limit(1);
  return { status: 200, body: row ?? null };
};

export const atualizarMetaPoupanca: Handler = async ({ db, body, session }) => {
  const householdId = session!.householdId;
  const input = MetaPoupancaSchema.parse(body);
  const [row] = await db
    .insert(metaPoupanca)
    .values({ householdId, ...input, atualizadoEm: new Date() })
    .onConflictDoUpdate({
      target: metaPoupanca.householdId,
      set: { ...input, atualizadoEm: new Date() },
    })
    .returning();
  return { status: 200, body: row };
};

export const listarAportesMeta: Handler = async ({ db, session }) => {
  const rows = await db
    .select()
    .from(metaPoupancaAportes)
    .where(eq(metaPoupancaAportes.householdId, session!.householdId))
    .orderBy(desc(metaPoupancaAportes.mesReferencia), desc(metaPoupancaAportes.criadoEm));
  return { status: 200, body: rows };
};

/**
 * Registra um aporte guardado num mês (histórico) e soma no acumulado da
 * meta — mesma ação usada tanto pelo formulário da tela de Meta quanto pelo
 * botão de guardar rápido do Painel.
 */
export const registrarAporteMeta: Handler = async ({ db, body, session }) => {
  const householdId = session!.householdId;
  const input = MetaAporteInputSchema.parse(body);
  const [aporte] = await db.insert(metaPoupancaAportes).values({ ...input, householdId }).returning();

  const [metaAtual] = await db.select().from(metaPoupanca).where(eq(metaPoupanca.householdId, householdId)).limit(1);
  if (!metaAtual) throw new HttpError(409, "Nenhuma meta de poupança configurada ainda");

  const [meta] = await db
    .update(metaPoupanca)
    .set({ acumuladoCents: metaAtual.acumuladoCents + input.valorCents, atualizadoEm: new Date() })
    .where(eq(metaPoupanca.householdId, householdId))
    .returning();

  return { status: 201, body: { aporte, meta } };
};

/**
 * Edita um aporte já registrado (ex: corrigir valor ou mês) e reflete a
 * diferença no acumulado da meta — ex: se você tirou parte da grana pra uma
 * emergência, corrige o aporte pro valor real que sobrou guardado. Tudo numa
 * transação pra não deixar aporte e acumulado dessincronizados.
 */
export const editarAporteMeta: Handler<unknown, { id: string }> = async ({ db, body, params, session }) => {
  const householdId = session!.householdId;
  const input = MetaAporteInputSchema.partial().parse(body);

  return db.transaction(async (tx) => {
    const [aporteAtual] = await tx
      .select()
      .from(metaPoupancaAportes)
      .where(and(eq(metaPoupancaAportes.id, params.id), eq(metaPoupancaAportes.householdId, householdId)))
      .limit(1);
    if (!aporteAtual) throw new HttpError(404, "Aporte não encontrado");

    const [metaAtual] = await tx.select().from(metaPoupanca).where(eq(metaPoupanca.householdId, householdId)).limit(1);
    if (!metaAtual) throw new HttpError(409, "Nenhuma meta de poupança configurada ainda");

    const [aporte] = await tx
      .update(metaPoupancaAportes)
      .set(input)
      .where(eq(metaPoupancaAportes.id, params.id))
      .returning();

    const deltaCents = (input.valorCents ?? aporteAtual.valorCents) - aporteAtual.valorCents;
    const [meta] = await tx
      .update(metaPoupanca)
      .set({ acumuladoCents: Math.max(0, metaAtual.acumuladoCents + deltaCents), atualizadoEm: new Date() })
      .where(eq(metaPoupanca.householdId, householdId))
      .returning();

    return { status: 200, body: { aporte, meta } };
  });
};

/**
 * Remove um aporte do histórico e desconta o valor dele do acumulado da
 * meta — ex: aporte lançado por engano, ou dinheiro que precisou ser
 * retirado de volta pra uma emergência.
 */
export const excluirAporteMeta: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const householdId = session!.householdId;
  return db.transaction(async (tx) => {
    const [aporte] = await tx
      .delete(metaPoupancaAportes)
      .where(and(eq(metaPoupancaAportes.id, params.id), eq(metaPoupancaAportes.householdId, householdId)))
      .returning();
    if (!aporte) throw new HttpError(404, "Aporte não encontrado");

    const [metaAtual] = await tx.select().from(metaPoupanca).where(eq(metaPoupanca.householdId, householdId)).limit(1);
    if (!metaAtual) throw new HttpError(409, "Nenhuma meta de poupança configurada ainda");

    const [meta] = await tx
      .update(metaPoupanca)
      .set({ acumuladoCents: Math.max(0, metaAtual.acumuladoCents - aporte.valorCents), atualizadoEm: new Date() })
      .where(eq(metaPoupanca.householdId, householdId))
      .returning();

    return { status: 200, body: { meta } };
  });
};
