import { getRoute21AStopAudioByAtIndex, ROUTE_21A_ID } from './routeStopAudio21A'
import type { RouteStopAudioAtRow } from './routeStopAudio21A'

export function getRouteStopAudioAtRow(
  routeId: string,
  atStopIndex: number,
): RouteStopAudioAtRow | undefined {
  if (routeId === ROUTE_21A_ID) {
    return getRoute21AStopAudioByAtIndex()?.get(atStopIndex)
  }
  return undefined
}

export function routeHasStopAudio(routeId: string): boolean {
  if (routeId === ROUTE_21A_ID) {
    const map = getRoute21AStopAudioByAtIndex()
    return map != null && map.size > 0
  }
  return false
}
