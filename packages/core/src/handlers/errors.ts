import { ZodError } from "zod";
import { HttpError } from "./types.js";

export interface ErrorResponse {
  status: number;
  body: { erro: string; detalhes?: unknown };
}

/** Mapeamento único de erro -> resposta HTTP, reusado pelos dois adapters. */
export function toErrorResponse(err: unknown): ErrorResponse {
  if (err instanceof HttpError) {
    return { status: err.status, body: { erro: err.message } };
  }
  if (err instanceof ZodError) {
    return { status: 400, body: { erro: "Dados inválidos", detalhes: err.issues } };
  }
  console.error(err);
  return { status: 500, body: { erro: "Erro interno" } };
}
