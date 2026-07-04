import type {
  RouteEditorConfig,
  RouteEditorLineStyle,
  RouteEditorNode,
  RouteEditorSegment,
} from '../routeEditor/types'
import {
  mapDrawNodeScaleFactor,
  mapDrawPointIconRadius,
  mapDrawStopIconRadius,
} from '../utils/mapDrawNodeScale'
import { formatRouteEditorStopLabel, routeEditorStopLabelShowsSeq } from '../utils/routeEditorStopLabel'

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
  onNodeDoubleClick?: (nodeId: number) => void
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
  onNodeDoubleClick,
  onSegmentDoubleClick,
}: ReferenceRouteEditorOverlayProps) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const stops = nodes.filter((node) => node.type === 'stop')
  const dash = strokeDashArray(lineStyle.style)
  const nodeScale = mapDrawNodeScaleFactor(imageWidth, imageHeight)
  const stopRadius = mapDrawStopIconRadius(config.stopIconSize, nodeScale)
  const pointRadius = mapDrawPointIconRadius(config.pointIconSize, nodeScale)
  const segmentHitWidth = 16 * nodeScale

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

        return (
          <g key={segment.id} className="reference-route-editor-segment">
            <line
              className="reference-route-editor-segment-hit"
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="transparent"
              strokeWidth={segmentHitWidth}
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
        const radius = node.type === 'stop' ? stopRadius : pointRadius
        const labelOffsetY = (node.labelOffsetY - 18) * nodeScale
        const stopLabel = node.type === 'stop' ? formatRouteEditorStopLabel(node) : ''
        const stopLabelHasSeq = node.type === 'stop' && routeEditorStopLabelShowsSeq(node)
        const labelBoxWidth =
          Math.max(56, node.labelWidth === 'resize' ? 80 : Number(node.labelWidth) || 80) *
          nodeScale *
          (stopLabelHasSeq ? 1 : 0.82)
        const labelBoxHeight = 28 * nodeScale
        const labelPadding = 4 * nodeScale

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
            onDoubleClick={
              onNodeDoubleClick
                ? (event) => {
                    event.stopPropagation()
                    event.preventDefault()
                    onNodeDoubleClick(node.id)
                  }
                : undefined
            }
          >
            <circle cx={node.x} cy={node.y} r={radius} className="reference-route-editor-node-dot" />
            {node.type === 'stop' && config.showLabelsAlways && stopLabel ? (
              <g
                className={`reference-route-editor-label reference-route-editor-label--${node.labelPosition}`}
                transform={`translate(${node.x + node.labelOffsetX * nodeScale}, ${node.y + labelOffsetY})`}
                pointerEvents="none"
              >
                <rect
                  x={-labelPadding}
                  y={-labelBoxHeight + labelPadding}
                  width={labelBoxWidth}
                  height={labelBoxHeight}
                  rx={4 * nodeScale}
                  className="reference-route-editor-label-bg"
                />
                <text
                  className="reference-route-editor-label-name"
                  x={2 * nodeScale}
                  y={-labelBoxHeight / 2 + labelPadding / 2}
                  fontSize={config.labelFontSize}
                  dominantBaseline="middle"
                >
                  {stopLabel}
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
          r={previewNode.type === 'stop' ? stopRadius : pointRadius}
          className={`reference-route-editor-preview reference-route-editor-preview--${previewNode.type}`}
        />
      ) : null}
    </svg>
  )
}
