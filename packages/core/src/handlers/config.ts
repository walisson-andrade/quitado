import { eq } from "drizzle-orm";
import { z } from "zod";
import { MesReferenciaSchema } from "@quitado/shared-types";
import { resolverMesAtual } from "@quitado/calc";
import { appConfig } from "../db/schema.js";
import type { Handler } from "./types.js";

export const obterConfig: Handler = async ({ db }) => {
  const [config] = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  return {
    status: 200,
    body: {
      salarioEurCents: config?.salarioEurCents ?? 0,
      eurBrlRate: config ? Number(config.eurBrlRate) : null,
      mesAtualOverride: config?.mesAtualOverride ?? null,
      mesAtual: resolverMesAtual(config?.mesAtualOverride ?? null),
    },
  };
};

const AtualizarConfigInputSchema = z.object({
  salarioEurCents: z.number().int().nonnegative().optional(),
  eurBrlRate: z.number().positive().optional(),
  mesAtualOverride: MesReferenciaSchema.nullable().optional(),
});

export const atualizarConfig: Handler = async ({ db, body }) => {
  const input = AtualizarConfigInputSchema.parse(body);
  const [row] = await db
    .update(appConfig)
    .set({
      ...(input.salarioEurCents !== undefined ? { salarioEurCents: input.salarioEurCents } : {}),
      ...(input.eurBrlRate !== undefined ? { eurBrlRate: String(input.eurBrlRate) } : {}),
      ...(input.mesAtualOverride !== undefined ? { mesAtualOverride: input.mesAtualOverride } : {}),
      updatedAt: new Date(),
    })
    .where(eq(appConfig.id, 1))
    .returning();
  return { status: 200, body: row };
};
