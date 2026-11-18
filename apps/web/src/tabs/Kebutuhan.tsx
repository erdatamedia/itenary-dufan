import { useState } from 'react'
import { rupiah, subtotal } from '../lib/format'
import type { Ctx, Item } from '../lib/types'
import { Btn, Card, Input, Judul } from '../ui'

export function Kebutuhan(c: Ctx) {
  const [grup, setGrup] = useState('')
  return (
    <section className="flex flex-col gap-4">
      {c.d.groups.map((g) => {
        const total = g.items.reduce((s, i) => s + subtotal(i), 0)
        return (
          <Card key={g.id} warna="krem">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Judul>{g.nama}</Judul>
              <span className="font-bold">{rupiah(total)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {g.items.map((i) => <Baris key={i.id} item={i} c={c} />)}
            </div>
            <TambahItem groupId={g.id} c={c} />
            {c.admin && (
              <Btn kecil warna="oranye" className="mt-3" onClick={() => confirm(`Hapus grup ${g.nama} beserta isinya?`) && c.act(() => c.call('DELETE', `/groups/${g.id}`))}>
                Hapus grup
              </Btn>
            )}
          </Card>
        )
      })}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); c.act(() => c.call('POST', '/groups', { nama: grup, urutan: c.d.groups.length })); setGrup('') }}>
        <Input placeholder="Grup baru (mis. Villa)" value={grup} onChange={(e) => setGrup(e.target.value)} required />
        <Btn type="submit">Tambah</Btn>
      </form>
    </section>
  )
}

function Baris({ item, c }: { item: Item; c: Ctx }) {
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({ nama: item.nama, harga: String(item.harga), qty: String(item.qty) })
  if (edit) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border-2 border-tinta p-2">
        <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
        <div className="flex gap-2">
          <Input inputMode="numeric" value={f.harga} onChange={(e) => setF({ ...f, harga: e.target.value })} aria-label="Harga satuan" />
          <Input inputMode="decimal" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} aria-label="Jumlah" />
        </div>
        <div className="flex gap-2">
          <Btn kecil warna="mint" onClick={() => { c.act(() => c.call('PATCH', `/items/${item.id}`, { nama: f.nama, harga: Number(f.harga), qty: Number(f.qty) })); setEdit(false) }}>Simpan</Btn>
          <Btn kecil warna="krem" onClick={() => setEdit(false)}>Batal</Btn>
          <Btn kecil warna="oranye" onClick={() => confirm('Hapus item?') && c.act(() => c.call('DELETE', `/items/${item.id}`))}>Hapus</Btn>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-2 border-b-2 border-tinta/20 pb-2">
      <div>
        <p className="font-bold">{item.nama}</p>
        {item.qty !== 1 && <p className="text-sm">{item.qty} × {rupiah(item.harga)}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold">{rupiah(subtotal(item))}</span>
        {c.admin && <Btn kecil warna="krem" onClick={() => setEdit(true)}>Edit</Btn>}
      </div>
    </div>
  )
}

function TambahItem({ groupId, c }: { groupId: string; c: Ctx }) {
  const [f, setF] = useState({ nama: '', harga: '', qty: '1' })
  return (
    <form
      className="mt-3 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        c.act(() => c.call('POST', `/groups/${groupId}/items`, { nama: f.nama, harga: Number(f.harga) || 0, qty: Number(f.qty) || 1 }))
        setF({ nama: '', harga: '', qty: '1' })
      }}
    >
      <Input placeholder="Item baru" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required />
      <div className="flex gap-2">
        <Input placeholder="Harga satuan" inputMode="numeric" value={f.harga} onChange={(e) => setF({ ...f, harga: e.target.value })} />
        <Input placeholder="Jml" inputMode="decimal" className="max-w-24" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
      </div>
      <Btn type="submit" warna="kuning">Tambah item</Btn>
    </form>
  )
}
