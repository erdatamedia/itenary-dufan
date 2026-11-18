import { useEffect, useState } from 'react'
import { saveRecent } from './App'
import { request, useEvent } from './lib/api'
import { rentangTanggal, rupiah } from './lib/format'
import type { Ctx, Member, Modul } from './lib/types'
import { RingkasanDialog } from './RingkasanDialog'
import { Bawa } from './tabs/Bawa'
import { Bayar } from './tabs/Bayar'
import { Itinerary } from './tabs/Itinerary'
import { Kebutuhan } from './tabs/Kebutuhan'
import { Btn, Card, Input, Judul, type Warna } from './ui'

const TABS: { id: Modul; label: string; warna: Warna }[] = [
  { id: 'kebutuhan', label: 'Kebutuhan', warna: 'kuning' },
  { id: 'itinerary', label: 'Itinerary', warna: 'langit' },
  { id: 'bawa', label: 'Bawa apa', warna: 'lavender' },
  { id: 'bayar', label: 'Bayar', warna: 'mint' },
]

export default function EventPage({ token }: { token: string }) {
  const { data, error, reload } = useEvent(token)
  const [meId, setMeId] = useState<string | null>(null)
  const [skip, setSkip] = useState(false)
  const [tab, setTab] = useState<Modul | null>(null)
  const [ringkasan, setRingkasan] = useState(false)
  const eventId = data?.event.id

  useEffect(() => {
    if (!data) return
    saveRecent({ id: data.event.id, nama: data.event.nama, token, role: data.role })
    try { setMeId(localStorage.getItem(`me:${data.event.id}`)) } catch { /* abaikan */ }
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data) return <main className="p-4"><Card warna="oranye"><p className="font-bold">{error}</p><a href="/" className="underline">Ke beranda</a></Card></main>
  if (!data) return <main className="p-4">Memuat...</main>

  const admin = data.role === 'admin'
  const me = data.members.find((m) => m.id === meId) ?? null
  const call: Ctx['call'] = (method, path, body) => request(token, method, path, body)
  const act: Ctx['act'] = (fn) => { fn().then(reload).catch((e) => alert(e instanceof Error ? e.message : 'Gagal')) }
  const pilih = (m: Member) => { try { localStorage.setItem(`me:${data.event.id}`, m.id) } catch { /* abaikan */ } setMeId(m.id) }

  if (!me && !(admin && skip)) return <Identitas data={data} call={call} pilih={pilih} reload={reload} admin={admin} lewati={() => setSkip(true)} />

  const ctx: Ctx = { d: data, admin, me, call, act }
  const tabs = TABS.filter((t) => data.event.modulAktif.includes(t.id))
  const aktif = tabs.find((t) => t.id === tab) ?? tabs[0]
  const invite = data.tokenUndangan ? `${location.origin}/e/${data.tokenUndangan}` : null
  const salin = (t: string) => { void navigator.clipboard?.writeText(t) }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-12">
      <header>
        <NamaAcara c={{ d: data, admin, me, call, act }} />
        <Tanggal c={{ d: data, admin, me, call, act }} />
        <p className="text-sm">
          {me ? <>Halo, <b>{me.nama}</b> · </> : null}{admin ? 'Admin' : 'Anggota'}
          {me && <button className="ml-2 underline" onClick={() => { try { localStorage.removeItem(`me:${data.event.id}`) } catch { /* abaikan */ } setMeId(null); setSkip(false) }}>ganti</button>}
        </p>
      </header>

      <Card warna="kuning">
        <p className="text-sm font-bold">Iuran per orang ({data.ringkasan.jumlahAnggota} peserta)</p>
        <p className="text-3xl font-bold">{rupiah(data.ringkasan.iuranPerOrang)}</p>
        <p className="text-sm">Total kebutuhan {rupiah(data.ringkasan.total)}</p>
      </Card>

      <Btn warna="langit" onClick={() => setRingkasan(true)}>Bagikan ringkasan (gambar)</Btn>
      {ringkasan && <RingkasanDialog d={data} onClose={() => setRingkasan(false)} />}

      {data.event.linkLampiran.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.event.linkLampiran.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded-lg border-[3px] border-tinta bg-white px-3 py-2 text-sm font-bold">
              {l.judul} ↗
            </a>
          ))}
        </div>
      )}

      {admin && invite && (
        <Card warna="lavender">
          <p className="mb-2 text-sm font-bold">Bagikan ke anggota</p>
          <Btn kecil warna="krem" onClick={() => salin(invite)}>Salin link undangan</Btn>
          <p className="mt-2 break-all text-xs">Simpan link admin ini (halaman ini) baik-baik; siapa pun yang punya bisa mengubah semuanya.</p>
        </Card>
      )}

      <nav className="grid grid-cols-2 gap-2">
        {tabs.map((t) => (
          <Btn key={t.id} warna={t.id === aktif?.id ? t.warna : 'krem'} onClick={() => setTab(t.id)}>{t.label}</Btn>
        ))}
      </nav>

      {aktif?.id === 'kebutuhan' && <Kebutuhan {...ctx} />}
      {aktif?.id === 'itinerary' && <Itinerary {...ctx} />}
      {aktif?.id === 'bawa' && <Bawa {...ctx} />}
      {aktif?.id === 'bayar' && <Bayar {...ctx} />}
    </main>
  )
}

function Identitas(p: {
  data: NonNullable<ReturnType<typeof useEvent>['data']>; call: Ctx['call']; pilih: (m: Member) => void
  reload: () => Promise<void>; admin: boolean; lewati: () => void
}) {
  const [nama, setNama] = useState('')
  async function gabung(e: React.FormEvent) {
    e.preventDefault()
    try {
      const m = (await p.call('POST', '/members', { nama })) as Member
      await p.reload()
      p.pilih(m)
    } catch (er) { alert(er instanceof Error ? er.message : 'Gagal') }
  }
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">{p.data.event.nama}</h1>
      <Judul>Kamu siapa?</Judul>
      <div className="flex flex-col gap-2">
        {p.data.members.map((m) => <Btn key={m.id} warna="mint" onClick={() => p.pilih(m)}>{m.nama}</Btn>)}
      </div>
      <Card warna="kuning">
        <form onSubmit={gabung} className="flex flex-col gap-3">
          <p className="font-bold">Belum ada namamu? Tambahkan</p>
          <Input placeholder="Nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
          <Btn type="submit">Gabung</Btn>
        </form>
      </Card>
      {p.admin && <Btn warna="krem" onClick={p.lewati}>Lewati, hanya lihat</Btn>}
    </main>
  )
}

function Tanggal({ c }: { c: Ctx }) {
  const { tanggalMulai, tanggalSelesai } = c.d.event
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({ mulai: '', selesai: '' })
  const teks = rentangTanggal(tanggalMulai, tanggalSelesai)

  if (!edit) {
    return (
      <p className="text-sm">
        📅 {teks ?? 'Tanggal belum diatur'}
        {c.admin && (
          <button className="ml-2 underline" onClick={() => { setF({ mulai: tanggalMulai ?? '', selesai: tanggalSelesai ?? '' }); setEdit(true) }}>ubah tanggal</button>
        )}
      </p>
    )
  }
  const salah = !!f.mulai && !!f.selesai && f.selesai < f.mulai
  return (
    <form
      className="my-2 flex flex-col gap-2 rounded-lg border-[3px] border-tinta bg-white p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (salah) return
        c.act(() => c.call('PATCH', '', { tanggalMulai: f.mulai || null, tanggalSelesai: f.selesai || null }))
        setEdit(false)
      }}
    >
      <label className="text-sm font-bold">Tanggal mulai
        <Input type="date" value={f.mulai} onChange={(e) => setF({ ...f, mulai: e.target.value })} />
      </label>
      <label className="text-sm font-bold">Tanggal selesai
        <Input type="date" value={f.selesai} min={f.mulai || undefined} onChange={(e) => setF({ ...f, selesai: e.target.value })} />
      </label>
      {salah && <p className="text-sm font-bold">Tanggal selesai tidak boleh sebelum tanggal mulai.</p>}
      <div className="flex gap-2">
        <Btn kecil warna="mint" type="submit" disabled={salah}>Simpan</Btn>
        <Btn kecil warna="krem" type="button" onClick={() => setEdit(false)}>Batal</Btn>
      </div>
    </form>
  )
}

function NamaAcara({ c }: { c: Ctx }) {
  const [edit, setEdit] = useState(false)
  const [nama, setNama] = useState(c.d.event.nama)
  if (!edit) {
    return (
      <h1 className="text-2xl font-bold">
        {c.d.event.nama}
        {c.admin && (
          <button className="ml-2 text-sm font-normal underline" onClick={() => { setNama(c.d.event.nama); setEdit(true) }}>ubah nama</button>
        )}
      </h1>
    )
  }
  return (
    <form
      className="my-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const n = nama.trim()
        if (n && n !== c.d.event.nama) c.act(() => c.call('PATCH', '', { nama: n }))
        setEdit(false)
      }}
    >
      <Input autoFocus onFocus={(e) => e.target.select()} value={nama} onChange={(e) => setNama(e.target.value)} aria-label="Nama acara" />
      <Btn kecil warna="mint" type="submit">Simpan</Btn>
      <Btn kecil warna="krem" type="button" onClick={() => setEdit(false)}>Batal</Btn>
    </form>
  )
}
