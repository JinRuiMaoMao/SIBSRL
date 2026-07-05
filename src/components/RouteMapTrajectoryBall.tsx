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

function routeMapTrajectoryPathKey(path: readonly WorldMapPoint[]): string {
  if (path.length === 0) return ''
  const first = path[0]!
  const last = path[path.length - 1]!
  return `${path.length}:${first[0]},${first[1]}:${last[0]},${last[1]}`
}

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

  const pathKey = useMemo(() => routeMapTrajectoryPathKey(path), [path])
  const pathTotalLength = useMemo(
    () => computeRouteMapTrajectoryPathLength(path, imageWidth, imageHeight),
    [imageHeight, imageWidth, pathKey],
  )

  const [ballPositions, setBallPositions] = useState<readonly [number, number][]>([])

  const pathRef = useRef(path)
  pathRef.current = path
  const stopNodesRef = useRef(stopNodes)
  stopNodesRef.current = stopNodes
  const onNextStopRef = useRef(onNextStopNodeIdChange)
  onNextStopRef.current = onNextStopNodeIdChange
  const prevNextStopNodeIdRef = useRef<number | null | undefined>(undefined)
  const animationStartAtRef = useRef(performance.now())
  const prevPathKeyRef = useRef(pathKey)

  useEffect(() => {
    if (prevPathKeyRef.current === pathKey) return
    prevPathKeyRef.current = pathKey
    animationStartAtRef.current = performance.now()
    prevNextStopNodeIdRef.current = undefined
    onNextStopRef.current?.(null)
  }, [pathKey])

  useEffect(() => {
    if (path.length < 2 || imageWidth <= 0 || imageHeight <= 0 || pathTotalLength <= 0) {
      setBallPositions([])
      return
    }

    let frame = 0

    const tick = (now: number) => {
      const elapsed = (now - animationStartAtRef.current) % LOOP_DURATION_MS
      const progress = elapsed / LOOP_DURATION_MS
      const leadArcLength = progress * pathTotalLength
      const ballArcs = resolveRouteMapTrajectoryBallArcLengths(leadArcLength, pathTotalLength)
      const currentPath = pathRef.current
      setBallPositions(
        ballArcs.map((arcLength) =>
          interpolateRouteMapTrajectoryPointAtArcLength(
            currentPath,
            arcLength,
            imageWidth,
            imageHeight,
          ),
        ),
      )

      const onNextStop = onNextStopRef.current
      const nodes = stopNodesRef.current
      if (onNextStop && nodes.length > 0) {
        const nextStopNodeId = resolveRouteMapTrajectoryNextStopNodeId(
          nodes,
          currentPath,
          progress,
          imageWidth,
          imageHeight,
        )
        if (nextStopNodeId !== prevNextStopNodeIdRef.current) {
          prevNextStopNodeIdRef.current = nextStopNodeId
          onNextStop(nextStopNodeId)
        }
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [imageHeight, imageWidth, path.length, pathKey, pathTotalLength])

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
