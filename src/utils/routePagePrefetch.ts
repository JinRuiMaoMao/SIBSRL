import { getRoutePageDataHref } from './routeNavigation'

const ROUTE_PAGE_CACHE_PREFIX = 'sibs-route-pages-'
const ROUTE_PAGE_CACHE_NAME = `${ROUTE_PAGE_CACHE_PREFIX}${__APP_BUILD__}`
const PREFETCH_CONCURRENCY = 3
const PREFETCH_LIMIT = 90

const pendingRouteIds = new Set<string>()
const prefetchedRouteIds = new Set<string>()
let scheduled = false
let running = false
let cleanedOldCaches = false

interface NetworkInformationLike {
  saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike
}

interface WindowWithIdleCallback extends Window {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
}

function canPrefetchRoutePages(): boolean {
  if (typeof window === 'undefined') return false
  const connection = (navigator as NavigatorWithConnection).connection
  return connection?.saveData !== true
}

function scheduleIdleTask(task: () => void): void {
  const idleWindow = window as WindowWithIdleCallback
  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(task, { timeout: 2500 })
    return
  }
  window.setTimeout(task, 900)
}

async function cleanupOldRoutePageCaches(): Promise<void> {
  if (cleanedOldCaches || !('caches' in window)) return
  cleanedOldCaches = true

  try {
    const keys = await window.caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith(ROUTE_PAGE_CACHE_PREFIX) && key !== ROUTE_PAGE_CACHE_NAME)
        .map((key) => window.caches.delete(key)),
    )
  } catch {
    /* Cache cleanup is best-effort. */
  }
}

async function cacheRoutePage(routeId: string): Promise<void> {
  const href = getRoutePageDataHref(routeId)
  const url = new URL(href, window.location.href).href
  const request = new Request(url, { credentials: 'same-origin' })

  let cache: Cache | null = null
  if ('caches' in window) {
    try {
      cache = await window.caches.open(ROUTE_PAGE_CACHE_NAME)
      if (await cache.match(request)) return
    } catch {
      cache = null
    }
  }

  const response = await fetch(request, { cache: 'force-cache' })
  if (!response.ok) return

  try {
    await cache?.put(request, response.clone())
  } catch {
    /* Browser HTTP cache from fetch() is still useful if Cache Storage is unavailable/quota-limited. */
  }
}

async function drainPrefetchQueue(): Promise<void> {
  if (running || !canPrefetchRoutePages()) return
  running = true

  try {
    await cleanupOldRoutePageCaches()

    while (pendingRouteIds.size > 0) {
      const batch = [...pendingRouteIds].slice(0, PREFETCH_CONCURRENCY)
      for (const routeId of batch) pendingRouteIds.delete(routeId)

      await Promise.all(
        batch.map(async (routeId) => {
          try {
            await cacheRoutePage(routeId)
            prefetchedRouteIds.add(routeId)
          } catch {
            /* Individual route page prefetches should never block the app. */
          }
        }),
      )
    }
  } finally {
    running = false
  }
}

export function scheduleRoutePagePrefetch(routeIds: string[]): void {
  if (!canPrefetchRoutePages()) return

  for (const routeId of routeIds.slice(0, PREFETCH_LIMIT)) {
    if (!routeId || prefetchedRouteIds.has(routeId)) continue
    pendingRouteIds.add(routeId)
  }

  if (scheduled || pendingRouteIds.size === 0) return
  scheduled = true
  scheduleIdleTask(() => {
    scheduled = false
    void drainPrefetchQueue()
  })
}

export async function clearRoutePagePrefetchCache(): Promise<void> {
  if (!('caches' in window)) return

  try {
    const keys = await window.caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith(ROUTE_PAGE_CACHE_PREFIX))
        .map((key) => window.caches.delete(key)),
    )
  } catch {
    /* ignore */
  }
}
