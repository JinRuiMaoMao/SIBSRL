import type { WorldMapVirtualNode, WorldMapVirtualNodeKind } from '../types/worldMapDraw'
import { isBridgeTunnelVirtualKind } from '../utils/mapSurfaceKind'

export function virtualNodeKindSymbol(kind: WorldMapVirtualNodeKind): string {
  if (kind === 'straight') return '↑'
  if (kind === 'left') return '←'
  if (kind === 'right') return '→'
  if (kind === 'on-bridge') return '上桥'
  if (kind === 'off-bridge') return '下桥'
  if (kind === 'enter-tunnel') return '进隧'
  return '出隧'
}

export function virtualNodeKindLabel(kind: WorldMapVirtualNodeKind, locale: string): string {
  if (locale.startsWith('zh')) {
    if (kind === 'straight') return '直行（北）'
    if (kind === 'left') return '左转'
    if (kind === 'right') return '右转'
    if (kind === 'on-bridge') return '上桥'
    if (kind === 'off-bridge') return '下桥'
    if (kind === 'enter-tunnel') return '进隧道'
    return '出隧道'
  }
  if (kind === 'straight') return 'Straight (N)'
  if (kind === 'left') return 'Left'
  if (kind === 'right') return 'Right'
  if (kind === 'on-bridge') return 'On bridge'
  if (kind === 'off-bridge') return 'Off bridge'
  if (kind === 'enter-tunnel') return 'Enter tunnel'
  return 'Exit tunnel'
}

export const DIRECTION_VIRTUAL_NODE_KINDS: WorldMapVirtualNodeKind[] = ['straight', 'left', 'right']
export const SURFACE_VIRTUAL_NODE_KINDS: WorldMapVirtualNodeKind[] = [
  'on-bridge',
  'off-bridge',
  'enter-tunnel',
  'exit-tunnel',
]

interface IslandMapVirtualNodeOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  nodes: readonly WorldMapVirtualNode[]
  pendingNode?: { x: number; y: number; kind: WorldMapVirtualNodeKind } | null
}

export function IslandMapVirtualNodeOverlayLayer({
  imageWidth,
  imageHeight,
  nodes,
  pendingNode = null,
}: IslandMapVirtualNodeOverlayLayerProps) {
  const markerSize = Math.max(10, imageWidth * 0.005)
  const fontSize = Math.max(11, imageWidth * 0.003)
  const labelSize = Math.max(10, imageWidth * 0.0028)

  return (
    <svg
      className="island-map-virtual-node-overlay"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {nodes.map((node) => {
        const x = node.point[0] * imageWidth
        const y = node.point[1] * imageHeight
        const surface = isBridgeTunnelVirtualKind(node.kind)
        return (
          <g
            key={node.id}
            className={`island-map-virtual-node-overlay-item island-map-virtual-node-overlay-item--${node.kind}`}
          >
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
