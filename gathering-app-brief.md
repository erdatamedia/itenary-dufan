# Brief: Aplikasi Gathering & Itinerary (pengganti Google Sheets)

Dokumen ini ringkasan hasil diskusi, untuk dilanjutkan di Claude Code.

## 1. Latar belakang

Spreadsheet "Rincian Kebutuhan 1st Gathering Dufan Family" tidak nyaman dibuka di HP.
Tujuan: aplikasi web mobile-first yang bisa diisi bersama oleh semua anggota, di-host di
domain dan VPS milik sendiri, dan fleksibel untuk acara/itinerary lain, bukan hanya satu acara.

Isi spreadsheet saat ini (satu tab, tanpa header kolom eksplisit; ringkasan, bisa kurang lengkap):
- Judul baris 1: "RINCIAN KEBUTUHAN 1ST GATHERING DUFAN FAMILY"
- Kolom A = nama item atau label bagian, kolom B = harga (Rp), kolom E-F = ringkasan total.
- Kebutuhan Grill (baris 3-10), total Rp240.000: daging slice 1 Kg (130.000), ayam slice 1 Kg (40.000),
  bawang bombay (20.000), selada (20.000), bumbu saus/kecap/BBQ (30.000).
- Kebutuhan Makan (baris 12-22), total Rp232.000: bumbu dapur (20.000), ayam 2 Kg (70.000),
  telur 1 Kg (22.000), mie (40.000), beras (40.000), dan lainnya.
- Ringkasan: Villa Rp1.910.498, total kebutuhan Rp2.382.498, iuran per orang Rp238.250
  (artinya sekitar 10 peserta).
- Link sheet: https://docs.google.com/spreadsheets/d/15b-iN-t6Xd3YU4BidRyHOeaUsiqqrjcyAm_5hQPhqXY/edit
  (data lengkap perlu dibaca ulang saat impor; tidak ada koneksi Google Sheets, bisa minta export CSV/XLSX).

## 2. Keputusan

| Hal | Keputusan |
|---|---|
| Akses anggota | Link undangan tanpa login; anggota memilih/mengisi nama (disimpan di perangkat) |
| Peran | Admin (link khusus penyelenggara) dan Anggota (mengisi/menambah). Edit total dan hapus hanya admin |
| Skala | Banyak acara, template reusable, modul bisa dihidupkan/dimatikan per acara |
| Backend | Node.js + **Hono** (`@hono/node-server`) |
| Database | **SQLite** (`better-sqlite3`) + **Drizzle ORM** (mudah pindah ke Postgres nanti) |
| Frontend | **Vite + React** (atau Preact) sebagai **PWA**, bukan Next.js (tanpa kebutuhan SEO/SSR) |
| Deploy | Satu proses Node di VPS: Hono menyajikan API dan hasil build frontend. Docker, di `itenary-dufan.nwsn.cc` |
| Sinkronisasi | Polling tiap beberapa detik; WebSocket belum perlu di v1 |
| UI | Neobrutalism, palet playful (lihat bagian 5) |

## 3. Fitur v1 (modul per acara)

1. **Kebutuhan dan iuran**: kelompok item (Grill, Makan, Villa, dll.) dengan harga. Total dan iuran per orang
   dihitung otomatis dari jumlah peserta.
2. **Itinerary**: agenda per hari dan jam, dengan lokasi, catatan, dan penanggung jawab.
3. **Siapa bawa apa / checklist**: anggota mengklaim item, lalu mencentang jika sudah dibeli/dibawa.
4. **Status bayar iuran**: daftar peserta dengan penanda lunas/belum dan catatan nominal.

## 4. Model data (draf)

- `Event` (id, nama, slug, tanggal mulai/selesai, token_admin, token_undangan, modul_aktif)
- `Member` (id, event_id, nama)
- `ItemGroup` (id, event_id, nama, urutan)
- `Item` (id, group_id, nama, harga, qty, penanggung_jawab_member_id, status: belum/dibeli/dibawa)
- `ItineraryEntry` (id, event_id, hari, jam_mulai, jam_selesai, judul, lokasi, catatan, pj_member_id)
- `Payment` (id, member_id, nominal, lunas, catatan)

Aturan: iuran per orang = total kebutuhan / jumlah Member. Fitur duplikasi acara menyalin struktur
(grup, item, itinerary) tanpa data Member dan Payment.

Keamanan: dua token acak panjang (admin dan undangan) di URL. Validasi token di tiap request; rate limit dasar.

## 5. Tema UI: neobrutalism, playful

Komponen: **neobrutalism.dev** (komponen berbasis shadcn/ui + Tailwind, disalin ke proyek). Alternatif:
BoldKit, RetroUI. Catatan: dokumentasinya condong ke Next.js. Uji dulu dengan Vite + shadcn CLI saat setup.

Palet dan perannya:

| Warna | Hex | Peran |
|---|---|---|
| Krem | `#FFF4E0` | Latar halaman |
| Tinta | `#111111` | Teks dan border |
| Pink | `#FF6B9D` | Tombol utama |
| Kuning | `#FFD93D` | Sorotan, total iuran |
| Mint | `#5DE2A5` | Lunas, sudah dibawa |
| Biru langit | `#4D96FF` | Itinerary, info |
| Lavender | `#B197FC` | Siapa bawa apa |
| Oranye | `#FF9F45` | Belum bayar, perhatian |

Aturan gaya: border 2-3px `#111`; bayangan keras (offset 4px, tanpa blur) hanya di kartu dan tombol utama;
teks di atas warna cerah selalu `#111`; area tap minimal 44px; satu kolom di HP; tombol besar; PWA bisa di-install.

## 6. Langkah awal untuk Claude Code

1. Buat monorepo (pnpm workspaces): `apps/api` (Hono + Drizzle + SQLite) dan `apps/web` (Vite + React + Tailwind).
2. Skema Drizzle + migrasi sesuai bagian 4.
3. Setup shadcn CLI di Vite, pasang komponen neobrutalism, pasang token tema (bagian 5). Uji bahwa instalasi berjalan.
4. API: buat acara, gabung via token undangan, CRUD item/itinerary/payment, perhitungan iuran.
5. Frontend: halaman acara dengan tab modul (Kebutuhan, Itinerary, Bawa apa, Bayar), mobile-first.
6. Skrip impor dari spreadsheet (CSV/XLSX) sebagai acara pertama: "1st Gathering Dufan Family".
7. Dockerfile + konfigurasi reverse proxy di VPS, lalu manifest dan service worker PWA.

## 7. Keputusan lanjutan

- **Subdomain:** `itenary-dufan.nwsn.cc`.
- **Jumlah peserta:** 11 untuk acara pertama, tapi bisa berubah. Iuran per orang harus selalu dihitung dari
  jumlah Member saat itu (jangan di-hardcode). Dengan 11 peserta, iuran awal = Rp2.382.498 / 11 = sekitar Rp216.591.
- **Database:** SQLite (satu instance, satu VPS). Ganti ke Postgres hanya jika nanti dipakai multi-server.
- **Lampiran:** tidak ada unggah file/foto (mis. bukti bayar) di v1. Lampiran berupa link saja, dan acara
  pertama menautkan spreadsheet sumber:
  https://docs.google.com/spreadsheets/d/15b-iN-t6Xd3YU4BidRyHOeaUsiqqrjcyAm_5hQPhqXY/edit?usp=sharing
  Model data: tambahkan `Event.link_lampiran` (daftar link: judul + url).
