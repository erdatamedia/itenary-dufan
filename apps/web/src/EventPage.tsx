import { useEffect, useState } from 'react'
import { saveRecent } from './App'
import { request, useEvent } from './lib/api'
import { rupiah } from './lib/format'
import type { Ctx, Member, Modul } from './lib/types'
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
        <h1 className="text-2xl font-bold">{data.event.nama}</h1>
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
