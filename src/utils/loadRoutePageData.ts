import type { BusRoute } from '../types/route'
import type { RoutePageData } from '../types/routePageData'
import { applyRoutePageData, getRoutePageHtmlUrl } from './applyRoutePageData'
import { buildStopAudioMapFromPageData } from './routePageDataFormat'
import { parseRoutePageHtml } from './parseRoutePageHtml'

export interface LoadedRoutePageData {
  route: BusRoute
  pageData: RoutePageData
  stopAudioByIndex: Map<number, { nextStopLabel: { zh: string; en: string }; audioUrl: string }>
}

/** 拉取 routes/{id}.html 并合并到基础线路数据 */
export async function loadRoutePageData(
  base: BusRoute,
): Promise<LoadedRoutePageData | null> {
  try {
    const response = await fetch(getRoutePageHtmlUrl(base.id))
    if (!response.ok) return null
    const html = await response.text()
    const pageData = parseRoutePageHtml(html)
    if (!pageData) return null

    return {
      route: applyRoutePageData(base, pageData),
      pageData,
      stopAudioByIndex: buildStopAudioMapFromPageData(pageData),
    }
  } catch {
    return null
  }
}
