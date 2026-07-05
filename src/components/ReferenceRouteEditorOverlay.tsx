import { useMemo } from 'react'
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
import {
  formatRouteEditorStopLabel,
  measureRouteEditorStopLabelBoxWidth,
  resolveRouteEditorStopLabelLayout,
} from '../utils/routeEditorStopLabel'
import { resolveRouteEditorStopSeqEndpoints } from '../utils/routeMapStopMatching'
import { buildRouteEditorSegmentOverlapGroups } from '../routeEditor/routeEditorSegmentOverlap'
import {
  buildRouteEditorDualCarriagewayPairs,
  buildRouteEditorDisplayPolylines,
  segmentDirectionArrowPoints,
} from '../routeEditor/routeEditorSegmentDirection'
import type { RouteEditorCarriageway } from '../routeEditor/types'

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
  /** Highlight this stop's label as the trajectory ball's next stop. */
  nextStopNodeId?: number | null
  /** Let map clicks pass through segments (placing stops/points on a line). */
  segmentPassthrough?: boolean
  /** Disable double-click segment delete while configuring placement. */
  allowSegmentDelete?: boolean
  /** Show a count badge when multiple segments stack between the same two nodes. */
  showSegmentOverlapCounts?: boolean
  /** Preview line carriageway while connecting (shows direction arrow on preview). */
  connectCarriageway?: RouteEditorCarriageway
  /** Merge shared-node segments into continuous paths (route-map viewer). */
  continuousSegmentPaths?: boolean
}

function strokeDashArray(style: RouteEditorLineStyle['style']): string {
  if (style === 'dashed') return '10,5'
  if (style === 'dotted') return '2,2'
  return ''
}

function stopSegmentPointer(event: React.PointerEvent) {
  event.stopPropagation()
}

function offsetSegmentEndpoints(
  from: RouteEditorNode,
  to: RouteEditorNode,
  offsetPx: number,
): { x1: number; y1: number; x2: number; y2: number } {
  if (offsetPx === 0) {
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
  }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const nx = (-dy / length) * offsetPx
  const ny = (dx / length) * offsetPx
  return {
    x1: from.x + nx,
    y1: from.y + ny,
    x2: to.x + nx,
    y2: to.y + ny,
  }
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
  nextStopNodeId = null,
  segmentPassthrough = false,
  allowSegmentDelete = true,
  showSegmentOverlapCounts = false,
  connectCarriageway = 'single',
  continuousSegmentPaths = false,
}: ReferenceRouteEditorOverlayProps) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const { startNodeId, endNodeId } = resolveRouteEditorStopSeqEndpoints(nodes)
  const dash = strokeDashArray(lineStyle.style)
  const nodeScale = mapDrawNodeScaleFactor(imageWidth, imageHeight)
  const stopRadius = mapDrawStopIconRadius(config.stopIconSize, nodeScale)
  const pointRadius = mapDrawPointIconRadius(config.pointIconSize, nodeScale)
  const segmentHitWidth = 16 * nodeScale
  const overlapGroups = useMemo(() => {
    if (!showSegmentOverlapCounts) return []
    const byId = new Map(nodes.map((node) => [node.id, node]))
    return buildRouteEditorSegmentOverlapGroups(segments, byId)
  }, [nodes, segments, showSegmentOverlapCounts])
  const dualCarriagewayPairs = useMemo(
    () => buildRouteEditorDualCarriagewayPairs(segments),
    [segments],
  )
  const displayPolylines = useMemo(
    () => (continuousSegmentPaths ? buildRouteEditorDisplayPolylines(segments, nodeById) : []),
    [continuousSegmentPaths, nodeById, segments],
  )
  const arrowSize = 10 * nodeScale
  const overlapBadgeRadius = 10 * nodeScale
  const overlapBadgeFontSize = Math.max(9, Math.round(11 * nodeScale))

  return (
    <svg
      className={`reference-route-editor-overlay${segmentPassthrough ? ' reference-route-editor-overlay--segment-passthrough' : ''}`.trim()}
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {continuousSegmentPaths
        ? displayPolylines.map((polyline, index) => (
            <path
              key={`polyline-${index}`}
              className="reference-route-editor-segment-path"
              d={polyline.d}
              fill="none"
              stroke={lineStyle.color}
              strokeWidth={lineStyle.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dash}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))
        : null}
      {segments.map((segment) => {
        const from = nodeById.get(segment.fromNodeId)
        const to = nodeById.get(segment.toNodeId)
        if (!from || !to) return null

        const pairKey = `${Math.min(segment.fromNodeId, segment.toNodeId)}:${Math.max(segment.fromNodeId, segment.toNodeId)}`
        const carriagewayOffset =
          dualCarriagewayPairs.has(pairKey) && segment.fromNodeId < segment.toNodeId
            ? 4 * nodeScale
            : dualCarriagewayPairs.has(pairKey)
              ? -4 * nodeScale
              : 0
        const { x1, y1, x2, y2 } = offsetSegmentEndpoints(from, to, carriagewayOffset)
        const showSegmentStroke = !continuousSegmentPaths

        return (
          <g key={segment.id} className="reference-route-editor-segment">
            {!continuousSegmentPaths ? (
              <line
                className="reference-route-editor-segment-hit"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={segmentHitWidth}
                vectorEffect="non-scaling-stroke"
                onPointerDown={segmentPassthrough ? undefined : stopSegmentPointer}
                onDoubleClick={
                  allowSegmentDelete && onSegmentDoubleClick
                    ? (event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        onSegmentDoubleClick(segment.id)
                      }
                    : undefined
                }
              />
            ) : null}
            {showSegmentStroke ? (
              <line
                className="reference-route-editor-segment-line"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={lineStyle.color}
                strokeWidth={lineStyle.width}
                strokeLinecap="round"
                strokeDasharray={dash}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ) : null}
            <polygon
              className="reference-route-editor-segment-arrow"
              points={segmentDirectionArrowPoints(x1, y1, x2, y2, arrowSize)}
              fill={lineStyle.color}
              pointerEvents="none"
            />
          </g>
        )
      })}

      {showSegmentOverlapCounts
        ? overlapGroups.map((group) => (
            <g key={group.key} className="reference-route-editor-segment-overlap">
              <circle
                cx={group.midX}
                cy={group.midY}
                r={overlapBadgeRadius}
                className="reference-route-editor-segment-overlap-bg"
              />
              <text
                x={group.midX}
                y={group.midY}
                className="reference-route-editor-segment-overlap-count"
                fontSize={overlapBadgeFontSize}
                textAnchor="middle"
                dominantBaseline="central"
                pointerEvents="none"
              >
                {group.count}
              </text>
            </g>
          ))
        : null}

      {connectPreview ? (
        <g className="reference-route-editor-connect-preview-wrap">
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
          <polygon
            className="reference-route-editor-segment-arrow reference-route-editor-connect-preview-arrow"
            points={segmentDirectionArrowPoints(
              connectPreview.fromX,
              connectPreview.fromY,
              connectPreview.toX,
              connectPreview.toY,
              arrowSize,
            )}
            fill={lineStyle.color}
            pointerEvents="none"
          />
        </g>
      ) : null}

      {nodes.map((node) => {
        if (node.type === 'stop' && !config.showStopIcons) return null
        if (node.type === 'point' && !config.showPointIcons) return null

        const isStartStop = node.type === 'stop' && startNodeId != null && node.id === startNodeId
        const isEndStop =
          node.type === 'stop' &&
          endNodeId != null &&
          node.id === endNodeId &&
          startNodeId !== endNodeId
        const isNextStop = node.type === 'stop' && nextStopNodeId != null && node.id === nextStopNodeId
        const selected = selectedNodeId === node.id
        const connectPending = connectPendingNodeId === node.id
        const radius = node.type === 'stop' ? stopRadius : pointRadius
        const stopLabel = node.type === 'stop' ? formatRouteEditorStopLabel(node) : ''
        const labelBoxHeight = 28 * nodeScale
        const labelPadding = 4 * nodeScale
        const textInsetX = 2 * nodeScale
        const labelBoxWidth =
          node.labelWidth === 'resize'
            ? measureRouteEditorStopLabelBoxWidth(stopLabel, config.labelFontSize, nodeScale, {
                minWidth: 56,
                textInsetX: 2,
                labelPadding: 4,
              })
            : Math.max(56, Number(node.labelWidth) || 80) * nodeScale
        const labelLayout =
          node.type === 'stop'
            ? resolveRouteEditorStopLabelLayout(node.labelPosition, {
                labelBoxWidth,
                labelBoxHeight,
                labelPadding,
                textInsetX,
                stopRadius,
                nodeScale,
                labelOffsetX: node.labelOffsetX,
                labelOffsetY: node.labelOffsetY,
              })
            : null

        return (
          <g
            key={node.id}
            className={`reference-route-editor-node reference-route-editor-node--${node.type}${selected ? ' reference-route-editor-node--selected' : ''}${connectPending ? ' reference-route-editor-node--connect-pending' : ''}${isStartStop ? ' reference-route-editor-node--first' : ''}${isEndStop ? ' reference-route-editor-node--last' : ''}${isNextStop ? ' reference-route-editor-node--next-stop' : ''}`.trim()}
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
            {node.type === 'stop' && config.showLabelsAlways && stopLabel && labelLayout ? (
              <g
                className={`reference-route-editor-label reference-route-editor-label--${node.labelPosition}`}
                transform={`translate(${node.x + labelLayout.translateX}, ${node.y + labelLayout.translateY})`}
              >
                <rect
                  x={labelLayout.rectX}
                  y={labelLayout.rectY}
                  width={labelBoxWidth}
                  height={labelBoxHeight}
                  rx={4 * nodeScale}
                  className={`reference-route-editor-label-bg${isNextStop ? ' reference-route-editor-label-bg--next-stop' : ''}`.trim()}
                />
                <text
                  className="reference-route-editor-label-name"
                  x={labelLayout.textX}
                  y={labelLayout.textY}
                  fontSize={config.labelFontSize}
                  textAnchor={labelLayout.textAnchor}
                  dominantBaseline="middle"
                  pointerEvents="none"
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
