const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
export const rupiah = (n: number) => idr.format(n).replace(/\s/g, '')

export function tanggalHari(mulai: string | null, hari: number) {
  if (!mulai) return null
  const d = new Date(`${mulai}T00:00:00`)
  d.setDate(d.getDate() + hari - 1)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}

export const subtotal = (i: { harga: number; qty: number }) => Math.round(i.harga * i.qty)
