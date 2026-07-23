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

/** Valor pontual diferente do normal pra uma despesa fixa num mês específico — ver `despesaFixaOverrides` no schema. */
export type DespesaFixaOverrideInput = { despesaFixaId: string; mesReferencia: MesReferencia; valorCents: number };

/** Valor efetivo da despesa fixa nesse mês — usa o override se houver um pra esse mês, senão o valor base. */
export function valorDespesaFixaNoMes(
  d: DespesaFixa,
  mes: MesReferencia,
  overrides: DespesaFixaOverrideInput[] = [],
): number {
  const override = overrides.find((o) => o.despesaFixaId === d.id && o.mesReferencia === mes);
  return override ? override.valorCents : d.valorCents;
}

export function calcularTotalDespesasFixas(
  despesas: DespesaFixa[],
  mes: MesReferencia,
  overrides: DespesaFixaOverrideInput[] = [],
): number {
  return despesas.filter((d) => d.ativo).reduce((acc, d) => acc + valorDespesaFixaNoMes(d, mes, overrides), 0);
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

/** Aporte de meta de poupança guardado num mês — dinheiro que sai do saldo livre pra poupança. */
export type MetaAporteInput = { mesReferencia: MesReferencia; valorCents: number };

export function calcularTotalAportesMetaNoMes(
  aportes: MetaAporteInput[],
  mesReferencia: MesReferencia,
): number {
  return aportes
    .filter((a) => a.mesReferencia === mesReferencia)
    .reduce((acc, a) => acc + a.valorCents, 0);
}

export interface SaldoMensalInput {
  rendaCents: number;
  despesasFixas: DespesaFixa[];
  parcelamentos: Array<ParcelamentoComFatura & { valorParcelaCents: number }>;
  itensVariaveis: ItemVariavel[];
  reembolsos: Reembolso[];
  parcelasDevedor?: ParcelaDevedorAtivoInput[];
  /** Aportes de meta de poupança já guardados — contam como saída do saldo livre no mês em que foram registrados. */
  aportesMeta?: MetaAporteInput[];
  /** Valores pontuais diferentes do normal pra despesas fixas em meses específicos. */
  despesaFixaOverrides?: DespesaFixaOverrideInput[];
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
  /** rendaCents (salário) + recebidoDevedoresCents — dinheiro que entrou pelas duas fontes no mês. */
  rendaTotalCents: number;
  despesasFixasCents: number;
  parcelamentosCents: number;
  itensVariaveisCents: number;
  reembolsosCents: number;
  recebidoDevedoresCents: number;
  aportesMetaCents: number;
  /**
   * Despesas brutas + aportes de meta - reembolsos. Parcelas de devedor já
   * pagas NÃO abatem aqui — é dinheiro recebido de outra pessoa, não uma
   * despesa menor, então entra em `rendaTotalCents` em vez de descontar
   * daqui (senão "despesas do mês" fica artificialmente baixo, podendo até
   * ficar negativo num mês com poucas despesas e muito recebido).
   */
  totalDespesasCents: number;
  saldoCents: number;
}

/** Nenhum total aqui é hardcoded — tudo derivado das listas-fonte, igual à planilha original. */
export function calcularSaldoMensal(input: SaldoMensalInput): SaldoMensalResultado {
  const despesasFixasCents = calcularTotalDespesasFixas(
    input.despesasFixas,
    input.mesReferencia,
    input.despesaFixaOverrides ?? [],
  );
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
  const aportesMetaCents = calcularTotalAportesMetaNoMes(input.aportesMeta ?? [], input.mesReferencia);

  const totalDespesasCents =
    despesasFixasCents + parcelamentosCents + itensVariaveisCents + aportesMetaCents - reembolsosCents;
  const rendaTotalCents = input.rendaCents + recebidoDevedoresCents;

  return {
    rendaCents: input.rendaCents,
    rendaTotalCents,
    despesasFixasCents,
    parcelamentosCents,
    itensVariaveisCents,
    reembolsosCents,
    recebidoDevedoresCents,
    aportesMetaCents,
    totalDespesasCents,
    saldoCents: rendaTotalCents - totalDespesasCents,
  };
}
