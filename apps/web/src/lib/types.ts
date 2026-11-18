export type Status = 'belum' | 'dibeli' | 'dibawa'
export type Item = { id: string; groupId: string; nama: string; harga: number; qty: number; pjMemberId: string | null; status: Status }
export type Group = { id: string; eventId: string; nama: string; urutan: number; items: Item[] }
export type Member = { id: string; nama: string }
export type Entry = {
  id: string; hari: number; jamMulai: string | null; jamSelesai: string | null; judul: string
  lokasi: string | null; catatan: string | null; pjMemberId: string | null
}
export type Payment = { id: string; memberId: string; nominal: number; lunas: boolean; catatan: string | null }
export type Modul = 'kebutuhan' | 'itinerary' | 'bawa' | 'bayar'
export type EventData = {
  role: 'admin' | 'anggota'
  event: {
    id: string; nama: string; slug: string; tanggalMulai: string | null; tanggalSelesai: string | null
    modulAktif: Modul[]; linkLampiran: { judul: string; url: string }[]
  }
  tokenAdmin?: string
  tokenUndangan?: string
  ringkasan: { total: number; jumlahAnggota: number; iuranPerOrang: number }
  members: Member[]
  groups: Group[]
  itinerary: Entry[]
  payments: Payment[]
}
export type Call = (method: string, path: string, body?: unknown) => Promise<unknown>
export type Ctx = {
  d: EventData
  admin: boolean
  me: Member | null
  call: Call
  act: (fn: () => Promise<unknown>) => void
}
