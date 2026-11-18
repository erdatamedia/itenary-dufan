// Service worker: app shell offline. Data API tidak pernah di-cache.
const CACHE = 'shell-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return

  // Navigasi: jaringan dulu, jatuh ke shell yang tersimpan saat offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put('/', copy))
        return res
      }).catch(() => caches.match('/')),
    )
    return
  }

  // Aset: cache dulu, isi saat pertama diambil (nama file ber-hash).
  e.respondWith(
    caches.match(req).then((hit) => hit ?? fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
      return res
    })),
  )
})
