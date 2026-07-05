import { useEffect, useMemo, useRef, useState } from 'react'
import type { RouteEditorNode } from '../routeEditor/types'
import { ROUTE_MAP_VIEWER_EDITOR_CONFIG } from '../routeEditor/types'
import { mapDrawNodeScaleFactor, mapDrawStopIconRadius } from '../utils/mapDrawNodeScale'
import {
  interpolateRouteMapTrajectoryPoint,
  resolveRouteMapTrajectoryConsumedSegmentIds,
  resolveRouteMapTrajectoryNextStopNodeId,
  type RouteMapTrajectory,
} from '../utils/routeMapTrajectory'

interface RouteMapTrajectoryBallProps {
  imageWidth: number
  imageHeight: number
  trajectory: RouteMapTrajectory
  stopNodes?: readonly RouteEditorNode[]
  onNextStopNodeIdChange?: (nodeId: number | null) => void
  onConsumedSegmentIdsChange?: (segmentIds: readonly number[]) => void
}

const LOOP_DURATION_MS = 24_000

export function RouteMapTrajectoryBall({
  imageWidth,
  imageHeight,
  trajectory,
  stopNodes = [],
  onNextStopNodeIdChange,
  onConsumedSegmentIdsChange,
}: RouteMapTrajectoryBallProps) {
  const path = trajectory.path
  const radius = useMemo(() => {
    const nodeScale = mapDrawNodeScaleFactor(imageWidth, imageHeight)
    return mapDrawStopIconRadius(ROUTE_MAP_VIEWER_EDITOR_CONFIG.stopIconSize, nodeScale)
  }, [imageHeight, imageWidth])

  const [position, setPosition] = useState<[number, number]>(() => {
    if (path.length === 0 || imageWidth <= 0 || imageHeight <= 0) return [0, 0]
    return interpolateRouteMapTrajectoryPoint(path, 0, imageWidth, imageHeight)
  })

  const prevNextStopNodeIdRef = useRef<number | null | undefined>(undefined)
  const prevConsumedSegmentIdsRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    prevNextStopNodeIdRef.current = undefined
    prevConsumedSegmentIdsRef.current = undefined
    onNextStopNodeIdChange?.(null)
    onConsumedSegmentIdsChange?.([])
  }, [onConsumedSegmentIdsChange, onNextStopNodeIdChange, path, stopNodes, trajectory.segmentEndArcLengths, trajectory.segmentIds])

  useEffect(() => {
    if (path.length < 2 || imageWidth <= 0 || imageHeight <= 0) return

    let frame = 0
    const startAt = performance.now()

    const tick = (now: number) => {
      const elapsed = (now - startAt) % LOOP_DURATION_MS
      const progress = elapsed / LOOP_DURATION_MS
      setPosition(interpolateRouteMapTrajectoryPoint(path, progress, imageWidth, imageHeight))
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
      if (onConsumedSegmentIdsChange && trajectory.segmentIds.length > 0) {
        const consumedSegmentIds = resolveRouteMapTrajectoryConsumedSegmentIds(
          trajectory,
          progress,
          imageWidth,
          imageHeight,
        )
        const consumedKey = consumedSegmentIds.join(',')
        if (consumedKey !== prevConsumedSegmentIdsRef.current) {
          prevConsumedSegmentIdsRef.current = consumedKey
          onConsumedSegmentIdsChange(consumedSegmentIds)
        }
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [
    imageHeight,
    imageWidth,
    onConsumedSegmentIdsChange,
    onNextStopNodeIdChange,
    path,
    stopNodes,
    trajectory,
  ])

  if (path.length < 2) return null

  return (
    <svg
      className="route-map-trajectory-ball-layer"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      <circle
        className="route-map-trajectory-ball-glow"
        cx={position[0]}
        cy={position[1]}
        r={radius * 1.45}
      />
      <circle className="route-map-trajectory-ball" cx={position[0]} cy={position[1]} r={radius} />
    </svg>
  )
}
