import { useEffect, useState } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import { interpolateRouteMapTrajectoryPoint } from '../utils/routeMapTrajectory'

interface RouteMapTrajectoryBallProps {
  imageWidth: number
  imageHeight: number
  path: readonly WorldMapPoint[]
}

const LOOP_DURATION_MS = 24_000

export function RouteMapTrajectoryBall({ imageWidth, imageHeight, path }: RouteMapTrajectoryBallProps) {
  const [position, setPosition] = useState<[number, number]>(() => {
    if (path.length === 0 || imageWidth <= 0 || imageHeight <= 0) return [0, 0]
    return interpolateRouteMapTrajectoryPoint(path, 0, imageWidth, imageHeight)
  })

  useEffect(() => {
    if (path.length < 2 || imageWidth <= 0 || imageHeight <= 0) return

    let frame = 0
    const startAt = performance.now()

    const tick = (now: number) => {
      const elapsed = (now - startAt) % LOOP_DURATION_MS
      const progress = elapsed / LOOP_DURATION_MS
      setPosition(interpolateRouteMapTrajectoryPoint(path, progress, imageWidth, imageHeight))
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [imageHeight, imageWidth, path])

  if (path.length < 2) return null

  const radius = Math.max(6, imageWidth * 0.0045)

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
        r={radius * 1.8}
      />
      <circle className="route-map-trajectory-ball" cx={position[0]} cy={position[1]} r={radius} />
    </svg>
  )
}
