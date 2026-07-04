import type { WorldMapPoint } from '../data/worldMapRoutes'
import { sampleRouteEditorTrajectoryPathPoints } from '../routeEditor/routeEditorPath'
import { resolveRouteEditorStopSeqEndpoints } from './routeMapStopMatching'
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

function slicePathBetweenPoints(
  path: readonly WorldMapPoint[],
  startPoint: WorldMapPoint,
  endPoint: WorldMapPoint,
): WorldMapPoint[] {
  if (path.length < 2) return [...path]

  const startIdx = closestPathIndex(path, startPoint)
  const endIdx = closestPathIndex(path, endPoint)
  if (startIdx === endIdx) return [path[startIdx]!]

  const low = Math.min(startIdx, endIdx)
  const high = Math.max(startIdx, endIdx)
  const segment = path.slice(low, high + 1)
  return startIdx <= endIdx ? segment : [...segment].reverse()
}

export function resolveRouteMapDisplayPathPoints(
  display: RouteMapViewerDisplay,
  imageSize: { width: number; height: number },
): WorldMapPoint[] {
  if (display.referenceEditor?.segments.length) {
    const sampled = sampleRouteEditorTrajectoryPathPoints(
      {
        id: 1,
        name: display.routeNumber,
        nodes: [...display.referenceEditor.nodes],
        segments: [...display.referenceEditor.segments],
      },
      imageSize.width,
      imageSize.height,
    )
    if (sampled.length >= 2) {
      const { startNodeId, endNodeId } = resolveRouteEditorStopSeqEndpoints(display.referenceEditor.nodes)
      if (startNodeId != null && endNodeId != null && startNodeId !== endNodeId) {
        const nodeById = new Map(display.referenceEditor.nodes.map((node) => [node.id, node]))
        const startNode = nodeById.get(startNodeId)
        const endNode = nodeById.get(endNodeId)
        if (startNode && endNode) {
          const startPoint: WorldMapPoint = [
            startNode.x / imageSize.width,
            startNode.y / imageSize.height,
          ]
          const endPoint: WorldMapPoint = [endNode.x / imageSize.width, endNode.y / imageSize.height]
          const sliced = slicePathBetweenPoints(sampled, startPoint, endPoint)
          if (sliced.length >= 2) return sliced
        }
      }
      return sampled
    }
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
