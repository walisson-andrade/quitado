import type { MesReferencia, MetaPoupanca } from "@quitado/shared-types";
import { diffMeses } from "./mes.js";

export interface ProgressoMeta {
  percentual: number; // 0..1 (pode passar de 1 se acumulado > alvo)
  restanteCents: number;
}

export function calcularProgressoMeta(meta: MetaPoupanca): ProgressoMeta {
  const percentual = meta.valorAlvoCents === 0 ? 0 : meta.acumuladoCents / meta.valorAlvoCents;
  const restanteCents = Math.max(meta.valorAlvoCents - meta.acumuladoCents, 0);
  return { percentual, restanteCents };
}

/**
 * Quantos meses de aporte restam até o prazo. O mês atual só entra na conta
 * se ainda não tiver aporte guardado nele — se `mesAtualJaContemplado` for
 * true (já existe aporte registrado pro mês atual), ele é excluído por já
 * estar contabilizado no acumulado; senão ele ainda é uma oportunidade de
 * guardar e conta como mais um mês (mínimo 1, ex: prazo já vencido ou é o
 * próprio mês atual).
 */
export function mesesRestantesMeta(
  prazo: MesReferencia,
  mesAtual: MesReferencia,
  mesAtualJaContemplado: boolean,
): number {
  return Math.max(diffMeses(mesAtual, prazo) + (mesAtualJaContemplado ? 0 : 1), 1);
}

/**
 * Quanto precisa guardar por mês, dado o que falta e os meses restantes até
 * o prazo — ex: faltam R$8.333,33 em 5 meses -> R$1.666,67/mês. Nunca
 * negativo (se a meta já foi batida, o aporte necessário é zero).
 */
export function calcularAporteNecessario(
  meta: MetaPoupanca,
  mesAtual: MesReferencia,
  mesAtualJaContemplado: boolean,
): number {
  const { restanteCents } = calcularProgressoMeta(meta);
  if (restanteCents === 0) return 0;
  const meses = mesesRestantesMeta(meta.prazo, mesAtual, mesAtualJaContemplado);
  return Math.ceil(restanteCents / meses);
}
