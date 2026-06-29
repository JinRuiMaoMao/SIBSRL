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

function lerpPoint(a: WorldMapPoint, b: WorldMapPoint, t: number): WorldMapPoint {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export function curveStaysOnRoad(
  start: WorldMapPoint,
  control: WorldMapPoint,
  end: WorldMapPoint,
  isOnRoad: (point: WorldMapPoint) => boolean,
  steps = 10,
): boolean {
  for (let step = 0; step <= steps; step += 1) {
    const sample = quadraticBezierPoint(start, control, end, step / steps)
    if (!isOnRoad(sample)) return false
  }
  return true
}

/** Keep curve endpoints fixed; snap control to road and limit bulge so samples stay on road. */
export function constrainLegControlOnRoad(
  start: WorldMapPoint,
  end: WorldMapPoint,
  desired: WorldMapPoint,
  snap: (point: WorldMapPoint) => WorldMapPoint,
  isOnRoad: (point: WorldMapPoint) => boolean,
): WorldMapPoint {
  const mid = defaultLegControl(start, end)
  const snapped = snap(desired)
  if (curveStaysOnRoad(start, snapped, end, isOnRoad)) return snapped

  let lo = 0
  let hi = 1
  let best = mid
  for (let iteration = 0; iteration < 14; iteration += 1) {
    const t = (lo + hi) / 2
    const candidate = snap(lerpPoint(mid, snapped, t))
    if (curveStaysOnRoad(start, candidate, end, isOnRoad)) {
      best = candidate
      lo = t
    } else {
      hi = t
    }
  }
  return best
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
): WorldMapPoint[] {
  if (points.length < 2) return [...points]
  const legs = getPathLegRanges(legStarts, points.length)
  const merged: WorldMapPoint[] = []

  legs.forEach((leg, legIndex) => {
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
