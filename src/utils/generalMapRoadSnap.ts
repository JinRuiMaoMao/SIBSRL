import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapVirtualNodeKind } from '../types/worldMapDraw'
import { MAP_NORTH_DIR } from './mapSurfaceKind'

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

const PLAIN_ROAD = ROUTE_COLORS[0]!
const BRIDGE_SURFACE = ROUTE_COLORS[1]!
const TUNNEL_SURFACE = ROUTE_COLORS[2]!

function colorDistance(r: number, g: number, b: number, target: (typeof ROUTE_COLORS)[number]): number {
  return Math.hypot(r - target.r, g - target.g, b - target.b)
}

function isRoutePixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 180) return false
  return ROUTE_COLORS.some((color) => colorDistance(r, g, b, color) <= color.tolerance)
}

function matchesSurface(
  r: number,
  g: number,
  b: number,
  a: number,
  target: (typeof ROUTE_COLORS)[number],
): boolean {
  if (a < 180) return false
  return colorDistance(r, g, b, target) <= target.tolerance
}

function isPlainRoadPixel(r: number, g: number, b: number, a: number): boolean {
  return matchesSurface(r, g, b, a, PLAIN_ROAD)
}

function isBridgePixel(r: number, g: number, b: number, a: number): boolean {
  return matchesSurface(r, g, b, a, BRIDGE_SURFACE)
}

function isTunnelPixel(r: number, g: number, b: number, a: number): boolean {
  return matchesSurface(r, g, b, a, TUNNEL_SURFACE)
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

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const

const PATH_DIR_COUNT = NEIGHBORS.length
const PATH_STATE_STRIDE = PATH_DIR_COUNT + 1
const PATH_START_DIR = PATH_DIR_COUNT
const TURN_PENALTY = 0.35

function cellIndex(gridWidth: number, x: number, y: number): number {
  return y * gridWidth + x
}

function isOppositeDir(inDx: number, inDy: number, outDx: number, outDy: number): boolean {
  return outDx === -inDx && outDy === -inDy
}

function neighborDirIndex(dx: number, dy: number): number {
  return NEIGHBORS.findIndex(([x, y]) => x === dx && y === dy)
}

function pathStateId(cellIndex: number, incomingDir: number): number {
  return cellIndex * PATH_STATE_STRIDE + incomingDir
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

export type VirtualNodeKind = WorldMapVirtualNodeKind

export interface VirtualNodePathConstraint {
  gx: number
  gy: number
  kind: VirtualNodeKind
}

function turnLeftDir(inDir: number): number {
  const [dx, dy] = NEIGHBORS[inDir]!
  return neighborDirIndex(-dy, dx)
}

function turnRightDir(inDir: number): number {
  const [dx, dy] = NEIGHBORS[inDir]!
  return neighborDirIndex(dy, -dx)
}

export function exitDirForKind(incomingDir: number, kind: VirtualNodeKind): number {
  if (kind === 'straight') return MAP_NORTH_DIR
  if (kind === 'left') return turnLeftDir(incomingDir)
  if (kind === 'right') return turnRightDir(incomingDir)
  return incomingDir
}

export function satisfiesVirtualNodeTransition(
  incomingDir: number,
  _constraint: VirtualNodePathConstraint,
): boolean {
  return incomingDir !== PATH_START_DIR
}

interface FindPathOptions {
  endConstraint?: VirtualNodePathConstraint
  startStates?: number[]
  startViaKind?: VirtualNodeKind
}

class GeneralMapRoadSnapIndex {
  readonly width: number
  readonly height: number
  readonly gridWidth: number
  readonly gridHeight: number
  readonly roadGrid: Uint8Array
  readonly plainRoadGrid: Uint8Array
  readonly bridgeGrid: Uint8Array
  readonly tunnelGrid: Uint8Array
  readonly imageData: Uint8ClampedArray

  constructor(width: number, height: number, imageData: Uint8ClampedArray) {
    this.width = width
    this.height = height
    this.gridWidth = Math.ceil(width / ROAD_CELL_PX)
    this.gridHeight = Math.ceil(height / ROAD_CELL_PX)
    this.imageData = imageData
    this.roadGrid = new Uint8Array(this.gridWidth * this.gridHeight)
    this.plainRoadGrid = new Uint8Array(this.gridWidth * this.gridHeight)
    this.bridgeGrid = new Uint8Array(this.gridWidth * this.gridHeight)
    this.tunnelGrid = new Uint8Array(this.gridWidth * this.gridHeight)

    for (let gy = 0; gy < this.gridHeight; gy += 1) {
      for (let gx = 0; gx < this.gridWidth; gx += 1) {
        const idx = cellIndex(this.gridWidth, gx, gy)
        const plain = this.cellHasPlainRoad(gx, gy)
        const bridge = this.cellHasBridge(gx, gy)
        const tunnel = this.cellHasTunnel(gx, gy)
        if (plain) this.plainRoadGrid[idx] = 1
        if (bridge) this.bridgeGrid[idx] = 1
        if (tunnel) this.tunnelGrid[idx] = 1
        if (plain || bridge || tunnel) this.roadGrid[idx] = 1
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

  private readPixel(x: number, y: number): [number, number, number, number] {
    const offset = this.pixelOffset(x, y)
    return [
      this.imageData[offset]!,
      this.imageData[offset + 1]!,
      this.imageData[offset + 2]!,
      this.imageData[offset + 3]!,
    ]
  }

  private isPlainRoadAtPixel(x: number, y: number): boolean {
    const [r, g, b, a] = this.readPixel(x, y)
    return isPlainRoadPixel(r, g, b, a)
  }

  private isBridgeAtPixel(x: number, y: number): boolean {
    const [r, g, b, a] = this.readPixel(x, y)
    return isBridgePixel(r, g, b, a)
  }

  private isTunnelAtPixel(x: number, y: number): boolean {
    const [r, g, b, a] = this.readPixel(x, y)
    return isTunnelPixel(r, g, b, a)
  }

  private cellHasSurface(
    gx: number,
    gy: number,
    probe: (x: number, y: number) => boolean,
  ): boolean {
    const startX = gx * ROAD_CELL_PX
    const startY = gy * ROAD_CELL_PX
    const endX = Math.min(this.width, startX + ROAD_CELL_PX)
    const endY = Math.min(this.height, startY + ROAD_CELL_PX)
    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        if (probe(x, y)) return true
      }
    }
    return false
  }

  private cellHasRoad(gx: number, gy: number): boolean {
    return this.cellHasSurface(gx, gy, (x, y) => this.isRoadAtPixel(x, y))
  }

  private cellHasPlainRoad(gx: number, gy: number): boolean {
    return this.cellHasSurface(gx, gy, (x, y) => this.isPlainRoadAtPixel(x, y))
  }

  private cellHasBridge(gx: number, gy: number): boolean {
    return this.cellHasSurface(gx, gy, (x, y) => this.isBridgeAtPixel(x, y))
  }

  private cellHasTunnel(gx: number, gy: number): boolean {
    return this.cellHasSurface(gx, gy, (x, y) => this.isTunnelAtPixel(x, y))
  }

  isPlainRoadCell(gx: number, gy: number): boolean {
    if (gx < 0 || gy < 0 || gx >= this.gridWidth || gy >= this.gridHeight) return false
    return this.plainRoadGrid[cellIndex(this.gridWidth, gx, gy)] === 1
  }

  isBridgeCell(gx: number, gy: number): boolean {
    if (gx < 0 || gy < 0 || gx >= this.gridWidth || gy >= this.gridHeight) return false
    return this.bridgeGrid[cellIndex(this.gridWidth, gx, gy)] === 1
  }

  isTunnelCell(gx: number, gy: number): boolean {
    if (gx < 0 || gy < 0 || gx >= this.gridWidth || gy >= this.gridHeight) return false
    return this.tunnelGrid[cellIndex(this.gridWidth, gx, gy)] === 1
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

  snapVirtualNode(point: WorldMapPoint, kind: VirtualNodeKind): WorldMapPoint {
    const { px, py, gx, gy } = this.toGridPoint(point)
    let cell: { gx: number; gy: number } | null = null

    switch (kind) {
      case 'on-bridge':
        cell = this.findNearestSurfaceCell(gx, gy, (x, y) => this.bridgeGrid[y * this.gridWidth + x] === 1)
        break
      case 'off-bridge':
        cell = this.findNearestSurfaceCell(gx, gy, (x, y) => this.plainRoadGrid[y * this.gridWidth + x] === 1)
        break
      case 'enter-tunnel':
        cell = this.findNearestSurfaceCell(gx, gy, (x, y) => this.tunnelGrid[y * this.gridWidth + x] === 1)
        break
      case 'exit-tunnel':
        cell = this.findNearestSurfaceCell(gx, gy, (x, y) => this.plainRoadGrid[y * this.gridWidth + x] === 1)
        break
      default:
        cell = this.findNearestRoadCell(gx, gy)
        break
    }

    if (!cell) return this.snap(point)
    const snapPx = cell.gx * ROAD_CELL_PX + ROAD_CELL_PX / 2
    const snapPy = cell.gy * ROAD_CELL_PX + ROAD_CELL_PX / 2
    return this.toNormalized(snapPx, snapPy)
  }

  private findNearestSurfaceCell(
    gx: number,
    gy: number,
    matches: (gx: number, gy: number) => boolean,
  ): { gx: number; gy: number } | null {
    if (matches(gx, gy)) return { gx, gy }
    const maxRadius = Math.ceil(SNAP_SEARCH_PX / ROAD_CELL_PX)
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          const nx = gx + dx
          const ny = gy + dy
          if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue
          if (matches(nx, ny)) return { gx: nx, gy: ny }
        }
      }
    }
    return null
  }

  private getValidExitDirs(gx: number, gy: number, incomingDir: number, kind: VirtualNodeKind): number[] {
    if (incomingDir === PATH_START_DIR) return []
    const exits: number[] = []
    for (let outDir = 0; outDir < PATH_DIR_COUNT; outDir += 1) {
      if (this.isValidVirtualTransition(gx, gy, incomingDir, outDir, kind)) exits.push(outDir)
    }
    return exits
  }

  private isValidVirtualTransition(
    gx: number,
    gy: number,
    incomingDir: number,
    outDir: number,
    kind: VirtualNodeKind,
  ): boolean {
    const [inDx, inDy] = NEIGHBORS[incomingDir]!
    const [outDx, outDy] = NEIGHBORS[outDir]!
    const prevGx = gx - inDx
    const prevGy = gy - inDy
    const nextGx = gx + outDx
    const nextGy = gy + outDy
    if (prevGx < 0 || prevGy < 0 || prevGx >= this.gridWidth || prevGy >= this.gridHeight) return false
    if (nextGx < 0 || nextGy < 0 || nextGx >= this.gridWidth || nextGy >= this.gridHeight) return false
    if (!this.roadGrid[cellIndex(this.gridWidth, prevGx, prevGy)]) return false
    if (!this.roadGrid[cellIndex(this.gridWidth, nextGx, nextGy)]) return false

    switch (kind) {
      case 'straight':
        return outDir === MAP_NORTH_DIR
      case 'left':
        return outDir === turnLeftDir(incomingDir)
      case 'right':
        return outDir === turnRightDir(incomingDir)
      case 'on-bridge':
        return (
          this.isPlainRoadCell(prevGx, prevGy) &&
          this.isBridgeCell(gx, gy) &&
          this.isBridgeCell(nextGx, nextGy)
        )
      case 'off-bridge':
        return (
          this.isBridgeCell(prevGx, prevGy) &&
          this.isPlainRoadCell(gx, gy) &&
          this.isPlainRoadCell(nextGx, nextGy)
        )
      case 'enter-tunnel':
        return (
          this.isPlainRoadCell(prevGx, prevGy) &&
          this.isTunnelCell(gx, gy) &&
          this.isTunnelCell(nextGx, nextGy)
        )
      case 'exit-tunnel':
        return (
          this.isTunnelCell(prevGx, prevGy) &&
          this.isPlainRoadCell(gx, gy) &&
          this.isPlainRoadCell(nextGx, nextGy)
        )
      default:
        return false
    }
  }

  trace(from: WorldMapPoint, to: WorldMapPoint, via: VirtualNodePathConstraint[] = []): WorldMapPoint[] {
    const start = this.toGridPoint(from)
    const end = this.toGridPoint(to)
    const startCell = this.findNearestRoadCell(start.gx, start.gy)
    const endCell = this.findNearestRoadCell(end.gx, end.gy)
    if (!startCell || !endCell) return [this.snap(to)]

    const chain: Array<{ gx: number; gy: number; endConstraint?: VirtualNodePathConstraint }> = [
      ...via.map((constraint) => ({
        gx: constraint.gx,
        gy: constraint.gy,
        endConstraint: constraint,
      })),
      { gx: endCell.gx, gy: endCell.gy },
    ]

    let startStates: number[] | undefined
    let startViaKind: VirtualNodeKind | undefined
    const mergedCells: Array<{ gx: number; gy: number }> = []
    let cursor = startCell

    for (const target of chain) {
      const segment = this.findPath(cursor.gx, cursor.gy, target.gx, target.gy, {
        endConstraint: target.endConstraint,
        startStates,
        startViaKind,
      })
      if (!segment || segment.length === 0) return [this.snap(to)]

      if (mergedCells.length > 0 && segment.length > 0) {
        segment.shift()
      }
      mergedCells.push(...segment)

      if (target.endConstraint) {
        startStates = this.collectStatesAtCell(target.endConstraint)
        startViaKind = target.endConstraint.kind
        if (startStates.length === 0) return [this.snap(to)]
      } else {
        startStates = undefined
        startViaKind = undefined
      }
      cursor = { gx: target.gx, gy: target.gy }
    }

    const points: WorldMapPoint[] = []
    for (const cell of mergedCells) {
      const px = cell.gx * ROAD_CELL_PX + ROAD_CELL_PX / 2
      const py = cell.gy * ROAD_CELL_PX + ROAD_CELL_PX / 2
      points.push(this.toNormalized(px, py))
    }

    points[points.length - 1] = this.snap(to)
    return simplifyPath(points, 0.00045)
  }

  roadDirectionsAt(point: WorldMapPoint): number[] {
    const { gx, gy } = this.toGridPoint(point)
    const cell = this.findNearestRoadCell(gx, gy)
    if (!cell) return []
    const dirs: number[] = []
    for (let dir = 0; dir < PATH_DIR_COUNT; dir += 1) {
      const [dx, dy] = NEIGHBORS[dir]!
      const nx = cell.gx + dx
      const ny = cell.gy + dy
      if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue
      if (this.roadGrid[cellIndex(this.gridWidth, nx, ny)]) dirs.push(dir)
    }
    return dirs
  }

  toVirtualNodeConstraint(point: WorldMapPoint, kind: VirtualNodeKind): VirtualNodePathConstraint | null {
    const snapped = this.snapVirtualNode(point, kind)
    const { gx, gy } = this.toGridPoint(snapped)
    const cell = this.resolveConstraintCell(gx, gy, kind)
    if (!cell) return null
    return { gx: cell.gx, gy: cell.gy, kind }
  }

  private resolveConstraintCell(
    gx: number,
    gy: number,
    kind: VirtualNodeKind,
  ): { gx: number; gy: number } | null {
    switch (kind) {
      case 'on-bridge':
        return this.findNearestSurfaceCell(gx, gy, (x, y) => this.isBridgeCell(x, y))
      case 'off-bridge':
      case 'exit-tunnel':
        return this.findNearestSurfaceCell(gx, gy, (x, y) => this.isPlainRoadCell(x, y))
      case 'enter-tunnel':
        return this.findNearestSurfaceCell(gx, gy, (x, y) => this.isTunnelCell(x, y))
      default:
        return this.findNearestRoadCell(gx, gy)
    }
  }

  private collectStatesAtCell(constraint: VirtualNodePathConstraint): number[] {
    const cell = cellIndex(this.gridWidth, constraint.gx, constraint.gy)
    const states: number[] = []
    for (let incomingDir = 0; incomingDir < PATH_DIR_COUNT; incomingDir += 1) {
      if (this.getValidExitDirs(constraint.gx, constraint.gy, incomingDir, constraint.kind).length === 0) {
        continue
      }
      states.push(pathStateId(cell, incomingDir))
    }
    return states
  }

  private roadNeighborCount(gx: number, gy: number): number {
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
  private allowsTurnaround(gx: number, gy: number): boolean {
    return this.roadNeighborCount(gx, gy) !== 2
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

  private findPath(
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    options: FindPathOptions = {},
  ): Array<{ gx: number; gy: number }> | null {
    if (sx === ex && sy === ey && !options.endConstraint) return [{ gx: sx, gy: sy }]

    const cellCount = this.gridWidth * this.gridHeight
    const stateCount = cellCount * PATH_STATE_STRIDE
    const gScore = new Float32Array(stateCount)
    const fScore = new Float32Array(stateCount)
    const cameFrom = new Int32Array(stateCount)
    const closed = new Uint8Array(stateCount)
    gScore.fill(Number.POSITIVE_INFINITY)
    fScore.fill(Number.POSITIVE_INFINITY)
    cameFrom.fill(-1)

    const endCell = cellIndex(this.gridWidth, ex, ey)
    const queue: number[] = []
    const startStateSet = options.startStates ? new Set(options.startStates) : null

    if (options.startStates && options.startStates.length > 0) {
      for (const state of options.startStates) {
        gScore[state] = 0
        fScore[state] = heuristic(sx, sy, ex, ey)
        queue.push(state)
      }
    } else {
      const startCell = cellIndex(this.gridWidth, sx, sy)
      const startState = pathStateId(startCell, PATH_START_DIR)
      gScore[startState] = 0
      fScore[startState] = heuristic(sx, sy, ex, ey)
      queue.push(startState)
    }

    let visited = 0
    let bestGoalState = -1
    let bestGoalScore = Number.POSITIVE_INFINITY

    while (queue.length > 0) {
      queue.sort((a, b) => fScore[a]! - fScore[b]!)
      const state = queue.shift()!
      if (closed[state]) continue
      closed[state] = 1
      visited += 1
      if (visited > PATHFIND_MAX_NODES) return null

      const cell = Math.floor(state / PATH_STATE_STRIDE)
      const incomingDir = state % PATH_STATE_STRIDE

      if (cell === endCell) {
        const endOk =
          !options.endConstraint ||
          (incomingDir !== PATH_START_DIR &&
            satisfiesVirtualNodeTransition(incomingDir, options.endConstraint))
        if (endOk) {
          if (options.endConstraint) {
            return this.reconstructDirectionalPath(cameFrom, state)
          }
          if (gScore[state]! < bestGoalScore) {
            bestGoalScore = gScore[state]!
            bestGoalState = state
          }
        }
      }

      if (bestGoalState >= 0 && gScore[state]! > bestGoalScore) continue

      const cx = cell % this.gridWidth
      const cy = Math.floor(cell / this.gridWidth)

      for (const [dx, dy] of NEIGHBORS) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue
        const nextCell = cellIndex(this.gridWidth, nx, ny)
        if (!this.roadGrid[nextCell]) continue

        if (incomingDir !== PATH_START_DIR) {
          const [inDx, inDy] = NEIGHBORS[incomingDir]!
          if (!this.allowsTurnaround(cx, cy) && isOppositeDir(inDx, inDy, dx, dy)) continue
        }

        const outDir = neighborDirIndex(dx, dy)
        if (outDir < 0) continue

        if (
          options.startViaKind &&
          startStateSet?.has(state) &&
          !this.getValidExitDirs(cx, cy, incomingDir, options.startViaKind).includes(outDir)
        ) {
          continue
        }

        let stepCost = dx !== 0 && dy !== 0 ? 1.414 : 1
        if (incomingDir !== PATH_START_DIR && incomingDir !== outDir) {
          stepCost += TURN_PENALTY
        }

        const nextState = pathStateId(nextCell, outDir)
        if (closed[nextState]) continue

        const tentative = gScore[state]! + stepCost
        if (tentative >= gScore[nextState]!) continue

        cameFrom[nextState] = state
        gScore[nextState] = tentative
        fScore[nextState] = tentative + heuristic(nx, ny, ex, ey)
        queue.push(nextState)
      }
    }

    if (bestGoalState >= 0) {
      return this.reconstructDirectionalPath(cameFrom, bestGoalState)
    }

    return null
  }

  private reconstructDirectionalPath(
    cameFrom: Int32Array,
    state: number,
  ): Array<{ gx: number; gy: number }> {
    const path: Array<{ gx: number; gy: number }> = []
    let cursor = state
    while (cursor >= 0) {
      const cell = Math.floor(cursor / PATH_STATE_STRIDE)
      path.push({ gx: cell % this.gridWidth, gy: Math.floor(cell / this.gridWidth) })
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
  via: VirtualNodePathConstraint[] = [],
): WorldMapPoint[] {
  if (!index) return [to]
  const traced = index.trace(from, to, via)
  return traced.length > 0 ? traced : [index.snap(to)]
}

export type { GeneralMapRoadSnapIndex }
