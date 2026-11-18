import { eq, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { randomBytes } from "node:crypto";
import { db } from "../db/index.js";
import { events } from "../db/schema.js";

export type Event = typeof events.$inferSelect;
export type Role = "admin" | "anggota";
export type AppEnv = { Variables: { event: Event; role: Role } };

export const newToken = () => randomBytes(32).toString("base64url");

export const eventAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = c.req.param("token") ?? "";
  const ev = db
    .select()
    .from(events)
    .where(or(eq(events.tokenAdmin, token), eq(events.tokenUndangan, token)))
    .get();
  if (!ev) return c.json({ error: "Token tidak valid" }, 404);
  c.set("event", ev);
  c.set("role", ev.tokenAdmin === token ? "admin" : "anggota");
  await next();
});

export const adminOnly = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("role") !== "admin") return c.json({ error: "Hanya admin" }, 403);
  await next();
});
