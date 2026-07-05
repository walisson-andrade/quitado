import type { ItemFaturaStaged } from "@quitado/shared-types";
import { classifySign } from "./classifySign.js";
import { parseCsvLines } from "./parseCsvLines.js";
import { parseTitleInstallment } from "./parseTitleInstallment.js";
import { parseValorPtBr } from "./parseValorPtBr.js";

/**
 * Caminho determinístico (sem IA) para extratos CSV do Nubank:
 * colunas `date,title,amount`. Convém a mesma ItemFaturaStaged que o
 * caminho Gemini, então a tela de revisão não precisa ramificar por origem.
 */
export function parseNubankCsv(csvTexto: string): ItemFaturaStaged[] {
  const linhas = parseCsvLines(csvTexto);
  if (linhas.length === 0) return [];

  const [cabecalho, ...resto] = linhas;
  const idxData = cabecalho!.indexOf("date");
  const idxTitulo = cabecalho!.indexOf("title");
  const idxValor = cabecalho!.indexOf("amount");
  if (idxData < 0 || idxTitulo < 0 || idxValor < 0) {
    throw new Error("CSV não reconhecido: esperado colunas date,title,amount");
  }

  return resto.map((linha): ItemFaturaStaged => {
    const data = linha[idxData]!.trim();
    const tituloBruto = linha[idxTitulo]!.trim();
    const valorSigned = parseValorPtBr(linha[idxValor]!);

    const parcelaInfo = parseTitleInstallment(tituloBruto);
    const nome = parcelaInfo?.nomeLimpo ?? tituloBruto;
    const tipo = classifySign(tituloBruto, valorSigned);

    return {
      nome,
      valorCents: Math.abs(valorSigned),
      tipo,
      parcelaAtual: parcelaInfo?.parcelaAtual ?? null,
      parcelaTotal: parcelaInfo?.parcelaTotal ?? null,
      cartaoOrigem: "Nubank",
      data,
      origemImportacao: "csv_nubank",
    };
  });
}
