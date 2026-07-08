import type { DespesaFixa, MesReferencia } from "@quitado/shared-types";
import { type DespesaFixaOverrideInput, valorDespesaFixaNoMes } from "./despesas.js";
import {
  parcelamentoContaNoMes,
  type ParcelamentoComFatura,
  type UltimaFaturaPorOrigem,
} from "./parcelamento.js";

export interface OrigemItemDetalhe {
  nome: string;
  valorCents: number;
}

export interface OrigemTotal {
  /** "fixo" pro balde de despesas fixas + parcelamentos manuais, ou o nome do cartão/banco pra qualquer outra origem. */
  origem: string;
  label: string;
  totalCents: number;
  itens: OrigemItemDetalhe[];
}

function labelPorOrigem(origem: string): string {
  return origem === "fixo" ? "Custos Fixos" : `Fatura ${origem}`;
}

type ParcelamentoComOrigem = ParcelamentoComFatura & {
  nome: string;
  valorParcelaCents: number;
  origem: string | null;
};

/**
 * Qualquer origem de fatura importada (Inter, Nubank, ou um cartão com nome
 * customizado como "Nubank Walisson") vira seu próprio balde — só cai em
 * "fixo" quem não veio de fatura nenhuma (origem "manual" ou null).
 */
function bucketDaOrigem(origem: string | null): string {
  if (origem && origem !== "manual") return origem;
  return "fixo";
}

/**
 * Agrupa o total do mês em um balde por origem — "Custos Fixos" (despesas
 * fixas + parcelamentos manuais) e um balde por cartão/banco de cada fatura
 * importada (ex: "Fatura Nubank Walisson", "Fatura Santander Leticia") —
 * cada um com a lista de itens que compõem o total, pra o usuário conferir
 * manualmente contra o extrato real.
 */
export function totalPorOrigem(
  despesasFixas: DespesaFixa[],
  parcelamentosList: ParcelamentoComOrigem[],
  mesAtual: MesReferencia,
  ultimaFaturaPorOrigem: UltimaFaturaPorOrigem = {},
  despesaFixaOverrides: DespesaFixaOverrideInput[] = [],
): OrigemTotal[] {
  const buckets = new Map<OrigemTotal["origem"], OrigemItemDetalhe[]>();

  for (const d of despesasFixas) {
    if (!d.ativo) continue;
    const itens = buckets.get("fixo") ?? [];
    itens.push({ nome: d.nome, valorCents: valorDespesaFixaNoMes(d, mesAtual, despesaFixaOverrides) });
    buckets.set("fixo", itens);
  }

  for (const p of parcelamentosList) {
    if (!parcelamentoContaNoMes(p, mesAtual, mesAtual, ultimaFaturaPorOrigem)) continue;
    const chave = bucketDaOrigem(p.origem);
    const itens = buckets.get(chave) ?? [];
    itens.push({ nome: p.nome, valorCents: p.valorParcelaCents });
    buckets.set(chave, itens);
  }

  return Array.from(buckets.entries())
    .map(([origem, itens]) => ({
      origem,
      label: labelPorOrigem(origem),
      totalCents: itens.reduce((acc, i) => acc + i.valorCents, 0),
      itens,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}
