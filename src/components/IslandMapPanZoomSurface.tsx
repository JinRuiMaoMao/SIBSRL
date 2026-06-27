import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

export interface PanZoomState {
  x: number
  y: number
  scale: number
}

interface ImageSize {
  width: number
  height: number
}

interface IslandMapPanZoomSurfaceProps {
  src: string
  mode: 'widget' | 'fullscreen'
  className?: string
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

export function IslandMapPanZoomSurface({ src, mode, className = '' }: IslandMapPanZoomSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [imageSize, setImageSize] = useState<ImageSize | null>(null)
  const [panZoom, setPanZoom] = useState<PanZoomState>({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const dragOriginRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(
    null,
  )
  const initializedSrcRef = useRef<string | null>(null)

  const readViewportSize = useCallback((): ImageSize | null => {
    const viewport = viewportRef.current
    if (!viewport) return null
    const rect = viewport.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return { width: rect.width, height: rect.height }
  }, [])

  const applyPanZoom = useCallback(
    (next: PanZoomState | ((current: PanZoomState) => PanZoomState)) => {
      setPanZoom((current) => {
        const viewport = readViewportSize()
        if (!viewport || !imageSize) {
          return typeof next === 'function' ? next(current) : next
        }
        const resolved = typeof next === 'function' ? next(current) : next
        return clampPanZoom(resolved, viewport, imageSize)
      })
    },
    [imageSize, readViewportSize],
  )

  const initializeView = useCallback(
    (force = false) => {
      const viewport = readViewportSize()
      if (!viewport || !imageSize) return
      if (!force && initializedSrcRef.current === src) return
      initializedSrcRef.current = src
      setPanZoom(createInitialPanZoom(viewport, imageSize, mode))
    },
    [imageSize, mode, readViewportSize, src],
  )

  useEffect(() => {
    initializedSrcRef.current = null
    setImageSize(null)
  }, [src])

  useEffect(() => {
    initializeView(true)
  }, [initializeView, src])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !imageSize) return

    const observer = new ResizeObserver(() => {
      applyPanZoom((current) => current)
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [applyPanZoom, imageSize])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !imageSize) return

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
  }, [applyPanZoom, imageSize])

  useEffect(() => {
    if (!dragging) return

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
  }, [applyPanZoom, dragging, imageSize, panZoom.scale, readViewportSize])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
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

  const imageStyle: CSSProperties | undefined = imageSize
    ? {
        width: `${imageSize.width}px`,
        height: `${imageSize.height}px`,
        transform: `translate3d(${panZoom.x}px, ${panZoom.y}px, 0) scale(${panZoom.scale})`,
      }
    : undefined

  return (
    <div
      ref={viewportRef}
      className={`island-map-panzoom ${dragging ? 'island-map-panzoom--dragging' : ''} ${className}`.trim()}
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
