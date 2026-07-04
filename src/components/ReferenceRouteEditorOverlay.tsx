import type { RouteEditorConfig, RouteEditorLineStyle, RouteEditorNode } from '../routeEditor/types'
import { buildRouteEditorPathD } from '../routeEditor/routeEditorPath'

interface ReferenceRouteEditorOverlayProps {
  imageWidth: number
  imageHeight: number
  nodes: readonly RouteEditorNode[]
  lineStyle: RouteEditorLineStyle
  config: RouteEditorConfig
  selectedNodeId: number | null
  previewNode?: { type: 'stop' | 'point'; x: number; y: number } | null
  onNodePointerDown?: (nodeId: number, event: React.PointerEvent<SVGGElement>) => void
}

function strokeDashArray(style: RouteEditorLineStyle['style']): string {
  if (style === 'dashed') return '10,5'
  if (style === 'dotted') return '2,2'
  return ''
}

export function ReferenceRouteEditorOverlay({
  imageWidth,
  imageHeight,
  nodes,
  lineStyle,
  config,
  selectedNodeId,
  previewNode = null,
  onNodePointerDown,
}: ReferenceRouteEditorOverlayProps) {
  const pathD = buildRouteEditorPathD(nodes, config.showPointLines)
  const stops = nodes.filter((node) => node.type === 'stop')

  return (
    <svg
      className="reference-route-editor-overlay"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {pathD ? (
        <path
          className="reference-route-editor-path"
          d={pathD}
          fill="none"
          stroke={lineStyle.color}
          strokeWidth={lineStyle.width}
          strokeLinecap="round"
          strokeDasharray={strokeDashArray(lineStyle.style)}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {nodes.map((node) => {
        if (node.type === 'stop' && !config.showStopIcons) return null
        if (node.type === 'point' && !config.showPointIcons) return null

        const stopIndex = stops.findIndex((stop) => stop.id === node.id)
        const isFirstStop = node.type === 'stop' && stopIndex === 0
        const isLastStop = node.type === 'stop' && stopIndex === stops.length - 1 && stops.length > 1
        const selected = selectedNodeId === node.id
        const radius =
          node.type === 'stop'
            ? Math.max(6, config.stopIconSize / 2)
            : Math.max(5, config.pointIconSize / 2)

        return (
          <g
            key={node.id}
            className={`reference-route-editor-node reference-route-editor-node--${node.type}${selected ? ' reference-route-editor-node--selected' : ''}${isFirstStop ? ' reference-route-editor-node--first' : ''}${isLastStop ? ' reference-route-editor-node--last' : ''}`.trim()}
            onPointerDown={
              onNodePointerDown
                ? (event) => {
                    event.stopPropagation()
                    onNodePointerDown(node.id, event)
                  }
                : undefined
            }
          >
            <circle cx={node.x} cy={node.y} r={radius} className="reference-route-editor-node-dot" />
            {node.type === 'stop' && config.showLabelsAlways && (node.chi_name || node.eng_name) ? (
              <g
                className={`reference-route-editor-label reference-route-editor-label--${node.labelPosition}`}
                transform={`translate(${node.x + node.labelOffsetX}, ${node.y + node.labelOffsetY - 18})`}
              >
                <rect
                  x={-4}
                  y={-14}
                  width={Math.max(56, node.labelWidth === 'resize' ? 80 : Number(node.labelWidth) || 80)}
                  height={28}
                  rx={4}
                  className="reference-route-editor-label-bg"
                />
                <text className="reference-route-editor-label-seq" x={2} y={-1}>
                  {stopIndex + 1}
                </text>
                <text className="reference-route-editor-label-name" x={16} y={-1}>
                  {node.chi_name || node.eng_name}
                </text>
              </g>
            ) : null}
          </g>
        )
      })}

      {previewNode ? (
        <circle
          cx={previewNode.x}
          cy={previewNode.y}
          r={previewNode.type === 'stop' ? 8 : 6}
          className={`reference-route-editor-preview reference-route-editor-preview--${previewNode.type}`}
        />
      ) : null}
    </svg>
  )
}
