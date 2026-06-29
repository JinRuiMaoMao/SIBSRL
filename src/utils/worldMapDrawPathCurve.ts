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
