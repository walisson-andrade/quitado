import { ItemFaturaStagedSchema, MesReferenciaSchema, type ItemFaturaStaged } from "@quitado/shared-types";
import type { RawGeminiExtraction } from "./extractFromDocument.js";

export interface ParseGeminiResultado {
  itensValidos: ItemFaturaStaged[];
  itensRejeitados: Array<{ bruto: unknown; motivo: string }>;
  /** 'YYYY-MM' derivado da data de vencimento extraída, ou null se a IA não retornou uma data válida. */
  mesReferenciaSugerido: string | null;
}

/**
 * Aplicação literal da regra "a IA nunca escreve direto no banco": qualquer
 * item que não valide contra ItemFaturaStagedSchema é descartado aqui,
 * antes de chegar à tela de revisão — nunca silenciosamente aceito.
 */
export function parseGeminiResponse(extracao: RawGeminiExtraction): ParseGeminiResultado {
  const itensValidos: ItemFaturaStaged[] = [];
  const itensRejeitados: Array<{ bruto: unknown; motivo: string }> = [];

  for (const bruto of extracao.itens) {
    const candidato = {
      nome: bruto.nome,
      valorCents: Math.round(bruto.valorReais * 100),
      tipo: bruto.tipo,
      parcelaAtual: bruto.parcelaAtual ?? null,
      parcelaTotal: bruto.parcelaTotal ?? null,
      cartaoOrigem: bruto.cartaoOrigem ?? null,
      data: bruto.data,
      origemImportacao: "pdf_imagem_ia" as const,
    };

    const resultado = ItemFaturaStagedSchema.safeParse(candidato);
    if (resultado.success) {
      itensValidos.push(resultado.data);
    } else {
      itensRejeitados.push({ bruto, motivo: resultado.error.issues.map((i) => i.message).join("; ") });
    }
  }

  const mesCandidato = extracao.dataVencimento?.slice(0, 7);
  const mesReferenciaSugerido = MesReferenciaSchema.safeParse(mesCandidato).success ? mesCandidato! : null;

  return { itensValidos, itensRejeitados, mesReferenciaSugerido };
}
