import {
  ALIGHTING_REMINDER_AUDIO_URL,
  ALIGHTING_REMINDER_LABEL,
} from '../data/routeAlightingReminder'
import { routes } from '../data/routes'
import type { RouteStopAudioAtRow } from '../data/routeStopAudio21A'
import { findStopNameAudio, passIndexForNextStop } from '../data/stopNameAudioManifest'
import type { BilingualText, RouteStop } from '../types/route'
import { passIndexForStopNamePool } from './stopNameAudioMatch'
import { canonicalStopKey } from './stopIdentity'

export function lookupStopZoneFromRoutes(zh: string, en: string): number | undefined {
  const key = canonicalStopKey(zh, en)
  for (const route of routes) {
    for (const group of route.stops ?? []) {
      for (const stop of group.list) {
        if (canonicalStopKey(stop.name.zh, stop.name.en) !== key) continue
        if (stop.zone != null) return stop.zone
      }
    }
  }
  return undefined
}

export function enrichPrivateHireRouteStop(name: BilingualText): RouteStop {
  return {
    name,
    zone: lookupStopZoneFromRoutes(name.zh, name.en),
  }
}

export function getPrivateHireStopAudioAtRow(
  stops: readonly RouteStop[],
  atStopIndex: number,
): RouteStopAudioAtRow | undefined {
  if (stops.length === 0) return undefined
  if (atStopIndex >= stops.length - 1) {
    return {
      atStopIndex,
      nextStopLabel: ALIGHTING_REMINDER_LABEL,
      audioUrl: ALIGHTING_REMINDER_AUDIO_URL,
    }
  }

  const list = stops.map((stop) => ({ name: stop.name }))
  const nextIndex = atStopIndex + 1
  const nextStop = stops[nextIndex]?.name
  if (!nextStop) return undefined

  const passIndex = passIndexForStopNamePool(
    'PH1',
    nextStop,
    passIndexForNextStop(list, nextIndex),
    nextIndex,
  )
  const match = findStopNameAudio(nextStop, passIndex)
  if (!match) return undefined

  return {
    atStopIndex,
    nextStopLabel: nextStop,
    audioUrl: match.audioUrl,
  }
}
