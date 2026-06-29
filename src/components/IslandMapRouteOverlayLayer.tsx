import type { WorldMapPoint } from '../data/worldMapRoutes'
import { getPathLegRanges } from '../utils/worldMapDrawPathEdit'
import { buildSmoothPolylinePathD } from '../utils/worldMapDrawPathCurve'

interface IslandMapRouteOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  routeNumber: string
  points: readonly WorldMapPoint[]
  vertexPoints?: readonly WorldMapPoint[]
  legStarts?: readonly number[]
  legHidden?: readonly boolean[]
  userBendIndices?: ReadonlySet<number>
  smoothRoadCorners?: boolean
  variant?: 'route' | 'draft'
  strokeColor?: string
}

function markerRadius(imageWidth: number, ratio: number, min = 3): number {
  return Math.max(min, imageWidth * ratio)
}

export function IslandMapRouteOverlayLayer({
  imageWidth,
  imageHeight,
  routeNumber,
  points,
  vertexPoints,
  legStarts,
  legHidden = [],
  userBendIndices = new Set<number>(),
  smoothRoadCorners = false,
  variant = 'route',
  strokeColor,
}: IslandMapRouteOverlayLayerProps) {
  const start = points[0]
  const end = points[points.length - 1]
  const strokeWidth = variant === 'draft' ? 1.25 : 1.75
  const draftStyle =
    strokeColor && variant === 'draft'
      ? { stroke: strokeColor, strokeWidth, vectorEffect: 'non-scaling-stroke' as const }
      : { strokeWidth, vectorEffect: 'non-scaling-stroke' as const }
  const markers = vertexPoints ?? (variant === 'route' ? points : [])

  const legRanges =
    variant === 'draft' && legStarts && points.length >= 2
      ? getPathLegRanges(legStarts, points.length)
      : []
  const useDraftLegPolylines = legRanges.length > 0

  const renderLegPath = (
    legPoints: readonly WorldMapPoint[],
    legIndex: number,
    legStart: number,
    legEnd: number,
  ) => {
    if (legPoints.length < 2) return null
    const legUserBends = new Set<number>()
    userBendIndices.forEach((index) => {
      if (index > legStart && index < legEnd) legUserBends.add(index - legStart)
    })
    if (smoothRoadCorners && variant === 'draft') {
      const pathD = buildSmoothPolylinePathD(legPoints, imageWidth, imageHeight, legUserBends)
      return (
        <path
          key={`leg-line-${legIndex}-${legStart}-${legEnd}`}
          className="island-map-route-overlay-line"
          d={pathD}
          style={draftStyle}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }
    const segmentCoords = legPoints
      .map((point) => `${point[0] * imageWidth},${point[1] * imageHeight}`)
      .join(' ')
    return (
      <polyline
        key={`leg-line-${legIndex}-${legStart}-${legEnd}`}
        className="island-map-route-overlay-line"
        points={segmentCoords}
        style={draftStyle}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }

  const polyline = points
    .map(([x, y]) => `${x * imageWidth},${y * imageHeight}`)
    .join(' ')

  return (
    <svg
      className={`island-map-route-overlay island-map-route-overlay--${variant}`.trim()}
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {useDraftLegPolylines
        ? legRanges.map((leg, legIndex) => {
            if (legHidden[legIndex]) return null
            const legPoints: WorldMapPoint[] = []
            for (let index = leg.start; index <= leg.end; index += 1) {
              const point = points[index]
              if (!point) continue
              legPoints.push(point)
            }
            return renderLegPath(legPoints, legIndex, leg.start, leg.end)
          })
        : (
          <polyline
            className="island-map-route-overlay-line"
            points={polyline}
            style={draftStyle}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      {markers.map(([x, y], index) => (
        <circle
          key={`${index}-${x}-${y}`}
          className="island-map-route-overlay-vertex"
          cx={x * imageWidth}
          cy={y * imageHeight}
          r={markerRadius(imageWidth, variant === 'draft' ? 0.0012 : 0.0018, variant === 'draft' ? 2 : 2.5)}
          style={strokeColor && variant === 'draft' ? { fill: strokeColor, stroke: 'none' } : undefined}
        />
      ))}
      {start && variant === 'route' ? (
        <circle
          className="island-map-route-overlay-marker island-map-route-overlay-marker--start"
          cx={start[0] * imageWidth}
          cy={start[1] * imageHeight}
          r={markerRadius(imageWidth, 0.004)}
        />
      ) : null}
      {end && end !== start && variant === 'route' ? (
        <circle
          className="island-map-route-overlay-marker island-map-route-overlay-marker--end"
          cx={end[0] * imageWidth}
          cy={end[1] * imageHeight}
          r={markerRadius(imageWidth, 0.0035, 3.5)}
        />
      ) : null}
      {start && routeNumber ? (
        <text
          className="island-map-route-overlay-label"
          x={start[0] * imageWidth + Math.max(6, imageWidth * 0.008)}
          y={start[1] * imageHeight - Math.max(4, imageHeight * 0.006)}
        >
          {routeNumber}
        </text>
      ) : null}
    </svg>
  )
}
