import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const ROAD_CELL_PX = 8
const SNAP_SEARCH_PX = 72
const PATHFIND_MAX_NODES = 120_000

const ROUTE_COLORS = [
  { r: 255, g: 255, b: 255, tolerance: 28 },
  { r: 254, g: 206, b: 122, tolerance: 38 },
  { r: 211, g: 54, b: 130, tolerance: 38 },
]

function colorDistance(r, g, b, target) {
  return Math.hypot(r - target.r, g - target.g, b - target.b)
}

function isRoutePixel(r, g, b, a) {
  if (a < 180) return false
  return ROUTE_COLORS.some((color) => colorDistance(r, g, b, color) <= color.tolerance)
}

function cellIndex(gridWidth, x, y) {
  return y * gridWidth + x
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const PATH_DIR_COUNT = NEIGHBORS.length
const PATH_STATE_STRIDE = PATH_DIR_COUNT + 1
const PATH_START_DIR = PATH_DIR_COUNT
const TURN_PENALTY = 0.35

function isOppositeDir(inDx, inDy, outDx, outDy) {
  return outDx === -inDx && outDy === -inDy
}

function neighborDirIndex(dx, dy) {
  return NEIGHBORS.findIndex(([x, y]) => x === dx && y === dy)
}

function pathStateId(cellIndexValue, incomingDir) {
  return cellIndexValue * PATH_STATE_STRIDE + incomingDir
}

function heuristic(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function pointsNear(a, b, epsilon = 0.00005) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= epsilon
}

function simplifyPath(points, minDistance) {
  if (points.length <= 2) return points
  const simplified = [points[0]]
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]
    const last = simplified[simplified.length - 1]
    if (index === points.length - 1 || Math.hypot(point[0] - last[0], point[1] - last[1]) >= minDistance) {
      if (!pointsNear(point, last)) simplified.push(point)
    }
  }
  return simplified
}

export class GeneralMapRoadSnapIndex {
  constructor(width, height, imageData) {
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

  pixelOffset(x, y) {
    const px = clamp(Math.round(x), 0, this.width - 1)
    const py = clamp(Math.round(y), 0, this.height - 1)
    return (py * this.width + px) * 4
  }

  isRoadAtPixel(x, y) {
    const offset = this.pixelOffset(x, y)
    return isRoutePixel(
      this.imageData[offset],
      this.imageData[offset + 1],
      this.imageData[offset + 2],
      this.imageData[offset + 3],
    )
  }

  cellHasRoad(gx, gy) {
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

  toGridPoint(point) {
    const px = clamp(point[0], 0, 1) * (this.width - 1)
    const py = clamp(point[1], 0, 1) * (this.height - 1)
    return {
      px,
      py,
      gx: clamp(Math.floor(px / ROAD_CELL_PX), 0, this.gridWidth - 1),
      gy: clamp(Math.floor(py / ROAD_CELL_PX), 0, this.gridHeight - 1),
    }
  }

  toNormalized(px, py) {
    return [px / (this.width - 1), py / (this.height - 1)]
  }

  snap(point) {
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

  trace(from, to) {
    const start = this.toGridPoint(from)
    const end = this.toGridPoint(to)
    const startCell = this.findNearestRoadCell(start.gx, start.gy)
    const endCell = this.findNearestRoadCell(end.gx, end.gy)
    if (!startCell || !endCell) return [this.snap(to)]

    const pathCells = this.findPath(startCell.gx, start.gy, endCell.gx, endCell.gy)
    if (!pathCells || pathCells.length === 0) return [this.snap(to)]

    const points = []
    for (const cell of pathCells) {
      const px = cell.gx * ROAD_CELL_PX + ROAD_CELL_PX / 2
      const py = cell.gy * ROAD_CELL_PX + ROAD_CELL_PX / 2
      points.push(this.toNormalized(px, py))
    }

    points[points.length - 1] = this.snap(to)
    return simplifyPath(points, 0.00045)
  }

  roadNeighborCount(gx, gy) {
    let count = 0
    for (const [dx, dy] of NEIGHBORS) {
      const nx = gx + dx
      const ny = gy + dy
      if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue
      if (this.roadGrid[cellIndex(this.gridWidth, nx, ny)]) count += 1
    }
    return count
  }

  /** U-turn only at junctions / roundabouts (degree ≠ 2), not on straight road segments. */
  allowsTurnaround(gx, gy) {
    return this.roadNeighborCount(gx, gy) !== 2
  }

  findNearestRoadCell(gx, gy) {
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

  findPath(sx, sy, ex, ey) {
    if (sx === ex && sy === ey) return [{ gx: sx, gy: sy }]

    const cellCount = this.gridWidth * this.gridHeight
    const stateCount = cellCount * PATH_STATE_STRIDE
    const gScore = new Float32Array(stateCount)
    const fScore = new Float32Array(stateCount)
    const cameFrom = new Int32Array(stateCount)
    const closed = new Uint8Array(stateCount)
    gScore.fill(Number.POSITIVE_INFINITY)
    fScore.fill(Number.POSITIVE_INFINITY)
    cameFrom.fill(-1)

    const startCell = cellIndex(this.gridWidth, sx, sy)
    const endCell = cellIndex(this.gridWidth, ex, ey)
    const startState = pathStateId(startCell, PATH_START_DIR)
    gScore[startState] = 0
    fScore[startState] = heuristic(sx, sy, ex, ey)

    const queue = [startState]
    let visited = 0

    while (queue.length > 0) {
      queue.sort((a, b) => fScore[a] - fScore[b])
      const state = queue.shift()
      if (closed[state]) continue
      closed[state] = 1
      visited += 1
      if (visited > PATHFIND_MAX_NODES) return null

      const cell = Math.floor(state / PATH_STATE_STRIDE)
      if (cell === endCell) {
        return this.reconstructDirectionalPath(cameFrom, state)
      }

      const incomingDir = state % PATH_STATE_STRIDE
      const cx = cell % this.gridWidth
      const cy = Math.floor(cell / this.gridWidth)

      for (const [dx, dy] of NEIGHBORS) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue
        const nextCell = cellIndex(this.gridWidth, nx, ny)
        if (!this.roadGrid[nextCell]) continue

        if (incomingDir !== PATH_START_DIR) {
          const [inDx, inDy] = NEIGHBORS[incomingDir]
          if (!this.allowsTurnaround(cx, cy) && isOppositeDir(inDx, inDy, dx, dy)) continue
        }

        const outDir = neighborDirIndex(dx, dy)
        if (outDir < 0) continue

        let stepCost = dx !== 0 && dy !== 0 ? 1.414 : 1
        if (incomingDir !== PATH_START_DIR && incomingDir !== outDir) {
          stepCost += TURN_PENALTY
        }

        const nextState = pathStateId(nextCell, outDir)
        if (closed[nextState]) continue

        const tentative = gScore[state] + stepCost
        if (tentative >= gScore[nextState]) continue

        cameFrom[nextState] = state
        gScore[nextState] = tentative
        fScore[nextState] = tentative + heuristic(nx, ny, ex, ey)
        queue.push(nextState)
      }
    }

    return null
  }

  reconstructDirectionalPath(cameFrom, state) {
    const path = []
    let cursor = state
    while (cursor >= 0) {
      const cell = Math.floor(cursor / PATH_STATE_STRIDE)
      path.push({ gx: cell % this.gridWidth, gy: Math.floor(cell / this.gridWidth) })
      cursor = cameFrom[cursor]
    }
    path.reverse()
    return path
  }
}

export function loadGeneralMapRoadSnapIndex(mapPath) {
  const png = PNG.sync.read(readFileSync(mapPath))
  const imageData = new Uint8ClampedArray(png.data.buffer)
  return new GeneralMapRoadSnapIndex(png.width, png.height, imageData)
}

export function mergePathPoints(current, segment) {
  const merged = [...current]
  for (const next of segment) {
    const prev = merged[merged.length - 1]
    if (!prev || Math.hypot(prev[0] - next[0], prev[1] - next[1]) > 0.00005) {
      merged.push(next)
    }
  }
  return merged
}

export function rebuildPathFromStopPoints(stops, index) {
  if (stops.length === 0) return []
  if (stops.length === 1) return [index.snap(stops[0].point)]

  let points = [index.snap(stops[0].point)]
  for (let i = 1; i < stops.length; i += 1) {
    const from = stops[i - 1].point
    const to = stops[i].point
    const segment = index.trace(from, to)
    points = mergePathPoints(points, segment.length > 0 ? segment : [index.snap(to)])
  }
  return points
}

function roundCoord(value) {
  return Math.round(value * 1000) / 1000
}

export function roundPoint(point) {
  return [roundCoord(point[0]), roundCoord(point[1])]
}
