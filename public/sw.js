const CACHE_VERSION = 'driveindia-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const API_CACHE    = `${CACHE_VERSION}-api`

// Files to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/admin/dashboard',
  '/instructor/schedule',
  '/auth/login',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// ── Install: pre-cache shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: clear old caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('driveindia-') && key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch strategy ───────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET') return
  if (url.origin !== location.origin) return

  // API routes — network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, 3000))
    return
  }

  // Static assets (_next) — cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Pages — stale-while-revalidate (loads instantly, updates in background)
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
})

// ── Strategies ───────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timeout)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)
  return cached ?? fetchPromise ?? offlinePage()
}

async function offlinePage() {
  const cached = await caches.match('/offline')
  return cached ?? new Response('<h1>You are offline</h1>', { headers: { 'Content-Type': 'text/html' } })
}
