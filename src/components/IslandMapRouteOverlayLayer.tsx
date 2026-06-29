import type { WorldMapPoint } from '../data/worldMapRoutes'
import { buildLegPathD } from '../utils/worldMapDrawPathCurve'
import { getPathLegRanges } from '../utils/worldMapDrawPathEdit'

interface IslandMapRouteOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  routeNumber: string
  points: readonly WorldMapPoint[]
  vertexPoints?: readonly WorldMapPoint[]
  legStarts?: readonly number[]
  legControls?: readonly (WorldMapPoint | null)[]
  legHidden?: readonly boolean[]
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
  legControls,
  legHidden = [],
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
  const useCurvedLegs = legRanges.length > 0 && legControls

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
      {useCurvedLegs
        ? legRanges.map((leg, legIndex) => {
            if (legHidden[legIndex]) return null
            const legStart = points[leg.start]
            const legEnd = points[leg.end]
            if (!legStart || !legEnd) return null
            return (
              <path
                key={`leg-line-${legIndex}-${leg.start}-${leg.end}`}
                className="island-map-route-overlay-line"
                d={buildLegPathD(
                  legStart,
                  legEnd,
                  legControls[legIndex],
                  imageWidth,
                  imageHeight,
                )}
                style={draftStyle}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
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
