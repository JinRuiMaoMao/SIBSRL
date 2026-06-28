import type { WorldMapPoint } from '../data/worldMapRoutes'

export type IslandMapDrawInteraction = 'route' | 'catalog' | 'virtual'

export type WorldMapVirtualNodeKind = 'straight' | 'left' | 'right'

export interface WorldMapVirtualNode {
  id: string
  point: WorldMapPoint
  routeId: string
  kind: WorldMapVirtualNodeKind
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
}
