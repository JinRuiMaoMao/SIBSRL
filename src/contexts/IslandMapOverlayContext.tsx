import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteDetailMapStop } from '../utils/routeDetailMapStops'
import type { RouteMapViewerDisplay } from '../utils/routeMapViewerDisplay'

export interface IslandMapRouteOverlay {
  routeId: string
  routeNumber: string
  directionIndex: number
  points: readonly WorldMapPoint[]
  stops?: readonly RouteDetailMapStop[]
  /** Imported path display shared with route-map.html (reference editor, bends, etc.). */
  importedPath?: Omit<RouteMapViewerDisplay, 'fitPoints'> | null
}

interface IslandMapOverlayContextValue {
  routeOverlay: IslandMapRouteOverlay | null
  setRouteOverlay: (overlay: IslandMapRouteOverlay | null) => void
}

const IslandMapOverlayContext = createContext<IslandMapOverlayContextValue | null>(null)

export function IslandMapOverlayProvider({ children }: { children: ReactNode }) {
  const [routeOverlay, setRouteOverlay] = useState<IslandMapRouteOverlay | null>(null)
  const value = useMemo(
    () => ({
      routeOverlay,
      setRouteOverlay,
    }),
    [routeOverlay],
  )
  return <IslandMapOverlayContext.Provider value={value}>{children}</IslandMapOverlayContext.Provider>
}

export function useIslandMapOverlay(): IslandMapOverlayContextValue {
  const context = useContext(IslandMapOverlayContext)
  if (!context) {
    throw new Error('useIslandMapOverlay must be used within IslandMapOverlayProvider')
  }
  return context
}

export function useOptionalIslandMapOverlay(): IslandMapOverlayContextValue | null {
  return useContext(IslandMapOverlayContext)
}
