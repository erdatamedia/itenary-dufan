import { useCallback, useEffect, useState } from 'react'
import type { EventData } from './types'

export async function request(token: string | null, method: string, path: string, body?: unknown) {
  const url = token ? `/api/e/${token}${path}` : `/api${path}`
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Permintaan gagal')
  return json
}

/** Ambil data acara dan polling tiap 5 detik selama tab terlihat. */
export function useEvent(token: string) {
  const [data, setData] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      setData((await request(token, 'GET', '')) as EventData)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat')
    }
  }, [token])
  useEffect(() => {
    void load()
    const t = setInterval(() => { if (!document.hidden) void load() }, 5000)
    return () => clearInterval(t)
  }, [load])
  return { data, error, reload: load }
}
