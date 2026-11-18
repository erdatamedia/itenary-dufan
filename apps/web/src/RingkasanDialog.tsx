import { useEffect, useState } from 'react'
import { buatRingkasanGambar } from './lib/ringkasanImage'
import type { EventData } from './lib/types'
import { Btn } from './ui'

export function RingkasanDialog({ d, onClose }: { d: EventData; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let u: string | null = null
    let batal = false
    buatRingkasanGambar(d)
      .then((b) => { if (!batal) { u = URL.createObjectURL(b); setBlob(b); setUrl(u) } })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Gagal'))
    return () => { batal = true; if (u) URL.revokeObjectURL(u) }
  }, [d])

  const nama = `ringkasan-${d.event.slug}.png`
  const file = blob ? new File([blob], nama, { type: 'image/png' }) : null
  const bisaBagi = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

  async function bagikan() {
    if (!file) return
    try { await navigator.share({ files: [file], title: d.event.nama }) } catch { /* dibatalkan */ }
  }

  return (
    <div className="fixed inset-0 z-10 flex flex-col gap-3 overflow-y-auto bg-krem p-4">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <h2 className="text-xl font-bold">Ringkasan acara</h2>
        {err && <p className="font-bold">{err}</p>}
        {!url && !err && <p>Membuat gambar...</p>}
        {url && <img src={url} alt="Ringkasan acara" className="w-full rounded-lg border-[3px] border-tinta" />}
        {url && (
          <>
            {bisaBagi && <Btn warna="mint" onClick={bagikan}>Bagikan (WhatsApp, dll.)</Btn>}
            <a href={url} download={nama} className="block">
              <Btn warna="kuning" className="w-full" type="button">Simpan gambar</Btn>
            </a>
            {!bisaBagi && <p className="text-sm">Perangkat ini belum mendukung berbagi langsung. Simpan gambar, lalu kirim lewat WhatsApp.</p>}
          </>
        )}
        <Btn warna="krem" onClick={onClose}>Tutup</Btn>
      </div>
    </div>
  )
}
