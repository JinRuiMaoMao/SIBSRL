import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteEditorNode } from '../routeEditor/types'
import type { WorldMapCatalogStop } from './worldMapStopCatalog'
import { stopsMatch } from './stopIdentity'

const PLACED_POINT_TOLERANCE = 0.015

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

    const point: WorldMapPoint = [node.x / imageWidth, node.y / imageHeight]
    const distance = Math.hypot(point[0] - catalogStop.point[0], point[1] - catalogStop.point[1])
    if (distance <= PLACED_POINT_TOLERANCE) return true
  }
  return false
}

export function catalogStopListKey(stop: WorldMapCatalogStop, index: number): string {
  return `${stop.name.zh}|${stop.name.en}|${stop.point[0]}|${stop.point[1]}|${index}`
}
