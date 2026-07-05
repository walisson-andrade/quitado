import type { ItemFaturaStaged } from "@quitado/shared-types";

/**
 * Passo final compartilhado pelos dois caminhos de importação (Gemini e
 * CSV) antes da tela de revisão: só ordena por data — a UI de revisão não
 * precisa saber de onde cada item veio.
 *
 * NÃO remove duplicatas "exatas" (mesmo nome/valor/data/parcela): faturas
 * reais podem ter duas cobranças idênticas de fato (ex: duas assinaturas
 * iguais lançadas no mesmo dia) — descartar uma delas aqui é silencioso e
 * incorreto. O usuário revisa item a item antes de confirmar e pode excluir
 * manualmente qualquer item que seja mesmo uma duplicata indevida.
 */
export function normalizeItensFatura(itens: ItemFaturaStaged[]): ItemFaturaStaged[] {
  return [...itens].sort((a, b) => a.data.localeCompare(b.data));
}
