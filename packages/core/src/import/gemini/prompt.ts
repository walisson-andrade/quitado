import { FRASES_PAGAMENTO_FATURA } from "../constants.js";

/**
 * Prompt versionado — mudar o texto aqui é uma mudança de contrato com o
 * parser (parseGeminiResponse.ts), suba a versão se alterar o formato.
 */
export const GEMINI_PROMPT_VERSION = 6;

export const GEMINI_EXTRACTION_PROMPT = `
Você recebe uma fatura de cartão de crédito brasileira (PDF ou foto), possivelmente
contendo VÁRIOS cartões na mesma fatura (cada um com sua própria seção/cabeçalho,
ex: "CARTÃO 5364****6071").

Retorne um objeto JSON com cinco campos: "dataVencimento", "totalFatura", "banco", "titular"
e "itens".

"dataVencimento": a "Data de Vencimento" desta fatura (o vencimento do boleto/pagamento
total, normalmente no topo do documento), convertida para o formato ISO "YYYY-MM-DD".
IMPORTANTE: isso é a data de vencimento DESTA fatura como um todo, não a data de nenhuma
compra individual — é usada para saber a qual mês as parcelas desta fatura pertencem.

"totalFatura": o valor total desta fatura como está IMPRESSO no documento (procure por
"Total da Fatura", "Total a pagar", "Valor total desta fatura" ou equivalente — geralmente
no topo ou no resumo/rodapé), como número em reais (ex: 280.95). Retorne null se não
encontrar esse total impresso. Este valor é conferido depois contra a soma dos itens
extraídos, então precisa ser exatamente o que está escrito no documento, não uma soma
que você mesmo calculou.

"banco": o nome do banco/emissor do cartão (ex: "Inter", "Nubank", "Santander", "C6 Bank",
"Neon"), normalmente no logo/cabeçalho do documento. Retorne null se não conseguir
identificar com confiança. Isso é só uma sugestão — o nome do arquivo NÃO é confiável pra
isso, só o que está escrito no próprio documento.

"titular": o nome completo do titular da fatura (dono da conta/cartão principal),
normalmente perto do endereço ou cabeçalho do documento — ex: "LETICIA MENDES SILVA".
Retorne null se não conseguir identificar com confiança. "banco" e "titular" juntos são só
uma sugestão pra ajudar a saber de quem é o cartão quando a mesma pessoa tem cartão em
vários bancos, ou o mesmo banco tem cartão de várias pessoas — nunca decidem nada
sozinhos, o usuário sempre confirma.

"itens": os lançamentos (linhas de movimentação/despesa) que efetivamente compõem O VALOR
COBRADO NESTA FATURA — a soma de "valorReais" de todos os itens precisa bater com
"totalFatura". Para cada item:

- "nome": o nome do beneficiário/loja como aparece na fatura, sem o texto "(Parcela X de Y)".
- "valorReais": o valor em reais como número (ex: 167.60), sempre positivo — nunca negativo,
  mesmo que a fatura mostre um sinal de menos.
- "tipo": "despesa" para a maioria dos lançamentos; "pagamento_fatura" se a linha for um
  pagamento da própria fatura (frases como ${FRASES_PAGAMENTO_FATURA.map((f) => `"${f}"`).join(", ")}
  ou equivalentes); "estorno" se for uma devolução/estorno de loja. IMPORTANTE: QUALQUER
  linha que apareça com sinal de MENOS (valor negativo) na fatura é "estorno", mesmo que
  não tenha nenhuma palavra tipo "estorno" ou "devolução" escrita do lado — o sinal negativo
  sozinho já é o suficiente. Isso é comum em compras parceladas canceladas: a fatura mostra
  uma linha negativa com o valor total (parcelas × valor de cada uma) revertendo a compra —
  essa linha negativa é "estorno", nunca "despesa" com o sinal invertido pra positivo.
- "parcelaAtual" e "parcelaTotal": se a linha disser "(Parcela 02 de 10)", retorne 2 e 10.
  Se não houver indicação de parcela (compra à vista), retorne null para ambos.
  ATENÇÃO: a data ao lado de cada lançamento parcelado costuma ser a data da COMPRA
  ORIGINAL (a mesma em todas as faturas seguintes), NÃO o mês desta fatura — por isso
  "dataVencimento" (acima) é o campo confiável para saber o mês desta parcela atual.
- "cartaoOrigem": a identificação do cartão daquela seção da fatura (ex: "5364****6071"),
  ou null se a fatura não tiver múltiplos cartões.
- "data": a data da movimentação como aparece na fatura, convertida para o formato ISO
  "YYYY-MM-DD" (mesmo sendo a data da compra original, mantenha para fins de auditoria).

ATENÇÃO — MUITAS faturas de cartão brasileiras têm, ALÉM da lista de lançamentos deste mês,
uma seção separada tipo "Compras parceladas", "Parcelamentos futuros" ou "Programação de
parcelas" mostrando as PRÓXIMAS parcelas de compras já parceladas, só como prévia
informativa — essas parcelas futuras NÃO são cobradas nesta fatura, só nas seguintes. NÃO
extraia essa seção como itens: cada compra parcelada entra só UMA VEZ em "itens", com o
número da parcela que está sendo cobrada NESTA fatura (ex: "Parcela 7 de 13" cobrada agora
vira um item com parcelaAtual=7, parcelaTotal=13 — as parcelas 8 a 13 dessa MESMA compra,
se aparecerem numa tabela de previsão à parte, não viram itens novos). O sinal de que uma
tabela é "previsão futura" e não cobrança deste mês: linhas repetindo a MESMA loja e a MESMA
data de compra original, só variando o número da parcela — isso é uma tabela de
parcelamento, não lançamentos novos.

Responda APENAS com o objeto JSON pedido — nenhum texto livre adicional.
`.trim();
