import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_EXTRACTION_PROMPT } from "./prompt.js";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    dataVencimento: { type: Type.STRING },
    totalFatura: { type: Type.NUMBER, nullable: true },
    banco: { type: Type.STRING, nullable: true },
    titular: { type: Type.STRING, nullable: true },
    itens: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING },
          valorReais: { type: Type.NUMBER },
          tipo: { type: Type.STRING, enum: ["despesa", "estorno", "pagamento_fatura"] },
          parcelaAtual: { type: Type.INTEGER, nullable: true },
          parcelaTotal: { type: Type.INTEGER, nullable: true },
          cartaoOrigem: { type: Type.STRING, nullable: true },
          data: { type: Type.STRING },
        },
        required: ["nome", "valorReais", "tipo", "data"],
      },
    },
  },
  required: ["dataVencimento", "itens"],
} as const;

export interface RawGeminiItem {
  nome: string;
  valorReais: number;
  tipo: "despesa" | "estorno" | "pagamento_fatura";
  parcelaAtual: number | null;
  parcelaTotal: number | null;
  cartaoOrigem: string | null;
  data: string;
}

export interface RawGeminiExtraction {
  /** Data de vencimento da fatura como um todo — base confiável para o mês das parcelas. */
  dataVencimento: string;
  /** Total da fatura impresso no documento (reais), ou null se não achou — usado só pra conferir contra a soma dos itens. */
  totalFatura: number | null;
  /** Nome do banco/emissor lido no documento, ou null se não achou — só sugestão, nunca decide sozinho. */
  banco: string | null;
  /** Nome do titular lido no documento, ou null se não achou — só sugestão, nunca decide sozinho. */
  titular: string | null;
  itens: RawGeminiItem[];
}

/**
 * Uma única chamada resolve faturas multi-cartão — o modelo retorna um
 * array com `cartaoOrigem` por item, mais a data de vencimento da fatura
 * (usada como sugestão de mês de referência, já que a data de cada item
 * parcelado é a da compra original, não a do mês corrente). Nunca escreve
 * no banco: o resultado bruto passa por parseGeminiResponse antes de
 * chegar à tela de revisão.
 */
export async function extractFromDocument(
  fileBuffer: Buffer,
  mimeType: string,
  apiKey: string = process.env.GEMINI_API_KEY ?? "",
): Promise<RawGeminiExtraction> {
  if (!apiKey) throw new Error("GEMINI_API_KEY não definido no ambiente.");

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [{ text: GEMINI_EXTRACTION_PROMPT }, { inlineData: { mimeType, data: fileBuffer.toString("base64") } }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Resposta vazia do Gemini.");

  return JSON.parse(text) as RawGeminiExtraction;
}
