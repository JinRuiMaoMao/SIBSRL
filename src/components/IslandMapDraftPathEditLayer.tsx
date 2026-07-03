import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import { getPathLegRanges } from '../utils/worldMapDrawPathEdit'
import { defaultLegControl } from '../utils/worldMapDrawPathCurve'

interface IslandMapDraftPathEditLayerProps {
  imageWidth: number
  imageHeight: number
  points: readonly WorldMapPoint[]
  legStarts?: readonly number[]
  legHidden?: readonly boolean[]
  userBendIndices?: ReadonlySet<number>
  strokeColor?: string
  editable?: boolean
  snapPoint?: (point: WorldMapPoint) => WorldMapPoint
  clientToNormalized?: (clientX: number, clientY: number) => WorldMapPoint
  onBendInsert: (segmentIndex: number, point: WorldMapPoint) => void
  onBendMove: (vertexIndex: number, point: WorldMapPoint) => void
  onBendDragStart?: () => void
  onBendDragEnd?: (vertexIndex: number, point: WorldMapPoint) => void
  onBendRemove: (vertexIndex: number) => void
  onLegDelete: (legIndex: number) => void
  onInteractionActiveChange?: (active: boolean) => void
}

const DOUBLE_TAP_MS = 420
const DRAG_THRESHOLD_PX = 4

interface PathSegmentRef {
  legIndex: number
  segmentIndex: number
  start: WorldMapPoint
  end: WorldMapPoint
}

function toImageCoords(point: WorldMapPoint, imageWidth: number, imageHeight: number) {
  return { x: point[0] * imageWidth, y: point[1] * imageHeight }
}

function pointerToNormalized(
  event: PointerEvent<SVGElement> | globalThis.PointerEvent,
  svg: SVGSVGElement,
  clientToNormalized?: (clientX: number, clientY: number) => WorldMapPoint,
): WorldMapPoint {
  if (clientToNormalized) return clientToNormalized(event.clientX, event.clientY)
  const rect = svg.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return [0.5, 0.5]
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  return [x, y]
}

function hitStrokeWidth(imageWidth: number): number {
  return Math.max(20, imageWidth * 0.012)
}

function handleRadius(imageWidth: number): number {
  return Math.max(5, imageWidth * 0.0018)
}

function segmentPathD(
  start: WorldMapPoint,
  end: WorldMapPoint,
  imageWidth: number,
  imageHeight: number,
): string {
  const sx = start[0] * imageWidth
  const sy = start[1] * imageHeight
  const ex = end[0] * imageWidth
  const ey = end[1] * imageHeight
  return `M ${sx} ${sy} L ${ex} ${ey}`
}

export function IslandMapDraftPathEditLayer({
  imageWidth,
  imageHeight,
  points,
  legStarts = [0],
  legHidden = [],
  userBendIndices = new Set<number>(),
  strokeColor,
  editable = false,
  snapPoint = (point) => point,
  clientToNormalized,
  onBendInsert,
  onBendMove,
  onBendDragStart,
  onBendDragEnd,
  onBendRemove,
  onLegDelete,
  onInteractionActiveChange,
}: IslandMapDraftPathEditLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{
    kind: 'segment' | 'vertex'
    legIndex?: number
    segmentIndex: number
    vertexIndex?: number
    pointerId: number
    startClientX: number
    startClientY: number
    clickPoint: WorldMapPoint
    moved: boolean
    shiftHeldAtDown?: boolean
    captureTarget: SVGElement | null
  } | null>(null)
  const lastTapRef = useRef<{ key: string; time: number } | null>(null)
  const singleTapTimerRef = useRef<number | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [shiftHeld, setShiftHeld] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setShiftHeld(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setShiftHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const legRanges = useMemo(
    () => getPathLegRanges(legStarts, points.length),
    [legStarts, points.length],
  )

  const segments = useMemo(() => {
    const list: PathSegmentRef[] = []
    legRanges.forEach((leg, legIndex) => {
      if (legHidden[legIndex]) return
      for (let index = leg.start; index < leg.end; index += 1) {
        const start = points[index]
        const end = points[index + 1]
        if (!start || !end) continue
        list.push({ legIndex, segmentIndex: index, start, end })
      }
    })
    return list
  }, [legHidden, legRanges, points])

  const bendVertices = useMemo(() => {
    const indices: number[] = []
    userBendIndices.forEach((index) => {
      if (index > 0 && index < points.length - 1) {
        indices.push(index)
      }
    })
    return indices.sort((a, b) => a - b)
  }, [points.length, userBendIndices])

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current != null) window.clearTimeout(singleTapTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!dragging) return

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const deltaPx = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY)
      if (!drag.moved && deltaPx > DRAG_THRESHOLD_PX) {
        drag.moved = true
        if (drag.kind === 'vertex') onBendDragStart?.()
        if (singleTapTimerRef.current != null) {
          window.clearTimeout(singleTapTimerRef.current)
          singleTapTimerRef.current = null
        }
        if (drag.captureTarget && !drag.captureTarget.hasPointerCapture(event.pointerId)) {
          drag.captureTarget.setPointerCapture(event.pointerId)
        }
      }
      if (!drag.moved || drag.kind !== 'vertex' || drag.vertexIndex == null) return
      const svg = svgRef.current
      if (!svg) return
      onBendMove(drag.vertexIndex, snapPoint(pointerToNormalized(event, svg, clientToNormalized)))
    }

    const finishDrag = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      if (!drag.moved) {
        const now = Date.now()
        const tapKey =
          drag.kind === 'vertex'
            ? `v-${drag.vertexIndex}`
            : `l-${drag.legIndex ?? drag.segmentIndex}`
        const lastTap = lastTapRef.current
        if (lastTap && lastTap.key === tapKey && now - lastTap.time <= DOUBLE_TAP_MS) {
          if (singleTapTimerRef.current != null) {
            window.clearTimeout(singleTapTimerRef.current)
            singleTapTimerRef.current = null
          }
          lastTapRef.current = null
          if (drag.kind === 'vertex' && drag.vertexIndex != null) {
            onBendRemove(drag.vertexIndex)
          } else if (drag.legIndex != null) {
            onLegDelete(drag.legIndex)
          }
        } else {
          lastTapRef.current = { key: tapKey, time: now }
          if (drag.kind === 'segment') {
            const segmentIndex = drag.segmentIndex
            const clickPoint = drag.clickPoint
            if (drag.shiftHeldAtDown) {
              if (singleTapTimerRef.current != null) window.clearTimeout(singleTapTimerRef.current)
              singleTapTimerRef.current = window.setTimeout(() => {
                singleTapTimerRef.current = null
                if (lastTapRef.current?.key !== tapKey) return
                lastTapRef.current = null
                onBendInsert(segmentIndex, snapPoint(clickPoint))
              }, DOUBLE_TAP_MS)
            }
          }
        }
      } else if (drag.kind === 'vertex' && drag.vertexIndex != null) {
        const svg = svgRef.current
        if (svg) {
          onBendDragEnd?.(drag.vertexIndex, snapPoint(pointerToNormalized(event, svg, clientToNormalized)))
        }
      }

      try {
        if (drag.captureTarget?.hasPointerCapture(event.pointerId)) {
          drag.captureTarget.releasePointerCapture(event.pointerId)
        }
      } catch {
        // ignore
      }
      dragRef.current = null
      setActiveKey(null)
      setDragging(false)
      onInteractionActiveChange?.(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', finishDrag)
    }
  }, [
    dragging,
    onBendDragEnd,
    onBendDragStart,
    onBendInsert,
    onBendMove,
    onBendRemove,
    onInteractionActiveChange,
    onLegDelete,
    clientToNormalized,
    snapPoint,
  ])

  if (!editable || points.length < 2) return null

  const hitWidth = hitStrokeWidth(imageWidth)
  const ctrlRadius = handleRadius(imageWidth)

  const resolvePointer = (
    event: PointerEvent<SVGElement> | globalThis.PointerEvent,
    svg: SVGSVGElement | null,
    fallback: WorldMapPoint,
  ) => (svg ? pointerToNormalized(event, svg, clientToNormalized) : fallback)

  const beginSegmentInteraction = (
    segment: PathSegmentRef,
    event: PointerEvent<SVGElement>,
  ) => {
    event.stopPropagation()
    event.preventDefault()
    const clickPoint = resolvePointer(
      event,
      svgRef.current ?? event.currentTarget.ownerSVGElement,
      defaultLegControl(segment.start, segment.end),
    )
    dragRef.current = {
      kind: 'segment',
      legIndex: segment.legIndex,
      segmentIndex: segment.segmentIndex,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      clickPoint,
      moved: false,
      shiftHeldAtDown: shiftHeld,
      captureTarget: event.currentTarget,
    }
    setActiveKey(`s-${segment.segmentIndex}`)
    setDragging(true)
    onInteractionActiveChange?.(true)
  }

  const beginVertexInteraction = (vertexIndex: number, event: PointerEvent<SVGElement>) => {
    event.stopPropagation()
    event.preventDefault()
    const point = points[vertexIndex]
    if (!point) return
    const clickPoint = resolvePointer(
      event,
      svgRef.current ?? event.currentTarget.ownerSVGElement,
      point,
    )
    dragRef.current = {
      kind: 'vertex',
      vertexIndex,
      segmentIndex: vertexIndex,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      clickPoint,
      moved: false,
      captureTarget: event.currentTarget,
    }
    setActiveKey(`v-${vertexIndex}`)
    setDragging(true)
    onInteractionActiveChange?.(true)
  }

  return (
    <svg
      ref={svgRef}
      className={`island-map-draft-path-edit island-map-draft-path-edit--editable${shiftHeld ? ' island-map-draft-path-edit--shift-held' : ''}`.trim()}
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
      style={{ touchAction: 'none' }}
    >
      {segments.map((segment) => {
            const pathD = segmentPathD(segment.start, segment.end, imageWidth, imageHeight)
            const isActive = activeKey === `s-${segment.segmentIndex}`
            return (
              <path
                key={`leg-hit-${segment.legIndex}-${segment.segmentIndex}`}
                className={`island-map-draft-path-edit-segment-hit island-map-draft-path-edit-segment-hit--leg${isActive ? ' island-map-draft-path-edit-segment-hit--active' : ''}`.trim()}
                d={pathD}
                strokeWidth={hitWidth}
                fill="none"
                onPointerDown={(event) => beginSegmentInteraction(segment, event)}
              />
            )
          })}
      {bendVertices.map((vertexIndex) => {
        const point = points[vertexIndex]
        if (!point) return null
        const { x, y } = toImageCoords(point, imageWidth, imageHeight)
        const isActive = activeKey === `v-${vertexIndex}`
        return (
          <g
            key={`bend-${vertexIndex}-${point[0]}-${point[1]}`}
            onPointerDown={(event) => beginVertexInteraction(vertexIndex, event)}
          >
            <circle
              className="island-map-draft-path-edit-curve-handle-hit"
              cx={x}
              cy={y}
              r={ctrlRadius * 2.4}
              fill="transparent"
            />
            <circle
              className={`island-map-draft-path-edit-curve-handle island-map-draft-path-edit-curve-handle--node${isActive ? ' island-map-draft-path-edit-curve-handle--active' : ''}`.trim()}
              cx={x}
              cy={y}
              r={ctrlRadius}
              style={strokeColor ? { fill: strokeColor } : undefined}
            />
          </g>
        )
      })}
    </svg>
  )
}
