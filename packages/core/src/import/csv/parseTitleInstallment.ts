const PARCELA_REGEX = /^(.*?)\s*-\s*Parcela\s+(\d+)\/(\d+)$/i;

export interface TituloParcelado {
  nomeLimpo: string;
  parcelaAtual: number;
  parcelaTotal: number;
}

/** "Shopee *Atualcom - Parcela 2/4" -> { nomeLimpo: "Shopee *Atualcom", parcelaAtual: 2, parcelaTotal: 4 } */
export function parseTitleInstallment(titulo: string): TituloParcelado | null {
  const match = PARCELA_REGEX.exec(titulo.trim());
  if (!match) return null;
  const [, nomeLimpo, atual, total] = match;
  return { nomeLimpo: nomeLimpo!, parcelaAtual: Number(atual), parcelaTotal: Number(total) };
}
