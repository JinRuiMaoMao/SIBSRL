import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import {
  deletePathSegment,
  getPathLegRanges,
  movePathVertex,
  straightenPathLeg,
  translatePathLeg,
  translatePathSegment,
  type PathLegRange,
} from '../utils/worldMapDrawPathEdit'

type PathDragKind = 'segment' | 'vertex' | 'leg'

interface IslandMapDraftPathEditLayerProps {
  imageWidth: number
  imageHeight: number
  points: readonly WorldMapPoint[]
  legStarts?: readonly number[]
  strokeColor?: string
  editable?: boolean
  onPointsChange: (points: WorldMapPoint[]) => void
  onInteractionActiveChange?: (active: boolean) => void
}

const LEG_MODE_POINT_THRESHOLD = 28

function toImageCoords(point: WorldMapPoint, imageWidth: number, imageHeight: number) {
  return { x: point[0] * imageWidth, y: point[1] * imageHeight }
}

function hitStrokeWidth(imageWidth: number): number {
  return Math.max(14, imageWidth * 0.009)
}

function vertexRadius(imageWidth: number): number {
  return Math.max(4, imageWidth * 0.0014)
}

export function IslandMapDraftPathEditLayer({
  imageWidth,
  imageHeight,
  points,
  legStarts = [0],
  strokeColor,
  editable = false,
  onPointsChange,
  onInteractionActiveChange,
}: IslandMapDraftPathEditLayerProps) {
  const dragRef = useRef<{
    kind: PathDragKind
    index: number
    leg?: PathLegRange
    pointerId: number
    startClientX: number
    startClientY: number
    originPoints: WorldMapPoint[]
    moved: boolean
  } | null>(null)
  const previewPointsRef = useRef<WorldMapPoint[] | null>(null)
  const [previewPoints, setPreviewPoints] = useState<WorldMapPoint[] | null>(null)
  const [activeLegIndex, setActiveLegIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const displayPoints = previewPoints ?? points
  const legRanges = useMemo(
    () => getPathLegRanges(legStarts, displayPoints.length),
    [displayPoints.length, legStarts],
  )
  const legMode =
    legRanges.length > 1 || displayPoints.length > LEG_MODE_POINT_THRESHOLD

  useEffect(() => {
    if (!dragging) return

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const deltaX = (event.clientX - drag.startClientX) / imageWidth
      const deltaY = (event.clientY - drag.startClientY) / imageHeight
      if (Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) > 4) {
        drag.moved = true
      }
      if (drag.kind === 'leg' && drag.leg) {
        const next = translatePathLeg(drag.originPoints, drag.leg.start, drag.leg.end, [deltaX, deltaY])
        previewPointsRef.current = next
        setPreviewPoints(next)
        return
      }
      if (drag.kind === 'segment') {
        const next = translatePathSegment(drag.originPoints, drag.index, [deltaX, deltaY])
        previewPointsRef.current = next
        setPreviewPoints(next)
        return
      }
      const origin = drag.originPoints[drag.index]
      if (!origin) return
      const next = movePathVertex(drag.originPoints, drag.index, [origin[0] + deltaX, origin[1] + deltaY])
      previewPointsRef.current = next
      setPreviewPoints(next)
    }

    const finishDrag = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      if (drag.moved && previewPointsRef.current) {
        onPointsChange(previewPointsRef.current)
      }
      dragRef.current = null
      previewPointsRef.current = null
      setPreviewPoints(null)
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
  }, [dragging, imageHeight, imageWidth, onInteractionActiveChange, onPointsChange])

  if (!editable || displayPoints.length < 2) return null

  const hitWidth = hitStrokeWidth(imageWidth)
  const vtxRadius = vertexRadius(imageWidth)

  const beginDrag = (
    kind: PathDragKind,
    index: number,
    event: PointerEvent<SVGElement>,
    leg?: PathLegRange,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      kind,
      index,
      leg,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originPoints: displayPoints.map((point) => [point[0], point[1]] as WorldMapPoint),
      moved: false,
    }
    setDragging(true)
    onInteractionActiveChange?.(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleLegDoubleClick = (leg: PathLegRange, legIndex: number, event: PointerEvent<SVGLineElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = null
    previewPointsRef.current = null
    setPreviewPoints(null)
    setDragging(false)
    onInteractionActiveChange?.(false)
    const next = straightenPathLeg(points, leg.start, leg.end)
    if (!next) return
    onPointsChange(next)
    setActiveLegIndex(legIndex)
  }

  const handleSegmentDoubleClick = (segmentIndex: number, event: PointerEvent<SVGLineElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = null
    previewPointsRef.current = null
    setPreviewPoints(null)
    setDragging(false)
    onInteractionActiveChange?.(false)
    const next = deletePathSegment(points, segmentIndex)
    if (!next) return
    onPointsChange(next)
  }

  return (
    <svg
      className="island-map-draft-path-edit island-map-draft-path-edit--editable"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {previewPoints && previewPoints.length >= 2 ? (
        <polyline
          className="island-map-draft-path-edit-preview"
          points={previewPoints
            .map(([x, y]) => `${x * imageWidth},${y * imageHeight}`)
            .join(' ')}
          style={strokeColor ? { stroke: strokeColor } : undefined}
          fill="none"
        />
      ) : null}
      {legMode
        ? legRanges.map((leg, legIndex) => {
            const start = displayPoints[leg.start]
            const end = displayPoints[leg.end]
            if (!start || !end) return null
            const a = toImageCoords(start, imageWidth, imageHeight)
            const b = toImageCoords(end, imageWidth, imageHeight)
            const isActive = activeLegIndex === legIndex
            return (
              <line
                key={`leg-${legIndex}-${leg.start}-${leg.end}`}
                className={`island-map-draft-path-edit-segment-hit island-map-draft-path-edit-segment-hit--leg${isActive ? ' island-map-draft-path-edit-segment-hit--active' : ''}`.trim()}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeWidth={hitWidth}
                onPointerDown={(event) => {
                  setActiveLegIndex(legIndex)
                  beginDrag('leg', legIndex, event, leg)
                }}
                onDoubleClick={(event) => handleLegDoubleClick(leg, legIndex, event)}
              />
            )
          })
        : displayPoints.slice(0, -1).map((start, segmentIndex) => {
            const end = displayPoints[segmentIndex + 1]!
            const a = toImageCoords(start, imageWidth, imageHeight)
            const b = toImageCoords(end, imageWidth, imageHeight)
            return (
              <line
                key={`seg-${segmentIndex}-${start[0]}-${start[1]}`}
                className="island-map-draft-path-edit-segment-hit"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeWidth={hitWidth}
                onPointerDown={(event) => beginDrag('segment', segmentIndex, event)}
                onDoubleClick={(event) => handleSegmentDoubleClick(segmentIndex, event)}
              />
            )
          })}
      {!legMode
        ? displayPoints.map((point, vertexIndex) => {
            const { x, y } = toImageCoords(point, imageWidth, imageHeight)
            return (
              <circle
                key={`vtx-${vertexIndex}-${point[0]}-${point[1]}`}
                className="island-map-draft-path-edit-vertex"
                cx={x}
                cy={y}
                r={vtxRadius}
                style={strokeColor ? { fill: strokeColor } : undefined}
                onPointerDown={(event) => beginDrag('vertex', vertexIndex, event)}
              />
            )
          })
        : null}
    </svg>
  )
}
