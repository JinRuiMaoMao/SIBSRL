import type {
  RouteEditorConfig,
  RouteEditorLineStyle,
  RouteEditorNode,
  RouteEditorSegment,
} from '../routeEditor/types'

interface ReferenceRouteEditorOverlayProps {
  imageWidth: number
  imageHeight: number
  nodes: readonly RouteEditorNode[]
  segments: readonly RouteEditorSegment[]
  lineStyle: RouteEditorLineStyle
  config: RouteEditorConfig
  selectedNodeId: number | null
  connectPendingNodeId?: number | null
  connectPreview?: { fromX: number; fromY: number; toX: number; toY: number } | null
  previewNode?: { type: 'stop' | 'point'; x: number; y: number } | null
  onNodePointerDown?: (nodeId: number, event: React.PointerEvent<SVGGElement>) => void
  onSegmentDoubleClick?: (segmentId: number) => void
}

function strokeDashArray(style: RouteEditorLineStyle['style']): string {
  if (style === 'dashed') return '10,5'
  if (style === 'dotted') return '2,2'
  return ''
}

function stopSegmentPointer(event: React.PointerEvent) {
  event.stopPropagation()
}

export function ReferenceRouteEditorOverlay({
  imageWidth,
  imageHeight,
  nodes,
  segments,
  lineStyle,
  config,
  selectedNodeId,
  connectPendingNodeId = null,
  connectPreview = null,
  previewNode = null,
  onNodePointerDown,
  onSegmentDoubleClick,
}: ReferenceRouteEditorOverlayProps) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const stops = nodes.filter((node) => node.type === 'stop')
  const dash = strokeDashArray(lineStyle.style)

  return (
    <svg
      className="reference-route-editor-overlay"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {segments.map((segment) => {
        const from = nodeById.get(segment.fromNodeId)
        const to = nodeById.get(segment.toNodeId)
        if (!from || !to) return null
        if (!config.showPointLines && from.type === 'point' && to.type === 'point') return null

        return (
          <g key={segment.id} className="reference-route-editor-segment">
            <line
              className="reference-route-editor-segment-hit"
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="transparent"
              strokeWidth={16}
              vectorEffect="non-scaling-stroke"
              onPointerDown={stopSegmentPointer}
              onDoubleClick={
                onSegmentDoubleClick
                  ? (event) => {
                      event.stopPropagation()
                      event.preventDefault()
                      onSegmentDoubleClick(segment.id)
                    }
                  : undefined
              }
            />
            <line
              className="reference-route-editor-segment-line"
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={lineStyle.color}
              strokeWidth={lineStyle.width}
              strokeLinecap="round"
              strokeDasharray={dash}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          </g>
        )
      })}

      {connectPreview ? (
        <line
          className="reference-route-editor-connect-preview"
          x1={connectPreview.fromX}
          y1={connectPreview.fromY}
          x2={connectPreview.toX}
          y2={connectPreview.toY}
          stroke={lineStyle.color}
          strokeWidth={lineStyle.width}
          strokeLinecap="round"
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
        const connectPending = connectPendingNodeId === node.id
        const radius =
          node.type === 'stop'
            ? Math.max(6, config.stopIconSize / 2)
            : Math.max(5, config.pointIconSize / 2)

        return (
          <g
            key={node.id}
            className={`reference-route-editor-node reference-route-editor-node--${node.type}${selected ? ' reference-route-editor-node--selected' : ''}${connectPending ? ' reference-route-editor-node--connect-pending' : ''}${isFirstStop ? ' reference-route-editor-node--first' : ''}${isLastStop ? ' reference-route-editor-node--last' : ''}`.trim()}
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
                pointerEvents="none"
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
