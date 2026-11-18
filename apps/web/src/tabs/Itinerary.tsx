import { useState } from 'react'
import { tanggalHari } from '../lib/format'
import type { Ctx, Entry } from '../lib/types'
import { Btn, Card, Input, Judul } from '../ui'

type Form = { hari: string; jamMulai: string; jamSelesai: string; judul: string; lokasi: string; catatan: string; pj: string }
const KOSONG: Form = { hari: '1', jamMulai: '', jamSelesai: '', judul: '', lokasi: '', catatan: '', pj: '' }
const dariEntry = (e: Entry): Form => ({
  hari: String(e.hari), jamMulai: e.jamMulai ?? '', jamSelesai: e.jamSelesai ?? '', judul: e.judul,
  lokasi: e.lokasi ?? '', catatan: e.catatan ?? '', pj: e.pjMemberId ?? '',
})
const keBody = (f: Form) => ({
  hari: Number(f.hari) || 1, jamMulai: f.jamMulai || null, jamSelesai: f.jamSelesai || null, judul: f.judul,
  lokasi: f.lokasi || null, catatan: f.catatan || null, pjMemberId: f.pj || null,
})

export function Itinerary(c: Ctx) {
  const hariList = [...new Set(c.d.itinerary.map((e) => e.hari))].sort((a, b) => a - b)
  const [baru, setBaru] = useState<Form>(KOSONG)

  return (
    <section className="flex flex-col gap-4">
      {hariList.length === 0 && <p>Belum ada agenda.</p>}
      {hariList.map((h) => (
        <Card key={h} warna="langit">
          <Judul>Hari {h}{tanggalHari(c.d.event.tanggalMulai, h) ? ` · ${tanggalHari(c.d.event.tanggalMulai, h)}` : ''}</Judul>
          <div className="flex flex-col gap-2">
            {c.d.itinerary.filter((e) => e.hari === h).map((e) => <Agenda key={e.id} e={e} c={c} />)}
          </div>
        </Card>
      ))}

      <Card warna="krem">
        <Judul>Tambah agenda</Judul>
        <FormAgenda
          c={c} f={baru} setF={setBaru} label="Tambah"
          onSubmit={() => { c.act(() => c.call('POST', '/itinerary', keBody(baru))); setBaru({ ...KOSONG, hari: baru.hari }) }}
        />
      </Card>
    </section>
  )
}

function Agenda({ e, c }: { e: Entry; c: Ctx }) {
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState<Form>(dariEntry(e))
  const pj = c.d.members.find((m) => m.id === e.pjMemberId)?.nama

  if (edit) {
    return (
      <div className="rounded-lg border-2 border-tinta bg-white p-2">
        <FormAgenda
          c={c} f={f} setF={setF} label="Simpan"
          onSubmit={() => { c.act(() => c.call('PATCH', `/itinerary/${e.id}`, keBody(f))); setEdit(false) }}
          onBatal={() => setEdit(false)}
        />
      </div>
    )
  }
  return (
    <div className="rounded-lg border-2 border-tinta bg-white p-2">
      <p className="text-sm font-bold">{e.jamMulai ?? '--:--'}{e.jamSelesai ? ` - ${e.jamSelesai}` : ''}</p>
      <p className="font-bold">{e.judul}</p>
      {e.lokasi && <p className="text-sm">📍 {e.lokasi}</p>}
      {e.catatan && <p className="text-sm">{e.catatan}</p>}
      {pj && <p className="text-sm">PJ: {pj}</p>}
      {c.admin && (
        <div className="mt-2 flex gap-2">
          <Btn kecil warna="krem" onClick={() => { setF(dariEntry(e)); setEdit(true) }}>Edit</Btn>
          <Btn kecil warna="oranye" onClick={() => confirm('Hapus agenda?') && c.act(() => c.call('DELETE', `/itinerary/${e.id}`))}>Hapus</Btn>
        </div>
      )}
    </div>
  )
}

function FormAgenda(p: { c: Ctx; f: Form; setF: (f: Form) => void; label: string; onSubmit: () => void; onBatal?: () => void }) {
  const { f, setF } = p
  return (
    <form className="flex flex-col gap-2" onSubmit={(ev) => { ev.preventDefault(); p.onSubmit() }}>
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
        {p.c.d.members.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
      </select>
      <div className="flex gap-2">
        <Btn type="submit" warna="langit">{p.label}</Btn>
        {p.onBatal && <Btn type="button" warna="krem" onClick={p.onBatal}>Batal</Btn>}
      </div>
    </form>
  )
}
