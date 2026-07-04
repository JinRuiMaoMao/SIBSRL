import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { Locale } from '../i18n/types'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import { getPathLegRanges } from './worldMapDrawPathEdit'
import { buildEditorCornerPathD } from './worldMapDrawPathCurve'
import { normalizeStopLabelScale } from './mapDrawStopLabel'
import { drawRouteEditorStopLabelOnCanvas } from './routeEditorStopLabel'
import { mapDrawNodeScaleFactor } from './mapDrawNodeScale'
import { resolveExportBaseName } from './worldMapRouteExport'
import { formatDrawStopLabel } from './worldMapDrawStopDisplay'

export interface WorldMapDrawImageSegment {
  from: WorldMapPoint
  to: WorldMapPoint
}

export interface WorldMapDrawImageExportOptions {
  mapImageUrl: string
  routeId: string
  points: readonly WorldMapPoint[]
  stops: readonly WorldMapDrawStop[]
  legStarts: readonly number[]
  legHidden: readonly boolean[]
  pathUserBends?: readonly boolean[]
  /** 编辑器线段；提供时优先于 points 折线绘制 */
  segmentLines?: readonly WorldMapDrawImageSegment[]
  strokeColor: string
  strokeWidth?: number
  showStopLabels?: boolean
  stopLabelScale?: number
  locale?: Locale
  cropToRoute?: boolean
}

interface PixelBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('map image load failed'))
    image.src = url
  })
}

function measurePaintedBounds(
  imageWidth: number,
  imageHeight: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): PixelBounds | null {
  const canvas = document.createElement('canvas')
  canvas.width = imageWidth
  canvas.height = imageHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  paint(ctx)

  const { data } = ctx.getImageData(0, 0, imageWidth, imageHeight)
  let minX = imageWidth
  let minY = imageHeight
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      const alpha = data[(y * imageWidth + x) * 4 + 3]!
      if (alpha <= 8) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (maxX < minX || maxY < minY) return null
  return { minX, minY, maxX, maxY }
}

function computeCropRect(
  imageWidth: number,
  imageHeight: number,
  content: PixelBounds,
  paddingRatio = 0.1,
) {
  const contentWidth = content.maxX - content.minX + 1
  const contentHeight = content.maxY - content.minY + 1
  const padX = Math.max(64, contentWidth * paddingRatio)
  const padY = Math.max(64, contentHeight * paddingRatio)

  const x0 = Math.max(0, Math.floor(content.minX - padX))
  const y0 = Math.max(0, Math.floor(content.minY - padY))
  const x1 = Math.min(imageWidth, Math.ceil(content.maxX + padX + 1))
  const y1 = Math.min(imageHeight, Math.ceil(content.maxY + padY + 1))

  return {
    x: x0,
    y: y0,
    width: Math.max(1, x1 - x0),
    height: Math.max(1, y1 - y0),
  }
}

function drawSegmentLinesOnCanvas(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  segmentLines: readonly WorldMapDrawImageSegment[],
  strokeColor: string,
  strokeWidth?: number,
) {
  if (segmentLines.length === 0) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = strokeWidth ?? Math.max(2, imageWidth * 0.0014)

  for (const segment of segmentLines) {
    ctx.beginPath()
    ctx.moveTo(segment.from[0] * imageWidth, segment.from[1] * imageHeight)
    ctx.lineTo(segment.to[0] * imageWidth, segment.to[1] * imageHeight)
    ctx.stroke()
  }
}

function drawRouteOnCanvas(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  legHidden: readonly boolean[],
  pathUserBends: readonly boolean[],
  strokeColor: string,
) {
  if (points.length < 2) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = Math.max(2, imageWidth * 0.0014)

  const anyLegHidden = legHidden.some(Boolean)
  if (!anyLegHidden) {
    const userBends = new Set<number>()
    pathUserBends.forEach((isUser, index) => {
      if (isUser) userBends.add(index)
    })
    const pathD = buildEditorCornerPathD(points, imageWidth, imageHeight, {
      userBendIndices: userBends,
    })
    if (pathD) ctx.stroke(new Path2D(pathD))
    return
  }

  const legs = getPathLegRanges(legStarts, points.length)

  legs.forEach((leg, legIndex) => {
    if (legHidden[legIndex]) return
    const legPoints: WorldMapPoint[] = []
    const legUserBends = new Set<number>()
    for (let index = leg.start; index <= leg.end; index += 1) {
      const point = points[index]
      if (!point) continue
      legPoints.push(point)
      if (pathUserBends[index]) legUserBends.add(index - leg.start)
    }
    if (legPoints.length < 2) return
    const pathD = buildEditorCornerPathD(legPoints, imageWidth, imageHeight, {
      userBendIndices: legUserBends,
    })
    ctx.stroke(new Path2D(pathD))
  })
}

function drawStopsOnCanvas(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  stops: readonly WorldMapDrawStop[],
  options: {
    showStopLabels: boolean
    stopLabelScale: number
    locale: Locale
  },
) {
  const scale = normalizeStopLabelScale(options.stopLabelScale)
  const nodeScale = mapDrawNodeScaleFactor(imageWidth, imageHeight)
  const radius = Math.max(4, imageWidth * 0.0022 * scale)
  const outlineWidth = Math.max(1.5, imageWidth * 0.0009 * scale)
  const fontSize = Math.max(8, Math.round(11 * scale * nodeScale))

  stops.forEach((stop, index) => {
    const x = stop.point[0] * imageWidth
    const y = stop.point[1] * imageHeight
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = outlineWidth
    ctx.stroke()
    if (!options.showStopLabels) return
    drawRouteEditorStopLabelOnCanvas(ctx, {
      anchorX: x,
      anchorY: y,
      label: formatDrawStopLabel(stop, index, options.locale),
      labelPosition: stop.labelPosition ?? 'top',
      fontSize,
      nodeScale,
      stopRadius: radius,
    })
  })
}

function drawRouteContentOnCanvas(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  options: {
    points: readonly WorldMapPoint[]
    legStarts: readonly number[]
    legHidden: readonly boolean[]
    pathUserBends: readonly boolean[]
    segmentLines: readonly WorldMapDrawImageSegment[]
    strokeColor: string
    strokeWidth?: number
  },
) {
  if (options.segmentLines.length > 0) {
    drawSegmentLinesOnCanvas(
      ctx,
      imageWidth,
      imageHeight,
      options.segmentLines,
      options.strokeColor,
      options.strokeWidth,
    )
    return
  }
  drawRouteOnCanvas(
    ctx,
    imageWidth,
    imageHeight,
    options.points,
    options.legStarts,
    options.legHidden,
    options.pathUserBends,
    options.strokeColor,
  )
}

function measureExportContentBounds(
  imageWidth: number,
  imageHeight: number,
  options: {
    points: readonly WorldMapPoint[]
    legStarts: readonly number[]
    legHidden: readonly boolean[]
    pathUserBends: readonly boolean[]
    segmentLines: readonly WorldMapDrawImageSegment[]
    strokeColor: string
    strokeWidth?: number
    stops: readonly WorldMapDrawStop[]
    showStopLabels: boolean
    stopLabelScale: number
    locale: Locale
  },
): PixelBounds | null {
  return measurePaintedBounds(imageWidth, imageHeight, (ctx) => {
    drawRouteContentOnCanvas(ctx, imageWidth, imageHeight, {
      points: options.points,
      legStarts: options.legStarts,
      legHidden: options.legHidden,
      pathUserBends: options.pathUserBends,
      segmentLines: options.segmentLines,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
    })
    drawStopsOnCanvas(ctx, imageWidth, imageHeight, options.stops, {
      showStopLabels: options.showStopLabels,
      stopLabelScale: options.stopLabelScale,
      locale: options.locale,
    })
  })
}

export async function exportWorldMapDrawImage(
  options: WorldMapDrawImageExportOptions,
  exportBaseName: string,
): Promise<void> {
  const image = await loadImage(options.mapImageUrl)
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight
  const showStopLabels = options.showStopLabels !== false
  const stopLabelScale = options.stopLabelScale ?? 1
  const locale = options.locale ?? 'en'
  const pathUserBends = options.pathUserBends ?? []
  const segmentLines = options.segmentLines ?? []
  const strokeWidth =
    options.strokeWidth != null && imageWidth > 0
      ? Math.max(2, (options.strokeWidth / 3) * imageWidth * 0.0014)
      : undefined

  const contentBounds = measureExportContentBounds(imageWidth, imageHeight, {
    points: options.points,
    legStarts: options.legStarts,
    legHidden: options.legHidden,
    pathUserBends,
    segmentLines,
    strokeColor: options.strokeColor,
    strokeWidth,
    stops: options.stops,
    showStopLabels,
    stopLabelScale,
    locale,
  })

  const crop =
    options.cropToRoute !== false && contentBounds
      ? computeCropRect(imageWidth, imageHeight, contentBounds)
      : { x: 0, y: 0, width: imageWidth, height: imageHeight }

  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
  ctx.save()
  ctx.translate(-crop.x, -crop.y)
  drawRouteContentOnCanvas(ctx, imageWidth, imageHeight, {
    points: options.points,
    legStarts: options.legStarts,
    legHidden: options.legHidden,
    pathUserBends,
    segmentLines,
    strokeColor: options.strokeColor,
    strokeWidth,
  })
  drawStopsOnCanvas(ctx, imageWidth, imageHeight, options.stops, {
    showStopLabels,
    stopLabelScale,
    locale,
  })
  ctx.restore()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/png')
  })
  if (!blob) throw new Error('png encode failed')

  const baseName = resolveExportBaseName(exportBaseName, options.routeId || 'route')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${baseName}.png`
  anchor.click()
  URL.revokeObjectURL(url)
}
