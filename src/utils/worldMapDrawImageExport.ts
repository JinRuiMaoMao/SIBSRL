import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import { getPathLegRanges } from './worldMapDrawPathEdit'
import { resolveExportBaseName } from './worldMapRouteExport'

export interface WorldMapDrawImageExportOptions {
  mapImageUrl: string
  routeId: string
  points: readonly WorldMapPoint[]
  stops: readonly WorldMapDrawStop[]
  legStarts: readonly number[]
  legHidden: readonly boolean[]
  strokeColor: string
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
  paddingRatio = 0.04,
) {
  const xs: number[] = []
  const ys: number[] = []
  for (const point of points) {
    xs.push(point[0] * imageWidth)
    ys.push(point[1] * imageHeight)
  }
  for (const stop of stops) {
    xs.push(stop.point[0] * imageWidth)
    ys.push(stop.point[1] * imageHeight)
  }
  if (xs.length === 0) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight }
  }
  let minX = Math.min(...xs)
  let minY = Math.min(...ys)
  let maxX = Math.max(...xs)
  let maxY = Math.max(...ys)
  const padX = Math.max(24, (maxX - minX) * paddingRatio)
  const padY = Math.max(24, (maxY - minY) * paddingRatio)
  minX = Math.max(0, minX - padX)
  minY = Math.max(0, minY - padY)
  maxX = Math.min(imageWidth, maxX + padX)
  maxY = Math.min(imageHeight, maxY + padY)
  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.max(1, Math.ceil(maxX - minX)),
    height: Math.max(1, Math.ceil(maxY - minY)),
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
) {
  const markerSize = Math.max(8, imageWidth * 0.0045)
  const fontSize = Math.max(11, imageWidth * 0.0032)
  ctx.font = `${fontSize}px sans-serif`
  ctx.textBaseline = 'middle'

  stops.forEach((stop, index) => {
    const x = stop.point[0] * imageWidth
    const y = stop.point[1] * imageHeight
    ctx.fillStyle = strokeColor
    ctx.fillRect(x - markerSize / 2, y - markerSize / 2, markerSize, markerSize)
    ctx.fillStyle = '#111'
    const label = `${index + 1}. ${stop.name.zh || stop.name.en}`
    ctx.fillText(label, x + markerSize * 0.7, y)
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

  const crop = options.cropToRoute !== false
    ? computeCropRect(imageWidth, imageHeight, visiblePoints, options.stops)
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
  drawStopsOnCanvas(ctx, imageWidth, imageHeight, options.stops, options.strokeColor)
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
