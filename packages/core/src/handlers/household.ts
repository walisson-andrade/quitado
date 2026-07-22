import { randomUUID } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { assinarSessao, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../auth/jwt.js";
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

/**
 * Aceita um convite estando já autenticado — cobre o caso de quem já tem
 * sessão válida no navegador (não passa pelo fluxo de login do Google, que
 * só processa convite durante o callback OAuth). Sempre entra/troca pra essa
 * família, mesmo já sendo membro de outra.
 */
export const aceitarConvite: Handler<unknown, { token: string }> = async ({ db, params, session }) => {
  const [conviteRow] = await db.select().from(householdInvites).where(eq(householdInvites.token, params.token)).limit(1);
  if (!conviteRow || conviteRow.usadoEm || conviteRow.expiraEm < new Date()) {
    throw new HttpError(410, "Convite inválido ou expirado");
  }

  const householdId = conviteRow.householdId;
  const [jaEhMembro] = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, session!.userId), eq(householdMembers.householdId, householdId)))
    .limit(1);
  if (!jaEhMembro) {
    await db.insert(householdMembers).values({ householdId, userId: session!.userId, papel: "membro" });
  }
  await db.update(householdInvites).set({ usadoEm: new Date() }).where(eq(householdInvites.id, conviteRow.id));
  await db.update(users).set({ activeHouseholdId: householdId }).where(eq(users.id, session!.userId));

  const token = await assinarSessao({ userId: session!.userId, householdId });
  return {
    status: 200,
    body: { ok: true },
    setCookies: [{ name: SESSION_COOKIE_NAME, value: token, maxAgeSeconds: SESSION_MAX_AGE_SECONDS }],
  };
};

/** Remove alguém da família — só o dono pode remover, e nunca a si mesmo (evita se autoexcluir sem querer no meio do uso). */
export const removerMembro: Handler<unknown, { userId: string }> = async ({ db, params, session }) => {
  if (session!.papel !== "dono") {
    throw new HttpError(403, "Só o dono da família pode remover membros.");
  }
  if (params.userId === session!.userId) {
    throw new HttpError(400, "Você não pode remover a si mesmo — peça pra outro dono fazer isso.");
  }
  const [row] = await db
    .delete(householdMembers)
    .where(and(eq(householdMembers.userId, params.userId), eq(householdMembers.householdId, session!.householdId)))
    .returning();
  if (!row) throw new HttpError(404, "Membro não encontrado nessa família");

  // Se essa era a família ativa da pessoa removida, limpa — assim o próximo
  // login dela decide de novo (cai numa das outras que ainda faz parte, ou
  // cria uma nova, em vez de tentar reentrar numa família que ela não é mais).
  await db
    .update(users)
    .set({ activeHouseholdId: null })
    .where(and(eq(users.id, params.userId), eq(users.activeHouseholdId, session!.householdId)));

  return { status: 204, body: null };
};

/**
 * Sai da família ativa por vontade própria — diferente de `removerMembro`
 * (que exige dono e nunca permite se autoexcluir), aqui é sempre a própria
 * pessoa saindo. Se ela ainda fizer parte de outra família, a sessão troca
 * pra essa automaticamente; se não sobrar nenhuma, o cookie é limpo e o
 * próximo login começa do zero (cria uma família nova).
 */
export const sairDaFamilia: Handler = async ({ db, session }) => {
  if (session!.papel === "dono") {
    const [outroMembro] = await db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, session!.householdId), ne(householdMembers.userId, session!.userId)))
      .limit(1);
    if (outroMembro) {
      throw new HttpError(
        409,
        "Você é dono dessa família e ainda tem outras pessoas nela — remova todo mundo antes de sair.",
      );
    }
  }

  await db
    .delete(householdMembers)
    .where(and(eq(householdMembers.userId, session!.userId), eq(householdMembers.householdId, session!.householdId)));

  const [outraFamilia] = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, session!.userId), ne(householdMembers.householdId, session!.householdId)))
    .limit(1);

  if (!outraFamilia) {
    await db.update(users).set({ activeHouseholdId: null }).where(eq(users.id, session!.userId));
    return {
      status: 200,
      body: { ok: true, semFamilia: true },
      setCookies: [{ name: SESSION_COOKIE_NAME, value: "", maxAgeSeconds: 0 }],
    };
  }

  await db.update(users).set({ activeHouseholdId: outraFamilia.householdId }).where(eq(users.id, session!.userId));
  const token = await assinarSessao({ userId: session!.userId, householdId: outraFamilia.householdId });
  return {
    status: 200,
    body: { ok: true, semFamilia: false },
    setCookies: [{ name: SESSION_COOKIE_NAME, value: token, maxAgeSeconds: SESSION_MAX_AGE_SECONDS }],
  };
};
