import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { Locale } from '../i18n/types'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import { getPathLegRanges } from './worldMapDrawPathEdit'
import { normalizeStopLabelScale } from './mapDrawStopLabel'
import { resolveExportBaseName } from './worldMapRouteExport'
import { formatDrawStopLabel } from './worldMapDrawStopDisplay'

export interface WorldMapDrawImageExportOptions {
  mapImageUrl: string
  routeId: string
  points: readonly WorldMapPoint[]
  stops: readonly WorldMapDrawStop[]
  legStarts: readonly number[]
  legHidden: readonly boolean[]
  strokeColor: string
  showStopLabels?: boolean
  stopLabelScale?: number
  locale?: Locale
  cropToRoute?: boolean
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('map image load failed'))
    image.src = url
  })
}

function collectVisiblePathPoints(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  legHidden: readonly boolean[],
): WorldMapPoint[] {
  if (points.length < 2) return [...points]
  const legs = getPathLegRanges(legStarts, points.length)
  const merged: WorldMapPoint[] = []
  legs.forEach((leg, legIndex) => {
    if (legHidden[legIndex]) return
    for (let index = leg.start; index <= leg.end; index += 1) {
      const point = points[index]
      if (!point) continue
      merged.push(point)
    }
  })
  return merged.length >= 2 ? merged : [...points]
}

function computeCropRect(
  imageWidth: number,
  imageHeight: number,
  points: readonly WorldMapPoint[],
  stops: readonly WorldMapDrawStop[],
  options: {
    showStopLabels: boolean
    stopLabelScale: number
    locale: Locale
    strokeWidth: number
  },
  paddingRatio = 0.08,
) {
  const xs: number[] = []
  const ys: number[] = []
  const labelScale = normalizeStopLabelScale(options.stopLabelScale)
  const markerSize = Math.max(8, imageWidth * 0.0045 * labelScale)
  const fontSize = Math.max(11, imageWidth * 0.0032 * labelScale)
  const strokePad = Math.max(16, options.strokeWidth * 2)

  for (const point of points) {
    xs.push(point[0] * imageWidth)
    ys.push(point[1] * imageHeight)
  }
  for (const [index, stop] of stops.entries()) {
    const x = stop.point[0] * imageWidth
    const y = stop.point[1] * imageHeight
    xs.push(x - markerSize / 2, x + markerSize / 2)
    ys.push(y - markerSize / 2, y + markerSize / 2 + fontSize * 0.6)
    if (options.showStopLabels) {
      const label = formatDrawStopLabel(stop, index, options.locale)
      const labelWidth = label.length * fontSize * 0.58 + markerSize * 0.7
      xs.push(x + markerSize * 0.7 + labelWidth)
    }
  }
  if (xs.length === 0) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight }
  }
  let minX = Math.min(...xs) - strokePad
  let minY = Math.min(...ys) - strokePad
  let maxX = Math.max(...xs) + strokePad
  let maxY = Math.max(...ys) + strokePad
  const padX = Math.max(48, (maxX - minX) * paddingRatio)
  const padY = Math.max(48, (maxY - minY) * paddingRatio)
  minX = Math.max(0, minX - padX)
  minY = Math.max(0, minY - padY)
  maxX = Math.min(imageWidth, maxX + padX)
  maxY = Math.min(imageHeight, maxY + padY)
  const x0 = Math.floor(minX)
  const y0 = Math.floor(minY)
  const x1 = Math.min(imageWidth, Math.ceil(maxX))
  const y1 = Math.min(imageHeight, Math.ceil(maxY))
  return {
    x: x0,
    y: y0,
    width: Math.max(1, x1 - x0),
    height: Math.max(1, y1 - y0),
  }
}

function drawRouteOnCanvas(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  legHidden: readonly boolean[],
  strokeColor: string,
) {
  if (points.length < 2) return
  const legs = getPathLegRanges(legStarts, points.length)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = Math.max(2, imageWidth * 0.0014)

  legs.forEach((leg, legIndex) => {
    if (legHidden[legIndex]) return
    ctx.beginPath()
    for (let index = leg.start; index <= leg.end; index += 1) {
      const point = points[index]
      if (!point) continue
      const x = point[0] * imageWidth
      const y = point[1] * imageHeight
      if (index === leg.start) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  })
}

function drawStopsOnCanvas(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  stops: readonly WorldMapDrawStop[],
  strokeColor: string,
  options: {
    showStopLabels: boolean
    stopLabelScale: number
    locale: Locale
  },
) {
  const scale = normalizeStopLabelScale(options.stopLabelScale)
  const markerSize = Math.max(8, imageWidth * 0.0045 * scale)
  const fontSize = Math.max(11, imageWidth * 0.0032 * scale)
  ctx.textBaseline = 'middle'

  stops.forEach((stop, index) => {
    const x = stop.point[0] * imageWidth
    const y = stop.point[1] * imageHeight
    ctx.fillStyle = strokeColor
    ctx.fillRect(x - markerSize / 2, y - markerSize / 2, markerSize, markerSize)
    if (!options.showStopLabels) return
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = '#111'
    ctx.fillText(formatDrawStopLabel(stop, index, options.locale), x + markerSize * 0.7, y)
  })
}

export async function exportWorldMapDrawImage(
  options: WorldMapDrawImageExportOptions,
  exportBaseName: string,
): Promise<void> {
  const image = await loadImage(options.mapImageUrl)
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight
  const visiblePoints = collectVisiblePathPoints(
    options.points,
    options.legStarts,
    options.legHidden,
  )
  const strokeWidth = Math.max(2, imageWidth * 0.0014)
  const showStopLabels = options.showStopLabels !== false
  const stopLabelScale = options.stopLabelScale ?? 1
  const locale = options.locale ?? 'en'

  const crop = options.cropToRoute !== false
    ? computeCropRect(imageWidth, imageHeight, visiblePoints, options.stops, {
        showStopLabels,
        stopLabelScale,
        locale,
        strokeWidth,
      })
    : { x: 0, y: 0, width: imageWidth, height: imageHeight }

  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
  ctx.save()
  ctx.translate(-crop.x, -crop.y)
  drawRouteOnCanvas(
    ctx,
    imageWidth,
    imageHeight,
    options.points,
    options.legStarts,
    options.legHidden,
    options.strokeColor,
  )
  drawStopsOnCanvas(ctx, imageWidth, imageHeight, options.stops, options.strokeColor, {
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
