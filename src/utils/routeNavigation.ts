import { getRoutesPageFile, isRoutesPage } from './appTabNavigation'
import { hasSeenDailyChallengePrompt } from '../storage/dailyChallengePrompt'

const ROUTE_PAGE_DIR = 'routes'
const ROUTE_QUERY_KEY = 'route'
const DIRECTION_QUERY_KEY = 'dir'
const FROM_STOP_QUERY_KEY = 'from'
const TO_STOP_QUERY_KEY = 'to'
const DEPART_QUERY_KEY = 'depart'
const SEARCH_QUERY_KEY = 'q'

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

/** 后台读取 routes/{id}.html 内嵌 JSON 时使用的版本化地址 */
export function getRoutePageDataHref(routeId: string): string {
  return `${ROUTE_PAGE_DIR}/${routeIdToPageFilename(routeId)}.html?v=${encodeURIComponent(__APP_BUILD__)}`
}

/** 从线路列表页点击卡片时的相对链接：保留当前搜索参数，并带上 route。 */
export function getRoutePageHref(routeId: string, directionIndex?: number): string {
  const params = new URLSearchParams(window.location.search)
  params.set(ROUTE_QUERY_KEY, routeId)
  if (directionIndex != null && directionIndex >= 0) {
    params.set(DIRECTION_QUERY_KEY, String(directionIndex))
  } else {
    params.delete(DIRECTION_QUERY_KEY)
  }
  const page = getRoutesPageFile()
  const qs = params.toString()
  return qs ? `${page}?${qs}` : page
}

/** 读取 URL 中的线路编号（不做别名转换） */
export function readRouteQueryFromLocation(): string | null {
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get(ROUTE_QUERY_KEY)?.trim()
  if (fromQuery) return fromQuery

  const path = window.location.pathname.replace(/\\/g, '/')
  const segments = path.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last?.endsWith('.html') || last === 'index.html' || last === 'dev.html' || last === 'routes.html') {
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

/** 读取 URL 中的行车方向索引（?dir=） */
export function readDirectionQueryFromLocation(): number | null {
  const raw = new URLSearchParams(window.location.search).get(DIRECTION_QUERY_KEY)?.trim()
  if (!raw) return null
  const index = Number.parseInt(raw, 10)
  return Number.isFinite(index) && index >= 0 ? index : null
}

/** 关闭详情后回到线路列表页（去掉 ?route= / ?dir=） */
export function clearRouteFromLocation(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(ROUTE_QUERY_KEY) && !url.searchParams.has(DIRECTION_QUERY_KEY)) return

  url.searchParams.delete(ROUTE_QUERY_KEY)
  url.searchParams.delete(DIRECTION_QUERY_KEY)
  const qs = url.searchParams.toString()
  window.history.replaceState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

/** 更新 URL 中的线路与方向，不新增历史记录 */
export function replaceRouteInLocation(routeId: string, directionIndex?: number): void {
  const url = new URL(window.location.href)
  url.searchParams.set(ROUTE_QUERY_KEY, routeId)
  if (directionIndex != null && directionIndex >= 0) {
    url.searchParams.set(DIRECTION_QUERY_KEY, String(directionIndex))
  } else {
    url.searchParams.delete(DIRECTION_QUERY_KEY)
  }
  const qs = url.searchParams.toString()
  window.history.replaceState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

/** 站内打开线路详情时更新 URL，不刷新页面 */
export function setRouteInLocation(routeId: string, directionIndex?: number): void {
  const url = new URL(window.location.href)
  url.searchParams.set(ROUTE_QUERY_KEY, routeId)
  if (directionIndex != null && directionIndex >= 0) {
    url.searchParams.set(DIRECTION_QUERY_KEY, String(directionIndex))
  } else {
    url.searchParams.delete(DIRECTION_QUERY_KEY)
  }
  const qs = url.searchParams.toString()
  window.history.pushState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

/** 分享链接：含线路与方向 */
export function buildRouteShareUrl(routeId: string, directionIndex: number): string {
  const path = window.location.pathname.replace(/\\/g, '/')
  const segments = path.split('/').filter(Boolean)
  const inRoutesDir = segments[segments.length - 2] === ROUTE_PAGE_DIR
  const prefix = inRoutesDir ? '../' : './'
  const page = getRoutesPageFile()
  const params = new URLSearchParams({
    [ROUTE_QUERY_KEY]: routeId,
    [DIRECTION_QUERY_KEY]: String(directionIndex),
  })
  return `${prefix}${page}?${params.toString()}`
}

export interface StopPairLocationQuery {
  from: string
  to: string
  depart: string | null
}

export function readStopPairFromLocation(): StopPairLocationQuery | null {
  const params = new URLSearchParams(window.location.search)
  const from = params.get(FROM_STOP_QUERY_KEY)?.trim()
  const to = params.get(TO_STOP_QUERY_KEY)?.trim()
  if (!from || !to) return null
  const depart = params.get(DEPART_QUERY_KEY)?.trim() || null
  return { from, to, depart }
}

/** 读取 URL 中的自由文本搜索（?q=） */
export function readSearchQueryFromLocation(): string | null {
  const q = new URLSearchParams(window.location.search).get(SEARCH_QUERY_KEY)?.trim()
  return q || null
}

export function replaceSearchInLocation(query: string): void {
  const url = new URL(window.location.href)
  const trimmed = query.trim()
  if (trimmed) url.searchParams.set(SEARCH_QUERY_KEY, trimmed)
  else url.searchParams.delete(SEARCH_QUERY_KEY)
  const qs = url.searchParams.toString()
  window.history.replaceState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

export function clearSearchFromLocation(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(SEARCH_QUERY_KEY)) return
  url.searchParams.delete(SEARCH_QUERY_KEY)
  const qs = url.searchParams.toString()
  window.history.replaceState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

export function buildStopPairSearchQuery(from: string, to: string): string {
  return `${from.trim()} -- ${to.trim()}`
}

export function buildStopPairShareUrl(from: string, to: string, depart?: string | null): string {
  const path = window.location.pathname.replace(/\\/g, '/')
  const segments = path.split('/').filter(Boolean)
  const inRoutesDir = segments[segments.length - 2] === ROUTE_PAGE_DIR
  const prefix = inRoutesDir ? '../' : './'
  const page = getRoutesPageFile()
  const params = new URLSearchParams({
    [FROM_STOP_QUERY_KEY]: from.trim(),
    [TO_STOP_QUERY_KEY]: to.trim(),
  })
  if (depart?.trim()) params.set(DEPART_QUERY_KEY, depart.trim())
  return `${prefix}${page}?${params.toString()}`
}

export function replaceStopPairInLocation(from: string, to: string, depart?: string | null): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(ROUTE_QUERY_KEY)
  url.searchParams.delete(DIRECTION_QUERY_KEY)
  url.searchParams.set(FROM_STOP_QUERY_KEY, from.trim())
  url.searchParams.set(TO_STOP_QUERY_KEY, to.trim())
  if (depart?.trim()) url.searchParams.set(DEPART_QUERY_KEY, depart.trim())
  else url.searchParams.delete(DEPART_QUERY_KEY)
  const qs = url.searchParams.toString()
  window.history.replaceState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

export function clearStopPairFromLocation(): void {
  const url = new URL(window.location.href)
  if (
    !url.searchParams.has(FROM_STOP_QUERY_KEY) &&
    !url.searchParams.has(TO_STOP_QUERY_KEY) &&
    !url.searchParams.has(DEPART_QUERY_KEY)
  ) {
    return
  }
  url.searchParams.delete(FROM_STOP_QUERY_KEY)
  url.searchParams.delete(TO_STOP_QUERY_KEY)
  url.searchParams.delete(DEPART_QUERY_KEY)
  const qs = url.searchParams.toString()
  window.history.replaceState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

/** 构建时写入 routes/*.html 的跳转目标 */
export function buildRouteLandingUrl(
  routeId: string,
  fromRoutesDir = true,
  directionIndex?: number,
): string {
  const prefix = fromRoutesDir ? '../' : './'
  const params = new URLSearchParams({ [ROUTE_QUERY_KEY]: routeId })
  if (directionIndex != null && directionIndex >= 0) {
    params.set(DIRECTION_QUERY_KEY, String(directionIndex))
  }
  return `${prefix}${getRoutesPageFile()}?${params.toString()}`
}

/** 仅在线路查询首页、无 ?route=、且尚未展示过每日挑战弹窗时弹出提示 */
export function shouldShowDailyChallengePrompt(): boolean {
  if (readRouteQueryFromLocation()) return false
  if (!isRoutesPage()) return false
  if (hasSeenDailyChallengePrompt()) return false
  return true
}
