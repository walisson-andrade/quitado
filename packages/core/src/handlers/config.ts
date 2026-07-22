import { eq } from "drizzle-orm";
import { z } from "zod";
import { MesReferenciaSchema } from "@quitado/shared-types";
import { resolverMesAtual } from "@quitado/calc";
import { householdConfig } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

const MoedaSchema = z.enum(["BRL", "EUR", "USD"]);

export const obterConfig: Handler = async ({ db, session }) => {
  const [config] = await db.select().from(householdConfig).where(eq(householdConfig.householdId, session!.householdId)).limit(1);
  return {
    status: 200,
    body: {
      salarioCents: config?.salarioCents ?? 0,
      moedaSalario: config?.moedaSalario ?? "BRL",
      cotacaoBrl: config ? Number(config.cotacaoBrl) : null,
      mesAtualOverride: config?.mesAtualOverride ?? null,
      mesAtual: resolverMesAtual(config?.mesAtualOverride ?? null),
    },
  };
};

const AtualizarConfigInputSchema = z.object({
  salarioCents: z.number().int().nonnegative().optional(),
  moedaSalario: MoedaSchema.optional(),
  cotacaoBrl: z.number().positive().optional(),
  mesAtualOverride: MesReferenciaSchema.nullable().optional(),
});

export const atualizarConfig: Handler = async ({ db, body, session }) => {
  const input = AtualizarConfigInputSchema.parse(body);
  const patch = {
    ...(input.salarioCents !== undefined ? { salarioCents: input.salarioCents } : {}),
    ...(input.moedaSalario !== undefined ? { moedaSalario: input.moedaSalario } : {}),
    ...(input.cotacaoBrl !== undefined ? { cotacaoBrl: String(input.cotacaoBrl) } : {}),
    ...(input.mesAtualOverride !== undefined ? { mesAtualOverride: input.mesAtualOverride } : {}),
  };
  const [row] = await db
    .insert(householdConfig)
    .values({ householdId: session!.householdId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: householdConfig.householdId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return { status: 200, body: row };
};

const CotacaoQuerySchema = z.object({ moeda: z.enum(["EUR", "USD"]) });

/** Cotação do dia via AwesomeAPI (gratuita, sem chave) — usada pelo botão "Atualizar cotação" nas Configurações. */
export const obterCotacaoAtual: Handler = async ({ query }) => {
  const { moeda } = CotacaoQuerySchema.parse(query);
  const resposta = await fetch(`https://economia.awesomeapi.com.br/last/${moeda}-BRL`);
  if (!resposta.ok) {
    // 429 (rate limit do plano gratuito) é o caso mais comum aqui — sem
    // chave de API, ela aceita um número limitado de chamadas por período.
    throw new HttpError(502, "Não consegui buscar a cotação agora (serviço externo indisponível) — tenta de novo em instantes.");
  }
  const data = (await resposta.json()) as Record<string, { bid: string }>;
  const par = data[`${moeda}BRL`];
  if (!par) throw new HttpError(502, "Cotação não encontrada na resposta da API.");
  return { status: 200, body: { cotacao: Number(par.bid) } };
};
