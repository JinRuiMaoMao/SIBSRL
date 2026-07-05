import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteEditorNode } from '../routeEditor/types'
import { ROUTE_MAP_VIEWER_EDITOR_CONFIG } from '../routeEditor/types'
import { mapDrawNodeScaleFactor, mapDrawStopIconRadius } from '../utils/mapDrawNodeScale'
import {
  computeRouteMapTrajectoryPathLength,
  interpolateRouteMapTrajectoryPointAtArcLength,
  resolveRouteMapTrajectoryBallArcLengths,
  resolveRouteMapTrajectoryNextStopNodeId,
} from '../utils/routeMapTrajectory'

interface RouteMapTrajectoryBallProps {
  imageWidth: number
  imageHeight: number
  path: readonly WorldMapPoint[]
  stopNodes?: readonly RouteEditorNode[]
  onNextStopNodeIdChange?: (nodeId: number | null) => void
}

const LOOP_DURATION_MS = 24_000

export function RouteMapTrajectoryBall({
  imageWidth,
  imageHeight,
  path,
  stopNodes = [],
  onNextStopNodeIdChange,
}: RouteMapTrajectoryBallProps) {
  const radius = useMemo(() => {
    const nodeScale = mapDrawNodeScaleFactor(imageWidth, imageHeight)
    return mapDrawStopIconRadius(ROUTE_MAP_VIEWER_EDITOR_CONFIG.stopIconSize, nodeScale)
  }, [imageHeight, imageWidth])

  const pathTotalLength = useMemo(
    () => computeRouteMapTrajectoryPathLength(path, imageWidth, imageHeight),
    [imageHeight, imageWidth, path],
  )

  const [ballPositions, setBallPositions] = useState<readonly [number, number][]>([])

  const prevNextStopNodeIdRef = useRef<number | null | undefined>(undefined)

  useEffect(() => {
    prevNextStopNodeIdRef.current = undefined
    onNextStopNodeIdChange?.(null)
  }, [onNextStopNodeIdChange, path, stopNodes])

  useEffect(() => {
    if (path.length < 2 || imageWidth <= 0 || imageHeight <= 0 || pathTotalLength <= 0) {
      setBallPositions([])
      return
    }

    let frame = 0
    const startAt = performance.now()

    const tick = (now: number) => {
      const elapsed = (now - startAt) % LOOP_DURATION_MS
      const progress = elapsed / LOOP_DURATION_MS
      const leadArcLength = progress * pathTotalLength
      const ballArcs = resolveRouteMapTrajectoryBallArcLengths(leadArcLength, pathTotalLength)
      setBallPositions(
        ballArcs.map((arcLength) =>
          interpolateRouteMapTrajectoryPointAtArcLength(path, arcLength, imageWidth, imageHeight),
        ),
      )

      if (onNextStopNodeIdChange && stopNodes.length > 0) {
        const nextStopNodeId = resolveRouteMapTrajectoryNextStopNodeId(
          stopNodes,
          path,
          progress,
          imageWidth,
          imageHeight,
        )
        if (nextStopNodeId !== prevNextStopNodeIdRef.current) {
          prevNextStopNodeIdRef.current = nextStopNodeId
          onNextStopNodeIdChange(nextStopNodeId)
        }
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [
    imageHeight,
    imageWidth,
    onNextStopNodeIdChange,
    path,
    pathTotalLength,
    stopNodes,
  ])

  if (path.length < 2 || ballPositions.length === 0) return null

  return (
    <svg
      className="route-map-trajectory-ball-layer"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {ballPositions.map(([x, y], index) => (
        <g key={index} className="route-map-trajectory-ball-group">
          <circle
            className="route-map-trajectory-ball-glow"
            cx={x}
            cy={y}
            r={radius * 1.45}
          />
          <circle className="route-map-trajectory-ball" cx={x} cy={y} r={radius} />
        </g>
      ))}
    </svg>
  )
}
