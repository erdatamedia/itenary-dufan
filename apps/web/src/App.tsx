import { useState } from 'react'
import EventPage from './EventPage'
import { request } from './lib/api'
import { Btn, Card, Input } from './ui'

type Recent = { id: string; nama: string; token: string; role: string }
export const loadRecent = (): Recent[] => {
  try { return JSON.parse(localStorage.getItem('recent') ?? '[]') } catch { return [] }
}
export const saveRecent = (r: Recent) => {
  try {
    const list = loadRecent().filter((x) => !(x.id === r.id && x.role === r.role))
    localStorage.setItem('recent', JSON.stringify([r, ...list].slice(0, 20)))
  } catch { /* abaikan */ }
}

export default function App() {
  const m = location.pathname.match(/^\/e\/([^/]+)/)
  return m ? <EventPage token={m[1]} /> : <Home />
}

function Home() {
  const [nama, setNama] = useState('')
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')
  const recent = loadRecent()

  async function buat(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = (await request(null, 'POST', '/events', { nama }).catch(async (er) => {
        if (!key) throw er
        const r = await fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json', 'x-create-key': key }, body: JSON.stringify({ nama }) })
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? 'Gagal')
        return j
      })) as { tokenAdmin: string }
      location.href = `/e/${res.tokenAdmin}`
    } catch (er) {
      setErr(er instanceof Error ? er.message : 'Gagal membuat acara')
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Gathering &amp; Itinerary</h1>
      {recent.length > 0 && (
        <Card warna="langit">
          <p className="mb-2 font-bold">Acara terakhir</p>
          <div className="flex flex-col gap-2">
            {recent.map((r) => (
              <a key={r.token} href={`/e/${r.token}`} className="block min-h-11 rounded-lg border-[3px] border-tinta bg-white p-2 font-bold">
                {r.nama} <span className="text-sm font-normal">({r.role})</span>
              </a>
            ))}
          </div>
        </Card>
      )}
      <Card warna="kuning">
        <form onSubmit={buat} className="flex flex-col gap-3">
          <p className="font-bold">Buat acara baru</p>
          <Input placeholder="Nama acara" value={nama} onChange={(e) => setNama(e.target.value)} required />
          <Input placeholder="Kunci pembuat (jika diminta)" value={key} onChange={(e) => setKey(e.target.value)} />
          {err && <p className="font-bold">{err}</p>}
          <Btn type="submit">Buat acara</Btn>
        </form>
      </Card>
    </main>
  )
}
