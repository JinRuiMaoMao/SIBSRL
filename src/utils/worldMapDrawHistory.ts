import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop, WorldMapVirtualNode } from '../types/worldMapDraw'

export interface DrawDraftSnapshot {
  draftPoints: WorldMapPoint[]
  draftStops: WorldMapDrawStop[]
  draftVirtualNodes: WorldMapVirtualNode[]
  pathLegStarts: number[]
  pathLegControls: (WorldMapPoint | null)[]
  pathLegHidden: boolean[]
  pathUserBends: boolean[]
  pathManuallyEdited: boolean
}

export function cloneDrawDraftSnapshot(state: DrawDraftSnapshot): DrawDraftSnapshot {
  return {
    draftPoints: state.draftPoints.map((point) => [point[0], point[1]] as WorldMapPoint),
    draftStops: state.draftStops.map((stop) => ({
      ...stop,
      point: [stop.point[0], stop.point[1]] as WorldMapPoint,
      name: { ...stop.name },
    })),
    draftVirtualNodes: state.draftVirtualNodes.map((node) => ({
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
  }
}

export const DRAW_HISTORY_LIMIT = 80
