import { rentangTanggal, rupiah, subtotal, tanggalHari } from './format'
import type { EventData } from './types'

const W = 1080
const M = 40 // margin halaman
const CP = 30 // padding kartu
const INK = '#111111'
const KREM = '#FFF4E0'
const WARNA = { putih: '#FFFFFF', kuning: '#FFD93D', langit: '#4D96FF', lavender: '#B197FC', mint: '#5DE2A5', pink: '#FF6B9D' }
const font = (size: number, bold = false) => `${bold ? 700 : 400} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

type Opt = { size: number; bold?: boolean; maxW: number; align?: CanvasTextAlign; color?: string }

class Painter {
  readonly ctx: CanvasRenderingContext2D
  readonly draw: boolean
  constructor(ctx: CanvasRenderingContext2D, draw: boolean) { this.ctx = ctx; this.draw = draw }

  wrap(text: string, maxW: number, f: string): string[] {
    this.ctx.font = f
    const out: string[] = []
    for (const para of text.split('\n')) {
      let cur = ''
      for (const w of para.split(' ')) {
        const t = cur ? `${cur} ${w}` : w
        if (this.ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w } else cur = t
      }
      out.push(cur)
    }
    return out
  }

  text(text: string, x: number, y: number, o: Opt): number {
    const f = font(o.size, o.bold)
    const ls = this.wrap(text, o.maxW, f)
    const lh = Math.round(o.size * 1.3)
    if (this.draw) {
      this.ctx.font = f
      this.ctx.fillStyle = o.color ?? INK
      this.ctx.textAlign = o.align ?? 'left'
      this.ctx.textBaseline = 'top'
      ls.forEach((l, i) => this.ctx.fillText(l, x, y + i * lh))
    }
    return ls.length * lh
  }

  /** Label kiri (boleh melipat) dan nilai rata kanan dalam satu baris. */
  row(kiri: string, kanan: string, x: number, y: number, w: number, size: number, bold = false): number {
    this.ctx.font = font(size, bold)
    const rw = this.ctx.measureText(kanan).width
    const h = this.text(kiri, x, y, { size, bold, maxW: w - rw - 24 })
    this.text(kanan, x + w, y, { size, bold, maxW: rw + 4, align: 'right' })
    return h
  }
}

function kartu(p: Painter, y: number, warna: string, judul: string, isi: (p: Painter, x: number, y: number, w: number) => number): number {
  const x = M, w = W - 2 * M, ix = x + CP, iw = w - 2 * CP
  const dry = new Painter(p.ctx, false)
  const hJudul = dry.text(judul, 0, 0, { size: 34, bold: true, maxW: iw })
  const h = CP + hJudul + 14 + isi(dry, 0, 0, iw) + CP
  if (p.draw) {
    const c = p.ctx
    c.fillStyle = INK
    c.fillRect(x + 8, y + 8, w, h)
    c.fillStyle = warna
    c.fillRect(x, y, w, h)
    c.lineWidth = 5
    c.strokeStyle = INK
    c.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5)
  }
  p.text(judul, ix, y + CP, { size: 34, bold: true, maxW: iw })
  isi(p, ix, y + CP + hJudul + 14, iw)
  return h + 8 + 28
}

function layout(p: Painter, d: EventData): number {
  const mod = (m: string) => (d.event.modulAktif as string[]).includes(m)
  const nama = (id: string | null) => d.members.find((m) => m.id === id)?.nama
  let y = M

  // Judul
  y += p.text(d.event.nama, M, y, { size: 56, bold: true, maxW: W - 2 * M }) + 4
  const tgl = rentangTanggal(d.event.tanggalMulai, d.event.tanggalSelesai)
  if (tgl) y += p.text(`📅 ${tgl}`, M, y, { size: 28, maxW: W - 2 * M })
  y += p.text(`Diperbarui ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, M, y, { size: 22, maxW: W - 2 * M, color: '#555555' })
  y += 24

  // Iuran
  const lunasN = d.payments.filter((x) => x.lunas).length
  const terkumpul = d.payments.filter((x) => x.lunas).reduce((s, x) => s + x.nominal, 0)
  y += kartu(p, y, WARNA.kuning, `Iuran per orang (${d.ringkasan.jumlahAnggota} peserta)`, (q, x, yy, w) => {
    let h = q.text(rupiah(d.ringkasan.iuranPerOrang), x, yy, { size: 84, bold: true, maxW: w })
    h += q.text(`Total kebutuhan ${rupiah(d.ringkasan.total)}`, x, yy + h, { size: 28, maxW: w })
    if (mod('bayar')) h += q.text(`Terkumpul ${rupiah(terkumpul)} · ${lunasN} dari ${d.members.length} lunas`, x, yy + h, { size: 28, bold: true, maxW: w })
    return h
  })

  // Kebutuhan
  const groups = d.groups.filter((g) => g.items.length)
  if (mod('kebutuhan') && groups.length) {
    y += kartu(p, y, WARNA.putih, 'Kebutuhan', (q, x, yy, w) => {
      let h = 0
      groups.forEach((g, gi) => {
        if (gi) h += 16
        h += q.row(g.nama, rupiah(g.items.reduce((s, i) => s + subtotal(i), 0)), x, yy + h, w, 30, true)
        for (const i of g.items) {
          h += 4 + q.row(`${i.nama}${i.qty !== 1 ? ` (${i.qty}×)` : ''}`, i.harga ? rupiah(subtotal(i)) : '-', x + 16, yy + h + 4, w - 16, 26)
        }
      })
      return h
    })
  }

  // Itinerary
  if (mod('itinerary') && d.itinerary.length) {
    const hari = [...new Set(d.itinerary.map((e) => e.hari))].sort((a, b) => a - b)
    y += kartu(p, y, WARNA.langit, 'Itinerary', (q, x, yy, w) => {
      let h = 0
      hari.forEach((hr, hi) => {
        if (hi) h += 16
        const tg = tanggalHari(d.event.tanggalMulai, hr)
        h += q.text(`Hari ${hr}${tg ? ` · ${tg}` : ''}`, x, yy + h, { size: 30, bold: true, maxW: w })
        for (const e of d.itinerary.filter((z) => z.hari === hr)) {
          const jam = e.jamMulai ? `${e.jamMulai}${e.jamSelesai ? `-${e.jamSelesai}` : ''}` : '--:--'
          h += 4 + q.text(`${jam}  ${e.judul}`, x + 16, yy + h + 4, { size: 26, bold: true, maxW: w - 16 })
          const info = [e.lokasi && `📍 ${e.lokasi}`, nama(e.pjMemberId) && `PJ ${nama(e.pjMemberId)}`].filter(Boolean).join(' · ')
          if (info) h += q.text(info, x + 16, yy + h + 4, { size: 22, maxW: w - 16 })
        }
      })
      return h
    })
  }

  // Siapa bawa apa
  const semuaItem = d.groups.flatMap((g) => g.items)
  if (mod('bawa') && semuaItem.length) {
    const belum = semuaItem.filter((i) => !i.pjMemberId)
    const penanda = (s: string) => (s === 'dibawa' ? ' ✓' : s === 'dibeli' ? ' (dibeli)' : '')
    y += kartu(p, y, WARNA.lavender, 'Siapa bawa apa', (q, x, yy, w) => {
      let h = 0
      for (const m of d.members) {
        const mine = semuaItem.filter((i) => i.pjMemberId === m.id)
        if (!mine.length) continue
        h += 6 + q.text(`${m.nama}: ${mine.map((i) => i.nama + penanda(i.status)).join(', ')}`, x, yy + h + 6, { size: 25, maxW: w })
      }
      if (belum.length) h += 12 + q.text(`Belum ada yang bawa: ${belum.map((i) => i.nama).join(', ')}`, x, yy + h + 12, { size: 25, bold: true, maxW: w })
      return h
    })
  }

  // Bayar
  if (mod('bayar') && d.members.length) {
    const lunasId = new Set(d.payments.filter((x) => x.lunas).map((x) => x.memberId))
    y += kartu(p, y, WARNA.mint, `Status bayar · ${lunasN}/${d.members.length} lunas`, (q, x, yy, w) => {
      const cw = w / 2
      d.members.forEach((m, i) => {
        const lunas = lunasId.has(m.id)
        q.text(`${lunas ? '✓' : '○'} ${m.nama}`, x + (i % 2) * cw, yy + Math.floor(i / 2) * 40, { size: 26, bold: lunas, maxW: cw - 12 })
      })
      return Math.ceil(d.members.length / 2) * 40
    })
  }

  p.text(location.host, M, y - 12, { size: 20, maxW: W - 2 * M, color: '#555555' })
  return y + 24
}

export function buatRingkasanGambar(d: EventData): Promise<Blob> {
  const scratch = document.createElement('canvas').getContext('2d')!
  const H = Math.ceil(layout(new Painter(scratch, false), d))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = KREM
  ctx.fillRect(0, 0, W, H)
  layout(new Painter(ctx, true), d)
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Gagal membuat gambar'))), 'image/png'))
}
