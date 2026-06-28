const CACHE_VERSION = 'sibs-offline-v5'
const SHELL_URLS = ['./index.html', './routes.html', './account.html', './sibs-logo.png', './apple-touch-icon.png']

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
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.json')
  )
}

function isHtmlShell(request) {
  const url = new URL(request.url)
  return url.pathname.endsWith('.html') || url.pathname.endsWith('/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isCacheableGet(request)) return

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      if (isHtmlShell(request)) {
        try {
          const response = await fetch(request)
          if (response.ok) cache.put(request, response.clone())
          return response
        } catch {
          const cached = await cache.match(request)
          if (cached) return cached
          throw new Error('offline')
        }
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
