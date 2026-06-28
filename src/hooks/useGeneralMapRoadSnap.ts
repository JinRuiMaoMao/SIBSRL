import { useEffect, useMemo, useState } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import {
  preloadGeneralMapRoadSnapIndex,
  snapPointToGeneralMapRoad,
  traceGeneralMapRoadPath,
  type GeneralMapRoadSnapIndex,
} from '../utils/generalMapRoadSnap'

export function useGeneralMapRoadSnap(enabled: boolean) {
  const [index, setIndex] = useState<GeneralMapRoadSnapIndex | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    void preloadGeneralMapRoadSnapIndex().then((loaded) => {
      if (cancelled) return
      setIndex(loaded)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return useMemo(
    () => ({
      ready: Boolean(index),
      loading,
      snap(point: WorldMapPoint): WorldMapPoint {
        return snapPointToGeneralMapRoad(index, point)
      },
      appendSegment(from: WorldMapPoint | null, to: WorldMapPoint): WorldMapPoint[] {
        const snapped = snapPointToGeneralMapRoad(index, to)
        if (!from) return [snapped]
        if (!index) return [snapped]
        const traced = traceGeneralMapRoadPath(index, from, snapped)
        return traced.length > 0 ? traced : [snapped]
      },
    }),
    [index, loading],
  )
}
