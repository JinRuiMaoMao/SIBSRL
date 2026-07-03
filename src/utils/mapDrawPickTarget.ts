import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
import { DRAW_STOP_NODE_HIT_PX } from './mapDrawHitRadius'

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

interface PickDrawRouteTargetOptions {
  clientX: number
  clientY: number
  viewportRect: DOMRect
  panZoom: PanZoomState
  imageSize: ImageSize
  stops: readonly WorldMapDrawStop[]
  pathNodes: readonly WorldMapDrawPathNode[]
  maxDistancePx?: number
}

export function normalizedToClientPoint(
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

/** Nearest stop or path node within screen radius — bends are handled by the path edit layer. */
export function pickDrawRouteTarget(options: PickDrawRouteTargetOptions): DrawRoutePickTarget | null {
  const maxDistancePx = options.maxDistancePx ?? DRAW_STOP_NODE_HIT_PX
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

  if (candidates.length === 0) return null
  candidates.sort((left, right) => {
    if (left.distancePx !== right.distancePx) return left.distancePx - right.distancePx
    if (left.target.kind === right.target.kind) return 0
    return left.target.kind === 'stop' ? -1 : 1
  })
  return candidates[0]!.target
}

export function isNearDrawAnchor(
  clientX: number,
  clientY: number,
  anchors: readonly WorldMapPoint[],
  viewportRect: DOMRect,
  panZoom: PanZoomState,
  imageSize: ImageSize,
  radiusPx = DRAW_STOP_NODE_HIT_PX,
): boolean {
  for (const point of anchors) {
    const screen = normalizedToClientPoint(point, viewportRect, panZoom, imageSize)
    if (Math.hypot(clientX - screen.x, clientY - screen.y) <= radiusPx) return true
  }
  return false
}
