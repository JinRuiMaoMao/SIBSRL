import type { WorldMapVirtualNode, WorldMapVirtualNodeKind } from '../types/worldMapDraw'

export function virtualNodeKindSymbol(kind: WorldMapVirtualNodeKind): string {
  if (kind === 'straight') return '↑'
  if (kind === 'left') return '←'
  return '→'
}

export function virtualNodeKindLabel(kind: WorldMapVirtualNodeKind, locale: string): string {
  if (locale.startsWith('zh')) {
    if (kind === 'straight') return '直行'
    if (kind === 'left') return '左转'
    return '右转'
  }
  if (kind === 'straight') return 'Straight'
  if (kind === 'left') return 'Left'
  return 'Right'
}

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
  const fontSize = Math.max(12, imageWidth * 0.0034)
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
        return (
          <g
            key={node.id}
            className={`island-map-virtual-node-overlay-item island-map-virtual-node-overlay-item--${node.kind}`}
          >
            <circle
              className="island-map-virtual-node-overlay-marker"
              cx={x}
              cy={y}
              r={markerSize * 0.55}
            />
            <text
              className="island-map-virtual-node-overlay-symbol"
              x={x}
              y={y + fontSize * 0.35}
              textAnchor="middle"
              style={{ fontSize }}
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
