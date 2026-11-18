import { getConnInfo } from "@hono/node-server/conninfo";
import { createMiddleware } from "hono/factory";

export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      getConnInfo(c).remote.address ||
      "unknown";
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || h.reset < now) hits.set(ip, { n: 1, reset: now + windowMs });
    else if (++h.n > max) return c.json({ error: "Terlalu banyak permintaan" }, 429);
    await next();
  });
}
