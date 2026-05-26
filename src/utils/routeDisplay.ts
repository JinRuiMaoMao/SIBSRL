import type { BusRoute, RoutePattern } from '../types/route'
import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'

/** 起讫之间的方向符号：双向/环线用左右箭头，单程用右箭头 */
export function getRouteArrow(pattern: RoutePattern): string {
  if (pattern === 'oneway') return '→'
  return '↔'
}

export function formatRouteEndpoints(route: BusRoute, locale: Locale): string {
  const arrow = getRouteArrow(route.pattern)
  return `${getPrimaryText(route.origin, locale)} ${arrow} ${getPrimaryText(route.destination, locale)}`
}

/** 从任意长度文案提取「19 km」 */
export function extractKmDisplay(text: string): string | null {
  const match = text.match(/([\d.]+)\s*km/i)
  if (match) return `${match[1]} km`
  return null
}

export function formatRouteOperators(route: BusRoute): string {
  return route.operators.join(' & ')
}
