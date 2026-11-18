// Pakai: pnpm import:sheet import/rincian-gathering.csv [--peserta 11] [--nama "..."] [--mulai 2026-12-20]
import { readFileSync } from "node:fs";
import { db } from "./db/index.js";
import { events, itemGroups, items, members, payments } from "./db/schema.js";
import { newToken } from "./lib/auth.js";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const rupiah = (s: string | undefined) => {
  const t = (s ?? "").trim();
  if (!/\d/.test(t)) return t === "-" ? 0 : null; // "-" = belum ada harga
  return parseInt(t.replace(/\D/g, ""), 10);
};
const judul = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/Griill/i, "Grill");
const clean = (s: string) => s.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!file) throw new Error("Berikan path CSV");

const rows = parseCsv(readFileSync(file, "utf8"));
const parsed: { grup: string; items: { nama: string; harga: number }[] }[] = [];
let cur: (typeof parsed)[number] | null = null;
let villa: number | null = null;

for (const r of rows.slice(1)) {
  const a = clean(r[0] ?? ""), harga = rupiah(r[1]);
  const e = clean(r[4] ?? ""), f = rupiah(r[5]);
  if (e && f !== null && !/^(kebutuhan|total|biaya)/i.test(e)) villa = f; // ringkasan kanan: Villa
  if (!a || /^total/i.test(a)) continue;
  if (harga === null && !/\d/.test(r[1] ?? "") && (r[1] ?? "").trim() === "") { cur = { grup: judul(a), items: [] }; parsed.push(cur); continue; }
  if (cur && harga !== null) cur.items.push({ nama: a, harga });
}
if (villa) parsed.push({ grup: "Villa", items: [{ nama: "Villa", harga: villa }] });

const peserta = Number(flag("peserta") ?? 0);
const hasil = db.transaction((tx) => {
  const ev = tx.insert(events).values({
    nama: flag("nama") ?? "1st Gathering Dufan Family",
    slug: "1st-gathering-dufan-family",
    tanggalMulai: flag("mulai") ?? null,
    tokenAdmin: newToken(), tokenUndangan: newToken(),
    linkLampiran: [{ judul: "Spreadsheet", url: "https://docs.google.com/spreadsheets/d/15b-iN-t6Xd3YU4BidRyHOeaUsiqqrjcyAm_5hQPhqXY/edit?usp=sharing" }],
  }).returning().get();
  parsed.forEach((g, urutan) => {
    const gr = tx.insert(itemGroups).values({ eventId: ev.id, nama: g.grup, urutan }).returning().get();
    for (const i of g.items) tx.insert(items).values({ groupId: gr.id, nama: i.nama, harga: i.harga }).run();
  });
  for (let n = 1; n <= peserta; n++) {
    const m = tx.insert(members).values({ eventId: ev.id, nama: `Peserta ${n}` }).returning().get();
    tx.insert(payments).values({ memberId: m.id }).run();
  }
  return ev;
});

let total = 0;
for (const g of parsed) { const s = g.items.reduce((x, i) => x + i.harga, 0); total += s; console.log(`${g.grup}: ${g.items.length} item, Rp${s.toLocaleString("id-ID")}`); }
console.log(`Total: Rp${total.toLocaleString("id-ID")}` + (peserta ? `, iuran/orang (${peserta}): Rp${Math.round(total / peserta).toLocaleString("id-ID")}` : ""));
console.log(`Link admin    : /e/${hasil.tokenAdmin}`);
console.log(`Link undangan : /e/${hasil.tokenUndangan}`);
