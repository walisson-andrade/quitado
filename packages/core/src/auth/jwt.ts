import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "quitado_session";
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não definido no ambiente.");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  tokenVersion: number;
}

export async function assinarSessao(payload: SessionPayload): Promise<string> {
  return new SignJWT({ tokenVersion: payload.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${THIRTY_DAYS_SECONDS}s`)
    .sign(getSecret());
}

/** Retorna o payload se a assinatura e expiração forem válidas, ou null caso contrário. */
export async function verificarSessao(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.tokenVersion !== "number") return null;
    return { tokenVersion: payload.tokenVersion };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = THIRTY_DAYS_SECONDS;
