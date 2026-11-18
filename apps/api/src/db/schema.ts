import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);

export const events = sqliteTable("events", {
  id: id(),
  nama: text("nama").notNull(),
  slug: text("slug").notNull().unique(),
  tanggalMulai: text("tanggal_mulai"), // YYYY-MM-DD
  tanggalSelesai: text("tanggal_selesai"),
  tokenAdmin: text("token_admin").notNull().unique(),
  tokenUndangan: text("token_undangan").notNull().unique(),
  modulAktif: text("modul_aktif", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'["kebutuhan","itinerary","bawa","bayar"]'`),
  linkLampiran: text("link_lampiran", { mode: "json" })
    .$type<{ judul: string; url: string }[]>()
    .notNull()
    .default(sql`'[]'`),
  createdAt: createdAt(),
});

export const members = sqliteTable("members", {
  id: id(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  createdAt: createdAt(),
});

export const itemGroups = sqliteTable("item_groups", {
  id: id(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  urutan: integer("urutan").notNull().default(0),
});

export const items = sqliteTable("items", {
  id: id(),
  groupId: text("group_id").notNull().references(() => itemGroups.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  harga: integer("harga").notNull().default(0), // rupiah
  qty: real("qty").notNull().default(1),
  pjMemberId: text("pj_member_id").references(() => members.id, { onDelete: "set null" }),
  status: text("status", { enum: ["belum", "dibeli", "dibawa"] }).notNull().default("belum"),
});

export const itineraryEntries = sqliteTable("itinerary_entries", {
  id: id(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  hari: integer("hari").notNull(), // hari ke-1, 2, ...
  jamMulai: text("jam_mulai"), // HH:MM
  jamSelesai: text("jam_selesai"),
  judul: text("judul").notNull(),
  lokasi: text("lokasi"),
  catatan: text("catatan"),
  pjMemberId: text("pj_member_id").references(() => members.id, { onDelete: "set null" }),
});

export const payments = sqliteTable("payments", {
  id: id(),
  memberId: text("member_id").notNull().unique().references(() => members.id, { onDelete: "cascade" }),
  nominal: integer("nominal").notNull().default(0),
  lunas: integer("lunas", { mode: "boolean" }).notNull().default(false),
  catatan: text("catatan"),
});
