import type { DespesaFixa, MesReferencia } from "@quitado/shared-types";
import { CATEGORIA_LABEL, categorizarAutomaticamente, type CategoriaSlug } from "./categoria.js";
import { type DespesaFixaOverrideInput, valorDespesaFixaNoMes } from "./despesas.js";
import {
  parcelamentoContaNoMes,
  type ParcelamentoComFatura,
  type UltimaFaturaPorOrigem,
} from "./parcelamento.js";

export interface CategoriaItemDetalhe {
  nome: string;
  valorCents: number;
}

export interface CategoriaTotal {
  categoria: CategoriaSlug | string;
  label: string;
  totalCents: number;
  itens: CategoriaItemDetalhe[];
}

type DespesaFixaComCategoria = DespesaFixa & { categoria?: string | null };
type ParcelamentoComCategoria = ParcelamentoComFatura & {
  nome: string;
  valorParcelaCents: number;
  categoria?: string | null;
};

/**
 * Agrupa despesas fixas ativas + parcelamentos ativos no mês por categoria
 * — usa a categoria salva no item se houver, senão cai na heurística
 * automática. Ordenado do maior para o menor total.
 */
export function totalPorCategoria(
  despesasFixas: DespesaFixaComCategoria[],
  parcelamentosList: ParcelamentoComCategoria[],
  mesAtual: MesReferencia,
  ultimaFaturaPorOrigem: UltimaFaturaPorOrigem = {},
  despesaFixaOverrides: DespesaFixaOverrideInput[] = [],
): CategoriaTotal[] {
  const buckets = new Map<string, CategoriaItemDetalhe[]>();

  const acumular = (nome: string, categoria: string | null | undefined, valorCents: number) => {
    const chave = categoria ?? categorizarAutomaticamente(nome);
    const itens = buckets.get(chave) ?? [];
    itens.push({ nome, valorCents });
    buckets.set(chave, itens);
  };

  for (const d of despesasFixas) {
    if (!d.ativo) continue;
    acumular(d.nome, d.categoria, valorDespesaFixaNoMes(d, mesAtual, despesaFixaOverrides));
  }

  for (const p of parcelamentosList) {
    if (!parcelamentoContaNoMes(p, mesAtual, mesAtual, ultimaFaturaPorOrigem)) continue;
    acumular(p.nome, p.categoria, p.valorParcelaCents);
  }

  return Array.from(buckets.entries())
    .map(([categoria, itens]) => ({
      categoria,
      label: CATEGORIA_LABEL[categoria as CategoriaSlug] ?? categoria,
      totalCents: itens.reduce((acc, i) => acc + i.valorCents, 0),
      itens,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}
