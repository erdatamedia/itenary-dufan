import type { Ctx, Status } from '../lib/types'
import { Badge, Btn, Card, Judul, type Warna } from '../ui'

const NEXT: Record<Status, Status> = { belum: 'dibeli', dibeli: 'dibawa', dibawa: 'belum' }
const WARNA: Record<Status, Warna> = { belum: 'oranye', dibeli: 'kuning', dibawa: 'mint' }

export function Bawa(c: Ctx) {
  const nama = (id: string | null) => c.d.members.find((m) => m.id === id)?.nama
  return (
    <section className="flex flex-col gap-4">
      {c.d.groups.filter((g) => g.items.length).map((g) => (
        <Card key={g.id} warna="lavender">
          <Judul>{g.nama}</Judul>
          <div className="flex flex-col gap-2">
            {g.items.map((i) => (
              <div key={i.id} className="rounded-lg border-2 border-tinta bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{i.nama}</p>
                  <Badge warna={WARNA[i.status]}>{i.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {i.pjMemberId ? (
                    <>
                      <span className="text-sm">Dibawa <b>{nama(i.pjMemberId)}</b></span>
                      <Btn kecil warna={WARNA[NEXT[i.status]]} onClick={() => c.act(() => c.call('PATCH', `/items/${i.id}`, { status: NEXT[i.status] }))}>
                        → {NEXT[i.status]}
                      </Btn>
                      {(c.admin || c.me?.id === i.pjMemberId) && (
                        <Btn kecil warna="krem" onClick={() => c.act(() => c.call('PATCH', `/items/${i.id}`, { pjMemberId: null, status: 'belum' }))}>Lepas</Btn>
                      )}
                    </>
                  ) : (
                    <Btn kecil disabled={!c.me} warna="lavender" onClick={() => c.me && c.act(() => c.call('PATCH', `/items/${i.id}`, { pjMemberId: c.me!.id }))}>
                      Saya yang bawa
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </section>
  )
}
