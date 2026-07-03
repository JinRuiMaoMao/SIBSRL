import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
import { DRAW_HIT_SCREEN_PX } from './mapDrawHitRadius'

interface PanZoomState {
  x: number
  y: number
  scale: number
}

interface ImageSize {
  width: number
  height: number
}

export type DrawRoutePickTarget =
  | { kind: 'stop'; id: string }
  | { kind: 'pathNode'; id: string }
  | { kind: 'bend'; vertexIndex: number }

interface PickDrawRouteTargetOptions {
  clientX: number
  clientY: number
  viewportRect: DOMRect
  panZoom: PanZoomState
  imageSize: ImageSize
  stops: readonly WorldMapDrawStop[]
  pathNodes: readonly WorldMapDrawPathNode[]
  bendPoints?: readonly WorldMapPoint[]
  userBendIndices?: ReadonlySet<number>
  maxDistancePx?: number
}

function normalizedToClientPoint(
  point: WorldMapPoint,
  viewportRect: DOMRect,
  panZoom: PanZoomState,
  imageSize: ImageSize,
): { x: number; y: number } {
  const imageX = point[0] * imageSize.width
  const imageY = point[1] * imageSize.height
  return {
    x: viewportRect.left + panZoom.x + imageX * panZoom.scale,
    y: viewportRect.top + panZoom.y + imageY * panZoom.scale,
  }
}

function distancePx(
  clientX: number,
  clientY: number,
  viewportRect: DOMRect,
  panZoom: PanZoomState,
  imageSize: ImageSize,
  point: WorldMapPoint,
): number {
  const screen = normalizedToClientPoint(point, viewportRect, panZoom, imageSize)
  return Math.hypot(clientX - screen.x, clientY - screen.y)
}

export function pickDrawRouteTarget(options: PickDrawRouteTargetOptions): DrawRoutePickTarget | null {
  const maxDistancePx = options.maxDistancePx ?? DRAW_HIT_SCREEN_PX
  const candidates: Array<{ target: DrawRoutePickTarget; distancePx: number }> = []

  for (const stop of options.stops) {
    const distance = distancePx(
      options.clientX,
      options.clientY,
      options.viewportRect,
      options.panZoom,
      options.imageSize,
      stop.point,
    )
    if (distance <= maxDistancePx) {
      candidates.push({ target: { kind: 'stop', id: stop.id }, distancePx: distance })
    }
  }

  for (const node of options.pathNodes) {
    const distance = distancePx(
      options.clientX,
      options.clientY,
      options.viewportRect,
      options.panZoom,
      options.imageSize,
      node.point,
    )
    if (distance <= maxDistancePx) {
      candidates.push({ target: { kind: 'pathNode', id: node.id }, distancePx: distance })
    }
  }

  const bendPoints = options.bendPoints ?? []
  options.userBendIndices?.forEach((vertexIndex) => {
    if (vertexIndex <= 0 || vertexIndex >= bendPoints.length - 1) return
    const point = bendPoints[vertexIndex]
    if (!point) return
    const distance = distancePx(
      options.clientX,
      options.clientY,
      options.viewportRect,
      options.panZoom,
      options.imageSize,
      point,
    )
    if (distance <= maxDistancePx) {
      candidates.push({ target: { kind: 'bend', vertexIndex }, distancePx: distance })
    }
  })

  if (candidates.length === 0) return null
  candidates.sort((left, right) => left.distancePx - right.distancePx)
  return candidates[0]!.target
}
