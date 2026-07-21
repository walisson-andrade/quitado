import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não definido no ambiente.`);
  return value;
}

/**
 * Monta a URL de consentimento do Google — `state` carrega o token de
 * convite (se o login veio de um link `/convite/:token`) pra o callback
 * saber em qual household juntar o usuário, em vez de sempre criar um novo.
 */
export function montarUrlLoginGoogle(state: string): string {
  const params = new URLSearchParams({
    client_id: getEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: getEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export interface PerfilGoogle {
  sub: string;
  email: string;
  nome: string | null;
  avatarUrl: string | null;
}

/** Troca o `code` do callback por tokens e verifica o `id_token` contra o JWKS do Google — nunca confia no payload sem checar assinatura/issuer/audience. */
export async function trocarCodePorPerfil(code: string): Promise<PerfilGoogle> {
  const body = new URLSearchParams({
    code,
    client_id: getEnv("GOOGLE_CLIENT_ID"),
    client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: getEnv("GOOGLE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });

  const resposta = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao trocar code com o Google: ${resposta.status} ${await resposta.text()}`);
  }
  const { id_token: idToken } = (await resposta.json()) as { id_token?: string };
  if (!idToken) throw new Error("Google não retornou id_token.");

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: getEnv("GOOGLE_CLIENT_ID"),
  });

  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("id_token do Google sem sub/email.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    nome: typeof payload.name === "string" ? payload.name : null,
    avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
  };
}
