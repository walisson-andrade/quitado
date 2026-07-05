import type { MesReferencia } from "@quitado/shared-types";

/**
 * Todas as comparações de mês são feitas como aritmética inteira sobre
 * 'YYYY-MM', nunca com `Date` mutável — evita bugs de fuso/DST para algo que
 * é conceitualmente só contagem de meses de calendário.
 */
export function mesParaIndice(mes: MesReferencia): number {
  const [ano, m] = mes.split("-").map(Number) as [number, number];
  return ano * 12 + (m - 1);
}

export function indiceParaMes(indice: number): MesReferencia {
  const ano = Math.floor(indice / 12);
  const m = (indice % 12) + 1;
  return `${ano}-${String(m).padStart(2, "0")}`;
}

export function addMeses(mes: MesReferencia, delta: number): MesReferencia {
  return indiceParaMes(mesParaIndice(mes) + delta);
}

/** Quantos meses de `a` até `b` (b - a). Positivo se b for depois de a. */
export function diffMeses(a: MesReferencia, b: MesReferencia): number {
  return mesParaIndice(b) - mesParaIndice(a);
}

export function compararMeses(a: MesReferencia, b: MesReferencia): number {
  return mesParaIndice(a) - mesParaIndice(b);
}

export function formatarMes(date: Date): MesReferencia {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Resolve o "mês atual" da regra de negócio: vem do override de configuração
 * se existir, senão do relógio do sistema. Nunca hardcoded. `agora` é
 * injetável para tornar os chamadores testáveis com data fixa.
 */
export function resolverMesAtual(
  override: MesReferencia | null,
  agora: Date = new Date(),
): MesReferencia {
  return override ?? formatarMes(agora);
}

export function gerarIntervaloMeses(inicio: MesReferencia, quantidade: number): MesReferencia[] {
  return Array.from({ length: quantidade }, (_, i) => addMeses(inicio, i));
}
