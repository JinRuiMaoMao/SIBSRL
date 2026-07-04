import type { WorldMapPoint } from '../data/worldMapRoutes'
import { sampleRouteEditorPathPoints } from '../routeEditor/routeEditorPath'
import type { RouteDetailMapStop } from './routeDetailMapStops'
import type { RouteMapViewerDisplay } from './routeMapViewerDisplay'

function distance(a: WorldMapPoint, b: WorldMapPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function dedupePoints(points: readonly WorldMapPoint[]): WorldMapPoint[] {
  const out: WorldMapPoint[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (last && distance(last, point) < 0.00001) continue
    out.push([point[0], point[1]])
  }
  return out
}

function closestPathIndex(path: readonly WorldMapPoint[], point: WorldMapPoint): number {
  let best = 0
  let bestDist = Infinity
  for (let index = 0; index < path.length; index += 1) {
    const dist = distance(path[index]!, point)
    if (dist < bestDist) {
      bestDist = dist
      best = index
    }
  }
  return best
}

export function resolveRouteMapDisplayPathPoints(
  display: RouteMapViewerDisplay,
  imageSize: { width: number; height: number },
): WorldMapPoint[] {
  if (display.referenceEditor?.segments.length) {
    const sampled = sampleRouteEditorPathPoints(
      {
        id: 1,
        name: display.routeNumber,
        nodes: [...display.referenceEditor.nodes],
        segments: [...display.referenceEditor.segments],
      },
      imageSize.width,
      imageSize.height,
      false,
    )
    if (sampled.length >= 2) return sampled
  }
  return display.points.length >= 2 ? [...display.points] : []
}

/** Path from route start through each detail-page stop in order, then to route end. */
export function buildRouteMapTrajectoryPath(
  display: RouteMapViewerDisplay,
  imageSize: { width: number; height: number },
  catalogStops: readonly RouteDetailMapStop[],
): WorldMapPoint[] {
  const path = resolveRouteMapDisplayPathPoints(display, imageSize)
  if (path.length < 2) return path

  const orderedStops = [...catalogStops].sort((a, b) => a.seq - b.seq)
  if (orderedStops.length === 0) return path

  const stopIndices = orderedStops.map((stop) => closestPathIndex(path, stop.point))
  for (let index = 1; index < stopIndices.length; index += 1) {
    stopIndices[index] = Math.max(stopIndices[index]!, stopIndices[index - 1]!)
  }

  const endIndex = path.length - 1
  const waypointIndices = [...new Set([0, ...stopIndices, endIndex])].sort((a, b) => a - b)

  const result: WorldMapPoint[] = []
  for (let index = 0; index < waypointIndices.length - 1; index += 1) {
    const from = waypointIndices[index]!
    const to = waypointIndices[index + 1]!
    result.push(...path.slice(from, to + 1))
  }

  return dedupePoints(result)
}

export function interpolateRouteMapTrajectoryPoint(
  path: readonly WorldMapPoint[],
  progress: number,
  imageWidth: number,
  imageHeight: number,
): [number, number] {
  if (path.length === 0) return [0, 0]
  if (path.length === 1) {
    return [path[0]![0] * imageWidth, path[0]![1] * imageHeight]
  }

  const clamped = Math.min(1, Math.max(0, progress))
  const pixelPath = path.map(
    (point) => [point[0] * imageWidth, point[1] * imageHeight] as [number, number],
  )

  const segmentLengths: number[] = []
  let total = 0
  for (let index = 0; index < pixelPath.length - 1; index += 1) {
    const length = Math.hypot(
      pixelPath[index + 1]![0] - pixelPath[index]![0],
      pixelPath[index + 1]![1] - pixelPath[index]![1],
    )
    segmentLengths.push(length)
    total += length
  }

  if (total <= 0) {
    const first = pixelPath[0]!
    return [first[0], first[1]]
  }

  let remaining = clamped * total
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index]!
    if (remaining > length) {
      remaining -= length
      continue
    }
    const t = length > 0 ? remaining / length : 0
    const a = pixelPath[index]!
    const b = pixelPath[index + 1]!
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  }

  const last = pixelPath[pixelPath.length - 1]!
  return [last[0], last[1]]
}
