import { routes } from './routes'
import {
  ALIGHTING_REMINDER_AUDIO_URL,
  ALIGHTING_REMINDER_LABEL,
} from './routeAlightingReminder'
import {
  findStopNameAudio,
  passIndexForNextStop,
} from './stopNameAudioManifest'
import type { RouteStopAudioAtRow } from './routeStopAudio21A'
import { getRoute21AStopAudioByAtIndex, ROUTE_21A_ID } from './routeStopAudio21A'
import { getRoute77XAStopAudioByAtIndex, ROUTE_77XA_ID } from './routeStopAudio77XA'
import {
  getRouteDirectionStopAudioByAtIndex,
  ROUTE_DIRECTION_AUDIO_ROUTE_IDS,
} from './routeStopAudioByDirection.generated'
import { passIndexForStopNamePool } from '../utils/stopNameAudioMatch'
import { borrowRouteStopAudioAtRow } from '../utils/borrowRouteStopAudio'

const ROUTE_ID_ALIASES: Record<string, string> = {
  '21': '21A',
  '77X': ROUTE_77XA_ID,
}

function resolveRouteDataId(routeId: string): string {
  return ROUTE_ID_ALIASES[routeId] ?? routeId
}

function routeHasMultipleDirections(routeId: string): boolean {
  const dataId = resolveRouteDataId(routeId)
  const route = routes.find((r) => r.id === dataId)
  return (route?.stops?.length ?? 0) > 1
}

function getRoute21AStopAudio(routeId: string, atStopIndex: number): RouteStopAudioAtRow | undefined {
  if (resolveRouteDataId(routeId) !== ROUTE_21A_ID) return undefined
  return getRoute21AStopAudioByAtIndex()?.get(atStopIndex)
}

function getRoute77XAStopAudio(routeId: string, atStopIndex: number): RouteStopAudioAtRow | undefined {
  if (routeId === ROUTE_77XA_ID || routeId === '77X') {
    return getRoute77XAStopAudioByAtIndex()?.get(atStopIndex)
  }
  return undefined
}

function getDirectionSyncedStopAudio(
  routeId: string,
  atStopIndex: number,
  directionGroupIndex: number,
): RouteStopAudioAtRow | undefined {
  const dataId = resolveRouteDataId(routeId)
  if (!(ROUTE_DIRECTION_AUDIO_ROUTE_IDS as readonly string[]).includes(dataId)) {
    return undefined
  }
  return getRouteDirectionStopAudioByAtIndex(dataId, directionGroupIndex)?.get(atStopIndex)
}

function getNextStopNamePoolAudio(
  routeId: string,
  atStopIndex: number,
  directionGroupIndex: number,
  stopListLength: number,
): RouteStopAudioAtRow | undefined {
  if (stopListLength > 0 && atStopIndex >= stopListLength - 1) return undefined

  const dataId = resolveRouteDataId(routeId)
  const list = routes.find((r) => r.id === dataId)?.stops?.[directionGroupIndex]?.list
  if (!list?.length) return undefined

  const nextIndex = atStopIndex + 1
  const nextStop = list[nextIndex]
  if (!nextStop) return undefined

  const passIndex = passIndexForStopNamePool(
    dataId,
    nextStop.name,
    passIndexForNextStop(list, nextIndex),
    nextIndex,
  )
  const match = findStopNameAudio(nextStop.name, passIndex)
  if (!match) return undefined

  return {
    atStopIndex,
    nextStopLabel: nextStop.name,
    audioUrl: match.audioUrl,
  }
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

  const dataId = resolveRouteDataId(routeId)

  return (
    getDirectionSyncedStopAudio(dataId, atStopIndex, directionGroupIndex) ??
    getRoute21AStopAudio(dataId, atStopIndex) ??
    getRoute77XAStopAudio(routeId, atStopIndex) ??
    borrowRouteStopAudioAtRow(dataId, atStopIndex, directionGroupIndex) ??
    (routeHasMultipleDirections(dataId)
      ? undefined
      : getNextStopNamePoolAudio(dataId, atStopIndex, directionGroupIndex, length))
  )
}

export function routeHasStopAudio(routeId: string): boolean {
  const dataId = resolveRouteDataId(routeId)
  const route = routes.find((r) => r.id === dataId)
  if (!route?.stops?.length) return false

  if (getRoute21AStopAudioByAtIndex()?.size) {
    if (dataId === ROUTE_21A_ID) return true
  }
  if (getRoute77XAStopAudio(routeId, 0)) return true

  if ((ROUTE_DIRECTION_AUDIO_ROUTE_IDS as readonly string[]).includes(dataId)) {
    return route.stops.some(
      (_, groupIndex) => (getRouteDirectionStopAudioByAtIndex(dataId, groupIndex)?.size ?? 0) > 0,
    )
  }

  if (routeHasMultipleDirections(dataId)) {
    return route.stops.some((group, groupIndex) =>
      group.list.some(
        (_, at) => borrowRouteStopAudioAtRow(dataId, at, groupIndex) != null,
      ),
    )
  }

  return route.stops.some((group) => group.list.length > 0)
}

export type { RouteStopAudioAtRow }
