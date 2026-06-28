import type { WorldMapDrawStop } from '../types/worldMapDraw'

interface IslandMapStopOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  stops: readonly WorldMapDrawStop[]
  pendingStop?: { x: number; y: number } | null
}

export function IslandMapStopOverlayLayer({
  imageWidth,
  imageHeight,
  stops,
  pendingStop = null,
}: IslandMapStopOverlayLayerProps) {
  const markerSize = Math.max(8, imageWidth * 0.0045)
  const fontSize = Math.max(11, imageWidth * 0.0032)

  return (
    <svg
      className="island-map-stop-overlay"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {stops.map((stop) => {
        const x = stop.point[0] * imageWidth
        const y = stop.point[1] * imageHeight
        return (
          <g key={stop.id} className="island-map-stop-overlay-item">
            <rect
              className="island-map-stop-overlay-marker"
              x={x - markerSize / 2}
              y={y - markerSize / 2}
              width={markerSize}
              height={markerSize}
              rx={markerSize * 0.22}
            />
            <text className="island-map-stop-overlay-label" x={x + markerSize * 0.7} y={y + fontSize * 0.35} style={{ fontSize }}>
              {stop.name.zh || stop.name.en}
            </text>
          </g>
        )
      })}
      {pendingStop ? (
        <circle
          className="island-map-stop-overlay-pending"
          cx={pendingStop.x}
          cy={pendingStop.y}
          r={markerSize * 0.55}
        />
      ) : null}
    </svg>
  )
}
