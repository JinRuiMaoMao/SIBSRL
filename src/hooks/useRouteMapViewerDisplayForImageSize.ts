import { useEffect, useState } from 'react'
import type { IslandMapRouteOverlay } from '../contexts/IslandMapOverlayContext'
import { buildRouteMapViewerDisplay, type RouteMapViewerDisplay } from '../utils/routeMapViewerDisplay'
import { resolveRouteMapImportPayload } from '../utils/routeMapOverlaySource'

/** 切换概览/详细图层时按当前 imageSize 重建走线 display（4000²↔8000²）。 */
export function useRouteMapViewerDisplayForImageSize(
  routeOverlay: IslandMapRouteOverlay | null,
  imageSize: { width: number; height: number } | null,
): RouteMapViewerDisplay | null {
  const cachedDisplay = routeOverlay?.importedPath ?? null

  const [display, setDisplay] = useState<RouteMapViewerDisplay | null>(cachedDisplay)

  useEffect(() => {
    if (!routeOverlay?.importedPath) {
      setDisplay(null)
      return
    }

    if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
      setDisplay(routeOverlay.importedPath)
      return
    }

    let cancelled = false
    void (async () => {
      const parsed = await resolveRouteMapImportPayload(
        routeOverlay.routeId,
        routeOverlay.directionIndex,
      )
      if (cancelled) return

      if (!parsed) {
        setDisplay(routeOverlay.importedPath)
        return
      }

      const rebuilt = buildRouteMapViewerDisplay(
        parsed,
        imageSize.width,
        imageSize.height,
        routeOverlay.routeNumber || parsed.routeId,
      )
      setDisplay(rebuilt ?? routeOverlay.importedPath)
    })()

    return () => {
      cancelled = true
    }
  }, [
    imageSize,
    routeOverlay?.directionIndex,
    routeOverlay?.importedPath,
    routeOverlay?.routeId,
    routeOverlay?.routeNumber,
  ])

  if (!routeOverlay?.importedPath) return null
  return display ?? routeOverlay.importedPath
}
