import { FRASES_PAGAMENTO_FATURA } from "../constants.js";

/**
 * Prompt versionado — mudar o texto aqui é uma mudança de contrato com o
 * parser (parseGeminiResponse.ts), suba a versão se alterar o formato.
 */
export const GEMINI_PROMPT_VERSION = 2;

export const GEMINI_EXTRACTION_PROMPT = `
Você recebe uma fatura de cartão de crédito brasileira (PDF ou foto), possivelmente
contendo VÁRIOS cartões na mesma fatura (cada um com sua própria seção/cabeçalho,
ex: "CARTÃO 5364****6071").

Retorne um objeto JSON com dois campos: "dataVencimento" e "itens".

"dataVencimento": a "Data de Vencimento" desta fatura (o vencimento do boleto/pagamento
total, normalmente no topo do documento), convertida para o formato ISO "YYYY-MM-DD".
IMPORTANTE: isso é a data de vencimento DESTA fatura como um todo, não a data de nenhuma
compra individual — é usada para saber a qual mês as parcelas desta fatura pertencem.

"itens": TODOS os lançamentos (linhas de movimentação/despesa) da fatura. Para cada item:

- "nome": o nome do beneficiário/loja como aparece na fatura, sem o texto "(Parcela X de Y)".
- "valorReais": o valor em reais como número (ex: 167.60), sempre positivo — nunca negativo,
  mesmo que a fatura mostre um sinal de menos.
- "tipo": "despesa" para a maioria dos lançamentos; "pagamento_fatura" se a linha for um
  pagamento da própria fatura (frases como ${FRASES_PAGAMENTO_FATURA.map((f) => `"${f}"`).join(", ")}
  ou equivalentes); "estorno" se for uma devolução/estorno de loja.
- "parcelaAtual" e "parcelaTotal": se a linha disser "(Parcela 02 de 10)", retorne 2 e 10.
  Se não houver indicação de parcela (compra à vista), retorne null para ambos.
  ATENÇÃO: a data ao lado de cada lançamento parcelado costuma ser a data da COMPRA
  ORIGINAL (a mesma em todas as faturas seguintes), NÃO o mês desta fatura — por isso
  "dataVencimento" (acima) é o campo confiável para saber o mês desta parcela atual.
- "cartaoOrigem": a identificação do cartão daquela seção da fatura (ex: "5364****6071"),
  ou null se a fatura não tiver múltiplos cartões.
- "data": a data da movimentação como aparece na fatura, convertida para o formato ISO
  "YYYY-MM-DD" (mesmo sendo a data da compra original, mantenha para fins de auditoria).

Responda APENAS com o objeto JSON pedido — nenhum texto livre adicional.
`.trim();
