import type { DespesaFixa, ItemVariavel, MesReferencia, ParcelaDevedor, Reembolso } from "@quitado/shared-types";
import {
  calcularTotalParcelamentosNoMes,
  calcularTotalParcelamentosNoMesHibrido,
  type ParcelamentoComFatura,
  type UltimaFaturaPorOrigem,
} from "./parcelamento.js";

export function calcularRendaBRL(salarioEurCents: number, cotacaoEurBrl: number): number {
  return Math.round(salarioEurCents * cotacaoEurBrl);
}

export function calcularTotalDespesasFixas(despesas: DespesaFixa[]): number {
  return despesas.filter((d) => d.ativo).reduce((acc, d) => acc + d.valorCents, 0);
}

export function calcularTotalItensVariaveisNoMes(
  itens: ItemVariavel[],
  mesReferencia: MesReferencia,
): number {
  return itens
    .filter((i) => i.mesReferencia === mesReferencia)
    .reduce((acc, i) => acc + i.valorCents, 0);
}

export function calcularTotalReembolsosNoMes(
  reembolsos: Reembolso[],
  mesReferencia: MesReferencia,
): number {
  return reembolsos
    .filter((r) => r.mesReferencia === mesReferencia)
    .reduce((acc, r) => acc + r.valorCents, 0);
}

/**
 * Só parcelas já marcadas "pago" contam — dinheiro que ainda está pendente
 * de quem te deve não é dinheiro que você já tem disponível, então não
 * entra no Saldo livre (evita contar com um recebimento que pode não vir).
 */
export type ParcelaDevedorAtivoInput = Pick<ParcelaDevedor, "mesReferencia" | "status" | "valorCents">;

export function calcularTotalRecebidoDevedoresNoMes(
  parcelasDevedor: ParcelaDevedorAtivoInput[],
  mesReferencia: MesReferencia,
): number {
  return parcelasDevedor
    .filter((p) => p.mesReferencia === mesReferencia && p.status === "pago")
    .reduce((acc, p) => acc + p.valorCents, 0);
}

export interface SaldoMensalInput {
  rendaCents: number;
  despesasFixas: DespesaFixa[];
  parcelamentos: Array<ParcelamentoComFatura & { valorParcelaCents: number }>;
  itensVariaveis: ItemVariavel[];
  reembolsos: Reembolso[];
  parcelasDevedor?: ParcelaDevedorAtivoInput[];
  mesReferencia: MesReferencia;
  /**
   * Mês real de hoje + última fatura confirmada por banco — quando
   * presentes, o mês igual a `mesAtual` usa a regra híbrida (fatura mais
   * recente conta inteira); omitir mantém sempre o cálculo por calendário
   * (usado pelos meses futuros da projeção).
   */
  mesAtual?: MesReferencia;
  ultimaFaturaPorOrigem?: UltimaFaturaPorOrigem;
}

export interface SaldoMensalResultado {
  rendaCents: number;
  despesasFixasCents: number;
  parcelamentosCents: number;
  itensVariaveisCents: number;
  reembolsosCents: number;
  recebidoDevedoresCents: number;
  /** despesas brutas - reembolsos - parcelas de devedor já pagas no mês */
  totalDespesasCents: number;
  saldoCents: number;
}

/** Nenhum total aqui é hardcoded — tudo derivado das listas-fonte, igual à planilha original. */
export function calcularSaldoMensal(input: SaldoMensalInput): SaldoMensalResultado {
  const despesasFixasCents = calcularTotalDespesasFixas(input.despesasFixas);
  const parcelamentosCents = input.mesAtual
    ? calcularTotalParcelamentosNoMesHibrido(
        input.parcelamentos,
        input.mesReferencia,
        input.mesAtual,
        input.ultimaFaturaPorOrigem ?? {},
      )
    : calcularTotalParcelamentosNoMes(input.parcelamentos, input.mesReferencia);
  const itensVariaveisCents = calcularTotalItensVariaveisNoMes(input.itensVariaveis, input.mesReferencia);
  const reembolsosCents = calcularTotalReembolsosNoMes(input.reembolsos, input.mesReferencia);
  const recebidoDevedoresCents = calcularTotalRecebidoDevedoresNoMes(
    input.parcelasDevedor ?? [],
    input.mesReferencia,
  );

  const totalDespesasCents =
    despesasFixasCents + parcelamentosCents + itensVariaveisCents - reembolsosCents - recebidoDevedoresCents;

  return {
    rendaCents: input.rendaCents,
    despesasFixasCents,
    parcelamentosCents,
    itensVariaveisCents,
    reembolsosCents,
    recebidoDevedoresCents,
    totalDespesasCents,
    saldoCents: input.rendaCents - totalDespesasCents,
  };
}
