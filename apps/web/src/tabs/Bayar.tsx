import { useState } from 'react'
import { rupiah } from '../lib/format'
import type { Ctx, Member } from '../lib/types'
import { Badge, Btn, Card, Input, Judul } from '../ui'

export function Bayar(c: Ctx) {
  const [nama, setNama] = useState('')
  const pay = (id: string) => c.d.payments.find((p) => p.memberId === id)
  const terkumpul = c.d.payments.filter((p) => p.lunas).reduce((s, p) => s + p.nominal, 0)
  const lunasN = c.d.payments.filter((p) => p.lunas).length

  return (
    <section className="flex flex-col gap-4">
      <Card warna="mint">
        <p className="font-bold">Terkumpul {rupiah(terkumpul)} dari {rupiah(c.d.ringkasan.total)}</p>
        <p className="text-sm">{lunasN} dari {c.d.members.length} sudah lunas · iuran {rupiah(c.d.ringkasan.iuranPerOrang)}/orang</p>
      </Card>

      {c.d.members.map((m) => {
        const p = pay(m.id)
        return (
          <Card key={m.id} warna="krem">
            <div className="flex items-center justify-between gap-2">
              <NamaPeserta m={m} c={c} />
              <Badge warna={p?.lunas ? 'mint' : 'oranye'}>{p?.lunas ? 'Lunas' : 'Belum'}</Badge>
            </div>
            <p className="text-sm">Dibayar {rupiah(p?.nominal ?? 0)}</p>
            {c.admin && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  key={`${m.id}-${p?.nominal}`}
                  className="max-w-36" inputMode="numeric" defaultValue={p?.nominal ?? 0} aria-label={`Nominal ${m.nama}`}
                  onBlur={(e) => { const n = Number(e.target.value); if (n !== (p?.nominal ?? 0)) c.act(() => c.call('PATCH', `/members/${m.id}/payment`, { nominal: n })) }}
                />
                <Btn kecil warna={p?.lunas ? 'oranye' : 'mint'} onClick={() => c.act(() => c.call('PATCH', `/members/${m.id}/payment`, { lunas: !p?.lunas, ...(!p?.lunas && !p?.nominal ? { nominal: c.d.ringkasan.iuranPerOrang } : {}) }))}>
                  {p?.lunas ? 'Tandai belum' : 'Tandai lunas'}
                </Btn>
                <Btn kecil warna="krem" onClick={() => confirm(`Hapus ${m.nama}?`) && c.act(() => c.call('DELETE', `/members/${m.id}`))}>Hapus</Btn>
              </div>
            )}
          </Card>
        )
      })}

      {c.admin && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); c.act(() => c.call('POST', '/members', { nama })); setNama('') }}>
          <Input placeholder="Tambah peserta" value={nama} onChange={(e) => setNama(e.target.value)} required />
          <Btn type="submit">Tambah</Btn>
        </form>
      )}
      {!c.admin && <Judul>Status diubah oleh admin</Judul>}
    </section>
  )
}

function NamaPeserta({ m, c }: { m: Member; c: Ctx }) {
  const [edit, setEdit] = useState(false)
  const [nama, setNama] = useState(m.nama)
  if (!edit) {
    return (
      <p className="font-bold">
        {m.nama}
        {c.admin && (
          <button className="ml-2 text-sm font-normal underline" onClick={() => { setNama(m.nama); setEdit(true) }}>ubah nama</button>
        )}
      </p>
    )
  }
  return (
    <form
      className="flex flex-1 gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (nama.trim() && nama.trim() !== m.nama) c.act(() => c.call('PATCH', `/members/${m.id}`, { nama: nama.trim() }))
        setEdit(false)
      }}
    >
      <Input autoFocus onFocus={(e) => e.target.select()} value={nama} onChange={(e) => setNama(e.target.value)} aria-label={`Nama baru untuk ${m.nama}`} />
      <Btn kecil warna="mint" type="submit">Simpan</Btn>
      <Btn kecil warna="krem" type="button" onClick={() => setEdit(false)}>Batal</Btn>
    </form>
  )
}
