import type { WorldMapPoint } from '../data/worldMapRoutes'

const GENERAL_MAP_URL = './maps/SIMapGerenal.png'
const ROAD_CELL_PX = 8
const SNAP_SEARCH_PX = 72
const PATHFIND_MAX_NODES = 120_000

let loadPromise: Promise<GeneralMapRoadSnapIndex | null> | null = null

/** Walkable route colors on SIMapGerenal: roads, bridges, tunnels. */
const ROUTE_COLORS = [
  { r: 255, g: 255, b: 255, tolerance: 28 }, // 道路 #ffffff
  { r: 254, g: 206, b: 122, tolerance: 38 }, // 大桥 #fece7a
  { r: 211, g: 54, b: 130, tolerance: 38 }, // 隧道 #d33682
] as const

function colorDistance(r: number, g: number, b: number, target: (typeof ROUTE_COLORS)[number]): number {
  return Math.hypot(r - target.r, g - target.g, b - target.b)
}

function isRoutePixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 180) return false
  return ROUTE_COLORS.some((color) => colorDistance(r, g, b, color) <= color.tolerance)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load ${url}`))
    image.src = url
  })
}

function cellIndex(gridWidth: number, x: number, y: number): number {
  return y * gridWidth + x
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

class GeneralMapRoadSnapIndex {
  readonly width: number
  readonly height: number
  readonly gridWidth: number
  readonly gridHeight: number
  readonly roadGrid: Uint8Array
  readonly imageData: Uint8ClampedArray

  constructor(width: number, height: number, imageData: Uint8ClampedArray) {
    this.width = width
    this.height = height
    this.gridWidth = Math.ceil(width / ROAD_CELL_PX)
    this.gridHeight = Math.ceil(height / ROAD_CELL_PX)
    this.imageData = imageData
    this.roadGrid = new Uint8Array(this.gridWidth * this.gridHeight)

    for (let gy = 0; gy < this.gridHeight; gy += 1) {
      for (let gx = 0; gx < this.gridWidth; gx += 1) {
        if (this.cellHasRoad(gx, gy)) {
          this.roadGrid[cellIndex(this.gridWidth, gx, gy)] = 1
        }
      }
    }
  }

  private pixelOffset(x: number, y: number): number {
    const px = clamp(Math.round(x), 0, this.width - 1)
    const py = clamp(Math.round(y), 0, this.height - 1)
    return (py * this.width + px) * 4
  }

  private isRoadAtPixel(x: number, y: number): boolean {
    const offset = this.pixelOffset(x, y)
    return isRoutePixel(
      this.imageData[offset]!,
      this.imageData[offset + 1]!,
      this.imageData[offset + 2]!,
      this.imageData[offset + 3]!,
    )
  }

  private cellHasRoad(gx: number, gy: number): boolean {
    const startX = gx * ROAD_CELL_PX
    const startY = gy * ROAD_CELL_PX
    const endX = Math.min(this.width, startX + ROAD_CELL_PX)
    const endY = Math.min(this.height, startY + ROAD_CELL_PX)
    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        if (this.isRoadAtPixel(x, y)) return true
      }
    }
    return false
  }

  private toGridPoint(point: WorldMapPoint): { gx: number; gy: number; px: number; py: number } {
    const px = clamp(point[0], 0, 1) * (this.width - 1)
    const py = clamp(point[1], 0, 1) * (this.height - 1)
    return {
      px,
      py,
      gx: clamp(Math.floor(px / ROAD_CELL_PX), 0, this.gridWidth - 1),
      gy: clamp(Math.floor(py / ROAD_CELL_PX), 0, this.gridHeight - 1),
    }
  }

  private toNormalized(px: number, py: number): WorldMapPoint {
    return [px / (this.width - 1), py / (this.height - 1)]
  }

  snap(point: WorldMapPoint): WorldMapPoint {
    const { px, py } = this.toGridPoint(point)
    if (this.isRoadAtPixel(px, py)) {
      return this.toNormalized(px, py)
    }

    let bestDistance = Number.POSITIVE_INFINITY
    let bestX = px
    let bestY = py

    for (let radius = 1; radius <= SNAP_SEARCH_PX; radius += 1) {
      let foundInRing = false
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          const x = px + dx
          const y = py + dy
          if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue
          if (!this.isRoadAtPixel(x, y)) continue
          const distance = dx * dx + dy * dy
          if (distance < bestDistance) {
            bestDistance = distance
            bestX = x
            bestY = y
            foundInRing = true
          }
        }
      }
      if (foundInRing) break
    }

    return this.toNormalized(bestX, bestY)
  }

  trace(from: WorldMapPoint, to: WorldMapPoint): WorldMapPoint[] {
    const start = this.toGridPoint(from)
    const end = this.toGridPoint(to)
    const startCell = this.findNearestRoadCell(start.gx, start.gy)
    const endCell = this.findNearestRoadCell(end.gx, end.gy)
    if (!startCell || !endCell) return [this.snap(to)]

    const pathCells = this.findPath(startCell.gx, start.gy, endCell.gx, endCell.gy)
    if (!pathCells || pathCells.length === 0) return [this.snap(to)]

    const points: WorldMapPoint[] = []
    for (const cell of pathCells) {
      const px = cell.gx * ROAD_CELL_PX + ROAD_CELL_PX / 2
      const py = cell.gy * ROAD_CELL_PX + ROAD_CELL_PX / 2
      points.push(this.toNormalized(px, py))
    }

    points[points.length - 1] = this.snap(to)
    return simplifyPath(points, 0.00045)
  }

  private findNearestRoadCell(gx: number, gy: number): { gx: number; gy: number } | null {
    if (this.roadGrid[cellIndex(this.gridWidth, gx, gy)]) return { gx, gy }
    const maxRadius = Math.ceil(SNAP_SEARCH_PX / ROAD_CELL_PX)
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          const nx = gx + dx
          const ny = gy + dy
          if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue
          if (this.roadGrid[cellIndex(this.gridWidth, nx, ny)]) return { gx: nx, gy: ny }
        }
      }
    }
    return null
  }

  private findPath(sx: number, sy: number, ex: number, ey: number): Array<{ gx: number; gy: number }> | null {
    if (sx === ex && sy === ey) return [{ gx: sx, gy: sy }]

    const total = this.gridWidth * this.gridHeight
    const gScore = new Float32Array(total)
    const fScore = new Float32Array(total)
    const cameFrom = new Int32Array(total)
    const open = new Int8Array(total)
    const closed = new Int8Array(total)
    gScore.fill(Number.POSITIVE_INFINITY)
    fScore.fill(Number.POSITIVE_INFINITY)
    cameFrom.fill(-1)

    const startIndex = cellIndex(this.gridWidth, sx, sy)
    const endIndex = cellIndex(this.gridWidth, ex, ey)
    gScore[startIndex] = 0
    fScore[startIndex] = heuristic(sx, sy, ex, ey)

    const queue: number[] = [startIndex]
    open[startIndex] = 1
    let visited = 0

    const neighbors = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]

    while (queue.length > 0) {
      queue.sort((a, b) => fScore[a]! - fScore[b]!)
      const current = queue.shift()!
      if (current === endIndex) {
        return this.reconstructPath(cameFrom, current)
      }
      if (closed[current]) continue
      closed[current] = 1
      open[current] = 0
      visited += 1
      if (visited > PATHFIND_MAX_NODES) return null

      const cx = current % this.gridWidth
      const cy = Math.floor(current / this.gridWidth)

      for (const [dx, dy] of neighbors) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue
        const neighbor = cellIndex(this.gridWidth, nx, ny)
        if (!this.roadGrid[neighbor] || closed[neighbor]) continue

        const stepCost = dx !== 0 && dy !== 0 ? 1.414 : 1
        const tentative = gScore[current]! + stepCost
        if (tentative >= gScore[neighbor]!) continue

        cameFrom[neighbor] = current
        gScore[neighbor] = tentative
        fScore[neighbor] = tentative + heuristic(nx, ny, ex, ey)
        if (!open[neighbor]) {
          open[neighbor] = 1
          queue.push(neighbor)
        }
      }
    }

    return null
  }

  private reconstructPath(cameFrom: Int32Array, current: number): Array<{ gx: number; gy: number }> {
    const path: Array<{ gx: number; gy: number }> = []
    let cursor = current
    while (cursor >= 0) {
      path.push({ gx: cursor % this.gridWidth, gy: Math.floor(cursor / this.gridWidth) })
      cursor = cameFrom[cursor]!
    }
    path.reverse()
    return path
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function pointsNear(a: WorldMapPoint, b: WorldMapPoint, epsilon = 0.00005): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= epsilon
}

function simplifyPath(points: WorldMapPoint[], minDistance: number): WorldMapPoint[] {
  if (points.length <= 2) return points
  const simplified: WorldMapPoint[] = [points[0]!]
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!
    const last = simplified[simplified.length - 1]!
    if (index === points.length - 1 || Math.hypot(point[0] - last[0], point[1] - last[1]) >= minDistance) {
      if (!pointsNear(point, last)) simplified.push(point)
    }
  }
  return simplified
}

export async function loadGeneralMapRoadSnapIndex(): Promise<GeneralMapRoadSnapIndex | null> {
  if (typeof document === 'undefined') return null

  try {
    const image = await loadImage(GENERAL_MAP_URL)
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (width <= 0 || height <= 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, width, height)
    return new GeneralMapRoadSnapIndex(width, height, data)
  } catch {
    return null
  }
}

export function preloadGeneralMapRoadSnapIndex(): Promise<GeneralMapRoadSnapIndex | null> {
  if (!loadPromise) {
    loadPromise = loadGeneralMapRoadSnapIndex()
  }
  return loadPromise
}

export function snapPointToGeneralMapRoad(
  index: GeneralMapRoadSnapIndex | null,
  point: WorldMapPoint,
): WorldMapPoint {
  return index?.snap(point) ?? point
}

export function traceGeneralMapRoadPath(
  index: GeneralMapRoadSnapIndex | null,
  from: WorldMapPoint,
  to: WorldMapPoint,
): WorldMapPoint[] {
  if (!index) return [to]
  const traced = index.trace(from, to)
  return traced.length > 0 ? traced : [index.snap(to)]
}

export type { GeneralMapRoadSnapIndex }
