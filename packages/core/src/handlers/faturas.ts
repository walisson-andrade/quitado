import { createHash } from "node:crypto";
import { desc, eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { ConfirmarFaturaRequestSchema, ItemFaturaStagedArraySchema } from "@quitado/shared-types";
import type { Db } from "../db/client.js";
import { faturasImportadas, parcelamentos } from "../db/schema.js";
import { parseNubankCsv } from "../import/csv/parseNubankCsv.js";
import { extractFromDocument } from "../import/gemini/extractFromDocument.js";
import { parseGeminiResponse } from "../import/gemini/parseGeminiResponse.js";
import { normalizeItensFatura } from "../import/normalize.js";
import { getStorage } from "../storage.js";
import { HttpError, type Handler } from "./types.js";

/**
 * Pra cada banco (Inter/Nubank/...), qual foi a última fatura confirmada —
 * usado pra decidir quais parcelamentos dessa origem "valem" no mês atual
 * (a fatura mais recente conta inteira, não recalculada mês a mês) sem
 * afetar a projeção de meses futuros, que continua usando o número da parcela.
 */
export async function buscarUltimaFaturaPorOrigem(db: Db): Promise<Record<string, string>> {
  const confirmadas = await db
    .select({ id: faturasImportadas.id, origem: faturasImportadas.origem, confirmadoEm: faturasImportadas.confirmadoEm })
    .from(faturasImportadas)
    .where(eq(faturasImportadas.status, "confirmado"));

  const ultimaPorOrigem = new Map<string, { id: string; confirmadoEm: Date }>();
  for (const f of confirmadas) {
    if (!f.origem || !f.confirmadoEm) continue;
    const atual = ultimaPorOrigem.get(f.origem);
    if (!atual || f.confirmadoEm > atual.confirmadoEm) {
      ultimaPorOrigem.set(f.origem, { id: f.id, confirmadoEm: f.confirmadoEm });
    }
  }

  return Object.fromEntries(Array.from(ultimaPorOrigem.entries()).map(([origem, v]) => [origem, v.id]));
}

export const obterUltimaFaturaPorOrigem: Handler = async ({ db }) => {
  const mapa = await buscarUltimaFaturaPorOrigem(db);
  return { status: 200, body: mapa };
};

const CriarFaturaInputSchema = z.object({
  nomeArquivo: z.string().min(1),
  mimeType: z.string().min(1),
  conteudoBase64: z.string().min(1),
  tipoOrigem: z.enum(["pdf_imagem_ia", "csv_nubank"]),
});

export const listarFaturas: Handler = async ({ db }) => {
  const rows = await db.select().from(faturasImportadas).orderBy(desc(faturasImportadas.criadoEm));
  return { status: 200, body: rows };
};

export const obterFatura: Handler<unknown, { id: string }> = async ({ db, params }) => {
  const [row] = await db.select().from(faturasImportadas).where(eq(faturasImportadas.id, params.id)).limit(1);
  if (!row) throw new HttpError(404, "Fatura não encontrada");
  return { status: 200, body: row };
};

/**
 * NOTA (deploy Vercel): esta chamada é síncrona por simplicidade no dev
 * Docker. Antes de ir para produção na Vercel, dividir em duas etapas
 * (status 'processando' retornado na hora + conclusão assíncrona) para não
 * esbarrar no maxDuration de function — ver seção de bloqueios do plano.
 */
export const criarFaturaUpload: Handler = async ({ db, body }) => {
  const input = CriarFaturaInputSchema.parse(body);
  const buffer = Buffer.from(input.conteudoBase64, "base64");
  const arquivoHash = createHash("sha256").update(buffer).digest("hex");

  // Reimportar o mesmo arquivo já confirmado é quase sempre um engano do
  // usuário (ex: clicar em "solte aqui" de novo) que duplicaria parcelamentos
  // reais — bloqueia aqui em vez de deixar a duplicata acontecer silenciosa.
  const [duplicata] = await db
    .select()
    .from(faturasImportadas)
    .where(and(eq(faturasImportadas.arquivoHash, arquivoHash), ne(faturasImportadas.status, "descartado")))
    .limit(1);
  if (duplicata) {
    throw new HttpError(
      409,
      `Esse arquivo já foi importado em ${duplicata.criadoEm.toISOString().slice(0, 10)} (status: ${duplicata.status}). Descarte a importação anterior antes de reimportar, se for intencional.`,
    );
  }

  const storage = getStorage();
  const storageKey = await storage.put(`faturas/${Date.now()}-${input.nomeArquivo}`, buffer, input.mimeType);

  let itens;
  let mesReferenciaSugerido: string | null = null;
  if (input.tipoOrigem === "csv_nubank") {
    itens = normalizeItensFatura(parseNubankCsv(buffer.toString("utf-8")));
  } else {
    const extracao = await extractFromDocument(buffer, input.mimeType);
    const parseado = parseGeminiResponse(extracao);
    itens = normalizeItensFatura(parseado.itensValidos);
    mesReferenciaSugerido = parseado.mesReferenciaSugerido;
  }

  const [row] = await db
    .insert(faturasImportadas)
    .values({
      tipoOrigem: input.tipoOrigem,
      nomeArquivo: input.nomeArquivo,
      arquivoStorageKey: storageKey,
      arquivoHash,
      mesReferenciaSugerido,
      jsonExtraido: itens,
      status: "pendente_revisao",
    })
    .returning();

  return { status: 201, body: row };
};

export const confirmarFatura: Handler = async ({ db, body }) => {
  const input = ConfirmarFaturaRequestSchema.parse(body);
  const [fatura] = await db.select().from(faturasImportadas).where(eq(faturasImportadas.id, input.faturaId)).limit(1);
  if (!fatura) throw new HttpError(404, "Fatura não encontrada");
  if (fatura.status === "confirmado") {
    throw new HttpError(409, "Esta fatura já foi confirmada — evita duplicar os parcelamentos.");
  }

  // Banco real (Inter/Nubank/outro) informado na revisão tem prioridade —
  // o método de extração (origemImportacao: pdf_imagem_ia vs csv_nubank) não
  // é confiável pra decidir o banco, já que qualquer banco pode mandar PDF ou CSV.
  const origemPadrao = (item: (typeof input.itensAprovados)[number]) =>
    input.origemFatura ?? (item.origemImportacao === "csv_nubank" ? "Nubank" : "Inter");

  const candidatos = input.itensAprovados
    .filter((item) => item.tipo === "despesa")
    .map((item) => ({
      nome: item.nome,
      valorParcelaCents: item.valorCents,
      parcelaAtual: item.parcelaAtual ?? 1,
      parcelaTotal: item.parcelaTotal ?? 1,
      mesInicio: item.mesInicio ?? item.data.slice(0, 7),
      origem: origemPadrao(item),
      cartaoOrigem: item.cartaoOrigem,
      continuaIndefinidamente: false,
      faturaImportadaId: fatura.id,
    }));

  // Dedup por nome + valor + parcela atual/total: a mesma cobrança pode
  // aparecer em faturas diferentes (ex: reimportação, ou dois arquivos que
  // se sobrepõem) — não duplica um parcelamento que já existe com essa
  // combinação exata, mesmo vindo de um upload novo.
  const existentes = await db
    .select({
      nome: parcelamentos.nome,
      valorParcelaCents: parcelamentos.valorParcelaCents,
      parcelaAtual: parcelamentos.parcelaAtual,
      parcelaTotal: parcelamentos.parcelaTotal,
    })
    .from(parcelamentos);
  const chaveExistentes = new Set(
    existentes.map((p) => `${p.nome}|${p.valorParcelaCents}|${p.parcelaAtual}|${p.parcelaTotal}`),
  );

  const parcelamentosParaInserir = candidatos.filter(
    (c) => !chaveExistentes.has(`${c.nome}|${c.valorParcelaCents}|${c.parcelaAtual}|${c.parcelaTotal}`),
  );
  const duplicadosIgnorados = candidatos.length - parcelamentosParaInserir.length;

  if (parcelamentosParaInserir.length > 0) {
    await db.insert(parcelamentos).values(parcelamentosParaInserir);
  }

  const [atualizada] = await db
    .update(faturasImportadas)
    .set({
      status: "confirmado",
      origem: input.origemFatura ?? (fatura.tipoOrigem === "csv_nubank" ? "Nubank" : "Inter"),
      jsonConfirmado: ItemFaturaStagedArraySchema.parse(input.itensAprovados),
      confirmadoEm: new Date(),
    })
    .where(eq(faturasImportadas.id, input.faturaId))
    .returning();

  return { status: 200, body: { ...atualizada, itensInseridos: parcelamentosParaInserir.length, duplicadosIgnorados } };
};

export const descartarFatura: Handler<unknown, { id: string }> = async ({ db, params }) => {
  const [row] = await db
    .update(faturasImportadas)
    .set({ status: "descartado" })
    .where(eq(faturasImportadas.id, params.id))
    .returning();
  if (!row) throw new HttpError(404, "Fatura não encontrada");
  return { status: 200, body: row };
};

export const obterArquivoFatura: Handler<unknown, { id: string }> = async ({ db, params }) => {
  const [fatura] = await db.select().from(faturasImportadas).where(eq(faturasImportadas.id, params.id)).limit(1);
  if (!fatura || !fatura.arquivoStorageKey) throw new HttpError(404, "Arquivo não encontrado");

  const buffer = await getStorage().get(fatura.arquivoStorageKey);
  return {
    status: 200,
    body: { nomeArquivo: fatura.nomeArquivo, conteudoBase64: buffer.toString("base64") },
  };
};
