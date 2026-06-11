const ROUTE_DATA_SCRIPT_ID = 'sibs-route-data'

/** @param {string} html */
export function extractRoutePageDataFromHtml(html) {
  const byId = html.match(
    new RegExp(
      `<script[^>]*id=["']${ROUTE_DATA_SCRIPT_ID}["'][^>]*>([\\s\\S]*?)<\\/script>`,
      'i',
    ),
  )
  const raw = byId?.[1]?.trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.id || typeof parsed.id !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export { ROUTE_DATA_SCRIPT_ID }
