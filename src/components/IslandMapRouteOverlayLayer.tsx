import type { WorldMapPoint } from '../data/worldMapRoutes'

interface IslandMapRouteOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  routeNumber: string
  points: readonly WorldMapPoint[]
}

export function IslandMapRouteOverlayLayer({
  imageWidth,
  imageHeight,
  routeNumber,
  points,
}: IslandMapRouteOverlayLayerProps) {
  const polyline = points
    .map(([x, y]) => `${x * imageWidth},${y * imageHeight}`)
    .join(' ')
  const start = points[0]
  const end = points[points.length - 1]

  return (
    <svg
      className="island-map-route-overlay"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      <polyline className="island-map-route-overlay-line" points={polyline} />
      {start ? (
        <circle
          className="island-map-route-overlay-marker island-map-route-overlay-marker--start"
          cx={start[0] * imageWidth}
          cy={start[1] * imageHeight}
          r={Math.max(4, imageWidth * 0.004)}
        />
      ) : null}
      {end && end !== start ? (
        <circle
          className="island-map-route-overlay-marker island-map-route-overlay-marker--end"
          cx={end[0] * imageWidth}
          cy={end[1] * imageHeight}
          r={Math.max(3.5, imageWidth * 0.0035)}
        />
      ) : null}
      {start ? (
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
