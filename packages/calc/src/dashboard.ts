import type { DespesaFixa, ItemVariavel, MesReferencia, Reembolso } from "@quitado/shared-types";
import {
  calcularSaldoMensal,
  type DespesaFixaOverrideInput,
  type MetaAporteInput,
  type ParcelaDevedorAtivoInput,
  type SaldoMensalResultado,
} from "./despesas.js";
import type { ParcelamentoComFatura, UltimaFaturaPorOrigem } from "./parcelamento.js";

export interface ProjecaoMensal {
  mes: MesReferencia;
  saldo: SaldoMensalResultado;
}

export interface ProjetarSaldosInput {
  meses: MesReferencia[];
  rendaCents: number;
  despesasFixas: DespesaFixa[];
  parcelamentos: Array<ParcelamentoComFatura & { valorParcelaCents: number }>;
  itensVariaveis: ItemVariavel[];
  reembolsos: Reembolso[];
  parcelasDevedor?: ParcelaDevedorAtivoInput[];
  aportesMeta?: MetaAporteInput[];
  despesaFixaOverrides?: DespesaFixaOverrideInput[];
  /** Ver `SaldoMensalInput` — aplica a regra híbrida só no mês igual a `mesAtual`, meses futuros continuam por calendário. */
  mesAtual?: MesReferencia;
  ultimaFaturaPorOrigem?: UltimaFaturaPorOrigem;
}

/**
 * Saldo projetado por mês (não cumulativo — cada mês é renda - despesas
 * daquele mês de forma independente, igual à planilha original: o saldo
 * sobe conforme parcelamentos terminam, não por acúmulo bancário).
 */
export function projetarSaldos(input: ProjetarSaldosInput): ProjecaoMensal[] {
  return input.meses.map((mes) => ({
    mes,
    saldo: calcularSaldoMensal({
      rendaCents: input.rendaCents,
      despesasFixas: input.despesasFixas,
      parcelamentos: input.parcelamentos,
      itensVariaveis: input.itensVariaveis,
      reembolsos: input.reembolsos,
      parcelasDevedor: input.parcelasDevedor,
      aportesMeta: input.aportesMeta,
      despesaFixaOverrides: input.despesaFixaOverrides,
      mesReferencia: mes,
      mesAtual: input.mesAtual,
      ultimaFaturaPorOrigem: input.ultimaFaturaPorOrigem,
    }),
  }));
}
