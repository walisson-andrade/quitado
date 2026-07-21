import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parse as parseCookies, serialize as serializeCookie } from "cookie";
import { db, matchRoute, toErrorResponse } from "@quitado/core";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = req.query.slug;
  const path = "/" + (Array.isArray(pathSegments) ? pathSegments.join("/") : (pathSegments ?? ""));

  const match = matchRoute(req.method as any, path);
  if (!match) {
    res.status(404).json({ erro: "Rota não encontrada" });
    return;
  }

  const cookies = parseCookies(req.headers.cookie ?? "");
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "slug") continue;
    query[key] = Array.isArray(value) ? value[0] : value;
  }

  try {
    const result = await match.route.handler({ db, body: req.body, params: match.params, query, cookies });

    for (const c of result.setCookies ?? []) {
      res.setHeader("Set-Cookie", serializeCookie(c.name, c.value, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: c.maxAgeSeconds ?? 0,
      }));
    }

    if (result.redirectTo) {
      res.status(result.status).setHeader("Location", result.redirectTo).end();
      return;
    }

    res.status(result.status).json(result.body);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
}
