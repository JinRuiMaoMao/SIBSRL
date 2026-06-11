import { getRoute21AStopAudioByAtIndex, ROUTE_21A_ID } from './routeStopAudio21A'
import type { RouteStopAudioAtRow } from './routeStopAudio21A'
import { getRoute77XAStopAudioByAtIndex, ROUTE_77XA_ID } from './routeStopAudio77XA'

export function getRouteStopAudioAtRow(
  routeId: string,
  atStopIndex: number,
): RouteStopAudioAtRow | undefined {
  if (routeId === ROUTE_21A_ID || routeId === '21') {
    return getRoute21AStopAudioByAtIndex()?.get(atStopIndex)
  }
  if (routeId === ROUTE_77XA_ID || routeId === '77X') {
    return getRoute77XAStopAudioByAtIndex()?.get(atStopIndex)
  }
  return undefined
}

export function routeHasStopAudio(routeId: string): boolean {
  if (routeId === ROUTE_21A_ID || routeId === '21') {
    const map = getRoute21AStopAudioByAtIndex()
    return map != null && map.size > 0
  }
  if (routeId === ROUTE_77XA_ID || routeId === '77X') {
    const map = getRoute77XAStopAudioByAtIndex()
    return map != null && map.size > 0
  }
  return false
}
