import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { itemGroups, items, members } from "../db/schema.js";

/** Subtotal item = harga satuan x qty. Iuran = total / jumlah anggota saat ini (dibulatkan). */
export function hitungRingkasan(eventId: string) {
  const groupIds = db.select({ id: itemGroups.id }).from(itemGroups).where(eq(itemGroups.eventId, eventId)).all().map((g) => g.id);
  const rows = groupIds.length ? db.select().from(items).where(inArray(items.groupId, groupIds)).all() : [];
  const total = Math.round(rows.reduce((s, i) => s + i.harga * i.qty, 0));
  const jumlahAnggota = db.select().from(members).where(eq(members.eventId, eventId)).all().length;
  const iuranPerOrang = jumlahAnggota > 0 ? Math.round(total / jumlahAnggota) : 0;
  return { total, jumlahAnggota, iuranPerOrang };
}
