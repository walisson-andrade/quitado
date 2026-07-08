import { z } from "zod";
import { MesReferenciaSchema } from "./mes.js";

/**
 * Formato normalizado para o qual convergem os dois caminhos de importação
 * (Gemini vision para PDF/imagem, parser determinístico para CSV) antes da
 * tela de revisão. A IA nunca escreve direto no banco: qualquer item que
 * falhe esta validação é rejeitado antes de chegar ao usuário.
 */
export const ItemFaturaStagedSchema = z.object({
  nome: z.string().min(1),
  valorCents: z.number().int().positive(),
  tipo: z.enum(["despesa", "estorno", "pagamento_fatura"]),
  parcelaAtual: z.number().int().positive().nullable(),
  parcelaTotal: z.number().int().positive().nullable(),
  cartaoOrigem: z.string().nullable(),
  data: z.string(), // ISO date (YYYY-MM-DD)
  origemImportacao: z.enum(["pdf_imagem_ia", "csv_nubank"]),
});

export type ItemFaturaStaged = z.infer<typeof ItemFaturaStagedSchema>;

export const ItemFaturaStagedArraySchema = z.array(ItemFaturaStagedSchema);

export const FaturaTipoOrigemSchema = z.enum(["pdf_imagem_ia", "csv_nubank"]);
export const FaturaStatusSchema = z.enum([
  "processando",
  "pendente_revisao",
  "confirmado",
  "descartado",
]);

export const FaturaImportadaSchema = z.object({
  id: z.string().uuid(),
  tipoOrigem: FaturaTipoOrigemSchema,
  /** Banco/cartão real (ex: "Inter", "Nubank") — independente do método de extração (tipoOrigem). */
  origem: z.string().nullable(),
  nomeArquivo: z.string(),
  arquivoStorageKey: z.string().nullable(),
  mesReferenciaSugerido: MesReferenciaSchema.nullable(),
  /** Nome do titular do cartão lido no documento pela IA — sugestão pra bater com um cartão já cadastrado, o usuário sempre confirma. */
  titularSugerido: z.string().nullable(),
  /** Nome do banco/emissor lido no documento pela IA — mais confiável que adivinhar pelo nome do arquivo. */
  bancoSugerido: z.string().nullable(),
  /** Total da fatura impresso no documento, lido pela IA (centavos) — só pra conferir contra a soma dos itens na revisão. */
  totalFaturaSugeridoCents: z.number().int().nullable(),
  jsonExtraido: ItemFaturaStagedArraySchema,
  jsonConfirmado: ItemFaturaStagedArraySchema.nullable(),
  status: FaturaStatusSchema,
  criadoEm: z.string(),
  confirmadoEm: z.string().nullable(),
});

export type FaturaImportada = z.infer<typeof FaturaImportadaSchema>;

/** Corpo aceito pela rota de confirmação da tela de revisão. */
export const ConfirmarFaturaRequestSchema = z.object({
  faturaId: z.string().uuid(),
  /** Banco/cartão real desta fatura (ex: "Inter", "Nubank") — aplicado a todos os itens aprovados. */
  origemFatura: z.string().min(1).optional(),
  itensAprovados: z.array(
    ItemFaturaStagedSchema.extend({
      mesInicio: MesReferenciaSchema.optional(),
    }),
  ),
});

export type ConfirmarFaturaRequest = z.infer<typeof ConfirmarFaturaRequestSchema>;
