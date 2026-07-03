import type { WorldMapPoint } from '../data/worldMapRoutes'
import { getPathLegRanges, type PathLegRange } from './worldMapDrawPathEdit'

export function defaultLegControl(start: WorldMapPoint, end: WorldMapPoint): WorldMapPoint {
  return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
}

export function resolveLegControl(
  start: WorldMapPoint,
  end: WorldMapPoint,
  control: WorldMapPoint | null | undefined,
): WorldMapPoint {
  return control ?? defaultLegControl(start, end)
}

export function isLegStraight(
  start: WorldMapPoint,
  end: WorldMapPoint,
  control: WorldMapPoint | null | undefined,
): boolean {
  if (!control) return true
  const mid = defaultLegControl(start, end)
  return Math.hypot(control[0] - mid[0], control[1] - mid[1]) < 0.00004
}

/** Pick a bend handle from a road-traced polyline so the quadratic leg follows the road. */
export function controlFromRoadTracedLeg(
  start: WorldMapPoint,
  end: WorldMapPoint,
  traced: readonly WorldMapPoint[],
  snap: (point: WorldMapPoint) => WorldMapPoint,
): WorldMapPoint | null {
  if (traced.length < 2) return null
  const mid = defaultLegControl(start, end)
  let best = snap(mid)
  let bestOffset = 0
  for (const sample of traced) {
    const snapped = snap(sample)
    const offset = Math.hypot(snapped[0] - mid[0], snapped[1] - mid[1])
    if (offset > bestOffset) {
      bestOffset = offset
      best = snapped
    }
  }
  return bestOffset > 0.00002 ? best : snap(mid)
}

export function quadraticBezierPoint(
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

export function sampleQuadraticBezier(
  start: WorldMapPoint,
  control: WorldMapPoint,
  end: WorldMapPoint,
  steps = 12,
): WorldMapPoint[] {
  const samples: WorldMapPoint[] = []
  for (let step = 0; step <= steps; step += 1) {
    samples.push(quadraticBezierPoint(start, control, end, step / steps))
  }
  return samples
}


function sampleOnRoadCorridor(
  sample: WorldMapPoint,
  snap: (point: WorldMapPoint) => WorldMapPoint,
  isOnRoad: (point: WorldMapPoint) => boolean,
  maxSnapDist = 0.00028,
): boolean {
  if (isOnRoad(sample)) return true
  const snapped = snap(sample)
  return isOnRoad(snapped) && Math.hypot(snapped[0] - sample[0], snapped[1] - sample[1]) <= maxSnapDist
}

export function curveStaysOnRoad(
  start: WorldMapPoint,
  control: WorldMapPoint,
  end: WorldMapPoint,
  isOnRoad: (point: WorldMapPoint) => boolean,
  steps = 10,
  snap?: (point: WorldMapPoint) => WorldMapPoint,
): boolean {
  const check = snap
    ? (sample: WorldMapPoint) => sampleOnRoadCorridor(sample, snap, isOnRoad)
    : isOnRoad
  for (let step = 0; step <= steps; step += 1) {
    const sample = quadraticBezierPoint(start, control, end, step / steps)
    if (!check(sample)) return false
  }
  return true
}

/** Snap bend handle to road; endpoints stay on their anchors. */
export function constrainLegControlOnRoad(
  start: WorldMapPoint,
  end: WorldMapPoint,
  desired: WorldMapPoint,
  snap: (point: WorldMapPoint) => WorldMapPoint,
  _isOnRoad: (point: WorldMapPoint) => boolean,
): WorldMapPoint {
  void start
  void end
  return snap(desired)
}

function chordStaysOnRoad(
  start: WorldMapPoint,
  end: WorldMapPoint,
  isOnRoad: (point: WorldMapPoint) => boolean,
  snap: (point: WorldMapPoint) => WorldMapPoint,
  steps = 12,
): boolean {
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    const sample: WorldMapPoint = [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ]
    if (!sampleOnRoadCorridor(sample, snap, isOnRoad)) return false
  }
  return true
}

/** After generate, bend legs whose straight chord leaves the road corridor so dragging works. */
export function buildRoadSafeLegControls(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  snap: (point: WorldMapPoint) => WorldMapPoint,
  isOnRoad: (point: WorldMapPoint) => boolean,
): (WorldMapPoint | null)[] {
  const legs = getPathLegRanges(legStarts, points.length)
  return legs.map((leg) => {
    const start = points[leg.start]
    const end = points[leg.end]
    if (!start || !end) return null
    if (chordStaysOnRoad(start, end, isOnRoad, snap)) return null

    const mid = defaultLegControl(start, end)
    const candidates: WorldMapPoint[] = [
      snap(mid),
      snap([start[0] * 0.75 + end[0] * 0.25, start[1] * 0.75 + end[1] * 0.25]),
      snap([start[0] * 0.25 + end[0] * 0.75, start[1] * 0.25 + end[1] * 0.75]),
    ]
    for (const candidate of candidates) {
      if (curveStaysOnRoad(start, candidate, end, isOnRoad, 10, snap)) return candidate
    }
    return snap(mid)
  })
}

export function resizeLegControls(
  controls: readonly (WorldMapPoint | null)[],
  legCount: number,
): (WorldMapPoint | null)[] {
  if (legCount <= 0) return []
  if (controls.length === legCount) return [...controls]
  if (controls.length < legCount) {
    return [...controls, ...Array.from({ length: legCount - controls.length }, () => null)]
  }
  return controls.slice(0, legCount)
}

export function buildLegPathD(
  start: WorldMapPoint,
  end: WorldMapPoint,
  control: WorldMapPoint | null | undefined,
  imageWidth: number,
  imageHeight: number,
): string {
  const sx = start[0] * imageWidth
  const sy = start[1] * imageHeight
  const ex = end[0] * imageWidth
  const ey = end[1] * imageHeight
  if (isLegStraight(start, end, control)) {
    return `M ${sx} ${sy} L ${ex} ${ey}`
  }
  const resolved = resolveLegControl(start, end, control)
  const cx = resolved[0] * imageWidth
  const cy = resolved[1] * imageHeight
  return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`
}

function dist2(a: WorldMapPoint, b: WorldMapPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function sub2(a: WorldMapPoint, b: WorldMapPoint): WorldMapPoint {
  return [a[0] - b[0], a[1] - b[1]]
}

function norm2(v: WorldMapPoint): WorldMapPoint {
  const len = Math.hypot(v[0], v[1])
  if (len < 1e-9) return [0, 0]
  return [v[0] / len, v[1] / len]
}

function scale2(v: WorldMapPoint, factor: number): WorldMapPoint {
  return [v[0] * factor, v[1] * factor]
}

function add2(a: WorldMapPoint, b: WorldMapPoint): WorldMapPoint {
  return [a[0] + b[0], a[1] + b[1]]
}

function turnRadians(prev: WorldMapPoint, curr: WorldMapPoint, next: WorldMapPoint): number {
  const incoming = norm2(sub2(prev, curr))
  const outgoing = norm2(sub2(next, curr))
  const dot = Math.min(1, Math.max(-1, incoming[0] * outgoing[0] + incoming[1] * outgoing[1]))
  return Math.acos(dot)
}

function perpendicularDistancePx(
  point: WorldMapPoint,
  lineStart: WorldMapPoint,
  lineEnd: WorldMapPoint,
  imageWidth: number,
  imageHeight: number,
): number {
  const x0 = point[0] * imageWidth
  const y0 = point[1] * imageHeight
  const x1 = lineStart[0] * imageWidth
  const y1 = lineStart[1] * imageHeight
  const x2 = lineEnd[0] * imageWidth
  const y2 = lineEnd[1] * imageHeight
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-9) return Math.hypot(x0 - x1, y0 - y1)
  const t = Math.min(1, Math.max(0, ((x0 - x1) * dx + (y0 - y1) * dy) / lenSq))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return Math.hypot(x0 - projX, y0 - projY)
}

function collectDouglasPeuckerIndices(
  points: readonly WorldMapPoint[],
  imageWidth: number,
  imageHeight: number,
  epsilonPx: number,
  start: number,
  end: number,
): number[] {
  if (end <= start + 1) return [start]
  let maxDistance = 0
  let maxIndex = start
  for (let index = start + 1; index < end; index += 1) {
    const distance = perpendicularDistancePx(
      points[index]!,
      points[start]!,
      points[end]!,
      imageWidth,
      imageHeight,
    )
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = index
    }
  }
  if (maxDistance <= epsilonPx) return [start, end]
  const left = collectDouglasPeuckerIndices(points, imageWidth, imageHeight, epsilonPx, start, maxIndex)
  const right = collectDouglasPeuckerIndices(points, imageWidth, imageHeight, epsilonPx, maxIndex, end)
  return [...left, ...right.slice(1)]
}

function simplifyPathForDisplay(
  points: readonly WorldMapPoint[],
  imageWidth: number,
  imageHeight: number,
  userBends: ReadonlySet<number>,
  epsilonPx: number,
): WorldMapPoint[] {
  if (points.length <= 3) return [...points]

  const pinned = [...userBends, 0, points.length - 1]
    .filter((index) => index >= 0 && index < points.length)
    .sort((left, right) => left - right)
    .filter((index, pos, arr) => pos === 0 || index > arr[pos - 1]!)

  const simplified: WorldMapPoint[] = []
  for (let segment = 0; segment < pinned.length - 1; segment += 1) {
    const start = pinned[segment]!
    const end = pinned[segment + 1]!
    const slice = points.slice(start, end + 1)
    if (slice.length <= 2) {
      if (simplified.length === 0) simplified.push(...slice.map((point) => [point[0], point[1]] as WorldMapPoint))
      else simplified.push([slice[slice.length - 1]![0], slice[slice.length - 1]![1]])
      continue
    }
    const indices = collectDouglasPeuckerIndices(slice, imageWidth, imageHeight, epsilonPx, 0, slice.length - 1)
    const segmentPoints = indices.map((index) => slice[index]!)
    if (simplified.length === 0) {
      simplified.push(...segmentPoints.map((point) => [point[0], point[1]] as WorldMapPoint))
    } else {
      simplified.push(
        ...segmentPoints.slice(1).map((point) => [point[0], point[1]] as WorldMapPoint),
      )
    }
  }

  return simplified.length >= 2 ? simplified : [...points]
}

function remapUserBendIndices(
  simplified: readonly WorldMapPoint[],
  userBends: ReadonlySet<number>,
  source: readonly WorldMapPoint[],
): Set<number> {
  const remapped = new Set<number>()
  userBends.forEach((sourceIndex) => {
    const point = source[sourceIndex]
    if (!point) return
    for (let index = 0; index < simplified.length; index += 1) {
      const candidate = simplified[index]!
      if (Math.hypot(candidate[0] - point[0], candidate[1] - point[1]) <= 0.00002) {
        remapped.add(index)
        break
      }
    }
  })
  return remapped
}

function circularFilletRadius(
  autoRadiusPx: number,
  turn: number,
  len1: number,
  len2: number,
): number {
  const turnRatio = Math.min(1, turn / ((72 * Math.PI) / 180))
  const scaled = autoRadiusPx * (0.72 + 0.28 * turnRatio)
  return Math.min(scaled, len1 * 0.48, len2 * 0.48)
}

/**
 * SVG path with circular-arc fillets at corners. Dense road samples are simplified first.
 * User bend vertices stay sharp; auto corners use true circular arcs (SVG A).
 */
export function buildEditorCornerPathD(
  points: readonly WorldMapPoint[],
  imageWidth: number,
  imageHeight: number,
  options: {
    userBendIndices?: ReadonlySet<number>
    autoCornerRadiusPx?: number
    minTurnRadians?: number
    simplifyEpsilonPx?: number
  } = {},
): string {
  const sourceUserBends = options.userBendIndices ?? new Set<number>()
  const autoRadiusPx = options.autoCornerRadiusPx ?? Math.max(16, imageWidth * 0.0055)
  const minTurn = options.minTurnRadians ?? (5 * Math.PI) / 180
  const simplifyEpsilonPx = options.simplifyEpsilonPx ?? Math.max(3.5, imageWidth * 0.0011)

  const simplified =
    points.length > 12
      ? simplifyPathForDisplay(points, imageWidth, imageHeight, sourceUserBends, simplifyEpsilonPx)
      : [...points]
  const userBends =
    sourceUserBends.size > 0 ? remapUserBendIndices(simplified, sourceUserBends, points) : sourceUserBends

  const count = simplified.length
  if (count < 2) return ''

  const px = simplified.map((point) => ({
    x: point[0] * imageWidth,
    y: point[1] * imageHeight,
  }))

  const parts: string[] = [`M ${px[0]!.x} ${px[0]!.y}`]

  for (let index = 1; index < count - 1; index += 1) {
    const prev = px[index - 1]!
    const curr = px[index]!
    const next = px[index + 1]!

    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y
    const len1 = Math.hypot(dx1, dy1)
    const len2 = Math.hypot(dx2, dy2)
    if (len1 < 1e-6 || len2 < 1e-6) continue

    const turn = turnRadians(
      [prev.x / imageWidth, prev.y / imageHeight],
      [curr.x / imageWidth, curr.y / imageHeight],
      [next.x / imageWidth, next.y / imageHeight],
    )

    if (!userBends.has(index) && turn >= minTurn) {
      const maxRadius = circularFilletRadius(autoRadiusPx, turn, len1, len2)
      if (maxRadius > 0.5) {
        const u1x = dx1 / len1
        const u1y = dy1 / len1
        const u2x = dx2 / len2
        const u2y = dy2 / len2
        const startX = curr.x - u1x * maxRadius
        const startY = curr.y - u1y * maxRadius
        const endX = curr.x + u2x * maxRadius
        const endY = curr.y + u2y * maxRadius
        const cross = u1x * u2y - u1y * u2x
        const sweep = cross > 0 ? 1 : 0
        parts.push(`L ${startX} ${startY}`)
        parts.push(`A ${maxRadius} ${maxRadius} 0 0 ${sweep} ${endX} ${endY}`)
        continue
      }
    }

    parts.push(`L ${curr.x} ${curr.y}`)
  }

  const last = px[count - 1]!
  parts.push(`L ${last.x} ${last.y}`)
  return parts.join(' ')
}

/** SVG path with corridor-safe quadratic fillets; user bends stay sharp. */
export function buildCorridorSafeSmoothPathD(
  points: readonly WorldMapPoint[],
  imageWidth: number,
  imageHeight: number,
  userBendIndices: ReadonlySet<number>,
  snap: (point: WorldMapPoint) => WorldMapPoint,
  isOnRoad: (point: WorldMapPoint) => boolean,
): string {
  const count = points.length
  if (count < 2) return ''
  const fmt = (point: WorldMapPoint) => `${point[0] * imageWidth} ${point[1] * imageHeight}`
  if (count === 2) {
    return `M ${fmt(points[0]!)} L ${fmt(points[1]!)}`
  }

  const minTurn = (10 * Math.PI) / 180
  const filletRatio = 0.38
  const parts: string[] = [`M ${fmt(points[0]!)}`]

  for (let index = 1; index < count - 1; index += 1) {
    const prev = points[index - 1]!
    const curr = points[index]!
    const next = points[index + 1]!
    if (userBendIndices.has(index)) {
      parts.push(`L ${fmt(curr)}`)
      continue
    }
    const turn = turnRadians(prev, curr, next)
    if (turn < minTurn) {
      parts.push(`L ${fmt(curr)}`)
      continue
    }
    const alongIn = dist2(prev, curr)
    const alongOut = dist2(curr, next)
    const trim = Math.min(alongIn, alongOut) * filletRatio
    if (trim < 1e-7) {
      parts.push(`L ${fmt(curr)}`)
      continue
    }
    const p1 = add2(curr, scale2(norm2(sub2(prev, curr)), trim))
    const p2 = add2(curr, scale2(norm2(sub2(next, curr)), trim))
    if (curveStaysOnRoad(p1, curr, p2, isOnRoad, 8, snap)) {
      parts.push(`L ${fmt(p1)}`)
      parts.push(`Q ${fmt(curr)} ${fmt(p2)}`)
    } else {
      parts.push(`L ${fmt(curr)}`)
    }
  }

  parts.push(`L ${fmt(points[count - 1]!)}`)
  return parts.join(' ')
}

/** SVG path with quadratic fillets at road corners; user bends stay sharp pass-through vertices. */
export function buildSmoothPolylinePathD(
  points: readonly WorldMapPoint[],
  imageWidth: number,
  imageHeight: number,
  userBendIndices: ReadonlySet<number> = new Set(),
): string {
  const count = points.length
  if (count < 2) return ''
  const fmt = (point: WorldMapPoint) => `${point[0] * imageWidth} ${point[1] * imageHeight}`
  if (count === 2) {
    return `M ${fmt(points[0]!)} L ${fmt(points[1]!)}`
  }

  const minTurn = (10 * Math.PI) / 180
  const filletRatio = 0.42
  const parts: string[] = [`M ${fmt(points[0]!)}`]

  for (let index = 1; index < count - 1; index += 1) {
    const prev = points[index - 1]!
    const curr = points[index]!
    const next = points[index + 1]!
    if (userBendIndices.has(index)) {
      parts.push(`L ${fmt(curr)}`)
      continue
    }
    const turn = turnRadians(prev, curr, next)
    if (turn < minTurn) {
      parts.push(`L ${fmt(curr)}`)
      continue
    }
    const alongIn = dist2(prev, curr)
    const alongOut = dist2(curr, next)
    const trim = Math.min(alongIn, alongOut) * filletRatio
    if (trim < 1e-7) {
      parts.push(`L ${fmt(curr)}`)
      continue
    }
    const p1 = add2(curr, scale2(norm2(sub2(prev, curr)), trim))
    const p2 = add2(curr, scale2(norm2(sub2(next, curr)), trim))
    parts.push(`L ${fmt(p1)}`)
    parts.push(`Q ${fmt(curr)} ${fmt(p2)}`)
  }

  parts.push(`L ${fmt(points[count - 1]!)}`)
  return parts.join(' ')
}

export function flattenPolylinePath(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  snap: (point: WorldMapPoint) => WorldMapPoint,
  legHidden: readonly boolean[] = [],
): WorldMapPoint[] {
  if (points.length < 2) return [...points]
  const legs = getPathLegRanges(legStarts, points.length)
  const merged: WorldMapPoint[] = []

  legs.forEach((leg, legIndex) => {
    if (legHidden[legIndex]) return
    for (let index = leg.start; index <= leg.end; index += 1) {
      const point = points[index]
      if (!point) continue
      const onRoad = snap(point)
      const prev = merged[merged.length - 1]
      if (!prev || Math.hypot(onRoad[0] - prev[0], onRoad[1] - prev[1]) > 0.00003) {
        merged.push(onRoad)
      }
    }
  })

  return merged.length >= 2 ? merged : [...points]
}

/** @deprecated Bend points live in draftPoints; use flattenPolylinePath. */
export function flattenCurvedPath(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  legControls: readonly (WorldMapPoint | null)[],
  snap: (point: WorldMapPoint) => WorldMapPoint,
  stepsPerLeg = 10,
  legHidden: readonly boolean[] = [],
): WorldMapPoint[] {
  if (points.length < 2) return [...points]
  const legs = getPathLegRanges(legStarts, points.length)
  const merged: WorldMapPoint[] = []

  legs.forEach((leg, legIndex) => {
    if (legHidden[legIndex]) return
    const start = points[leg.start]
    const end = points[leg.end]
    if (!start || !end) return
    const control = resolveLegControl(start, end, legControls[legIndex])
    const samples = isLegStraight(start, end, legControls[legIndex])
      ? [start, end]
      : sampleQuadraticBezier(start, control, end, stepsPerLeg)

    for (const sample of samples) {
      const onRoad = snap(sample)
      const prev = merged[merged.length - 1]
      if (!prev || Math.hypot(onRoad[0] - prev[0], onRoad[1] - prev[1]) > 0.00003) {
        merged.push(onRoad)
      }
    }
  })

  if (merged.length < 2) return [...points]
  merged[0] = [points[0]![0], points[0]![1]]
  merged[merged.length - 1] = [
    points[points.length - 1]![0],
    points[points.length - 1]![1],
  ]
  return merged
}

export function legControlDisplayPoint(
  leg: PathLegRange,
  points: readonly WorldMapPoint[],
  legControls: readonly (WorldMapPoint | null)[],
  legIndex: number,
): WorldMapPoint | null {
  const start = points[leg.start]
  const end = points[leg.end]
  if (!start || !end) return null
  return resolveLegControl(start, end, legControls[legIndex])
}
