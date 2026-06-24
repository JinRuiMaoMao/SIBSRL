import type { BusRoute } from '../types/route'
import { normalizeRouteData } from '../utils/normalizeRouteData'
import secretRoutesJson from '../../data/secret-routes.json'

type SecretRouteStop = {
  name: { zh: string; en: string }
  nameSub?: { zh: string; en: string }
  turningPoint?: boolean
  zone?: number
}

type SecretRouteJson = {
  id: string
  number: string
  operators: string[]
  pattern?: 'circular' | 'bidirectional' | 'oneway'
  origin: { zh: string; en: string }
  destination: { zh: string; en: string }
  via?: { zh: string; en: string }
  journeyTime?: { zh: string; en: string }
  length?: { zh: string; en: string }
  fare?: { zh: string; en: string } | string
  serviceTime?: { zh: string; en: string }
  notes: { zh: string; en: string }
  wikiUrl?: string
  stops?: {
    direction: { zh: string; en: string }
    directionKey?: 'N' | 'S' | 'E' | 'W'
    list: SecretRouteStop[]
  }[]
}

function collectZones(stops: SecretRouteJson['stops']): number[] {
  const zones = new Set<number>()
  for (const group of stops ?? []) {
    for (const stop of group.list) {
      if (stop.zone != null) zones.add(stop.zone)
    }
  }
  return [...zones].sort((a, b) => a - b)
}

function toBusRoute(raw: SecretRouteJson): BusRoute {
  const fare =
    typeof raw.fare === 'string' ? raw.fare : raw.fare

  return {
    id: raw.id,
    number: raw.number,
    operators: raw.operators,
    category: 'special',
    serviceTypes: ['specialDeparture'],
    pattern: raw.pattern ?? 'bidirectional',
    zones: collectZones(raw.stops),
    origin: raw.origin,
    destination: raw.destination,
    via: raw.via,
    journeyTime: raw.journeyTime,
    length: raw.length,
    fare,
    serviceTime: raw.serviceTime,
    stops: raw.stops?.map((group, index) => ({
      ...group,
      directionKey:
        group.directionKey ??
        (index === 0 ? 'N' : index === 1 ? 'S' : undefined),
    })),
    notes: raw.notes,
    wikiUrl: raw.wikiUrl,
  }
}

export const secretRoutes: BusRoute[] = (secretRoutesJson as SecretRouteJson[]).map((raw) =>
  normalizeRouteData(toBusRoute(raw)),
)

export function findSecretRoute(routeId: string): BusRoute | undefined {
  const normalized = routeId.trim()
  return secretRoutes.find(
    (route) => route.id === normalized || route.number === normalized,
  )
}
