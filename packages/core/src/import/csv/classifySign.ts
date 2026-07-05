import type { ItemFaturaStaged } from "@quitado/shared-types";
import { ehPagamentoFatura } from "../constants.js";

const PREFIXOS_ESTORNO = ["estorno de", "crédito de", "credito de"];

/**
 * Classifica uma linha pelo título + sinal do valor. O CSV do Nubank marca
 * créditos/estornos com um "- " antes do valor — o sinal sozinho não decide
 * entre "estorno" (devolução de loja) e "pagamento_fatura" (o próprio
 * usuário pagando a fatura), por isso o texto do título entra na decisão.
 */
export function classifySign(titulo: string, valorSigned: number): ItemFaturaStaged["tipo"] {
  const tituloNormalizado = titulo.trim().toLowerCase();

  if (ehPagamentoFatura(tituloNormalizado)) return "pagamento_fatura";
  if (PREFIXOS_ESTORNO.some((p) => tituloNormalizado.startsWith(p))) return "estorno";
  if (valorSigned < 0) return "estorno";
  return "despesa";
}
