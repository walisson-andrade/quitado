import type { MesReferencia, Parcelamento } from "@quitado/shared-types";
import { addMeses, mesParaIndice } from "./mes.js";

export type ParcelamentoAtivoInput = Pick<
  Parcelamento,
  "parcelaAtual" | "parcelaTotal" | "mesInicio" | "continuaIndefinidamente"
>;

/**
 * Coração do app: um parcelamento com parcela atual P e total T, a partir do
 * mês M0, some sozinho a partir do mês M0 + (T - P) + 1 — ou seja, fica
 * visível de M0 até M0 + (T - P) (inclusive). Financiamentos sem término
 * definido (`continuaIndefinidamente`) nunca somem depois de começar.
 */
export function parcelaAindaAtiva(
  p: ParcelamentoAtivoInput,
  mesAtual: MesReferencia,
): boolean {
  const idxAtual = mesParaIndice(mesAtual);
  const idxInicio = mesParaIndice(p.mesInicio);

  if (idxAtual < idxInicio) return false; // ainda não começou
  if (p.continuaIndefinidamente) return true;

  const idxFinal = mesParaIndice(mesFinalParcelamento(p));
  return idxAtual <= idxFinal;
}

/** Último mês em que o parcelamento aparece (M0 + (T - P)). */
export function mesFinalParcelamento(p: ParcelamentoAtivoInput): MesReferencia {
  return addMeses(p.mesInicio, p.parcelaTotal - p.parcelaAtual);
}

/** Número da parcela correspondente a um mês específico (pode passar de T). */
export function parcelaNoMes(p: ParcelamentoAtivoInput, mes: MesReferencia): number {
  return p.parcelaAtual + (mesParaIndice(mes) - mesParaIndice(p.mesInicio));
}

export function parcelasRestantes(p: ParcelamentoAtivoInput, mesAtual: MesReferencia): number {
  if (p.continuaIndefinidamente) return Number.POSITIVE_INFINITY;
  const restante = p.parcelaTotal - parcelaNoMes(p, mesAtual) + 1;
  return Math.max(restante, 0);
}

/** Valor da parcela nesse mês, ou 0 se o parcelamento já tiver terminado. */
export function valorParcelamentoNoMes(
  p: ParcelamentoAtivoInput & { valorParcelaCents: number },
  mesAtual: MesReferencia,
): number {
  return parcelaAindaAtiva(p, mesAtual) ? p.valorParcelaCents : 0;
}

export function calcularTotalParcelamentosNoMes(
  parcelamentos: Array<ParcelamentoAtivoInput & { valorParcelaCents: number }>,
  mesAtual: MesReferencia,
): number {
  return parcelamentos.reduce((acc, p) => acc + valorParcelamentoNoMes(p, mesAtual), 0);
}

/** Última fatura confirmada por banco (ex: `{ Inter: '<uuid>', Nubank: '<uuid>' }`) — ver `parcelamentoContaNoMes`. */
export type UltimaFaturaPorOrigem = Record<string, string>;

export type ParcelamentoComFatura = ParcelamentoAtivoInput & {
  origem?: string | null;
  faturaImportadaId?: string | null;
};

/**
 * Regra híbrida pra "quanto eu devo esse mês": pra itens vindos de fatura
 * importada (qualquer cartão/banco — Inter, Nubank, ou um nome customizado
 * como "Nubank Walisson"), o MÊS ATUAL conta o valor inteiro de tudo que
 * pertence à última fatura confirmada daquele cartão — não a contagem
 * calendário de parcela, que faria o total cair conforme itens
 * terminam/são à-vista de um mês anterior, mesmo que a fatura real ainda
 * cobre esse valor. Meses futuros (projeção) e Custos Fixos (origem
 * manual/null) continuam usando só `parcelaAindaAtiva`.
 *
 * Exceção: um item PARCELADO (parcelaTotal > 1) que já chegou na última
 * parcela nessa mesma fatura (ex: "3 de 3") não tem próxima cobrança —
 * diferente do à-vista (parcelaTotal 1), que sempre representa a fatura
 * inteira daquele ciclo e deve continuar contando por inteiro enquanto for
 * a última confirmada. Sem essa exceção, uma compra parcelada que já
 * terminou continuaria sendo cobrada pra sempre enquanto o usuário não
 * importasse uma fatura mais nova daquele cartão.
 */
export function parcelamentoContaNoMes(
  p: ParcelamentoComFatura,
  mes: MesReferencia,
  mesAtual: MesReferencia,
  ultimaFaturaPorOrigem: UltimaFaturaPorOrigem,
): boolean {
  const origemDeFatura = !!p.origem && p.origem !== "manual";
  const parcelaJaEncerrada = !p.continuaIndefinidamente && p.parcelaTotal > 1 && p.parcelaAtual >= p.parcelaTotal;
  if (origemDeFatura && mes === mesAtual && p.faturaImportadaId && !parcelaJaEncerrada) {
    const ultimaFaturaId = ultimaFaturaPorOrigem[p.origem as string];
    if (ultimaFaturaId) return p.faturaImportadaId === ultimaFaturaId;
  }
  return parcelaAindaAtiva(p, mes);
}

export function valorParcelamentoNoMesHibrido(
  p: ParcelamentoComFatura & { valorParcelaCents: number },
  mes: MesReferencia,
  mesAtual: MesReferencia,
  ultimaFaturaPorOrigem: UltimaFaturaPorOrigem,
): number {
  return parcelamentoContaNoMes(p, mes, mesAtual, ultimaFaturaPorOrigem) ? p.valorParcelaCents : 0;
}

export function calcularTotalParcelamentosNoMesHibrido(
  parcelamentos: Array<ParcelamentoComFatura & { valorParcelaCents: number }>,
  mes: MesReferencia,
  mesAtual: MesReferencia,
  ultimaFaturaPorOrigem: UltimaFaturaPorOrigem,
): number {
  return parcelamentos.reduce(
    (acc, p) => acc + valorParcelamentoNoMesHibrido(p, mes, mesAtual, ultimaFaturaPorOrigem),
    0,
  );
}
