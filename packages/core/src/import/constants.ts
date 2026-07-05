/**
 * Frases que identificam uma linha como pagamento da própria fatura (não uma
 * despesa) — compartilhada entre o prompt do Gemini e o classificador de CSV
 * para não duplicar a regra em dois lugares. Ex: "PAGAMENTO ON LINE" no
 * Inter, "Pagamento recebido" no Nubank.
 */
export const FRASES_PAGAMENTO_FATURA = ["pagamento on line", "pagamento recebido", "pagamento efetuado"];

export function ehPagamentoFatura(textoLivre: string): boolean {
  const normalizado = textoLivre.trim().toLowerCase();
  return FRASES_PAGAMENTO_FATURA.some((frase) => normalizado.includes(frase));
}
