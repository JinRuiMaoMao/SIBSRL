import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteEditorNode } from '../routeEditor/types'
import {
  buildTrajectoryStopArcLengths,
  sampleRouteEditorTrajectoryPathPoints,
  sampleRouteEditorTrajectoryThroughStops,
} from '../routeEditor/routeEditorPath'
import { resolveRouteEditorStopSeqOrderedStops } from './routeMapStopMatching'
import type { RouteMapViewerDisplay } from './routeMapViewerDisplay'

const NEXT_STOP_REACHED_EPSILON_PX = 14

function buildPixelPath(
  path: readonly WorldMapPoint[],
  imageWidth: number,
  imageHeight: number,
): [number, number][] {
  return path.map((point) => [point[0] * imageWidth, point[1] * imageHeight] as [number, number])
}

function pathArcLengthAtProgress(
  path: readonly WorldMapPoint[],
  progress: number,
  imageWidth: number,
  imageHeight: number,
): number {
  if (path.length < 2) return 0

  const pixelPath = buildPixelPath(path, imageWidth, imageHeight)
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
  if (total <= 0) return 0

  let remaining = Math.min(1, Math.max(0, progress)) * total
  let arcLength = 0
  for (const length of segmentLengths) {
    if (remaining > length) {
      arcLength += length
      remaining -= length
      continue
    }
    return arcLength + remaining
  }
  return total
}

/** Next stop ahead of the trajectory ball along the drawn path (by stopSeq). */
export function resolveRouteMapTrajectoryNextStopNodeId(
  nodes: readonly RouteEditorNode[],
  path: readonly WorldMapPoint[],
  progress: number,
  imageWidth: number,
  imageHeight: number,
): number | null {
  const orderedStops = resolveRouteEditorStopSeqOrderedStops(nodes)
  if (orderedStops.length < 2 || path.length < 2 || imageWidth <= 0 || imageHeight <= 0) {
    return null
  }

  const ballDistance = pathArcLengthAtProgress(path, progress, imageWidth, imageHeight)
  const stopArcs = buildTrajectoryStopArcLengths(path, orderedStops, imageWidth, imageHeight)

  let nextIndex = 1
  for (let index = 0; index < stopArcs.length; index += 1) {
    if (stopArcs[index]! <= ballDistance + NEXT_STOP_REACHED_EPSILON_PX) {
      nextIndex = index + 1
    }
  }

  return nextIndex < orderedStops.length ? orderedStops[nextIndex]!.id : null
}

function dedupePoints(points: readonly WorldMapPoint[]): WorldMapPoint[] {
  const out: WorldMapPoint[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.00001) continue
    out.push([point[0], point[1]])
  }
  return out
}

export function resolveRouteMapDisplayPathPoints(
  display: RouteMapViewerDisplay,
  imageSize: { width: number; height: number },
): readonly WorldMapPoint[] {
  if (display.referenceEditor?.segments.length) {
    const line = {
      id: 1,
      name: display.routeNumber,
      nodes: [...display.referenceEditor.nodes],
      segments: [...display.referenceEditor.segments],
    }
    const orderedStops = resolveRouteEditorStopSeqOrderedStops(line.nodes)
    if (orderedStops.length >= 2) {
      const throughStops = sampleRouteEditorTrajectoryThroughStops(
        line,
        imageSize.width,
        imageSize.height,
        orderedStops,
      )
      if (throughStops.length >= 2) return throughStops
    }

    const sampled = sampleRouteEditorTrajectoryPathPoints(line, imageSize.width, imageSize.height)
    if (sampled.length >= 2) return sampled
  }
  return display.points.length >= 2 ? dedupePoints(display.points) : []
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
