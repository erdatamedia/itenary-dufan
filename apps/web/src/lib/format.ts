const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
export const rupiah = (n: number) => idr.format(n).replace(/\s/g, '')

export function tanggalHari(mulai: string | null, hari: number) {
  if (!mulai) return null
  const d = new Date(`${mulai}T00:00:00`)
  d.setDate(d.getDate() + hari - 1)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}

export const subtotal = (i: { harga: number; qty: number }) => Math.round(i.harga * i.qty)

const fmt = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
export function rentangTanggal(mulai: string | null, selesai: string | null) {
  if (!mulai && !selesai) return null
  if (mulai && selesai && mulai !== selesai) return `${fmt(mulai)} – ${fmt(selesai)}`
  return fmt((mulai ?? selesai)!)
}
