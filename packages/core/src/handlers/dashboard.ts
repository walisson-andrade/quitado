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
  appConfig,
  despesasFixas,
  itensVariaveis,
  parcelamentos,
  parcelasDevedor,
  reembolsos,
} from "../db/schema.js";
import { buscarUltimaFaturaPorOrigem } from "./faturas.js";
import type { Handler } from "./types.js";

export const obterDashboard: Handler = async ({ db, query }) => {
  const [config] = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  const mesAtual = resolverMesAtual(config?.mesAtualOverride ?? null);
  const meses = gerarIntervaloMeses(mesAtual, Number(query.meses ?? 13));

  const [despesas, parcelamentosRows, itensRows, reembolsosRows, parcelasDevedorRows, ultimaFaturaPorOrigem] =
    await Promise.all([
      db.select().from(despesasFixas),
      db.select().from(parcelamentos),
      db.select().from(itensVariaveis),
      db.select().from(reembolsos),
      db.select().from(parcelasDevedor),
      buscarUltimaFaturaPorOrigem(db),
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
    mesAtual,
    ultimaFaturaPorOrigem,
  });

  const porCategoria = totalPorCategoria(despesas, parcelamentosRows, mesAtual, ultimaFaturaPorOrigem);
  const porOrigem = totalPorOrigem(despesas, parcelamentosRows, mesAtual, ultimaFaturaPorOrigem);

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
