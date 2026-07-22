import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { db, matchRoute, toErrorResponse } from "@quitado/core";

const PORT = Number(process.env.PORT ?? 3011);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const app = Fastify({ logger: true });

await app.register(cors, { origin: WEB_ORIGIN, credentials: true });
await app.register(cookie);

app.all("/api/*", async (request, reply) => {
  const path = request.url.replace(/^\/api/, "").split("?")[0]!;
  const match = matchRoute(request.method as any, path);
  if (!match) {
    reply.status(404).send({ erro: "Rota não encontrada" });
    return;
  }

  try {
    const result = await match.route.handler({
      db,
      body: request.body,
      params: match.params,
      query: request.query as Record<string, string | undefined>,
      cookies: request.cookies as Record<string, string | undefined>,
    });

    for (const c of result.setCookies ?? []) {
      reply.setCookie(c.name, c.value, {
        path: "/",
        httpOnly: true,
        secure: false, // dev local é sempre http://localhost, nunca https
        sameSite: "lax",
        maxAge: c.maxAgeSeconds ?? 0,
      });
    }

    if (result.redirectTo) {
      reply.status(result.status).header("Location", result.redirectTo).send();
      return;
    }

    reply.status(result.status).send(result.body);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    reply.status(status).send(body);
  }
});

app.get("/api/health", async () => ({ ok: true }));

app.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
