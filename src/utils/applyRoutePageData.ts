import type { BusRoute } from '../types/route'
import type { RoutePageData } from '../types/routePageData'
import { pageDataToNormalizedStops } from './routePageDataFormat'
import { getRoutePageDataHref } from './routeNavigation'

function patchDefined<T extends object>(base: T, patch: Partial<T>): T {
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      ;(next as Record<string, unknown>)[key] = value
    }
  }
  return next
}

/** 用 HTML 内 JSON 覆盖线路字段（未写字段保留 TS 数据） */
export function applyRoutePageData(base: BusRoute, page: RoutePageData): BusRoute {
  const patch: Partial<BusRoute> = {}

  if (page.operators) patch.operators = page.operators
  if (page.fare) patch.fare = page.fare
  if (page.interval) patch.interval = page.interval
  if (page.journeyTime) patch.journeyTime = page.journeyTime
  if (page.serviceTime) patch.serviceTime = page.serviceTime
  if (page.length) patch.length = page.length
  if (page.notes) patch.notes = page.notes
  if (page.eventTitle) patch.eventTitle = page.eventTitle
  if (page.eventAbout) patch.eventAbout = page.eventAbout
  if (page.origin) patch.origin = page.origin
  if (page.destination) patch.destination = page.destination
  if (page.via) patch.via = page.via
  if (page.stops?.length) patch.stops = pageDataToNormalizedStops(page.stops)

  return patchDefined(base, patch)
}

export function getRoutePageHtmlUrl(routeId: string): string {
  return `./${getRoutePageDataHref(routeId)}`
}
