import type { WorldMapPoint } from '../data/worldMapRoutes'

export type IslandMapDrawInteraction = 'route' | 'catalog'

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
