import { routes } from './routes'
import {
  ALIGHTING_REMINDER_AUDIO_URL,
  ALIGHTING_REMINDER_LABEL,
} from './routeAlightingReminder'
import { getRoute21AStopAudioByAtIndex, ROUTE_21A_ID } from './routeStopAudio21A'
import type { RouteStopAudioAtRow } from './routeStopAudio21A'
import { getRoute77XAStopAudioByAtIndex, ROUTE_77XA_ID } from './routeStopAudio77XA'

const ROUTE_ID_ALIASES: Record<string, string> = {
  '21': ROUTE_21A_ID,
  '77X': ROUTE_77XA_ID,
}

function resolveRouteDataId(routeId: string): string {
  return ROUTE_ID_ALIASES[routeId] ?? routeId
}

function getRouteSpecificStopAudio(
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

export function getRouteStopAudioAtRow(
  routeId: string,
  atStopIndex: number,
  directionGroupIndex = 0,
  stopListLength?: number,
): RouteStopAudioAtRow | undefined {
  const length = stopListLength ?? 0
  if (length > 0 && atStopIndex === length - 1) {
    return {
      atStopIndex,
      nextStopLabel: ALIGHTING_REMINDER_LABEL,
      audioUrl: ALIGHTING_REMINDER_AUDIO_URL,
    }
  }

  return getRouteSpecificStopAudio(routeId, atStopIndex)
}

export function routeHasStopAudio(routeId: string): boolean {
  const dataId = resolveRouteDataId(routeId)
  const route = routes.find((r) => r.id === dataId)
  if (!route?.stops?.length) return false

  if (getRouteSpecificStopAudio(routeId, 0)) return true

  return route.stops.some((group) => group.list.length > 0)
}
