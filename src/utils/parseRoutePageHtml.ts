import type { RoutePageData } from '../types/routePageData'

const ROUTE_DATA_SCRIPT_ID = 'sibs-route-data'

/** 从 routes/{id}.html 文本中解析 JSON 数据块 */
export function parseRoutePageHtml(html: string): RoutePageData | null {
  const byId = html.match(
    new RegExp(
      `<script[^>]*id=["']${ROUTE_DATA_SCRIPT_ID}["'][^>]*>([\\s\\S]*?)<\\/script>`,
      'i',
    ),
  )
  const raw = byId?.[1]?.trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as RoutePageData
    if (!parsed?.id || typeof parsed.id !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export { ROUTE_DATA_SCRIPT_ID }
