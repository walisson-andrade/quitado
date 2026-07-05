import type { Db } from "../db/client.js";

export interface HandlerContext<TBody = unknown, TParams = Record<string, string>> {
  body: TBody;
  params: TParams;
  query: Record<string, string | undefined>;
  db: Db;
  /** Cookies recebidos na requisição (ex: sessão de auth). */
  cookies: Record<string, string | undefined>;
}

export interface HandlerResult<TBody = unknown> {
  status: number;
  body: TBody;
  /** Cookies a serem escritos na resposta (ex: Set-Cookie de sessão) — cada adapter traduz para o formato da plataforma. */
  setCookies?: Array<{ name: string; value: string; maxAgeSeconds?: number }>;
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
