import type { RouteEditorNode } from '../routeEditor/types'
import { canonicalStopKey, stopsMatch } from './stopIdentity'
import type { MapDrawRouteDetailStopName } from './mapDrawRouteDetailStops'
import type { WorldMapCatalogStop } from './worldMapStopCatalog'

export type MapDrawAllStationsFilter = 'all' | 'added' | 'not-added'

export interface MapDrawAllStationsRow {
  stop: WorldMapCatalogStop
  index: number
  key: string
  /** Present in the current world-map stop catalog JSON. */
  inCatalog: boolean
  hasMapCoords: boolean
}

export function buildMapDrawAllStationsRows(
  catalog: readonly WorldMapCatalogStop[],
  routeDetailStops: readonly MapDrawRouteDetailStopName[],
): MapDrawAllStationsRow[] {
  const rows: MapDrawAllStationsRow[] = catalog.map((stop, index) => ({
    stop,
    index,
    key: catalogStopListKey(stop, index),
    inCatalog: true,
    hasMapCoords: true,
  }))

  const seenKeys = new Set(rows.map((row) => canonicalStopKey(row.stop.name.zh, row.stop.name.en)))
  let extraIndex = catalog.length

  for (const listed of routeDetailStops) {
    const key = canonicalStopKey(listed.zh, listed.en)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    const catalogMatch = catalog.find((stop) => stopsMatch(stop.name, listed))
    rows.push({
      stop: catalogMatch ?? {
        name: listed,
        point: [0, 0],
      },
      index: extraIndex,
      key: `route-detail|${key}|${extraIndex}`,
      inCatalog: false,
      hasMapCoords: Boolean(catalogMatch),
    })
    extraIndex += 1
  }

  return rows
}

/** 当前 JSON 目录为空时，「已添加」筛选回退为展示未添加站点。 */
export function filterMapDrawAllStationsRows(
  rows: readonly MapDrawAllStationsRow[],
  filter: MapDrawAllStationsFilter,
): MapDrawAllStationsRow[] {
  if (filter === 'added') {
    const added = rows.filter((row) => row.inCatalog)
    if (added.length === 0) return rows.filter((row) => !row.inCatalog)
    return added
  }
  if (filter === 'not-added') return rows.filter((row) => !row.inCatalog)
  return [...rows]
}

export function isMapDrawCatalogStopPlaced(
  catalogStop: WorldMapCatalogStop,
  nodes: readonly RouteEditorNode[],
  imageWidth: number,
  imageHeight: number,
): boolean {
  if (imageWidth <= 0 || imageHeight <= 0) return false

  for (const node of nodes) {
    if (node.type !== 'stop') continue
    if (!stopsMatch({ zh: node.chi_name, en: node.eng_name }, catalogStop.name)) continue

    const point = [node.x / imageWidth, node.y / imageHeight] as const
    const distance = Math.hypot(point[0] - catalogStop.point[0], point[1] - catalogStop.point[1])
    if (distance <= 0.015) return true
  }
  return false
}

export function catalogStopListKey(stop: WorldMapCatalogStop, index: number): string {
  return `${stop.name.zh}|${stop.name.en}|${stop.point[0]}|${stop.point[1]}|${index}`
}
