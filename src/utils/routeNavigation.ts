import { isRoutesPage } from './appTabNavigation'

const ROUTE_PAGE_DIR = 'routes'

/** Windows / URL 安全文件名：非字母数字与连字符一律百分号编码 */
export function routeIdToPageFilename(routeId: string): string {
  return [...routeId]
    .map((ch) =>
      /[A-Za-z0-9-]/.test(ch)
        ? ch
        : `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
    )
    .join('')
}

export function pageFilenameToRouteId(filename: string): string {
  return filename.replace(/%([0-9A-F]{2})/gi, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
}

/** 从线路列表页点击卡片时的相对链接 */
export function getRoutePageHref(routeId: string): string {
  return `${ROUTE_PAGE_DIR}/${routeIdToPageFilename(routeId)}.html`
}

const ROUTE_QUERY_KEY = 'route'

/** 读取 URL 中的线路编号（不做别名转换） */
export function readRouteQueryFromLocation(): string | null {
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get(ROUTE_QUERY_KEY)?.trim()
  if (fromQuery) return fromQuery

  const path = window.location.pathname.replace(/\\/g, '/')
  const segments = path.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last?.endsWith('.html') || last === 'index.html' || last === 'dev.html') {
    return null
  }

  const base = last.slice(0, -'.html'.length)
  if (!base || base === 'index' || base === 'dev') return null

  const parent = segments[segments.length - 2]
  if (parent !== ROUTE_PAGE_DIR) return null

  return pageFilenameToRouteId(decodeURIComponent(base))
}

/** @deprecated 使用 readRouteQueryFromLocation */
export function readInitialRouteIdFromLocation(): string | null {
  return readRouteQueryFromLocation()
}

/** 关闭详情后回到线路列表页（去掉 ?route=） */
export function clearRouteFromLocation(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(ROUTE_QUERY_KEY)) return

  url.searchParams.delete(ROUTE_QUERY_KEY)
  const qs = url.searchParams.toString()
  window.history.replaceState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

/** 站内打开线路详情时更新 URL，不刷新页面 */
export function setRouteInLocation(routeId: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set(ROUTE_QUERY_KEY, routeId)
  const qs = url.searchParams.toString()
  window.history.pushState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

/** 仅在线路查询首页且无 ?route= 时弹出每日挑战提示 */
export function shouldShowDailyChallengePrompt(): boolean {
  if (readRouteQueryFromLocation()) return false
  return isRoutesPage()
}

/** 构建时写入 routes/*.html 的跳转目标 */
export function buildRouteLandingUrl(routeId: string, fromRoutesDir = true): string {
  const prefix = fromRoutesDir ? '../' : './'
  return `${prefix}index.html?${ROUTE_QUERY_KEY}=${encodeURIComponent(routeId)}`
}
