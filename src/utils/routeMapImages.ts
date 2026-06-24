import { routeIdToPageFilename } from './routeNavigation'

export type RouteMapViewKind = 'path' | 'height'

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
  const prefix = resolveRouteAssetPrefix(fromRoutesDir)
  const dir = routeIdToPageFilename(routeId)
  return `${prefix}${ROUTE_MAPS_DIR}/${dir}/${routeMapImageBasename(kind)}.${extension}`
}

/** Standalone viewer page (走向 / 高度). */
export function buildRouteMapViewerUrl(
  routeId: string,
  kind: RouteMapViewKind,
  fromRoutesDir = false,
): string {
  const prefix = resolveRouteAssetPrefix(fromRoutesDir)
  const params = new URLSearchParams({
    route: routeId,
    view: kind,
  })
  return `${prefix}route-map.html?${params.toString()}`
}
