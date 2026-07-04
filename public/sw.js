const CACHE_VERSION = 'sibs-offline-v10'
const SHELL_URLS = ['./sibs-logo.png', './apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

function isCacheableGet(request) {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  return (
    url.pathname.endsWith('.html') ||
    url.pathname.includes('/routes/') ||
    url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  )
}

function isHtmlShell(request) {
  const url = new URL(request.url)
  return url.pathname.endsWith('.html') || url.pathname.endsWith('/')
}

function isHashedAsset(request) {
  const url = new URL(request.url)
  return url.pathname.includes('/assets/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isCacheableGet(request)) return

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      if (isHtmlShell(request)) {
        try {
          const response = await fetch(request, { cache: 'no-store' })
          if (response.ok) return response
        } catch {
          const cached = await cache.match(request)
          if (cached) return cached
        }
        throw new Error('offline')
      }

      if (isHashedAsset(request)) {
        try {
          const response = await fetch(request, { cache: 'no-store' })
          if (response.ok) {
            cache.put(request, response.clone())
            return response
          }
        } catch {
          const cached = await cache.match(request)
          if (cached) return cached
        }
        throw new Error('offline')
      }

      const cached = await cache.match(request)
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => cached)

      return cached ?? networkFetch
    }),
  )
})
