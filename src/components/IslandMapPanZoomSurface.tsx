import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

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
}

const WIDGET_ZOOM_FACTOR = 2.4
const MIN_SCALE_RATIO = 0.45
const MAX_SCALE_RATIO = 8
const WHEEL_ZOOM_FACTOR = 1.12

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
): PanZoomState {
  const fitScale = computeFitScale(viewport, image)
  const minScale = fitScale * MIN_SCALE_RATIO
  const maxScale = fitScale * MAX_SCALE_RATIO
  const scale = clamp(view.zoomRatio * fitScale, minScale, maxScale)
  return clampPanZoom(
    {
      scale,
      x: viewport.width / 2 - view.centerX * image.width * scale,
      y: viewport.height / 2 - view.centerY * image.height * scale,
    },
    viewport,
    image,
  )
}

function clampPanZoom(
  panZoom: PanZoomState,
  viewport: ImageSize,
  image: ImageSize,
): PanZoomState {
  const fitScale = computeFitScale(viewport, image)
  const minScale = fitScale * MIN_SCALE_RATIO
  const maxScale = fitScale * MAX_SCALE_RATIO
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
): PanZoomState {
  const fitScale = computeFitScale(viewport, image)
  const minScale = fitScale * MIN_SCALE_RATIO
  const maxScale = fitScale * MAX_SCALE_RATIO
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
  )
}

function resolvePanZoom(
  view: NormalizedMapView | null,
  viewport: ImageSize,
  image: ImageSize,
  mode: 'widget' | 'fullscreen',
): PanZoomState {
  if (view) return normalizedToPanZoom(view, viewport, image)
  return createInitialPanZoom(viewport, image, mode)
}

export function IslandMapPanZoomSurface({
  src,
  mode,
  className = '',
  view,
  onViewChange,
}: IslandMapPanZoomSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  const [imageSize, setImageSize] = useState<ImageSize | null>(null)
  const [panZoom, setPanZoom] = useState<PanZoomState | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragOriginRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(
    null,
  )
  const applyingExternalViewRef = useRef(false)

  useEffect(() => {
    setImageSize(null)
    setPanZoom(null)
  }, [src])

  const readViewportSize = useCallback((): ImageSize | null => {
    const viewport = viewportRef.current
    if (!viewport) return null
    const rect = viewport.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return { width: rect.width, height: rect.height }
  }, [])

  const syncPanZoom = useCallback(
    (options: { publish?: boolean } = {}) => {
      const viewport = readViewportSize()
      if (!viewport || !imageSize) return false

      const next = resolvePanZoom(viewRef.current, viewport, imageSize, mode)
      applyingExternalViewRef.current = true
      setPanZoom(next)

      if (!viewRef.current && options.publish !== false) {
        onViewChange(panZoomToNormalized(next, viewport, imageSize))
      }

      applyingExternalViewRef.current = false
      return true
    },
    [imageSize, mode, onViewChange, readViewportSize],
  )

  const publishView = useCallback(
    (next: PanZoomState) => {
      const viewport = readViewportSize()
      if (!viewport || !imageSize || applyingExternalViewRef.current) return
      onViewChange(panZoomToNormalized(next, viewport, imageSize))
    },
    [imageSize, onViewChange, readViewportSize],
  )

  const applyPanZoom = useCallback(
    (next: PanZoomState | ((current: PanZoomState) => PanZoomState)) => {
      setPanZoom((current) => {
        const viewport = readViewportSize()
        if (!viewport || !imageSize || !current) {
          return current
        }
        const resolved = typeof next === 'function' ? next(current) : next
        const clamped = clampPanZoom(resolved, viewport, imageSize)
        publishView(clamped)
        return clamped
      })
    },
    [imageSize, publishView, readViewportSize],
  )

  useEffect(() => {
    if (!imageSize) return

    let cancelled = false
    const frame = window.requestAnimationFrame(() => {
      if (!cancelled) syncPanZoom()
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [imageSize, mode, src, syncPanZoom, view])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !imageSize) return

    const observer = new ResizeObserver(() => {
      syncPanZoom({ publish: false })
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [imageSize, syncPanZoom])

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
      applyPanZoom({
        x: origin.panX + (event.clientX - origin.pointerX),
        y: origin.panY + (event.clientY - origin.pointerY),
        scale: panZoom.scale,
      })
    }

    const onPointerUp = () => {
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
    }
  }, [applyPanZoom, dragging, imageSize, panZoom, readViewportSize])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !panZoom) return
    event.preventDefault()
    dragOriginRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: panZoom.x,
      panY: panZoom.y,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    dragOriginRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
  }

  const imageStyle: CSSProperties | undefined =
    imageSize && panZoom
      ? {
          width: `${imageSize.width}px`,
          height: `${imageSize.height}px`,
          transform: `translate3d(${panZoom.x}px, ${panZoom.y}px, 0) scale(${panZoom.scale})`,
        }
      : undefined

  return (
    <div
      ref={viewportRef}
      className={`island-map-panzoom ${dragging ? 'island-map-panzoom--dragging' : ''} ${panZoom ? '' : 'island-map-panzoom--pending'} ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={src}
        alt=""
        className="island-map-panzoom-image"
        decoding="async"
        draggable={false}
        style={imageStyle}
        onLoad={onImageLoad}
      />
    </div>
  )
}
