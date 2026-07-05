import { routeIdToPageFilename } from './routeNavigation'
import { resolveRouteMapRouteId, type RouteMapViewKind } from '../data/routeMapsManifest'

export type { RouteMapViewKind }

const ROUTE_MAPS_DIR = 'route-maps'

const KIND_FILENAMES: Record<RouteMapViewKind, string> = {
  path: 'path',
  height: 'height',
}

/** Relative asset prefix when the current page sits under routes/*.html */
export function resolveRouteAssetPrefix(fromRoutesDir = false): string {
  return fromRoutesDir ? '../' : './'
}

export function routeMapImageBasename(kind: RouteMapViewKind): string {
  return KIND_FILENAMES[kind]
}

/** Static image URL; viewer page tries png/webp/jpg extensions. */
export function getRouteMapImageUrl(
  routeId: string,
  kind: RouteMapViewKind,
  fromRoutesDir = false,
  extension = 'png',
): string {
  const canonicalId = resolveRouteMapRouteId(routeId) ?? routeId
  const prefix = resolveRouteAssetPrefix(fromRoutesDir)
  const dir = routeIdToPageFilename(canonicalId)
  return `${prefix}${ROUTE_MAPS_DIR}/${dir}/${routeMapImageBasename(kind)}.${extension}`
}

/** Standalone viewer page (走向 / 高度). */
export function buildRouteMapViewerUrl(
  routeId: string,
  kind: RouteMapViewKind,
  fromRoutesDir = false,
  directionIndex?: number,
): string {
  const canonicalId = resolveRouteMapRouteId(routeId) ?? routeId
  const prefix = resolveRouteAssetPrefix(fromRoutesDir)
  const params = new URLSearchParams({
    route: canonicalId,
    view: kind,
  })
  if (directionIndex != null && directionIndex >= 0) {
    params.set('dir', String(directionIndex))
  }
  return `${prefix}route-map.html?${params.toString()}`
}
