const ROUTE_QUERY_KEY = 'route'

/** @param {string} routeId */
export function routeIdToPageFilename(routeId) {
  return [...routeId]
    .map((ch) =>
      /[A-Za-z0-9-]/.test(ch)
        ? ch
        : `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
    )
    .join('')
}

/** @param {string} routeId @param {boolean} [fromRoutesDir] */
export function buildRouteLandingUrl(routeId, fromRoutesDir = true) {
  const prefix = fromRoutesDir ? '../' : './'
  return `${prefix}index.html?${ROUTE_QUERY_KEY}=${encodeURIComponent(routeId)}`
}
