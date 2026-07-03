import type { PointerEvent } from 'react'
import type { WorldMapDrawPathNode } from '../types/worldMapDraw'

interface IslandMapPathNodeOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  nodes: readonly WorldMapDrawPathNode[]
  pendingNode?: { x: number; y: number } | null
  editable?: boolean
  traceSelectedNodeId?: string | null
  draggingNodeId?: string | null
  onNodePointerDown?: (nodeId: string, event: PointerEvent<SVGGElement>) => void
  /** When false, parent handles nearest-target picking (route draw mode). */
  directPick?: boolean
}

export function IslandMapPathNodeOverlayLayer({
  imageWidth,
  imageHeight,
  nodes,
  pendingNode = null,
  editable = false,
  traceSelectedNodeId = null,
  draggingNodeId = null,
  onNodePointerDown,
  directPick = true,
}: IslandMapPathNodeOverlayLayerProps) {
  const markerSize = Math.max(7, imageWidth * 0.0036)
  const fontSize = Math.max(10, imageWidth * 0.0028)
  const hitSize = markerSize * 1.6

  return (
    <svg
      className={`island-map-path-node-overlay${editable ? ' island-map-path-node-overlay--editable' : ''}`.trim()}
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden={!editable}
    >
      {nodes.map((node, index) => {
        const x = node.point[0] * imageWidth
        const y = node.point[1] * imageHeight
        const isTraceSelected = traceSelectedNodeId === node.id
        const isDragging = draggingNodeId === node.id
        const label = node.label?.trim() || `节点 ${index + 1}`
        return (
          <g
            key={node.id}
            className={`island-map-path-node-overlay-item${isTraceSelected ? ' island-map-path-node-overlay-item--trace-selected' : ''}${isDragging ? ' island-map-path-node-overlay-item--dragging' : ''}`.trim()}
            onPointerDown={
              editable && directPick && onNodePointerDown
                ? (event) => {
                    event.stopPropagation()
                    onNodePointerDown(node.id, event)
                  }
                : undefined
            }
          >
            {editable && directPick ? (
              <rect
                className="island-map-path-node-overlay-hit"
                x={x - hitSize / 2}
                y={y - hitSize / 2}
                width={hitSize}
                height={hitSize}
                rx={hitSize * 0.2}
              />
            ) : null}
            <polygon
              className="island-map-path-node-overlay-marker"
              points={`${x},${y - markerSize * 0.55} ${x + markerSize * 0.5},${y} ${x},${y + markerSize * 0.55} ${x - markerSize * 0.5},${y}`}
            />
            <text
              className="island-map-path-node-overlay-label"
              x={x + markerSize * 0.65}
              y={y + fontSize * 0.32}
              style={{ fontSize }}
            >
              {label}
            </text>
          </g>
        )
      })}
      {pendingNode ? (
        <polygon
          className="island-map-path-node-overlay-pending"
          points={`${pendingNode.x},${pendingNode.y - markerSize * 0.55} ${pendingNode.x + markerSize * 0.5},${pendingNode.y} ${pendingNode.x},${pendingNode.y + markerSize * 0.55} ${pendingNode.x - markerSize * 0.5},${pendingNode.y}`}
        />
      ) : null}
    </svg>
  )
}
