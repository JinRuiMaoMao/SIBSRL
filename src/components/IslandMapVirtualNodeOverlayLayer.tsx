import type { PointerEvent } from 'react'
import type { WorldMapVirtualNode, WorldMapVirtualNodeKind } from '../types/worldMapDraw'
import {
  COMPASS_ROSE_LAYOUT,
  isBridgeTunnelVirtualKind,
  RELATIVE_DIRECTION_KINDS,
} from '../utils/mapSurfaceKind'

export function virtualNodeKindSymbol(kind: WorldMapVirtualNodeKind): string {
  switch (kind) {
    case 'north':
      return '↑'
    case 'south':
      return '↓'
    case 'west':
      return '←'
    case 'east':
      return '→'
    case 'northwest':
      return '↖'
    case 'northeast':
      return '↗'
    case 'southwest':
      return '↙'
    case 'southeast':
      return '↘'
    case 'turn-left':
      return '↺'
    case 'turn-right':
      return '↻'
    case 'u-turn':
      return '↩'
    case 'on-bridge':
      return '上桥'
    case 'off-bridge':
      return '下桥'
    case 'enter-tunnel':
      return '进隧'
    default:
      return '出隧'
  }
}

export function virtualNodeKindLabel(kind: WorldMapVirtualNodeKind, locale: string): string {
  if (locale.startsWith('zh')) {
    switch (kind) {
      case 'north':
        return '北'
      case 'south':
        return '南'
      case 'west':
        return '西'
      case 'east':
        return '东'
      case 'northwest':
        return '左上'
      case 'northeast':
        return '右上'
      case 'southwest':
        return '左下'
      case 'southeast':
        return '右下'
      case 'turn-left':
        return '左转'
      case 'turn-right':
        return '右转'
      case 'u-turn':
        return '掉头'
      case 'on-bridge':
        return '上桥'
      case 'off-bridge':
        return '下桥'
      case 'enter-tunnel':
        return '进隧道'
      default:
        return '出隧道'
    }
  }
  switch (kind) {
    case 'north':
      return 'North'
    case 'south':
      return 'South'
    case 'west':
      return 'West'
    case 'east':
      return 'East'
    case 'northwest':
      return 'NW'
    case 'northeast':
      return 'NE'
    case 'southwest':
      return 'SW'
    case 'southeast':
      return 'SE'
    case 'turn-left':
      return 'Turn left'
    case 'turn-right':
      return 'Turn right'
    case 'u-turn':
      return 'U-turn'
    case 'on-bridge':
      return 'On bridge'
    case 'off-bridge':
      return 'Off bridge'
    case 'enter-tunnel':
      return 'Enter tunnel'
    default:
      return 'Exit tunnel'
  }
}

export { COMPASS_ROSE_LAYOUT, RELATIVE_DIRECTION_KINDS }
export { SURFACE_VIRTUAL_NODE_KINDS } from '../utils/mapSurfaceKind'

interface IslandMapVirtualNodeOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  nodes: readonly WorldMapVirtualNode[]
  pendingNode?: { x: number; y: number; kind: WorldMapVirtualNodeKind } | null
  traceable?: boolean
  traceSelectedNodeId?: string | null
  onNodePointerDown?: (nodeId: string, event: PointerEvent<SVGGElement>) => void
}

export function IslandMapVirtualNodeOverlayLayer({
  imageWidth,
  imageHeight,
  nodes,
  pendingNode = null,
  traceable = false,
  traceSelectedNodeId = null,
  onNodePointerDown,
}: IslandMapVirtualNodeOverlayLayerProps) {
  const markerSize = Math.max(10, imageWidth * 0.005)
  const fontSize = Math.max(12, imageWidth * 0.003)
  const labelSize = Math.max(10, imageWidth * 0.0028)
  const hitSize = Math.max(markerSize * 2.4, 20)

  return (
    <svg
      className={`island-map-virtual-node-overlay${traceable ? ' island-map-virtual-node-overlay--traceable' : ''}`.trim()}
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {nodes.map((node) => {
        const x = node.point[0] * imageWidth
        const y = node.point[1] * imageHeight
        const surface = isBridgeTunnelVirtualKind(node.kind)
        const isTraceSelected = traceSelectedNodeId === node.id
        return (
          <g
            key={node.id}
            className={`island-map-virtual-node-overlay-item island-map-virtual-node-overlay-item--${node.kind}${isTraceSelected ? ' island-map-virtual-node-overlay-item--trace-selected' : ''}`.trim()}
            onPointerDown={
              traceable && onNodePointerDown
                ? (event) => {
                    event.stopPropagation()
                    onNodePointerDown(node.id, event)
                  }
                : undefined
            }
          >
            {traceable ? (
              <circle
                className="island-map-virtual-node-overlay-hit"
                cx={x}
                cy={y}
                r={hitSize / 2}
              />
            ) : null}
            <circle
              className="island-map-virtual-node-overlay-marker"
              cx={x}
              cy={y}
              r={markerSize * (surface ? 0.62 : 0.55)}
            />
            <text
              className={`island-map-virtual-node-overlay-symbol${surface ? ' island-map-virtual-node-overlay-symbol--surface' : ''}`.trim()}
              x={x}
              y={y + fontSize * 0.35}
              textAnchor="middle"
              style={{ fontSize: surface ? fontSize * 0.82 : fontSize }}
            >
              {virtualNodeKindSymbol(node.kind)}
            </text>
            <text
              className="island-map-virtual-node-overlay-label"
              x={x}
              y={y - markerSize * 0.95}
              textAnchor="middle"
              style={{ fontSize: labelSize }}
            >
              {node.routeId}
            </text>
          </g>
        )
      })}
      {pendingNode ? (
        <g className="island-map-virtual-node-overlay-pending">
          <circle cx={pendingNode.x} cy={pendingNode.y} r={markerSize * 0.45} />
          <text
            className="island-map-virtual-node-overlay-symbol"
            x={pendingNode.x}
            y={pendingNode.y + fontSize * 0.35}
            textAnchor="middle"
            style={{ fontSize }}
          >
            {virtualNodeKindSymbol(pendingNode.kind)}
          </text>
        </g>
      ) : null}
    </svg>
  )
}
