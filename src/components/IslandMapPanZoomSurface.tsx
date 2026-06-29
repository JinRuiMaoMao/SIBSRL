import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import { IslandMapRouteOverlayLayer } from './IslandMapRouteOverlayLayer'
import { IslandMapDraftPathEditLayer } from './IslandMapDraftPathEditLayer'
import { IslandMapStopOverlayLayer } from './IslandMapStopOverlayLayer'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import type { IslandMapDrawInteraction } from '../types/worldMapDraw'

export interface PanZoomState {
  x: number
  y: number
  scale: number
}

export interface NormalizedMapView {
  centerX: number
  centerY: number
  zoomRatio: number
}

interface ImageSize {
  width: number
  height: number
}

interface IslandMapPanZoomSurfaceProps {
  src: string
  mode: 'widget' | 'fullscreen'
  className?: string
  view: NormalizedMapView | null
  onViewChange: (view: NormalizedMapView) => void
  routeOverlay?: {
    routeNumber: string
    points: readonly WorldMapPoint[]
  } | null
  drawMode?: boolean
  drawInteraction?: IslandMapDrawInteraction
  draftPoints?: readonly WorldMapPoint[]
  draftStopPoints?: readonly WorldMapPoint[]
  draftStrokeColor?: string
  draftRouteNumber?: string
  draftStops?: readonly WorldMapDrawStop[]
  pendingStopPoint?: WorldMapPoint | null
  onDrawMapClick?: (point: WorldMapPoint) => void
  onDrawUndo?: () => void
  onStopDrag?: (stopId: string, point: WorldMapPoint) => void
  onStopDragEnd?: (stopId: string, point: WorldMapPoint) => void
  onStopClick?: (stopId: string) => void
  selectedStopId?: string | null
  onPathPointsChange?: (points: WorldMapPoint[]) => void
  onBendInsert?: (segmentIndex: number, point: WorldMapPoint) => void
  onBendMove?: (vertexIndex: number, point: WorldMapPoint) => void
  onBendDragStart?: () => void
  onBendDragEnd?: (vertexIndex: number, point: WorldMapPoint) => void
  onBendRemove?: (vertexIndex: number) => void
  onLegDelete?: (legIndex: number) => void
  pathEditable?: boolean
  pathLegStarts?: readonly number[]
  pathLegHidden?: readonly boolean[]
  pathUserBends?: readonly boolean[]
  snapPathPoint?: (point: WorldMapPoint) => WorldMapPoint
  traceSelectedStopId?: string | null
  maxZoomRatio?: number
}

const WIDGET_ZOOM_FACTOR = 2.4
const MIN_SCALE_RATIO = 0.45
const DEFAULT_MAX_SCALE_RATIO = 8
export const DRAW_MAX_ZOOM_RATIO = 16
const WHEEL_ZOOM_FACTOR = 1.12
const MAX_SYNC_ATTEMPTS = 12

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function computeFitScale(viewport: ImageSize, image: ImageSize): number {
  if (image.width <= 0 || image.height <= 0) return 1
  return Math.min(viewport.width / image.width, viewport.height / image.height)
}

function createInitialPanZoom(
  viewport: ImageSize,
  image: ImageSize,
  mode: 'widget' | 'fullscreen',
): PanZoomState {
  const fitScale = computeFitScale(viewport, image)
  const scale = mode === 'widget' ? fitScale * WIDGET_ZOOM_FACTOR : fitScale
  return {
    scale,
    x: (viewport.width - image.width * scale) / 2,
    y: (viewport.height - image.height * scale) / 2,
  }
}

export function panZoomToNormalized(
  panZoom: PanZoomState,
  viewport: ImageSize,
  image: ImageSize,
): NormalizedMapView {
  const fitScale = computeFitScale(viewport, image)
  const scaledWidth = image.width * panZoom.scale
  const scaledHeight = image.height * panZoom.scale
  const centerX = scaledWidth > 0 ? (viewport.width / 2 - panZoom.x) / scaledWidth : 0.5
  const centerY = scaledHeight > 0 ? (viewport.height / 2 - panZoom.y) / scaledHeight : 0.5
  return {
    centerX: clamp(centerX, 0, 1),
    centerY: clamp(centerY, 0, 1),
    zoomRatio: fitScale > 0 ? panZoom.scale / fitScale : 1,
  }
}

export function normalizedToPanZoom(
  view: NormalizedMapView,
  viewport: ImageSize,
  image: ImageSize,
  maxZoomRatio = DEFAULT_MAX_SCALE_RATIO,
): PanZoomState {
  const fitScale = computeFitScale(viewport, image)
  const minScale = fitScale * MIN_SCALE_RATIO
  const maxScale = fitScale * maxZoomRatio
  const scale = clamp(view.zoomRatio * fitScale, minScale, maxScale)
  return clampPanZoom(
    {
      scale,
      x: viewport.width / 2 - view.centerX * image.width * scale,
      y: viewport.height / 2 - view.centerY * image.height * scale,
    },
    viewport,
    image,
    maxZoomRatio,
  )
}

function clampPanZoom(
  panZoom: PanZoomState,
  viewport: ImageSize,
  image: ImageSize,
  maxZoomRatio = DEFAULT_MAX_SCALE_RATIO,
): PanZoomState {
  const fitScale = computeFitScale(viewport, image)
  const minScale = fitScale * MIN_SCALE_RATIO
  const maxScale = fitScale * maxZoomRatio
  const scale = clamp(panZoom.scale, minScale, maxScale)
  const scaledWidth = image.width * scale
  const scaledHeight = image.height * scale

  let x = panZoom.x
  let y = panZoom.y

  if (scaledWidth <= viewport.width) {
    x = (viewport.width - scaledWidth) / 2
  } else {
    x = clamp(x, viewport.width - scaledWidth, 0)
  }

  if (scaledHeight <= viewport.height) {
    y = (viewport.height - scaledHeight) / 2
  } else {
    y = clamp(y, viewport.height - scaledHeight, 0)
  }

  return { x, y, scale }
}

function zoomAtPoint(
  panZoom: PanZoomState,
  point: { x: number; y: number },
  direction: 'in' | 'out',
  viewport: ImageSize,
  image: ImageSize,
  maxZoomRatio = DEFAULT_MAX_SCALE_RATIO,
): PanZoomState {
  const fitScale = computeFitScale(viewport, image)
  const minScale = fitScale * MIN_SCALE_RATIO
  const maxScale = fitScale * maxZoomRatio
  const factor = direction === 'in' ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR
  const nextScale = clamp(panZoom.scale * factor, minScale, maxScale)
  const ratio = nextScale / panZoom.scale

  return clampPanZoom(
    {
      scale: nextScale,
      x: point.x - ratio * (point.x - panZoom.x),
      y: point.y - ratio * (point.y - panZoom.y),
    },
    viewport,
    image,
    maxZoomRatio,
  )
}

function resolvePanZoom(
  view: NormalizedMapView | null,
  viewport: ImageSize,
  image: ImageSize,
  mode: 'widget' | 'fullscreen',
  maxZoomRatio = DEFAULT_MAX_SCALE_RATIO,
): PanZoomState {
  if (view) return normalizedToPanZoom(view, viewport, image, maxZoomRatio)
  return createInitialPanZoom(viewport, image, mode)
}

function readImageSize(image: HTMLImageElement): ImageSize | null {
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return null
  return { width: image.naturalWidth, height: image.naturalHeight }
}

export function viewportClientToNormalized(
  clientX: number,
  clientY: number,
  viewportRect: DOMRect,
  panZoom: PanZoomState,
  imageSize: ImageSize,
): WorldMapPoint {
  const localX = clientX - viewportRect.left
  const localY = clientY - viewportRect.top
  const imageX = (localX - panZoom.x) / panZoom.scale
  const imageY = (localY - panZoom.y) / panZoom.scale
  return [
    clamp(imageX / imageSize.width, 0, 1),
    clamp(imageY / imageSize.height, 0, 1),
  ]
}

export function IslandMapPanZoomSurface({
  src,
  mode,
  className = '',
  view,
  onViewChange,
  routeOverlay = null,
  drawMode = false,
  drawInteraction = 'route',
  draftPoints = [],
  draftStopPoints = [],
  draftStrokeColor,
  draftRouteNumber = '',
  draftStops = [],
  pendingStopPoint = null,
  onDrawMapClick,
  onDrawUndo,
  onStopDrag,
  onStopDragEnd,
  onStopClick,
  selectedStopId = null,
  onPathPointsChange,
  onBendInsert,
  onBendMove,
  onBendDragStart,
  onBendDragEnd,
  onBendRemove,
  onLegDelete,
  pathEditable = false,
  pathLegStarts = [0],
  pathLegHidden = [],
  pathUserBends = [],
  snapPathPoint,
  traceSelectedStopId = null,
  maxZoomRatio = DEFAULT_MAX_SCALE_RATIO,
}: IslandMapPanZoomSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const viewRef = useRef(view)
  const modeRef = useRef(mode)
  const maxZoomRatioRef = useRef(maxZoomRatio)
  const onViewChangeRef = useRef(onViewChange)
  const imageSizeCacheRef = useRef<Map<string, ImageSize>>(new Map())
  const displayedSrcRef = useRef(src)
  const panZoomRef = useRef<PanZoomState | null>(null)
  const dragRafRef = useRef(0)
  const stopDragRef = useRef<{
    stopId: string
    pointerId: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null)
  const pathEditActiveRef = useRef(false)
  const suppressPublishRef = useRef(false)

  viewRef.current = view
  modeRef.current = mode
  maxZoomRatioRef.current = maxZoomRatio
  onViewChangeRef.current = onViewChange

  const [displayedSrc, setDisplayedSrc] = useState(src)
  const [incomingSrc, setIncomingSrc] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<ImageSize | null>(() => imageSizeCacheRef.current.get(src) ?? null)
  const [panZoom, setPanZoom] = useState<PanZoomState | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragOriginRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(
    null,
  )

  displayedSrcRef.current = displayedSrc
  panZoomRef.current = panZoom

  const applyTransformLive = useCallback((next: PanZoomState) => {
    const content = contentRef.current
    if (!content) return
    content.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`
  }, [])

  useEffect(() => {
    if (dragging || !panZoom) return
    applyTransformLive(panZoom)
  }, [applyTransformLive, dragging, panZoom])

  const readViewportSize = useCallback((): ImageSize | null => {
    const viewport = viewportRef.current
    if (!viewport) return null
    const rect = viewport.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return { width: rect.width, height: rect.height }
  }, [])

  const syncPanZoom = useCallback(
    (options: { publish?: boolean } = {}): boolean => {
      const viewport = readViewportSize()
      const size = imageSize ?? imageSizeCacheRef.current.get(displayedSrcRef.current) ?? null
      if (!viewport || !size) return false

      const next = resolvePanZoom(viewRef.current, viewport, size, modeRef.current, maxZoomRatioRef.current)
      suppressPublishRef.current = true
      setPanZoom(next)
      suppressPublishRef.current = false

      if (options.publish !== false && !viewRef.current) {
        onViewChangeRef.current(panZoomToNormalized(next, viewport, size))
      }

      return true
    },
    [imageSize, readViewportSize],
  )

  const syncPanZoomRef = useRef(syncPanZoom)
  syncPanZoomRef.current = syncPanZoom

  const scheduleSync = useCallback((options: { publish?: boolean } = {}) => {
    let cancelled = false
    let attempts = 0
    let frame = 0
    const run = () => {
      if (cancelled) return
      if (syncPanZoomRef.current(options)) return
      if (attempts >= MAX_SYNC_ATTEMPTS) return
      attempts += 1
      frame = window.requestAnimationFrame(run)
    }
    frame = window.requestAnimationFrame(run)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const applyPanZoom = useCallback(
    (next: PanZoomState | ((current: PanZoomState) => PanZoomState)) => {
      setPanZoom((current) => {
        const viewport = readViewportSize()
        const size = imageSize ?? imageSizeCacheRef.current.get(displayedSrcRef.current) ?? null
        if (!viewport || !size || !current) return current
        const resolved = typeof next === 'function' ? next(current) : next
        const clamped = clampPanZoom(resolved, viewport, size, maxZoomRatioRef.current)
        if (!suppressPublishRef.current) {
          onViewChangeRef.current(panZoomToNormalized(clamped, viewport, size))
        }
        return clamped
      })
    },
    [imageSize, readViewportSize],
  )

  const activateMapLayer = useCallback(
    (nextSrc: string, image: HTMLImageElement) => {
      const size = readImageSize(image)
      if (!size) return false
      imageSizeCacheRef.current.set(nextSrc, size)
      displayedSrcRef.current = nextSrc
      setDisplayedSrc(nextSrc)
      setImageSize(size)
      setIncomingSrc(null)
      return true
    },
    [],
  )

  const adoptImage = useCallback(
    (nextSrc: string, image: HTMLImageElement) => activateMapLayer(nextSrc, image),
    [activateMapLayer],
  )

  useEffect(() => {
    if (src === displayedSrcRef.current) {
      setIncomingSrc(null)
      return
    }
    if (src === incomingSrc) return
    setIncomingSrc(src)
  }, [incomingSrc, src])

  useLayoutEffect(() => {
    const image = imageRef.current
    if (!image?.complete) return
    adoptImage(displayedSrcRef.current, image)
  }, [adoptImage, displayedSrc])

  useLayoutEffect(() => {
    if (!imageSize) return
    if (syncPanZoomRef.current({ publish: !viewRef.current })) return
    return scheduleSync({ publish: !viewRef.current })
  }, [displayedSrc, imageSize, mode, scheduleSync])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !imageSize) return

    const observer = new ResizeObserver(() => {
      syncPanZoomRef.current({ publish: false })
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [imageSize])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !imageSize || !panZoom) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      applyPanZoom((current) =>
        zoomAtPoint(
          current,
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          event.deltaY < 0 ? 'in' : 'out',
          { width: rect.width, height: rect.height },
          imageSize,
          maxZoomRatioRef.current,
        ),
      )
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [applyPanZoom, imageSize, panZoom])

  useEffect(() => {
    if (!dragging || !panZoom) return

    const onPointerMove = (event: PointerEvent) => {
      const origin = dragOriginRef.current
      const viewport = readViewportSize()
      if (!origin || !viewport || !imageSize) return
      const next = clampPanZoom(
        {
          x: origin.panX + (event.clientX - origin.pointerX),
          y: origin.panY + (event.clientY - origin.pointerY),
          scale: panZoom.scale,
        },
        viewport,
        imageSize,
        maxZoomRatioRef.current,
      )
      panZoomRef.current = next
      if (dragRafRef.current) return
      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = 0
        const live = panZoomRef.current
        if (live) applyTransformLive(live)
      })
    }

    const onPointerUp = () => {
      const live = panZoomRef.current
      if (live) {
        suppressPublishRef.current = false
        setPanZoom(live)
        const viewport = readViewportSize()
        if (viewport && imageSize) {
          onViewChangeRef.current(panZoomToNormalized(live, viewport, imageSize))
        }
      }
      dragOriginRef.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      if (dragRafRef.current) {
        window.cancelAnimationFrame(dragRafRef.current)
        dragRafRef.current = 0
      }
    }
  }, [applyTransformLive, dragging, imageSize, panZoom, readViewportSize])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panZoom || !imageSize) return

    if (stopDragRef.current) return
    if (pathEditActiveRef.current) return

    if (drawMode) {
      event.preventDefault()
      if (event.button === 2) {
        onDrawUndo?.()
        return
      }
      if (event.button !== 0) return
      const rect = event.currentTarget.getBoundingClientRect()
      onDrawMapClick?.(
        viewportClientToNormalized(event.clientX, event.clientY, rect, panZoom, imageSize),
      )
      return
    }

    if (event.button !== 0) return
    event.preventDefault()
    dragOriginRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: panZoom.x,
      panY: panZoom.y,
    }
    panZoomRef.current = panZoom
    suppressPublishRef.current = true
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleStopPointerDown = useCallback(
    (stopId: string, event: ReactPointerEvent<SVGGElement>) => {
      if (!drawMode || drawInteraction !== 'route' || !panZoom || !imageSize) return
      event.preventDefault()
      event.stopPropagation()
      stopDragRef.current = {
        stopId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      }
      setDraggingStopId(stopId)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [drawInteraction, drawMode, imageSize, panZoom],
  )

  useEffect(() => {
    if (!draggingStopId || !panZoom || !imageSize) return

    const onPointerMove = (event: PointerEvent) => {
      const drag = stopDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const viewport = viewportRef.current
      if (!viewport) return
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) {
        drag.moved = true
      }
      const rect = viewport.getBoundingClientRect()
      const livePanZoom = panZoomRef.current ?? panZoom
      const point = viewportClientToNormalized(event.clientX, event.clientY, rect, livePanZoom, imageSize)
      onStopDrag?.(drag.stopId, point)
    }

    const finishDrag = (event: PointerEvent) => {
      const drag = stopDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const viewport = viewportRef.current
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      const livePanZoom = panZoomRef.current ?? panZoom
      const point = viewportClientToNormalized(event.clientX, event.clientY, rect, livePanZoom, imageSize)
      if (drag.moved) {
        onStopDragEnd?.(drag.stopId, point)
      } else {
        onStopClick?.(drag.stopId)
      }
      stopDragRef.current = null
      setDraggingStopId(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', finishDrag)
    }
  }, [draggingStopId, imageSize, onStopClick, onStopDrag, onStopDragEnd, panZoom])

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    adoptImage(displayedSrcRef.current, event.currentTarget)
  }

  const onIncomingImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const layerSrc = incomingSrc
    if (!layerSrc) return
    if (activateMapLayer(layerSrc, event.currentTarget)) {
      window.requestAnimationFrame(() => {
        syncPanZoomRef.current({ publish: true })
      })
    }
  }

  const layerSizeStyle: CSSProperties | undefined = imageSize
    ? { width: `${imageSize.width}px`, height: `${imageSize.height}px` }
    : undefined

  const userBendIndexSet = useMemo(() => {
    const set = new Set<number>()
    pathUserBends.forEach((isUser, index) => {
      if (isUser) set.add(index)
    })
    return set
  }, [pathUserBends])

  const overlayChildren = imageSize ? (
    <>
      {routeOverlay ? (
        <div className="island-map-route-overlay-wrap">
          <IslandMapRouteOverlayLayer
            imageWidth={imageSize.width}
            imageHeight={imageSize.height}
            routeNumber={routeOverlay.routeNumber}
            points={routeOverlay.points}
            variant="route"
          />
        </div>
      ) : null}
      {drawInteraction === 'route' && draftPoints.length > 0 ? (
        <div className="island-map-route-overlay-wrap">
          <IslandMapRouteOverlayLayer
            imageWidth={imageSize.width}
            imageHeight={imageSize.height}
            routeNumber={draftRouteNumber}
            points={draftPoints}
            vertexPoints={draftStopPoints}
            legStarts={pathLegStarts}
            legHidden={pathLegHidden}
            userBendIndices={userBendIndexSet}
            smoothRoadCorners
            variant="draft"
            strokeColor={draftStrokeColor}
          />
        </div>
      ) : null}
      {draftStops.length > 0 || pendingStopPoint ? (
        <div
          className={`island-map-route-overlay-wrap${drawMode && drawInteraction === 'route' ? ' island-map-route-overlay-wrap--stop-editable' : ''}`.trim()}
        >
          <IslandMapStopOverlayLayer
            imageWidth={imageSize.width}
            imageHeight={imageSize.height}
            stops={draftStops}
            pendingStop={
              pendingStopPoint
                ? {
                    x: pendingStopPoint[0] * imageSize.width,
                    y: pendingStopPoint[1] * imageSize.height,
                  }
                : null
            }
            editable={drawMode && drawInteraction === 'route'}
            selectedStopId={selectedStopId}
            traceSelectedStopId={traceSelectedStopId}
            draggingStopId={draggingStopId}
            onStopPointerDown={handleStopPointerDown}
          />
        </div>
      ) : null}
      {drawMode && pathEditable && drawInteraction === 'route' && draftPoints.length >= 2 && onBendInsert && onBendMove && onBendRemove && onLegDelete ? (
        <div className="island-map-route-overlay-wrap island-map-route-overlay-wrap--path-editable">
          <IslandMapDraftPathEditLayer
            imageWidth={imageSize.width}
            imageHeight={imageSize.height}
            points={draftPoints}
            legStarts={pathLegStarts}
            legHidden={pathLegHidden}
            userBendIndices={userBendIndexSet}
            strokeColor={draftStrokeColor}
            editable
            snapPoint={snapPathPoint}
            onBendInsert={onBendInsert}
            onBendMove={onBendMove}
            onBendDragStart={onBendDragStart}
            onBendDragEnd={onBendDragEnd}
            onBendRemove={onBendRemove}
            onLegDelete={onLegDelete}
            onInteractionActiveChange={(active) => {
              pathEditActiveRef.current = active
            }}
          />
        </div>
      ) : null}
    </>
  ) : null

  return (
    <div
      ref={viewportRef}
      className={`island-map-panzoom ${dragging ? 'island-map-panzoom--dragging' : ''}${drawMode ? ' island-map-panzoom--draw' : ''}${drawMode && drawInteraction === 'catalog' ? ' island-map-panzoom--draw-stop' : ''} ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={drawMode ? (event) => event.preventDefault() : undefined}
    >
      {layerSizeStyle ? (
        <div
          ref={contentRef}
          className={`island-map-panzoom-content${dragging ? ' island-map-panzoom-content--dragging' : ''}`.trim()}
          style={layerSizeStyle}
        >
          <img
            ref={imageRef}
            src={displayedSrc}
            alt=""
            className="island-map-panzoom-image"
            decoding="async"
            draggable={false}
            onLoad={onImageLoad}
          />
          {incomingSrc ? (
            <img
              src={incomingSrc}
              alt=""
              className="island-map-panzoom-image island-map-panzoom-image--incoming"
              decoding="async"
              draggable={false}
              onLoad={onIncomingImageLoad}
            />
          ) : null}
          {overlayChildren}
        </div>
      ) : (
        <img
          ref={imageRef}
          src={displayedSrc}
          alt=""
          className="island-map-panzoom-image"
          decoding="async"
          draggable={false}
          onLoad={onImageLoad}
        />
      )}
    </div>
  )
}
