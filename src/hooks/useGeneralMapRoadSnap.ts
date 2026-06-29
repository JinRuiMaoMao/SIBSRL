import { useEffect, useMemo, useState } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import {
  preloadGeneralMapRoadSnapIndex,
  snapPointToGeneralMapRoad,
  isPointOnGeneralMapRoad,
  traceGeneralMapRoadPath,
  type GeneralMapRoadSnapIndex,
  type TraceRoadPathOptions,
  type VirtualNodePathConstraint,
  type WorldMapRouteSegmentRef,
} from '../utils/generalMapRoadSnap'

export function useGeneralMapRoadSnap(
  enabled: boolean,
  options?: { avoidParallelSegments?: readonly WorldMapRouteSegmentRef[] },
) {
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
      index,
      snap(point: WorldMapPoint): WorldMapPoint {
        return snapPointToGeneralMapRoad(index, point)
      },
      isOnRoad(point: WorldMapPoint): boolean {
        return isPointOnGeneralMapRoad(index, point)
      },
      snapVirtualNode(point: WorldMapPoint, kind: VirtualNodePathConstraint['kind']): WorldMapPoint {
        return index?.snapVirtualNode(point, kind) ?? point
      },
      toVirtualNodeConstraint(
        point: WorldMapPoint,
        kind: VirtualNodePathConstraint['kind'],
      ): VirtualNodePathConstraint | null {
        return index?.toVirtualNodeConstraint(point, kind) ?? null
      },
      appendSegment(
        from: WorldMapPoint | null,
        to: WorldMapPoint,
        via: VirtualNodePathConstraint[] = [],
        traceOptions: TraceRoadPathOptions = {},
      ): WorldMapPoint[] {
        const snapped = snapPointToGeneralMapRoad(index, to)
        if (!from) return [snapped]
        if (!index) return [snapped]
        const traced = traceGeneralMapRoadPath(index, from, snapped, via, {
          avoidParallelSegments: options?.avoidParallelSegments,
          ...traceOptions,
        })
        return traced.length > 0 ? traced : [snapped]
      },
    }),
    [index, loading, options?.avoidParallelSegments],
  )
}
