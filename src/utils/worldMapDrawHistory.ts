import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop, WorldMapDrawPathNode, IslandMapDrawInteraction } from '../types/worldMapDraw'

export interface DrawDraftSnapshot {
  draftPoints: WorldMapPoint[]
  draftStops: WorldMapDrawStop[]
  draftPathNodes: WorldMapDrawPathNode[]
  pathLegStarts: number[]
  pathLegControls: (WorldMapPoint | null)[]
  pathLegHidden: boolean[]
  pathUserBends: boolean[]
  pathManuallyEdited: boolean
  drawRouteId: string
  drawDirectionIndex: number
  drawInteraction: IslandMapDrawInteraction
}

export function cloneDrawDraftSnapshot(state: DrawDraftSnapshot): DrawDraftSnapshot {
  return {
    draftPoints: state.draftPoints.map((point) => [point[0], point[1]] as WorldMapPoint),
    draftStops: state.draftStops.map((stop) => ({
      ...stop,
      point: [stop.point[0], stop.point[1]] as WorldMapPoint,
      name: { ...stop.name },
    })),
    draftPathNodes: (state.draftPathNodes ?? []).map((node) => ({
      ...node,
      point: [node.point[0], node.point[1]] as WorldMapPoint,
    })),
    pathLegStarts: [...state.pathLegStarts],
    pathLegControls: state.pathLegControls.map((control) =>
      control ? ([control[0], control[1]] as WorldMapPoint) : null,
    ),
    pathLegHidden: [...state.pathLegHidden],
    pathUserBends: [...state.pathUserBends],
    pathManuallyEdited: state.pathManuallyEdited,
    drawRouteId: state.drawRouteId,
    drawDirectionIndex: state.drawDirectionIndex,
    drawInteraction: state.drawInteraction,
  }
}

export const DRAW_HISTORY_LIMIT = 80
