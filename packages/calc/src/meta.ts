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

/** Quantos meses de aporte restam até o prazo, contando o mês atual e o mês do prazo (mínimo 1). */
export function mesesRestantesMeta(prazo: MesReferencia, mesAtual: MesReferencia): number {
  return Math.max(diffMeses(mesAtual, prazo) + 1, 1);
}

/**
 * Quanto precisa guardar por mês, dado o que falta e os meses restantes até
 * o prazo — ex: faltam R$8.333,33 em 5 meses -> R$1.666,67/mês. Nunca
 * negativo (se a meta já foi batida, o aporte necessário é zero).
 */
export function calcularAporteNecessario(meta: MetaPoupanca, mesAtual: MesReferencia): number {
  const { restanteCents } = calcularProgressoMeta(meta);
  if (restanteCents === 0) return 0;
  const meses = mesesRestantesMeta(meta.prazo, mesAtual);
  return Math.ceil(restanteCents / meses);
}
