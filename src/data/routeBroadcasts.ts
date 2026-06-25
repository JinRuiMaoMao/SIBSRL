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
import { getRoute77XAStopAudioByAtIndex, ROUTE_77XA_ID } from './routeStopAudio77XA'
import { getRouteN171StopAudioByAtIndex, ROUTE_N171_ID } from './routeStopAudioN171'
import { passIndexForStopNamePool } from '../utils/stopNameAudioMatch'

const ROUTE_ID_ALIASES: Record<string, string> = {
  '21': '21A',
  '77X': ROUTE_77XA_ID,
}

function resolveRouteDataId(routeId: string): string {
  return ROUTE_ID_ALIASES[routeId] ?? routeId
}

function getRoute77XAStopAudio(routeId: string, atStopIndex: number): RouteStopAudioAtRow | undefined {
  if (routeId === ROUTE_77XA_ID || routeId === '77X') {
    return getRoute77XAStopAudioByAtIndex()?.get(atStopIndex)
  }
  return undefined
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

function getRouteN171StopAudio(
  routeId: string,
  atStopIndex: number,
  directionGroupIndex: number,
): RouteStopAudioAtRow | undefined {
  if (routeId !== ROUTE_N171_ID) return undefined
  return getRouteN171StopAudioByAtIndex(directionGroupIndex)?.get(atStopIndex)
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

  return (
    getRouteN171StopAudio(routeId, atStopIndex, directionGroupIndex) ??
    getRoute77XAStopAudio(routeId, atStopIndex) ??
    getNextStopNamePoolAudio(routeId, atStopIndex, directionGroupIndex, length)
  )
}

export function routeHasStopAudio(routeId: string): boolean {
  const dataId = resolveRouteDataId(routeId)
  const route = routes.find((r) => r.id === dataId)
  if (!route?.stops?.length) return false

  if (getRoute77XAStopAudio(routeId, 0)) return true
  if (getRouteN171StopAudioByAtIndex(0)?.size) return true

  return route.stops.some((group) => group.list.length > 0)
}

export type { RouteStopAudioAtRow }
