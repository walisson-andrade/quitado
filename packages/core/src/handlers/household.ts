import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { households, householdInvites, householdMembers, users } from "../db/schema.js";
import { HttpError, type Handler } from "./types.js";

const CONVITE_VALIDADE_DIAS = 7;

export const obterHousehold: Handler = async ({ db, session }) => {
  const [household] = await db.select().from(households).where(eq(households.id, session!.householdId)).limit(1);
  if (!household) throw new HttpError(404, "Household não encontrado");

  const membros = await db
    .select({
      id: users.id,
      nome: users.nome,
      email: users.email,
      avatarUrl: users.avatarUrl,
      papel: householdMembers.papel,
    })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, session!.householdId));

  return { status: 200, body: { id: household.id, nome: household.nome, membros } };
};

const AtualizarHouseholdInputSchema = z.object({ nome: z.string().min(1) });

export const atualizarHousehold: Handler = async ({ db, body, session }) => {
  const { nome } = AtualizarHouseholdInputSchema.parse(body);
  const [row] = await db.update(households).set({ nome }).where(eq(households.id, session!.householdId)).returning();
  return { status: 200, body: row };
};

export const criarConvite: Handler = async ({ db, session }) => {
  const expiraEm = new Date(Date.now() + CONVITE_VALIDADE_DIAS * 24 * 60 * 60 * 1000);
  const [convite] = await db
    .insert(householdInvites)
    .values({ householdId: session!.householdId, token: randomUUID(), criadoPorUserId: session!.userId, expiraEm })
    .returning();
  return { status: 201, body: convite };
};

export const listarConvitesPendentes: Handler = async ({ db, session }) => {
  const rows = await db
    .select()
    .from(householdInvites)
    .where(and(eq(householdInvites.householdId, session!.householdId), isNull(householdInvites.usadoEm)));
  return { status: 200, body: rows.filter((r) => r.expiraEm > new Date()) };
};

export const removerConvite: Handler<unknown, { id: string }> = async ({ db, params, session }) => {
  const [row] = await db
    .delete(householdInvites)
    .where(and(eq(householdInvites.id, params.id), eq(householdInvites.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Convite não encontrado");
  return { status: 204, body: null };
};
