import type { Db } from "../db/client.js";

/** Presente só em handlers envolvidos por `withAuth` — usuário e household já validados como membro ativo. */
export interface SessaoAtual {
  userId: string;
  householdId: string;
  papel: string;
}

export interface HandlerContext<TBody = unknown, TParams = Record<string, string>> {
  body: TBody;
  params: TParams;
  query: Record<string, string | undefined>;
  db: Db;
  /** Cookies recebidos na requisição (ex: sessão de auth). */
  cookies: Record<string, string | undefined>;
  /** Populado por `withAuth` — ausente em rotas públicas (login, callback do Google). */
  session?: SessaoAtual;
}

export interface HandlerResult<TBody = unknown> {
  status: number;
  body: TBody;
  /** Cookies a serem escritos na resposta (ex: Set-Cookie de sessão) — cada adapter traduz para o formato da plataforma. */
  setCookies?: Array<{ name: string; value: string; maxAgeSeconds?: number }>;
  /** Presente quando o handler quer responder com um redirect (ex: fluxo OAuth) — cada adapter traduz pra um 302 com Location. */
  redirectTo?: string;
}

export type Handler<TBody = unknown, TParams = Record<string, string>, TResult = unknown> = (
  ctx: HandlerContext<TBody, TParams>,
) => Promise<HandlerResult<TResult>>;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
