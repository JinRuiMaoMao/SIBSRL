import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import { getPathLegRanges } from '../utils/worldMapDrawPathEdit'
import {
  buildLegPathD,
  constrainLegControlOnRoad,
  isLegStraight,
  resolveLegControl,
} from '../utils/worldMapDrawPathCurve'

interface IslandMapDraftPathEditLayerProps {
  imageWidth: number
  imageHeight: number
  points: readonly WorldMapPoint[]
  legStarts?: readonly number[]
  legControls?: readonly (WorldMapPoint | null)[]
  strokeColor?: string
  editable?: boolean
  snapPoint?: (point: WorldMapPoint) => WorldMapPoint
  isOnRoad?: (point: WorldMapPoint) => boolean
  onLegControlChange: (legIndex: number, control: WorldMapPoint | null) => void
  onLegDelete: (legIndex: number) => void
  onInteractionActiveChange?: (active: boolean) => void
}

function toImageCoords(point: WorldMapPoint, imageWidth: number, imageHeight: number) {
  return { x: point[0] * imageWidth, y: point[1] * imageHeight }
}

function hitStrokeWidth(imageWidth: number): number {
  return Math.max(14, imageWidth * 0.009)
}

function handleRadius(imageWidth: number): number {
  return Math.max(5, imageWidth * 0.0018)
}

export function IslandMapDraftPathEditLayer({
  imageWidth,
  imageHeight,
  points,
  legStarts = [0],
  legControls = [],
  strokeColor,
  editable = false,
  snapPoint = (point) => point,
  isOnRoad = () => true,
  onLegControlChange,
  onLegDelete,
  onInteractionActiveChange,
}: IslandMapDraftPathEditLayerProps) {
  const dragRef = useRef<{
    legIndex: number
    pointerId: number
    startClientX: number
    startClientY: number
    originControl: WorldMapPoint
    start: WorldMapPoint
    end: WorldMapPoint
    moved: boolean
  } | null>(null)
  const previewControlRef = useRef<WorldMapPoint | null>(null)
  const [previewTick, setPreviewTick] = useState(0)
  const [previewLegIndex, setPreviewLegIndex] = useState<number | null>(null)
  const [activeLegIndex, setActiveLegIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const legRanges = useMemo(
    () => getPathLegRanges(legStarts, points.length),
    [legStarts, points.length],
  )

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
      const desired: WorldMapPoint = [
        drag.originControl[0] + deltaX,
        drag.originControl[1] + deltaY,
      ]
      const next = constrainLegControlOnRoad(
        drag.start,
        drag.end,
        desired,
        snapPoint,
        isOnRoad,
      )
      previewControlRef.current = next
      setPreviewLegIndex(drag.legIndex)
      setPreviewTick((tick) => tick + 1)
    }

    const finishDrag = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      if (drag.moved && previewControlRef.current) {
        onLegControlChange(drag.legIndex, previewControlRef.current)
      }
      dragRef.current = null
      previewControlRef.current = null
      setPreviewLegIndex(null)
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
    imageHeight,
    imageWidth,
    isOnRoad,
    onInteractionActiveChange,
    onLegControlChange,
    snapPoint,
  ])

  const previewControl = previewControlRef.current
  void previewTick

  if (!editable || points.length < 2 || legRanges.length === 0) return null

  const hitWidth = hitStrokeWidth(imageWidth)
  const ctrlRadius = handleRadius(imageWidth)

  const beginControlDrag = (
    legIndex: number,
    start: WorldMapPoint,
    end: WorldMapPoint,
    control: WorldMapPoint,
    event: PointerEvent<SVGElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      legIndex,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originControl: control,
      start,
      end,
      moved: false,
    }
    setActiveLegIndex(legIndex)
    setDragging(true)
    onInteractionActiveChange?.(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleLegDoubleClick = (legIndex: number, event: PointerEvent<SVGElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = null
    previewControlRef.current = null
    setPreviewLegIndex(null)
    setDragging(false)
    onInteractionActiveChange?.(false)
    onLegDelete(legIndex)
    setActiveLegIndex(null)
  }

  return (
    <svg
      className="island-map-draft-path-edit island-map-draft-path-edit--editable"
      width={imageWidth}
      height={imageHeight}
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      aria-hidden
    >
      {previewControl != null && previewLegIndex != null
        ? (() => {
            const leg = legRanges[previewLegIndex]
            const start = leg ? points[leg.start] : null
            const end = leg ? points[leg.end] : null
            if (!leg || !start || !end) return null
            return (
              <path
                className="island-map-draft-path-edit-preview"
                d={buildLegPathD(start, end, previewControl, imageWidth, imageHeight)}
                style={strokeColor ? { stroke: strokeColor } : undefined}
                fill="none"
              />
            )
          })()
        : null}
      {legRanges.map((leg, legIndex) => {
        const start = points[leg.start]
        const end = points[leg.end]
        if (!start || !end) return null
        const a = toImageCoords(start, imageWidth, imageHeight)
        const b = toImageCoords(end, imageWidth, imageHeight)
        const isActive = activeLegIndex === legIndex
        return (
          <line
            key={`leg-hit-${legIndex}-${leg.start}-${leg.end}`}
            className={`island-map-draft-path-edit-segment-hit island-map-draft-path-edit-segment-hit--leg${isActive ? ' island-map-draft-path-edit-segment-hit--active' : ''}`.trim()}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            strokeWidth={hitWidth}
            onPointerDown={() => setActiveLegIndex(legIndex)}
            onDoubleClick={(event) => handleLegDoubleClick(legIndex, event)}
          />
        )
      })}
      {legRanges.map((leg, legIndex) => {
        const start = points[leg.start]
        const end = points[leg.end]
        if (!start || !end) return null
        const stored = legControls[legIndex]
        const control =
          previewLegIndex === legIndex && previewControl
            ? previewControl
            : resolveLegControl(start, end, stored)
        const { x, y } = toImageCoords(control, imageWidth, imageHeight)
        const straight = isLegStraight(start, end, stored) && previewLegIndex !== legIndex
        return (
          <circle
            key={`curve-${legIndex}-${control[0]}-${control[1]}`}
            className={`island-map-draft-path-edit-curve-handle${straight ? ' island-map-draft-path-edit-curve-handle--straight' : ''}${activeLegIndex === legIndex ? ' island-map-draft-path-edit-curve-handle--active' : ''}`.trim()}
            cx={x}
            cy={y}
            r={ctrlRadius}
            style={strokeColor ? { fill: strokeColor } : undefined}
            onPointerDown={(event) => beginControlDrag(legIndex, start, end, control, event)}
          />
        )
      })}
    </svg>
  )
}
