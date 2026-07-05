import type { DespesaFixa, MesReferencia } from "@quitado/shared-types";
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
  origem: "fixo" | "Inter" | "Nubank";
  label: string;
  totalCents: number;
  itens: OrigemItemDetalhe[];
}

const LABEL_POR_ORIGEM: Record<OrigemTotal["origem"], string> = {
  fixo: "Custos Fixos",
  Inter: "Fatura Inter",
  Nubank: "Fatura Nubank",
};

type ParcelamentoComOrigem = ParcelamentoComFatura & {
  nome: string;
  valorParcelaCents: number;
  origem: string | null;
};

function bucketDaOrigem(origem: string | null): OrigemTotal["origem"] {
  if (origem === "Inter") return "Inter";
  if (origem === "Nubank") return "Nubank";
  return "fixo"; // manual, null, ou qualquer outra origem entra em "Custos Fixos" pra bater com o extrato real
}

/**
 * Agrupa o total do mês em só 3 baldes — Custos Fixos, Fatura Inter, Fatura
 * Nubank — cada um com a lista de itens que compõem o total, pra o usuário
 * conferir manualmente contra o extrato real. "Custos Fixos" junta despesas
 * fixas (sem prazo) com parcelamentos que não vieram de fatura importada
 * (ex: financiamentos/empréstimos cadastrados manualmente) — do ponto de
 * vista de "quanto eu gasto por mês", ambos são a mesma coisa.
 */
export function totalPorOrigem(
  despesasFixas: DespesaFixa[],
  parcelamentosList: ParcelamentoComOrigem[],
  mesAtual: MesReferencia,
  ultimaFaturaPorOrigem: UltimaFaturaPorOrigem = {},
): OrigemTotal[] {
  const buckets = new Map<OrigemTotal["origem"], OrigemItemDetalhe[]>();

  for (const d of despesasFixas) {
    if (!d.ativo) continue;
    const itens = buckets.get("fixo") ?? [];
    itens.push({ nome: d.nome, valorCents: d.valorCents });
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
      label: LABEL_POR_ORIGEM[origem],
      totalCents: itens.reduce((acc, i) => acc + i.valorCents, 0),
      itens,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}
