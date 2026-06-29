import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapVirtualNodeKind } from '../types/worldMapDraw'
import { absoluteExitDirForKind } from './mapSurfaceKind'

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
/** Avoid bridge/tunnel unless a matching virtual node or already on that surface. */
const BRIDGE_ENTRY_PENALTY = 4
const TUNNEL_ENTRY_PENALTY = 4
/** Penalize tracing parallel to an existing route segment at close range. */
const PARALLEL_OVERLAP_PENALTY = 3
const PARALLEL_DIST = 0.0028
const PARALLEL_ANGLE_TOL = 0.4
const SMOOTH_CORNER_ANGLE = 2.35
const SMOOTH_CORNER_RADIUS = 0.00022

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
  const absolute = absoluteExitDirForKind(kind)
  if (absolute != null) return absolute
  if (kind === 'turn-left') return turnLeftDir(incomingDir)
  if (kind === 'turn-right') return turnRightDir(incomingDir)
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
  allowBridge?: boolean
  allowTunnel?: boolean
  avoidParallelSegments?: readonly WorldMapRouteSegmentRef[]
}

export type WorldMapRouteSegmentRef = readonly [WorldMapPoint, WorldMapPoint]

export interface TraceRoadPathOptions {
  avoidParallelSegments?: readonly WorldMapRouteSegmentRef[]
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

  constructor(
    width: number,
    height: number,
    imageData: Uint8ClampedArray,
    options?: { deferGridBuild?: boolean },
  ) {
    this.width = width
    this.height = height
    this.gridWidth = Math.ceil(width / ROAD_CELL_PX)
    this.gridHeight = Math.ceil(height / ROAD_CELL_PX)
    this.imageData = imageData
    this.roadGrid = new Uint8Array(this.gridWidth * this.gridHeight)
    this.plainRoadGrid = new Uint8Array(this.gridWidth * this.gridHeight)
    this.bridgeGrid = new Uint8Array(this.gridWidth * this.gridHeight)
    this.tunnelGrid = new Uint8Array(this.gridWidth * this.gridHeight)

    if (!options?.deferGridBuild) {
      this.buildRoadGridsSync()
    }
  }

  private buildRoadGridsSync(): void {
    for (let gy = 0; gy < this.gridHeight; gy += 1) {
      this.buildRoadGridRow(gy)
    }
  }

  private buildRoadGridRow(gy: number): void {
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

  private async buildRoadGridsAsync(): Promise<void> {
    for (let gy = 0; gy < this.gridHeight; gy += 1) {
      this.buildRoadGridRow(gy)
      if ((gy & 31) === 31) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 0)
        })
      }
    }
  }

  static async create(
    width: number,
    height: number,
    imageData: Uint8ClampedArray,
  ): Promise<GeneralMapRoadSnapIndex> {
    const index = new GeneralMapRoadSnapIndex(width, height, imageData, { deferGridBuild: true })
    await index.buildRoadGridsAsync()
    return index
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

  isOnRoad(point: WorldMapPoint): boolean {
    const { px, py } = this.toGridPoint(point)
    return this.isRoadAtPixel(px, py)
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
      case 'north':
      case 'south':
      case 'east':
      case 'west':
      case 'northwest':
      case 'northeast':
      case 'southwest':
      case 'southeast': {
        const required = absoluteExitDirForKind(kind)
        return required != null && outDir === required
      }
      case 'turn-left':
        return outDir === turnLeftDir(incomingDir)
      case 'turn-right':
        return outDir === turnRightDir(incomingDir)
      case 'u-turn':
        return isOppositeDir(inDx, inDy, outDx, outDy)
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

  trace(
    from: WorldMapPoint,
    to: WorldMapPoint,
    via: VirtualNodePathConstraint[] = [],
    options: TraceRoadPathOptions = {},
  ): WorldMapPoint[] {
    const start = this.toGridPoint(from)
    const end = this.toGridPoint(to)
    const startCell = this.findNearestRoadCell(start.gx, start.gy)
    const endCell = this.findNearestRoadCell(end.gx, end.gy)
    if (!startCell || !endCell) return [this.ensureOnRoad(to)]

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
      const onBridge = this.isBridgeCell(cursor.gx, cursor.gy)
      const onTunnel = this.isTunnelCell(cursor.gx, cursor.gy)
      const segment = this.findPath(cursor.gx, cursor.gy, target.gx, target.gy, {
        endConstraint: target.endConstraint,
        startStates,
        startViaKind,
        allowBridge:
          onBridge || startViaKind === 'on-bridge' || target.endConstraint?.kind === 'on-bridge',
        allowTunnel:
          onTunnel ||
          startViaKind === 'enter-tunnel' ||
          target.endConstraint?.kind === 'enter-tunnel',
        avoidParallelSegments: options.avoidParallelSegments,
      })
      if (!segment || segment.length === 0) {
        if (mergedCells.length > 0) break
        return [this.ensureOnRoad(from), this.ensureOnRoad(to)]
      }

      if (mergedCells.length > 0 && segment.length > 0) {
        segment.shift()
      }
      mergedCells.push(...segment)

      if (target.endConstraint) {
        startStates = this.collectStatesAtCell(target.endConstraint)
        startViaKind = target.endConstraint.kind
        if (startStates.length === 0) {
          if (mergedCells.length > 0) break
          return [this.ensureOnRoad(from), this.ensureOnRoad(to)]
        }
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

    points[points.length - 1] = this.ensureOnRoad(to)
    const smoothed = this.smoothRoadCorners(points)
    const onRoad = this.densifyOnRoad(smoothed)
    return simplifyPath(onRoad, 0.00012)
  }

  private densifyOnRoad(points: WorldMapPoint[]): WorldMapPoint[] {
    if (points.length < 2) return points.map((point) => this.ensureOnRoad(point))

    const result: WorldMapPoint[] = [this.ensureOnRoad(points[0]!)]
    for (let index = 1; index < points.length; index += 1) {
      const prev = result[result.length - 1]!
      const next = points[index]!
      const span = Math.hypot(next[0] - prev[0], next[1] - prev[1])
      const steps = Math.max(1, Math.ceil(span / 0.00016))
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps
        const sample: WorldMapPoint = [
          prev[0] + (next[0] - prev[0]) * t,
          prev[1] + (next[1] - prev[1]) * t,
        ]
        const onRoad = this.ensureOnRoad(sample)
        const last = result[result.length - 1]!
        if (Math.hypot(onRoad[0] - last[0], onRoad[1] - last[1]) > 0.00003) {
          result.push(onRoad)
        }
      }
    }
    return result
  }

  private ensureOnRoad(point: WorldMapPoint): WorldMapPoint {
    const { px, py } = this.toGridPoint(point)
    if (this.isRoadAtPixel(px, py)) return point
    return this.snap(point)
  }

  private isJunctionCell(gx: number, gy: number): boolean {
    return this.roadNeighborCount(gx, gy) !== 2
  }

  private isJunctionPoint(point: WorldMapPoint): boolean {
    const { gx, gy } = this.toGridPoint(point)
    const cell = this.findNearestRoadCell(gx, gy)
    if (!cell) return false
    return this.isJunctionCell(cell.gx, cell.gy)
  }

  private smoothRoadCorners(points: WorldMapPoint[]): WorldMapPoint[] {
    if (points.length < 3) return points.map((point) => this.ensureOnRoad(point))

    const result: WorldMapPoint[] = [this.ensureOnRoad(points[0]!)]
    for (let index = 1; index < points.length - 1; index += 1) {
      const prev = points[index - 1]!
      const curr = points[index]!
      const next = points[index + 1]!
      const angle = turnAngleAt(prev, curr, next)

      if (angle < SMOOTH_CORNER_ANGLE) {
        const inLen = Math.hypot(curr[0] - prev[0], curr[1] - prev[1])
        const outLen = Math.hypot(next[0] - curr[0], next[1] - curr[1])
        const radius = Math.min(SMOOTH_CORNER_RADIUS, inLen * 0.45, outLen * 0.45)
        if (radius > 0.00003) {
          const pIn = pointAlong(curr, prev, radius)
          const pOut = pointAlong(curr, next, radius)
          for (let step = 1; step <= 6; step += 1) {
            const t = step / 6
            const sample = quadraticBezier(pIn, curr, pOut, t)
            result.push(this.ensureOnRoad(sample))
          }
          continue
        }
      }

      result.push(this.ensureOnRoad(curr))
    }

    result.push(this.ensureOnRoad(points[points.length - 1]!))
    return result
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
            this.getValidExitDirs(ex, ey, incomingDir, options.endConstraint.kind).length > 0)
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

        const isJunction = this.roadNeighborCount(cx, cy) !== 2
        if (isJunction && incomingDir !== PATH_START_DIR && incomingDir !== outDir) {
          const allowedByStartVia =
            options.startViaKind != null &&
            startStateSet?.has(state) &&
            this.getValidExitDirs(cx, cy, incomingDir, options.startViaKind).includes(outDir)

          if (!options.endConstraint && !allowedByStartVia) {
            continue
          }
        }

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

        const allowBridge =
          options.allowBridge || this.isBridgeCell(cx, cy) || options.startViaKind === 'on-bridge'
        const allowTunnel =
          options.allowTunnel ||
          this.isTunnelCell(cx, cy) ||
          options.startViaKind === 'enter-tunnel'
        if (!allowBridge && this.isPlainRoadCell(cx, cy) && this.isBridgeCell(nx, ny)) {
          stepCost += BRIDGE_ENTRY_PENALTY
        }
        if (!allowTunnel && this.isPlainRoadCell(cx, cy) && this.isTunnelCell(nx, ny)) {
          stepCost += TUNNEL_ENTRY_PENALTY
        }
        if (options.avoidParallelSegments?.length) {
          stepCost += parallelOverlapPenalty(
            cx,
            cy,
            nx,
            ny,
            this,
            options.avoidParallelSegments,
          )
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

function turnAngleAt(prev: WorldMapPoint, curr: WorldMapPoint, next: WorldMapPoint): number {
  const inDx = curr[0] - prev[0]
  const inDy = curr[1] - prev[1]
  const outDx = next[0] - curr[0]
  const outDy = next[1] - curr[1]
  const inLen = Math.hypot(inDx, inDy)
  const outLen = Math.hypot(outDx, outDy)
  if (inLen <= 1e-9 || outLen <= 1e-9) return Math.PI
  const dot = (inDx * outDx + inDy * outDy) / (inLen * outLen)
  return Math.acos(clamp(dot, -1, 1))
}

function pointAlong(from: WorldMapPoint, toward: WorldMapPoint, distance: number): WorldMapPoint {
  const dx = toward[0] - from[0]
  const dy = toward[1] - from[1]
  const len = Math.hypot(dx, dy)
  if (len <= 1e-9) return [from[0], from[1]]
  const scale = distance / len
  return [from[0] + dx * scale, from[1] + dy * scale]
}

function quadraticBezier(
  start: WorldMapPoint,
  control: WorldMapPoint,
  end: WorldMapPoint,
  t: number,
): WorldMapPoint {
  const u = 1 - t
  return [
    u * u * start[0] + 2 * u * t * control[0] + t * t * end[0],
    u * u * start[1] + 2 * u * t * control[1] + t * t * end[1],
  ]
}

function segmentBearing(from: WorldMapPoint, to: WorldMapPoint): number {
  return Math.atan2(to[1] - from[1], to[0] - from[0])
}

function pointSegmentDistance(point: WorldMapPoint, a: WorldMapPoint, b: WorldMapPoint): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq <= 1e-12) return Math.hypot(point[0] - a[0], point[1] - a[1])
  const t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lenSq, 0, 1)
  const px = a[0] + dx * t
  const py = a[1] + dy * t
  return Math.hypot(point[0] - px, point[1] - py)
}

function parallelOverlapPenalty(
  cx: number,
  cy: number,
  nx: number,
  ny: number,
  index: GeneralMapRoadSnapIndex,
  segments: readonly WorldMapRouteSegmentRef[],
): number {
  const fromPx = cx * ROAD_CELL_PX + ROAD_CELL_PX / 2
  const fromPy = cy * ROAD_CELL_PX + ROAD_CELL_PX / 2
  const toPx = nx * ROAD_CELL_PX + ROAD_CELL_PX / 2
  const toPy = ny * ROAD_CELL_PX + ROAD_CELL_PX / 2
  const from: WorldMapPoint = [fromPx / (index.width - 1), fromPy / (index.height - 1)]
  const to: WorldMapPoint = [toPx / (index.width - 1), toPy / (index.height - 1)]
  const moveBearing = segmentBearing(from, to)
  const mid: WorldMapPoint = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]

  for (const [a, b] of segments) {
    const dist = pointSegmentDistance(mid, a, b)
    if (dist > PARALLEL_DIST) continue
    const segBearing = segmentBearing(a, b)
    const delta = Math.abs(
      Math.atan2(Math.sin(moveBearing - segBearing), Math.cos(moveBearing - segBearing)),
    )
    if (delta < PARALLEL_ANGLE_TOL) {
      return PARALLEL_OVERLAP_PENALTY
    }
  }

  return 0
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
    return GeneralMapRoadSnapIndex.create(width, height, data)
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

export function isPointOnGeneralMapRoad(
  index: GeneralMapRoadSnapIndex | null,
  point: WorldMapPoint,
): boolean {
  return index?.isOnRoad(point) ?? true
}

export function traceGeneralMapRoadPath(
  index: GeneralMapRoadSnapIndex | null,
  from: WorldMapPoint,
  to: WorldMapPoint,
  via: VirtualNodePathConstraint[] = [],
  options: TraceRoadPathOptions = {},
): WorldMapPoint[] {
  if (!index) return [to]
  const traced = index.trace(from, to, via, options)
  return traced.length > 0 ? traced : [index.snap(to)]
}

export type { GeneralMapRoadSnapIndex }
