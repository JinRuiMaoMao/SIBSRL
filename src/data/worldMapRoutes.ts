import type { NormalizedMapView } from '../components/IslandMapPanZoomSurface'
import {
  WORLD_MAP_ROUTE_ALIASES,
  WORLD_MAP_ROUTE_PATHS,
  type WorldMapPoint,
} from './worldMapRoutesManifest.generated'

export type { WorldMapPoint } from './worldMapRoutesManifest.generated'

const WIDGET_ROUTE_FOCUS_FACTOR = 2.2

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function resolveWorldMapRouteId(routeId: string): string | null {
  if (WORLD_MAP_ROUTE_PATHS[routeId]) return routeId
  const alias = WORLD_MAP_ROUTE_ALIASES[routeId]
  if (alias && WORLD_MAP_ROUTE_PATHS[alias]) return alias
  return null
}

export function getWorldMapRoutePoints(
  routeId: string,
  directionIndex: number,
): readonly WorldMapPoint[] | null {
  const canonicalId = resolveWorldMapRouteId(routeId)
  if (!canonicalId) return null
  const entry = WORLD_MAP_ROUTE_PATHS[canonicalId]
  if (!entry) return null
  const direction =
    entry.directions.find((item) => item.directionIndex === directionIndex) ?? entry.directions[0]
  return direction?.points ?? null
}

export function hasWorldMapRoutePath(routeId: string): boolean {
  return resolveWorldMapRouteId(routeId) != null
}

export function fitNormalizedViewToRoutePoints(
  points: readonly WorldMapPoint[],
  mode: 'widget' | 'fullscreen',
  padding = 0.06,
): NormalizedMapView {
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const minX = clamp(Math.min(...xs) - padding, 0, 1)
  const maxX = clamp(Math.max(...xs) + padding, 0, 1)
  const minY = clamp(Math.min(...ys) - padding, 0, 1)
  const maxY = clamp(Math.max(...ys) + padding, 0, 1)
  const centerX = clamp((minX + maxX) / 2, 0, 1)
  const centerY = clamp((minY + maxY) / 2, 0, 1)
  const span = Math.max(maxX - minX, maxY - minY, 0.06)
  const base = mode === 'widget' ? WIDGET_ROUTE_FOCUS_FACTOR : 1
  return {
    centerX,
    centerY,
    zoomRatio: clamp(base / span, 0.8, 12),
  }
}
