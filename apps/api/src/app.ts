import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Hono } from "hono";
import { rateLimit } from "./lib/rateLimit.js";
import { ev, root } from "./routes/events.js";

export const app = new Hono();
app.use("/api/*", rateLimit(240, 60_000));
app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api", root);
app.route("/api/e/:token", ev);
app.all("/api/*", (c) => c.json({ error: "Tidak ditemukan" }, 404));

// Sajikan hasil build frontend (SPA) jika ada.
const dist = resolve(process.env.WEB_DIST ?? "../web/dist");
if (existsSync(dist)) {
  const root = relative(process.cwd(), dist) || ".";
  app.use("/*", serveStatic({ root }));
  app.get("*", serveStatic({ path: join(root, "index.html") }));
}

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Kesalahan server" }, 500);
});
