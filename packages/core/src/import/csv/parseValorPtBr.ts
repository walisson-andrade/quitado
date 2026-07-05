/**
 * "1.234,56" -> 123456 | "69,28" -> 6928 | "- 93,81" -> -9381
 * Formato pt-BR confirmado no CSV real do Nubank: ponto de milhar, vírgula decimal,
 * sinal negativo com espaço opcional antes do número (créditos/estornos).
 */
export function parseValorPtBr(raw: string): number {
  const limpo = raw.trim();
  const negativo = limpo.startsWith("-");
  const semSinal = limpo.replace(/^-\s*/, "");
  const semMilhar = semSinal.replace(/\./g, "").replace(",", ".");
  const valor = Number(semMilhar);
  if (Number.isNaN(valor)) throw new Error(`Valor inválido: "${raw}"`);
  const cents = Math.round(valor * 100);
  return negativo ? -cents : cents;
}
