import { useState } from 'react'
import { tanggalHari } from '../lib/format'
import type { Ctx } from '../lib/types'
import { Btn, Card, Input, Judul } from '../ui'

export function Itinerary(c: Ctx) {
  const hariList = [...new Set(c.d.itinerary.map((e) => e.hari))].sort((a, b) => a - b)
  const nama = (id: string | null) => c.d.members.find((m) => m.id === id)?.nama
  const [f, setF] = useState({ hari: '1', jamMulai: '', jamSelesai: '', judul: '', lokasi: '', catatan: '', pj: '' })

  return (
    <section className="flex flex-col gap-4">
      {hariList.length === 0 && <p>Belum ada agenda.</p>}
      {hariList.map((h) => (
        <Card key={h} warna="langit">
          <Judul>Hari {h}{tanggalHari(c.d.event.tanggalMulai, h) ? ` · ${tanggalHari(c.d.event.tanggalMulai, h)}` : ''}</Judul>
          <div className="flex flex-col gap-2">
            {c.d.itinerary.filter((e) => e.hari === h).map((e) => (
              <div key={e.id} className="rounded-lg border-2 border-tinta bg-white p-2">
                <p className="text-sm font-bold">{e.jamMulai ?? '--:--'}{e.jamSelesai ? ` - ${e.jamSelesai}` : ''}</p>
                <p className="font-bold">{e.judul}</p>
                {e.lokasi && <p className="text-sm">📍 {e.lokasi}</p>}
                {e.catatan && <p className="text-sm">{e.catatan}</p>}
                {nama(e.pjMemberId) && <p className="text-sm">PJ: {nama(e.pjMemberId)}</p>}
                {c.admin && <Btn kecil warna="oranye" className="mt-2" onClick={() => confirm('Hapus agenda?') && c.act(() => c.call('DELETE', `/itinerary/${e.id}`))}>Hapus</Btn>}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card warna="krem">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            c.act(() => c.call('POST', '/itinerary', {
              hari: Number(f.hari) || 1, jamMulai: f.jamMulai || null, jamSelesai: f.jamSelesai || null, judul: f.judul,
              lokasi: f.lokasi || null, catatan: f.catatan || null, pjMemberId: f.pj || null,
            }))
            setF({ ...f, jamMulai: '', jamSelesai: '', judul: '', lokasi: '', catatan: '' })
          }}
        >
          <Judul>Tambah agenda</Judul>
          <div className="flex gap-2">
            <Input type="number" min={1} value={f.hari} onChange={(e) => setF({ ...f, hari: e.target.value })} aria-label="Hari ke" />
            <Input type="time" value={f.jamMulai} onChange={(e) => setF({ ...f, jamMulai: e.target.value })} aria-label="Mulai" />
            <Input type="time" value={f.jamSelesai} onChange={(e) => setF({ ...f, jamSelesai: e.target.value })} aria-label="Selesai" />
          </div>
          <Input placeholder="Judul" value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} required />
          <Input placeholder="Lokasi" value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} />
          <Input placeholder="Catatan" value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} />
          <select className="min-h-11 rounded-lg border-[3px] border-tinta bg-white px-3" value={f.pj} onChange={(e) => setF({ ...f, pj: e.target.value })}>
            <option value="">Penanggung jawab (opsional)</option>
            {c.d.members.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
          </select>
          <Btn type="submit" warna="langit">Tambah</Btn>
        </form>
      </Card>
    </section>
  )
}
