import { routeIdToPageFilename } from './routeNavigation'
import { resolveRouteMapRouteId, type RouteMapViewKind } from '../data/routeMapsManifest'
import { getLayoutScopedHref, getSiteAssetRoot } from './appLayoutMode'

export type { RouteMapViewKind }

const ROUTE_MAPS_DIR = 'route-maps'

const KIND_FILENAMES: Record<RouteMapViewKind, string> = {
  path: 'path',
  height: 'height',
}

/** @deprecated Prefer getSiteAssetRoot(); kept for routes/*.html callers */
export function resolveRouteAssetPrefix(fromRoutesDir = false): string {
  if (fromRoutesDir) return getSiteAssetRoot()
  return getSiteAssetRoot()
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
  _fromRoutesDir = false,
  directionIndex?: number,
): string {
  const canonicalId = resolveRouteMapRouteId(routeId) ?? routeId
  const params = new URLSearchParams({
    route: canonicalId,
    view: kind,
  })
  if (directionIndex != null && directionIndex >= 0) {
    params.set('dir', String(directionIndex))
  }
  return `${getLayoutScopedHref('route-map.html')}?${params.toString()}`
}
