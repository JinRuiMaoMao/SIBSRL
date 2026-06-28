import type { WorldMapPoint } from '../data/worldMapRoutes'

export type IslandMapDrawInteraction = 'route' | 'catalog' | 'virtual'

export type WorldMapTraceAnchor =
  | { kind: 'stop'; id: string }
  | { kind: 'virtual-node'; id: string }

export type WorldMapCompassDirectionKind =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northwest'
  | 'northeast'
  | 'southwest'
  | 'southeast'

export type WorldMapRelativeDirectionKind = 'turn-left' | 'turn-right' | 'u-turn'

export type WorldMapSurfaceVirtualNodeKind =
  | 'on-bridge'
  | 'off-bridge'
  | 'enter-tunnel'
  | 'exit-tunnel'

export type WorldMapVirtualNodeKind =
  | WorldMapCompassDirectionKind
  | WorldMapRelativeDirectionKind
  | WorldMapSurfaceVirtualNodeKind

export interface WorldMapVirtualNode {
  id: string
  point: WorldMapPoint
  routeId: string
  kind: WorldMapVirtualNodeKind
  /** Sequence along the route; multiple nodes at one junction follow this order. */
  order: number
}

export interface WorldMapVirtualNodeDraft {
  point: WorldMapPoint
  routeId: string
  kind: WorldMapVirtualNodeKind
}

export interface WorldMapDrawStop {
  id: string
  point: WorldMapPoint
  name: {
    zh: string
    en: string
  }
}

export interface WorldMapDrawStopDraft {
  point: WorldMapPoint
  query: string
  /** When set, confirming updates this stop instead of adding a new one. */
  editingStopId?: string
}
