import type { WorldMapPoint } from '../data/worldMapRoutes'

export type IslandMapDrawInteraction = 'path' | 'stop'

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
