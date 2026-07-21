import { eq } from "drizzle-orm";
import { z } from "zod";
import { MesReferenciaSchema } from "@quitado/shared-types";
import { resolverMesAtual } from "@quitado/calc";
import { householdConfig } from "../db/schema.js";
import type { Handler } from "./types.js";

export const obterConfig: Handler = async ({ db, session }) => {
  const [config] = await db.select().from(householdConfig).where(eq(householdConfig.householdId, session!.householdId)).limit(1);
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

export const atualizarConfig: Handler = async ({ db, body, session }) => {
  const input = AtualizarConfigInputSchema.parse(body);
  const patch = {
    ...(input.salarioEurCents !== undefined ? { salarioEurCents: input.salarioEurCents } : {}),
    ...(input.eurBrlRate !== undefined ? { eurBrlRate: String(input.eurBrlRate) } : {}),
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
