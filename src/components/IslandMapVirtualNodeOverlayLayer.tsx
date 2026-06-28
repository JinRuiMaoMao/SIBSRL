import type { WorldMapVirtualNode, WorldMapVirtualNodeKind } from '../types/worldMapDraw'

const DIR_LABELS = ['→', '←', '↓', '↑', '↘', '↗', '↙', '↖'] as const

function outDirDegrees(outDir: number): number {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const
  const [dx, dy] = dirs[outDir] ?? [1, 0]
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

export function virtualNodeKindLabel(kind: WorldMapVirtualNodeKind, locale: string): string {
  if (locale.startsWith('zh')) {
    if (kind === 'straight') return '直行'
    if (kind === 'turn') return '转向'
    return '掉头'
  }
  if (kind === 'straight') return 'Straight'
  if (kind === 'turn') return 'Turn'
  return 'U-turn'
}

export function virtualNodeOutDirLabel(outDir: number): string {
  return DIR_LABELS[outDir] ?? '?'
}

interface IslandMapVirtualNodeOverlayLayerProps {
  imageWidth: number
  imageHeight: number
  nodes: readonly WorldMapVirtualNode[]
  pendingNode?: { x: number; y: number; outDir: number } | null
}

export function IslandMapVirtualNodeOverlayLayer({
  imageWidth,
  imageHeight,
  nodes,
  pendingNode = null,
}: IslandMapVirtualNodeOverlayLayerProps) {
  const markerSize = Math.max(10, imageWidth * 0.005)
  const fontSize = Math.max(10, imageWidth * 0.0028)

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
        const angle = outDirDegrees(node.outDir)
        return (
          <g
            key={node.id}
            className={`island-map-virtual-node-overlay-item island-map-virtual-node-overlay-item--${node.kind}`}
          >
            <polygon
              className="island-map-virtual-node-overlay-marker"
              points={`${x},${y - markerSize * 0.65} ${x + markerSize * 0.55},${y + markerSize * 0.45} ${x - markerSize * 0.55},${y + markerSize * 0.45}`}
              transform={`rotate(${angle} ${x} ${y})`}
            />
            <text
              className="island-map-virtual-node-overlay-label"
              x={x}
              y={y - markerSize * 0.85}
              textAnchor="middle"
              style={{ fontSize }}
            >
              {node.routeId}
            </text>
          </g>
        )
      })}
      {pendingNode ? (
        <g className="island-map-virtual-node-overlay-pending">
          <circle cx={pendingNode.x} cy={pendingNode.y} r={markerSize * 0.45} />
          <line
            x1={pendingNode.x}
            y1={pendingNode.y}
            x2={
              pendingNode.x +
              Math.cos((outDirDegrees(pendingNode.outDir) * Math.PI) / 180) * markerSize
            }
            y2={
              pendingNode.y +
              Math.sin((outDirDegrees(pendingNode.outDir) * Math.PI) / 180) * markerSize
            }
          />
        </g>
      ) : null}
    </svg>
  )
}

export { DIR_LABELS }
