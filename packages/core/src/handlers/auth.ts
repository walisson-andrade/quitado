import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { assinarSessao, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, verificarSessao } from "../auth/jwt.js";
import { appConfig } from "../db/schema.js";
import { HttpError, type Handler, type HandlerContext } from "./types.js";

const LoginInputSchema = z.object({ senha: z.string().min(1) });

export const login: Handler = async ({ db, body }) => {
  const { senha } = LoginInputSchema.parse(body);
  const [config] = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  if (!config) throw new HttpError(401, "Credenciais inválidas");

  const senhaValida = await bcrypt.compare(senha, config.passwordHash);
  if (!senhaValida) throw new HttpError(401, "Credenciais inválidas");

  const token = await assinarSessao({ tokenVersion: config.tokenVersion });
  return {
    status: 200,
    body: { ok: true },
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

const TrocarSenhaInputSchema = z.object({ senhaAtual: z.string().min(1), novaSenha: z.string().min(8) });

export const trocarSenha: Handler = async ({ db, body }) => {
  const { senhaAtual, novaSenha } = TrocarSenhaInputSchema.parse(body);
  const [config] = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  if (!config) throw new HttpError(401, "Credenciais inválidas");

  const senhaValida = await bcrypt.compare(senhaAtual, config.passwordHash);
  if (!senhaValida) throw new HttpError(401, "Senha atual incorreta");

  const passwordHash = await bcrypt.hash(novaSenha, 10);
  const novaTokenVersion = config.tokenVersion + 1;
  await db
    .update(appConfig)
    .set({ passwordHash, tokenVersion: novaTokenVersion, updatedAt: new Date() })
    .where(eq(appConfig.id, 1));

  // trocar a senha invalida sessões antigas imediatamente (token_version não confere mais)
  const token = await assinarSessao({ tokenVersion: novaTokenVersion });
  return {
    status: 200,
    body: { ok: true },
    setCookies: [{ name: SESSION_COOKIE_NAME, value: token, maxAgeSeconds: SESSION_MAX_AGE_SECONDS }],
  };
};

/**
 * Envolve um handler exigindo sessão válida — a verificação de assinatura
 * JWT + token_version *é* a checagem de sessão, sem round-trip adicional
 * ao banco além de ler o token_version atual do app_config.
 */
export function withAuth<TBody, TParams extends Record<string, string>, TResult>(
  handler: Handler<TBody, TParams, TResult>,
): Handler<TBody, TParams, TResult | { erro: string }> {
  return async (ctx: HandlerContext<TBody, TParams>) => {
    const session = await verificarSessao(ctx.cookies[SESSION_COOKIE_NAME]);
    if (!session) throw new HttpError(401, "Não autenticado");

    const [config] = await ctx.db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
    if (!config || config.tokenVersion !== session.tokenVersion) {
      throw new HttpError(401, "Sessão expirada — faça login novamente");
    }

    return handler(ctx);
  };
}
