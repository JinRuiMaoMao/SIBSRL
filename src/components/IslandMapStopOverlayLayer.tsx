import type { PointerEvent } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import { normalizeStopLabelScale } from '../utils/mapDrawStopLabel'
import { formatDrawStopLabel } from '../utils/worldMapDrawStopDisplay'

interface IslandMapStopOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  stops: readonly WorldMapDrawStop[]
  pendingStop?: { x: number; y: number } | null
  editable?: boolean
  selectedStopId?: string | null
  traceSelectedStopId?: string | null
  draggingStopId?: string | null
  showStopLabels?: boolean
  stopLabelScale?: number
  onStopPointerDown?: (stopId: string, event: PointerEvent<SVGGElement>) => void
}

export function IslandMapStopOverlayLayer({
  imageWidth,
  imageHeight,
  stops,
  pendingStop = null,
  editable = false,
  selectedStopId = null,
  traceSelectedStopId = null,
  draggingStopId = null,
  showStopLabels = true,
  stopLabelScale = 1,
  onStopPointerDown,
}: IslandMapStopOverlayLayerProps) {
  const { locale } = useLocale()
  const scale = normalizeStopLabelScale(stopLabelScale)
  const markerSize = Math.max(8, imageWidth * 0.0045 * scale)
  const fontSize = Math.max(11, imageWidth * 0.0032 * scale)
  const hitSize = Math.max(markerSize * 2.2, 18)

  return (
    <svg
      className={`island-map-stop-overlay${editable ? ' island-map-stop-overlay--editable' : ''}`.trim()}
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden={!editable}
    >
      {stops.map((stop, index) => {
        const x = stop.point[0] * imageWidth
        const y = stop.point[1] * imageHeight
        const isSelected = selectedStopId === stop.id
        const isTraceSelected = traceSelectedStopId === stop.id
        const isDragging = draggingStopId === stop.id
        return (
          <g
            key={stop.id}
            className={`island-map-stop-overlay-item${isSelected ? ' island-map-stop-overlay-item--selected' : ''}${isTraceSelected ? ' island-map-stop-overlay-item--trace-selected' : ''}${isDragging ? ' island-map-stop-overlay-item--dragging' : ''}`.trim()}
            onPointerDown={
              editable && onStopPointerDown
                ? (event) => {
                    event.stopPropagation()
                    onStopPointerDown(stop.id, event)
                  }
                : undefined
            }
          >
            {editable ? (
              <rect
                className="island-map-stop-overlay-hit"
                x={x - hitSize / 2}
                y={y - hitSize / 2}
                width={hitSize}
                height={hitSize}
                rx={hitSize * 0.2}
              />
            ) : null}
            <rect
              className="island-map-stop-overlay-marker"
              x={x - markerSize / 2}
              y={y - markerSize / 2}
              width={markerSize}
              height={markerSize}
              rx={markerSize * 0.22}
            />
            {showStopLabels ? (
              <text
                className="island-map-stop-overlay-label"
                x={x + markerSize * 0.7}
                y={y + fontSize * 0.35}
                style={{ fontSize }}
              >
                {formatDrawStopLabel(stop, index, locale)}
              </text>
            ) : null}
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
