import { eq } from "drizzle-orm";
import {
  gerarIntervaloMeses,
  projetarSaldos,
  resolverMesAtual,
  calcularRendaBRL,
  totalPorCategoria,
  totalPorOrigem,
  type ParcelaDevedorAtivoInput,
} from "@quitado/calc";
import {
  despesaFixaOverrides,
  despesasFixas,
  householdConfig,
  itensVariaveis,
  metaPoupancaAportes,
  parcelamentos,
  parcelasDevedor,
  reembolsos,
} from "../db/schema.js";
import { buscarUltimaFaturaPorOrigem } from "./faturas.js";
import type { Handler } from "./types.js";

export const obterDashboard: Handler = async ({ db, query, session }) => {
  const householdId = session!.householdId;
  const [config] = await db.select().from(householdConfig).where(eq(householdConfig.householdId, householdId)).limit(1);
  const mesAtual = resolverMesAtual(config?.mesAtualOverride ?? null);
  const meses = gerarIntervaloMeses(mesAtual, Number(query.meses ?? 13));

  const [
    despesas,
    parcelamentosRows,
    itensRows,
    reembolsosRows,
    parcelasDevedorRows,
    aportesMetaRows,
    despesaFixaOverridesRows,
    ultimaFaturaPorOrigem,
  ] = await Promise.all([
    db.select().from(despesasFixas).where(eq(despesasFixas.householdId, householdId)),
    db.select().from(parcelamentos).where(eq(parcelamentos.householdId, householdId)),
    db.select().from(itensVariaveis).where(eq(itensVariaveis.householdId, householdId)),
    db.select().from(reembolsos).where(eq(reembolsos.householdId, householdId)),
    db.select().from(parcelasDevedor).where(eq(parcelasDevedor.householdId, householdId)),
    db.select().from(metaPoupancaAportes).where(eq(metaPoupancaAportes.householdId, householdId)),
    db
      .select({ id: despesaFixaOverrides.id, despesaFixaId: despesaFixaOverrides.despesaFixaId, mesReferencia: despesaFixaOverrides.mesReferencia, valorCents: despesaFixaOverrides.valorCents })
      .from(despesaFixaOverrides)
      .innerJoin(despesasFixas, eq(despesasFixas.id, despesaFixaOverrides.despesaFixaId))
      .where(eq(despesasFixas.householdId, householdId)),
    buscarUltimaFaturaPorOrigem(db, householdId),
  ]);

  const eurBrlRate = config ? Number(config.eurBrlRate) : 1;
  const rendaCents = calcularRendaBRL(config?.salarioEurCents ?? 0, eurBrlRate);

  const projecao = projetarSaldos({
    meses,
    rendaCents,
    despesasFixas: despesas,
    parcelamentos: parcelamentosRows,
    itensVariaveis: itensRows,
    reembolsos: reembolsosRows,
    parcelasDevedor: parcelasDevedorRows as ParcelaDevedorAtivoInput[],
    aportesMeta: aportesMetaRows,
    despesaFixaOverrides: despesaFixaOverridesRows,
    mesAtual,
    ultimaFaturaPorOrigem,
  });

  const porCategoria = totalPorCategoria(despesas, parcelamentosRows, mesAtual, ultimaFaturaPorOrigem, despesaFixaOverridesRows);
  const porOrigem = totalPorOrigem(despesas, parcelamentosRows, mesAtual, ultimaFaturaPorOrigem, despesaFixaOverridesRows);

  return {
    status: 200,
    body: {
      mesAtual,
      eurBrlRate,
      projecao,
      saldoMesAtual: projecao[0]?.saldo ?? null,
      porCategoria,
      porOrigem,
    },
  };
};
