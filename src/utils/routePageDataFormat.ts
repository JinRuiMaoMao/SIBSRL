import { getRouteStopAudioAtRow } from '../data/routeBroadcasts'
import type { BilingualText, BusRoute, RouteStop } from '../types/route'
import type {
  RoutePageData,
  RoutePageStop,
  RoutePageStopAudio,
  RoutePageStopGroup,
} from '../types/routePageData'

function normalizeStop(stop: RoutePageStop): RouteStop & { audio?: RoutePageStopAudio } {
  if ('name' in stop && stop.name) {
    return {
      name: stop.name,
      zone: stop.zone,
      distanceFromPreviousMeters: stop.distanceFromPreviousMeters,
      audio: stop.audio,
    }
  }
  const { zone, audio, ...name } = stop as BilingualText & {
    zone?: number
    distanceFromPreviousMeters?: number
    audio?: RoutePageStopAudio
  }
  return {
    name: { zh: name.zh, en: name.en },
    zone,
    distanceFromPreviousMeters: name.distanceFromPreviousMeters,
    audio,
  }
}

function stopToPageStop(
  stop: RouteStop,
  audio?: RoutePageStopAudio,
): RoutePageStop {
  const item: RoutePageStop = {
    zh: stop.name.zh,
    en: stop.name.en,
  }
  if (stop.zone != null) item.zone = stop.zone
  if (stop.distanceFromPreviousMeters != null) {
    item.distanceFromPreviousMeters = stop.distanceFromPreviousMeters
  }
  if (audio) item.audio = audio
  return item
}

function collectStopAudio(route: BusRoute): RoutePageData['stopAudio'] {
  const groups = route.stops ?? []
  const maxRows = Math.max(0, ...groups.map((g) => g.list.length))
  const items: NonNullable<RoutePageData['stopAudio']> = []

  for (let i = 0; i < maxRows; i += 1) {
    const row = getRouteStopAudioAtRow(route.id, i)
    if (!row) continue
    items.push({
      atStopIndex: i,
      audioUrl: row.audioUrl,
      nextStop: row.nextStopLabel,
    })
  }

  return items.length > 0 ? items : undefined
}

/** 将完整线路转为 HTML 内嵌 JSON（供构建脚本写入 routes/*.html） */
export function busRouteToPageData(route: BusRoute): RoutePageData {
  const data: RoutePageData = {
    id: route.id,
  }

  if (route.operators.length > 0) data.operators = [...route.operators]
  if (route.fare) {
    data.fare = typeof route.fare === 'string' ? route.fare : route.fare.zh
  }
  if (route.interval) data.interval = route.interval
  if (route.journeyTime) data.journeyTime = route.journeyTime
  if (route.serviceTime) data.serviceTime = route.serviceTime
  if (route.length) data.length = route.length
  if (route.notes) data.notes = route.notes
  if (route.origin) data.origin = route.origin
  if (route.destination) data.destination = route.destination
  if (route.via) data.via = route.via

  if (route.stops?.length) {
    data.stops = route.stops.map((group): RoutePageStopGroup => {
      const list = group.list.map((stop, index) => {
        const audioRow = getRouteStopAudioAtRow(route.id, index)
        const audio = audioRow
          ? {
              audioUrl: audioRow.audioUrl,
              nextStop: audioRow.nextStopLabel,
            }
          : undefined
        return stopToPageStop(stop, audio)
      })
      return {
        direction: group.direction,
        directionKey: group.directionKey,
        serviceTime: group.serviceTime,
        length: group.length,
        list,
      }
    })
  }

  const stopAudio = collectStopAudio(route)
  if (stopAudio) data.stopAudio = stopAudio

  return data
}

export function pageDataToNormalizedStops(
  groups: RoutePageStopGroup[],
): BusRoute['stops'] {
  return groups.map((group) => ({
    direction: group.direction ?? { zh: '站序', en: 'Stops' },
    directionKey: group.directionKey,
    serviceTime: group.serviceTime,
    length: group.length,
    list: group.list.map((stop) => {
      const normalized = normalizeStop(stop)
      return {
        name: normalized.name,
        zone: normalized.zone,
        distanceFromPreviousMeters: normalized.distanceFromPreviousMeters,
      }
    }),
  }))
}

export function buildStopAudioMapFromPageData(
  data: RoutePageData,
  directionGroupIndex = 0,
): Map<number, { nextStopLabel: BilingualText; audioUrl: string }> {
  const map = new Map<number, { nextStopLabel: BilingualText; audioUrl: string }>()
  const group = data.stops?.[directionGroupIndex]

  if (group) {
    group.list.forEach((stop, index) => {
      const normalized = normalizeStop(stop)
      if (!normalized.audio) return
      const nextStop = group.list[index + 1]
      map.set(index, {
        audioUrl: normalized.audio.audioUrl,
        nextStopLabel:
          normalized.audio.nextStop ??
          (nextStop
            ? normalizeStop(nextStop).name
            : { zh: '下车提醒', en: 'Alighting reminder' }),
      })
    })
  }

  if ((data.stops?.length ?? 0) <= 1) {
    for (const entry of data.stopAudio ?? []) {
      map.set(entry.atStopIndex, {
        audioUrl: entry.audioUrl,
        nextStopLabel: entry.nextStop ?? { zh: '下一站', en: 'Next stop' },
      })
    }
  }

  return map
}

export function getPageStopAudioAtRow(
  data: RoutePageData | null | undefined,
  directionGroupIndex: number,
  rowIndex: number,
): { nextStopLabel: BilingualText; audioUrl: string } | undefined {
  if (!data) return undefined
  return buildStopAudioMapFromPageData(data, directionGroupIndex).get(rowIndex)
}
