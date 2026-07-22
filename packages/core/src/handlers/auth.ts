import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { montarUrlLoginGoogle, trocarCodePorPerfil } from "../auth/google.js";
import { assinarSessao, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, verificarSessao } from "../auth/jwt.js";
import { households, householdInvites, householdMembers, users } from "../db/schema.js";
import { HttpError, type Handler, type HandlerContext } from "./types.js";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não definido no ambiente.`);
  return value;
}

function codificarState(convite: string | null): string {
  return Buffer.from(JSON.stringify({ convite })).toString("base64url");
}

function decodificarState(state: string | undefined): { convite: string | null } {
  if (!state) return { convite: null };
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    return { convite: typeof parsed.convite === "string" ? parsed.convite : null };
  } catch {
    return { convite: null };
  }
}

export const iniciarLoginGoogle: Handler = async ({ query }) => {
  const state = codificarState(query.convite ?? null);
  return { status: 302, body: null, redirectTo: montarUrlLoginGoogle(state) };
};

export const callbackGoogle: Handler = async ({ db, query }) => {
  const webOrigin = getEnv("WEB_ORIGIN");

  if (query.error || !query.code) {
    return { status: 302, body: null, redirectTo: `${webOrigin}/?erro=login_cancelado` };
  }

  const { convite } = decodificarState(query.state);

  let perfil;
  try {
    perfil = await trocarCodePorPerfil(query.code);
  } catch (err) {
    console.error("Falha ao trocar code do Google por perfil:", err);
    return { status: 302, body: null, redirectTo: `${webOrigin}/?erro=login_falhou` };
  }

  const [user] = await db
    .insert(users)
    .values({ googleSub: perfil.sub, email: perfil.email, nome: perfil.nome, avatarUrl: perfil.avatarUrl })
    .onConflictDoUpdate({
      target: users.googleSub,
      set: { email: perfil.email, nome: perfil.nome, avatarUrl: perfil.avatarUrl },
    })
    .returning();
  if (!user) throw new HttpError(500, "Falha ao registrar usuário.");

  // Convite tem prioridade mesmo se a pessoa já é membro de outro household —
  // uma pessoa pode fazer parte de várias famílias (ex: a dela e a do
  // parceiro), então clicar num link de convite é sempre "entra/troca pra
  // essa aqui", nunca ignorado por já ter household.
  let householdId: string;
  if (convite) {
    const [conviteRow] = await db.select().from(householdInvites).where(eq(householdInvites.token, convite)).limit(1);
    if (!conviteRow || conviteRow.usadoEm || conviteRow.expiraEm < new Date()) {
      return { status: 302, body: null, redirectTo: `${webOrigin}/?erro=convite_invalido` };
    }
    householdId = conviteRow.householdId;

    const [jaEhMembro] = await db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.userId, user.id), eq(householdMembers.householdId, householdId)))
      .limit(1);
    if (!jaEhMembro) {
      await db.insert(householdMembers).values({ householdId, userId: user.id, papel: "membro" });
    }
    await db.update(householdInvites).set({ usadoEm: new Date() }).where(eq(householdInvites.id, conviteRow.id));
  } else if (user.activeHouseholdId) {
    householdId = user.activeHouseholdId;
  } else {
    const [membroExistente] = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, user.id))
      .limit(1);
    if (membroExistente) {
      householdId = membroExistente.householdId;
    } else {
      const [household] = await db.insert(households).values({ nome: perfil.nome ? `Família ${perfil.nome}` : "Minha família" }).returning();
      if (!household) throw new HttpError(500, "Falha ao criar household.");
      householdId = household.id;
      await db.insert(householdMembers).values({ householdId, userId: user.id, papel: "dono" });
    }
  }

  await db.update(users).set({ activeHouseholdId: householdId }).where(eq(users.id, user.id));

  const token = await assinarSessao({ userId: user.id, householdId });
  return {
    status: 302,
    body: null,
    redirectTo: webOrigin,
    setCookies: [{ name: SESSION_COOKIE_NAME, value: token, maxAgeSeconds: SESSION_MAX_AGE_SECONDS }],
  };
};

export const logout: Handler = async () => {
  return {
    status: 200,
    body: { ok: true },
    setCookies: [{ name: SESSION_COOKIE_NAME, value: "", maxAgeSeconds: 0 }],
  };
};

export const obterUsuarioAtual: Handler = async ({ db, session }) => {
  const [user] = await db.select().from(users).where(eq(users.id, session!.userId)).limit(1);
  if (!user) throw new HttpError(404, "Usuário não encontrado");
  return {
    status: 200,
    body: { id: user.id, email: user.email, nome: user.nome, avatarUrl: user.avatarUrl },
  };
};

/** Todas as famílias de que a pessoa faz parte — alimenta o seletor de família nas Configurações. */
export const listarMinhasFamilias: Handler = async ({ db, session }) => {
  const rows = await db
    .select({ id: households.id, nome: households.nome, papel: householdMembers.papel })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, session!.userId));
  return { status: 200, body: rows.map((r) => ({ ...r, ativa: r.id === session!.householdId })) };
};

const TrocarFamiliaInputSchema = z.object({ householdId: z.string().uuid() });

/** Troca a família ativa da sessão — só entre famílias das quais a pessoa já é membro. */
export const trocarFamilia: Handler = async ({ db, body, session }) => {
  const { householdId } = TrocarFamiliaInputSchema.parse(body);

  const [membro] = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, session!.userId), eq(householdMembers.householdId, householdId)))
    .limit(1);
  if (!membro) throw new HttpError(404, "Você não faz parte dessa família.");

  await db.update(users).set({ activeHouseholdId: householdId }).where(eq(users.id, session!.userId));

  const token = await assinarSessao({ userId: session!.userId, householdId });
  return {
    status: 200,
    body: { ok: true },
    setCookies: [{ name: SESSION_COOKIE_NAME, value: token, maxAgeSeconds: SESSION_MAX_AGE_SECONDS }],
  };
};

/**
 * Envolve um handler exigindo sessão válida — além de assinatura/expiração do
 * JWT, confere se o (userId, householdId) do token ainda é membro ativo do
 * household. É essa checagem no banco (não um contador de versão) que revoga
 * acesso na hora quando alguém é removido do household.
 */
export function withAuth<TBody, TParams extends Record<string, string>, TResult>(
  handler: Handler<TBody, TParams, TResult>,
): Handler<TBody, TParams, TResult | { erro: string }> {
  return async (ctx: HandlerContext<TBody, TParams>) => {
    const sessao = await verificarSessao(ctx.cookies[SESSION_COOKIE_NAME]);
    if (!sessao) throw new HttpError(401, "Não autenticado");

    const [membro] = await ctx.db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.userId, sessao.userId), eq(householdMembers.householdId, sessao.householdId)))
      .limit(1);
    if (!membro) throw new HttpError(401, "Sessão expirada — faça login novamente");

    return handler({ ...ctx, session: { userId: sessao.userId, householdId: sessao.householdId, papel: membro.papel } });
  };
}
