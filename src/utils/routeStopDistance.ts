import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'
import { getDirectionDataIndex } from './routeDirectionCore'
import { resolveLengthKmForDataIndex } from './routeLength'

export interface StopDistanceLabel {
  label: string
  estimated: boolean
}

function formatMeters(meters: number, estimated: boolean): string {
  const prefix = estimated ? '≈' : ''
  if (meters >= 1000) {
    const km = meters / 1000
    const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10
    return `${prefix}${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
  }
  const rounded = meters >= 100 ? Math.round(meters / 10) * 10 : Math.round(meters)
  return `${prefix}${rounded.toLocaleString()} m`
}

function parseKm(text: string | null): number | null {
  const match = text?.match(/([\d.]+)\s*km/i)
  if (!match) return null
  const km = Number(match[1])
  return Number.isFinite(km) && km > 0 ? km : null
}

export function getStopDistanceFromPreviousLabel(
  route: BusRoute,
  directionIndex: number,
  stopIndex: number,
  locale: Locale,
): StopDistanceLabel | null {
  if (stopIndex <= 0) return null

  const dataIndex = getDirectionDataIndex(route, directionIndex)
  const group = route.stops?.[dataIndex]
  const stop = group?.list[stopIndex]
  if (!group || !stop) return null

  const explicitMeters = stop.distanceFromPreviousMeters
  if (explicitMeters != null && Number.isFinite(explicitMeters) && explicitMeters > 0) {
    return { label: formatMeters(explicitMeters, false), estimated: false }
  }

  const intervals = group.list.length - 1
  if (intervals <= 0) return null

  const totalKm = parseKm(resolveLengthKmForDataIndex(route, dataIndex, locale))
  if (!totalKm) return null

  return {
    label: formatMeters((totalKm * 1000) / intervals, true),
    estimated: true,
  }
}
