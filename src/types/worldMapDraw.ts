import type { WorldMapPoint } from '../data/worldMapRoutes'

export type IslandMapDrawInteraction = 'route' | 'catalog' | 'virtual'

/** 0–7 index into generalMapRoadSnap NEIGHBORS (exit direction on the road grid). */
export type WorldMapVirtualNodeOutDir = number

export type WorldMapVirtualNodeKind = 'straight' | 'turn' | 'u-turn'

export interface WorldMapVirtualNode {
  id: string
  point: WorldMapPoint
  routeId: string
  kind: WorldMapVirtualNodeKind
  outDir: WorldMapVirtualNodeOutDir
}

export interface WorldMapVirtualNodeDraft {
  point: WorldMapPoint
  routeId: string
  kind: WorldMapVirtualNodeKind
  outDir: WorldMapVirtualNodeOutDir
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
