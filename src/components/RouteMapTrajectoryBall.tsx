import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import { ROUTE_MAP_VIEWER_EDITOR_CONFIG } from '../routeEditor/types'
import { mapDrawNodeScaleFactor, mapDrawStopIconRadius } from '../utils/mapDrawNodeScale'
import {
  computeRouteMapTrajectoryPathLength,
  interpolateRouteMapTrajectoryPointAtArcLength,
  resolveRouteMapTrajectoryBallArcLengths,
  resolveRouteMapTrajectoryLoopDurationMs,
} from '../utils/routeMapTrajectory'
import {
  clearRouteMapTrajectoryAnimationStart,
  readRouteMapTrajectoryAnimationStart,
  resetRouteMapTrajectoryAnimationStart,
} from '../utils/routeMapTrajectoryAnimation'

interface RouteMapTrajectoryBallProps {
  imageWidth: number
  imageHeight: number
  path: readonly WorldMapPoint[]
}

const loopDurationMs = resolveRouteMapTrajectoryLoopDurationMs()

function routeMapTrajectoryPathKey(path: readonly WorldMapPoint[]): string {
  if (path.length === 0) return ''
  const first = path[0]!
  const last = path[path.length - 1]!
  return `${path.length}:${first[0]},${first[1]}:${last[0]},${last[1]}`
}

function RouteMapTrajectoryBallInner({
  imageWidth,
  imageHeight,
  path,
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
  const animationStartAtRef = useRef(readRouteMapTrajectoryAnimationStart(pathKey))
  const prevPathKeyRef = useRef(pathKey)

  useEffect(() => {
    if (prevPathKeyRef.current === pathKey) return
    clearRouteMapTrajectoryAnimationStart(prevPathKeyRef.current)
    prevPathKeyRef.current = pathKey
    resetRouteMapTrajectoryAnimationStart(pathKey)
    animationStartAtRef.current = readRouteMapTrajectoryAnimationStart(pathKey)
  }, [pathKey])

  useEffect(() => {
    animationStartAtRef.current = readRouteMapTrajectoryAnimationStart(pathKey)
  }, [pathKey])

  useEffect(() => {
    if (path.length < 2 || imageWidth <= 0 || imageHeight <= 0 || pathTotalLength <= 0) {
      setBallPositions([])
      return
    }

    let frame = 0
    let cancelled = false

    const tick = (now: number) => {
      if (cancelled) return

      const elapsedMs = now - animationStartAtRef.current
      const ballArcs = resolveRouteMapTrajectoryBallArcLengths(elapsedMs, pathTotalLength)
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
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [imageHeight, imageWidth, pathKey, pathTotalLength])

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

export const RouteMapTrajectoryBall = memo(RouteMapTrajectoryBallInner)
