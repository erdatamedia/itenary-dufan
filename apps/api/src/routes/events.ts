import { and, asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { events, itemGroups, items, itineraryEntries, members, payments } from "../db/schema.js";
import { adminOnly, eventAuth, newToken, type AppEnv } from "../lib/auth.js";
import { hitungRingkasan } from "../lib/summary.js";

const MODUL = ["kebutuhan", "itinerary", "bawa", "bayar"] as const;
const lampiran = z.object({ judul: z.string().min(1).max(100), url: z.string().url().max(500) });
const tgl = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const jam = z.string().regex(/^\d{2}:\d{2}$/).nullable();
const nama = z.string().trim().min(1).max(100);

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "acara";
const newSlug = (s: string) => `${slugify(s)}-${newToken().slice(0, 4).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;

async function body<T extends z.ZodTypeAny>(c: { req: { json: () => Promise<unknown> } }, schema: T) {
  const raw = await c.req.json().catch(() => null);
  return schema.safeParse(raw);
}

export const root = new Hono();

// Buat acara. Jika CREATE_KEY diset, wajib kirim header x-create-key.
root.post("/events", async (c) => {
  const key = process.env.CREATE_KEY;
  if (key && c.req.header("x-create-key") !== key) return c.json({ error: "Tidak diizinkan" }, 403);
  const p = await body(c, z.object({
    nama, tanggalMulai: tgl.optional(), tanggalSelesai: tgl.optional(),
    modulAktif: z.array(z.enum(MODUL)).optional(), linkLampiran: z.array(lampiran).optional(),
  }));
  if (!p.success) return c.json({ error: p.error.flatten() }, 400);
  const ev = db.insert(events).values({
    nama: p.data.nama, slug: newSlug(p.data.nama),
    tanggalMulai: p.data.tanggalMulai ?? null, tanggalSelesai: p.data.tanggalSelesai ?? null,
    tokenAdmin: newToken(), tokenUndangan: newToken(),
    ...(p.data.modulAktif && { modulAktif: p.data.modulAktif }),
    ...(p.data.linkLampiran && { linkLampiran: p.data.linkLampiran }),
  }).returning().get();
  return c.json({ id: ev.id, slug: ev.slug, tokenAdmin: ev.tokenAdmin, tokenUndangan: ev.tokenUndangan }, 201);
});

export const ev = new Hono<AppEnv>();
ev.use("*", eventAuth);

// Seluruh data acara (satu request, dipakai polling).
ev.get("/", (c) => {
  const e = c.get("event");
  const role = c.get("role");
  const mem = db.select().from(members).where(eq(members.eventId, e.id)).orderBy(asc(members.createdAt)).all();
  const groups = db.select().from(itemGroups).where(eq(itemGroups.eventId, e.id)).orderBy(asc(itemGroups.urutan)).all();
  const its = groups.length ? db.select().from(items).where(inArray(items.groupId, groups.map((g) => g.id))).all() : [];
  const itin = db.select().from(itineraryEntries).where(eq(itineraryEntries.eventId, e.id))
    .orderBy(asc(itineraryEntries.hari), asc(itineraryEntries.jamMulai)).all();
  const pay = mem.length ? db.select().from(payments).where(inArray(payments.memberId, mem.map((m) => m.id))).all() : [];
  const { tokenAdmin, tokenUndangan, ...publik } = e;
  return c.json({
    role,
    event: publik,
    ...(role === "admin" && { tokenAdmin, tokenUndangan }),
    ringkasan: hitungRingkasan(e.id),
    members: mem,
    groups: groups.map((g) => ({ ...g, items: its.filter((i) => i.groupId === g.id) })),
    itinerary: itin,
    payments: pay,
  });
});

ev.patch("/", adminOnly, async (c) => {
  const p = await body(c, z.object({
    nama: nama.optional(), tanggalMulai: tgl.optional(), tanggalSelesai: tgl.optional(),
    modulAktif: z.array(z.enum(MODUL)).optional(), linkLampiran: z.array(lampiran).optional(),
  }).strict());
  if (!p.success) return c.json({ error: p.error.flatten() }, 400);
  if (Object.keys(p.data).length) db.update(events).set(p.data).where(eq(events.id, c.get("event").id)).run();
  return c.json({ ok: true });
});

// Duplikasi struktur (grup, item, itinerary) tanpa anggota dan pembayaran.
ev.post("/duplicate", adminOnly, async (c) => {
  const src = c.get("event");
  const p = await body(c, z.object({ nama }));
  if (!p.success) return c.json({ error: p.error.flatten() }, 400);
  const out = db.transaction((tx) => {
    const n = tx.insert(events).values({
      nama: p.data.nama, slug: newSlug(p.data.nama), tokenAdmin: newToken(), tokenUndangan: newToken(),
      modulAktif: src.modulAktif, linkLampiran: src.linkLampiran,
    }).returning().get();
    const groups = tx.select().from(itemGroups).where(eq(itemGroups.eventId, src.id)).all();
    for (const g of groups) {
      const ng = tx.insert(itemGroups).values({ eventId: n.id, nama: g.nama, urutan: g.urutan }).returning().get();
      for (const i of tx.select().from(items).where(eq(items.groupId, g.id)).all())
        tx.insert(items).values({ groupId: ng.id, nama: i.nama, harga: i.harga, qty: i.qty }).run();
    }
    for (const t of tx.select().from(itineraryEntries).where(eq(itineraryEntries.eventId, src.id)).all()) {
      const { id: _id, eventId: _e, pjMemberId: _p, ...rest } = t;
      tx.insert(itineraryEntries).values({ ...rest, eventId: n.id }).run();
    }
    return n;
  });
  return c.json({ id: out.id, slug: out.slug, tokenAdmin: out.tokenAdmin, tokenUndangan: out.tokenUndangan }, 201);
});

// ---- Anggota & pembayaran ----
ev.post("/members", async (c) => {
  const p = await body(c, z.object({ nama }));
  if (!p.success) return c.json({ error: p.error.flatten() }, 400);
  const m = db.transaction((tx) => {
    const m = tx.insert(members).values({ eventId: c.get("event").id, nama: p.data.nama }).returning().get();
    tx.insert(payments).values({ memberId: m.id }).run();
    return m;
  });
  return c.json(m, 201);
});

const memberOf = (eventId: string, id: string) =>
  db.select().from(members).where(and(eq(members.id, id), eq(members.eventId, eventId))).get();

ev.patch("/members/:id", adminOnly, async (c) => {
  const p = await body(c, z.object({ nama }).strict());
  if (!p.success || !memberOf(c.get("event").id, c.req.param("id"))) return c.json({ error: "Tidak valid" }, 400);
  db.update(members).set(p.data).where(eq(members.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

ev.delete("/members/:id", adminOnly, (c) => {
  if (!memberOf(c.get("event").id, c.req.param("id"))) return c.json({ error: "Tidak ditemukan" }, 404);
  db.delete(members).where(eq(members.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

ev.patch("/members/:id/payment", adminOnly, async (c) => {
  const p = await body(c, z.object({
    nominal: z.number().int().min(0).optional(), lunas: z.boolean().optional(), catatan: z.string().max(300).nullable().optional(),
  }).strict());
  if (!p.success || !memberOf(c.get("event").id, c.req.param("id"))) return c.json({ error: "Tidak valid" }, 400);
  const id = c.req.param("id");
  db.insert(payments).values({ memberId: id, ...p.data }).onConflictDoUpdate({ target: payments.memberId, set: p.data }).run();
  return c.json({ ok: true });
});

// ---- Grup & item ----
const groupOf = (eventId: string, id: string) =>
  db.select().from(itemGroups).where(and(eq(itemGroups.id, id), eq(itemGroups.eventId, eventId))).get();
const itemOf = (eventId: string, id: string) => {
  const r = db.select({ i: items }).from(items).innerJoin(itemGroups, eq(items.groupId, itemGroups.id))
    .where(and(eq(items.id, id), eq(itemGroups.eventId, eventId))).get();
  return r?.i;
};
const memberOrNull = (eventId: string, id: string | null | undefined) => (id ? !!memberOf(eventId, id) : true);

ev.post("/groups", async (c) => {
  const p = await body(c, z.object({ nama, urutan: z.number().int().optional() }));
  if (!p.success) return c.json({ error: p.error.flatten() }, 400);
  return c.json(db.insert(itemGroups).values({ eventId: c.get("event").id, ...p.data }).returning().get(), 201);
});
ev.patch("/groups/:id", adminOnly, async (c) => {
  const p = await body(c, z.object({ nama: nama.optional(), urutan: z.number().int().optional() }).strict());
  if (!p.success || !groupOf(c.get("event").id, c.req.param("id"))) return c.json({ error: "Tidak valid" }, 400);
  if (Object.keys(p.data).length) db.update(itemGroups).set(p.data).where(eq(itemGroups.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});
ev.delete("/groups/:id", adminOnly, (c) => {
  if (!groupOf(c.get("event").id, c.req.param("id"))) return c.json({ error: "Tidak ditemukan" }, 404);
  db.delete(itemGroups).where(eq(itemGroups.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

const STATUS = z.enum(["belum", "dibeli", "dibawa"]);
ev.post("/groups/:id/items", async (c) => {
  const p = await body(c, z.object({
    nama, harga: z.number().int().min(0).default(0), qty: z.number().positive().default(1),
    pjMemberId: z.string().nullable().optional(),
  }));
  const e = c.get("event");
  if (!p.success || !groupOf(e.id, c.req.param("id")) || !memberOrNull(e.id, p.data.pjMemberId))
    return c.json({ error: "Tidak valid" }, 400);
  return c.json(db.insert(items).values({ groupId: c.req.param("id"), ...p.data }).returning().get(), 201);
});

// Anggota hanya boleh klaim (pjMemberId) dan ubah status. Admin boleh semua field.
ev.patch("/items/:id", async (c) => {
  const e = c.get("event");
  const admin = c.get("role") === "admin";
  const claim = { status: STATUS.optional(), pjMemberId: z.string().nullable().optional() };
  const p = await body(c, (admin
    ? z.object({ ...claim, nama: nama.optional(), harga: z.number().int().min(0).optional(), qty: z.number().positive().optional() })
    : z.object(claim)).strict());
  if (!p.success || !itemOf(e.id, c.req.param("id")) || !memberOrNull(e.id, p.data.pjMemberId))
    return c.json({ error: "Tidak valid" }, 400);
  if (Object.keys(p.data).length) db.update(items).set(p.data).where(eq(items.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});
ev.delete("/items/:id", adminOnly, (c) => {
  if (!itemOf(c.get("event").id, c.req.param("id"))) return c.json({ error: "Tidak ditemukan" }, 404);
  db.delete(items).where(eq(items.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

// ---- Itinerary ----
const entry = z.object({
  hari: z.number().int().min(1), jamMulai: jam.optional(), jamSelesai: jam.optional(), judul: nama,
  lokasi: z.string().max(200).nullable().optional(), catatan: z.string().max(500).nullable().optional(),
  pjMemberId: z.string().nullable().optional(),
});
const entryOf = (eventId: string, id: string) =>
  db.select().from(itineraryEntries).where(and(eq(itineraryEntries.id, id), eq(itineraryEntries.eventId, eventId))).get();

ev.post("/itinerary", async (c) => {
  const p = await body(c, entry);
  const e = c.get("event");
  if (!p.success || !memberOrNull(e.id, p.data.pjMemberId)) return c.json({ error: "Tidak valid" }, 400);
  return c.json(db.insert(itineraryEntries).values({ eventId: e.id, ...p.data }).returning().get(), 201);
});
ev.patch("/itinerary/:id", adminOnly, async (c) => {
  const p = await body(c, entry.partial().strict());
  const e = c.get("event");
  if (!p.success || !entryOf(e.id, c.req.param("id")) || !memberOrNull(e.id, p.data.pjMemberId))
    return c.json({ error: "Tidak valid" }, 400);
  if (Object.keys(p.data).length) db.update(itineraryEntries).set(p.data).where(eq(itineraryEntries.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});
ev.delete("/itinerary/:id", adminOnly, (c) => {
  if (!entryOf(c.get("event").id, c.req.param("id"))) return c.json({ error: "Tidak ditemukan" }, 404);
  db.delete(itineraryEntries).where(eq(itineraryEntries.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});
