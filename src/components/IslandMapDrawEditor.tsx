import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { fitNormalizedViewToRoutePoints, listWorldMapRouteSegmentsExcept, resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import { useGeneralMapRoadSnap } from '../hooks/useGeneralMapRoadSnap'
import { useLocale } from '../i18n/LocaleContext'
import { useAuth } from '../contexts/AuthContext'
import {
  buildWorldMapRouteExportPayload,
  copyWorldMapRouteJson,
  downloadWorldMapRouteJson,
  resolveWorldMapExportRouteId,
  type WorldMapRouteExportSelection,
} from '../utils/worldMapRouteExport'
import { exportWorldMapDrawImage } from '../utils/worldMapDrawImageExport'
import {
  detectPathConflicts,
  mergeImportedDrawFiles,
  type ImportedDrawFile,
  type PathConflictGroup,
  type PathConflictResolution,
} from '../utils/worldMapDrawImportMerge'
import { worldMapDrawDraftSliceFromImport, type WorldMapDrawDraftSlice } from '../utils/worldMapDrawMerge'
import {
  mergePathPoints,
  rebuildStopToStopPath,
  resolveEffectiveLegStarts,
  resolveTraceAnchorPoint,
} from '../utils/worldMapDrawPath'
import {
  getPathLegRanges,
  hidePathLeg,
  insertPathBendPoint,
  isStopAnchorIndex,
  movePathVertex,
  removeLegInteriorPoints,
  removePathVertex,
  retacePathSpanAroundUserBend,
  retraceAdjacentLegsAtAnchor,
  resizeLegHidden,
  resizePathUserBends,
  updatePathPointsForStopMove,
} from '../utils/worldMapDrawPathEdit'
import { resizeLegControls } from '../utils/worldMapDrawPathCurve'
import { cloneDrawDraftSnapshot, DRAW_HISTORY_LIMIT, type DrawDraftSnapshot } from '../utils/worldMapDrawHistory'
import { clampPointToRoadCorridor } from '../utils/generalMapRoadSnap'
import { parseWorldMapDrawImportJson } from '../utils/worldMapRouteImport'
import { resolveStopByQuery } from '../utils/routeBetweenStops'
import type {
  IslandMapDrawInteraction,
  WorldMapDrawStop,
  WorldMapDrawStopDraft,
  WorldMapDrawPathNode,
  WorldMapDrawPathNodeDraft,
  WorldMapTraceAnchor,
} from '../types/worldMapDraw'
import { IslandMapDrawExportDialog, type IslandMapDrawExportMergeFile } from './IslandMapDrawExportDialog'
import { IslandMapDrawImportConflictDialog } from './IslandMapDrawImportConflictDialog'
import {
  IslandMapDrawClearDialog,
  type IslandMapDrawClearSelection,
} from './IslandMapDrawClearDialog'
import {
  IslandMapDrawPermissionDialogs,
} from './IslandMapDrawPermissionDialogs'
import { IslandMapDrawInteractionTabs } from './IslandMapDrawInteractionTabs'
import { IslandMapDrawColorPicker } from './IslandMapDrawColorPicker'
import { IslandMapDrawStopLabelSettings } from './IslandMapDrawStopLabelSettings'
import { IslandMapDrawStopPanel } from './IslandMapDrawStopPanel'
import { IslandMapDrawPathNodePanel } from './IslandMapDrawPathNodePanel'
import { IslandMapImportExportPanel } from './IslandMapImportExportPanel'
import { IslandMapPanZoomSurface, DRAW_MAX_ZOOM_RATIO, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { formatBuildLabel, readPublishedBuild } from '../utils/buildLabel'
import { readStoredMapDrawColor } from '../utils/mapDrawColor'
import {
  readStoredMapDrawStopLabelScale,
  readStoredMapDrawStopLabelVisible,
} from '../utils/mapDrawStopLabel'
function readImportJsonText(text: string): unknown {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  return JSON.parse(trimmed)
}


type MapLayer = 'general' | 'detailed'

const MAP_URLS: Record<MapLayer, string> = {
  general: './maps/SIMapGerenal.png',
  detailed: './maps/SIMap.png',
}

function surfaceProps(
  mapSrc: string,
  mode: 'widget' | 'fullscreen',
  className: string,
  mapView: NormalizedMapView | null,
  handleViewChange: (next: NormalizedMapView) => void,
  surfaceRouteOverlay: { routeNumber: string; points: readonly WorldMapPoint[] } | null,
  drawMode: boolean,
  drawInteraction: IslandMapDrawInteraction,
  draftPoints: readonly WorldMapPoint[],
  draftStopPoints: readonly WorldMapPoint[],
  draftStops: readonly WorldMapDrawStop[],
  draftPathNodes: readonly WorldMapDrawPathNode[],
  pendingStopPoint: WorldMapPoint | null,
  pendingPathNodePoint: WorldMapPoint | null,
  draftStrokeColor: string,
  draftRouteNumber: string,
  onDrawMapClick: (point: WorldMapPoint) => void,
  onDrawUndo: () => void,
  maxZoomRatio: number,
  draftPathLegStarts: readonly number[],
  draftPathLegHidden: readonly boolean[],
  draftPathUserBends: readonly boolean[],
  showStopLabels: boolean,
  stopLabelScale: number,
  stopEdit?: {
    selectedStopId: string | null
    onStopDrag: (stopId: string, point: WorldMapPoint) => void
    onStopDragEnd: (stopId: string, point: WorldMapPoint) => void
    onStopClick: (stopId: string) => void
  },
  nodeEdit?: {
    onPathNodeDrag: (nodeId: string, point: WorldMapPoint) => void
    onPathNodeDragEnd: (nodeId: string, point: WorldMapPoint) => void
    onPathNodeClick: (nodeId: string) => void
  },
  pathEdit?: {
    editable: boolean
    onBendInsert: (segmentIndex: number, point: WorldMapPoint) => void
    onBendMove: (vertexIndex: number, point: WorldMapPoint) => void
    onBendDragStart?: () => void
    onBendDragEnd?: (vertexIndex: number, point: WorldMapPoint) => void
    onBendRemove: (vertexIndex: number) => void
    onLegDelete: (legIndex: number) => void
    snapPathPoint: (point: WorldMapPoint) => WorldMapPoint
  },
  traceEdit?: {
    traceSelectedStopId: string | null
    traceSelectedPathNodeId: string | null
    onStopClick: (stopId: string) => void
    onPathNodeClick: (nodeId: string) => void
  },
  roadSnap?: {
    snap: (point: WorldMapPoint) => WorldMapPoint
    isOnRoad: (point: WorldMapPoint) => boolean
  },
) {
  return {
    src: mapSrc,
    mode,
    view: mapView,
    onViewChange: handleViewChange,
    routeOverlay: surfaceRouteOverlay,
    drawMode,
    drawInteraction,
    draftPoints,
    draftStopPoints,
    draftStops,
    draftPathNodes,
    pendingStopPoint,
    pendingPathNodePoint,
    draftStrokeColor,
    draftRouteNumber,
    onDrawMapClick,
    onDrawUndo,
    maxZoomRatio,
    className,
    selectedStopId: stopEdit?.selectedStopId ?? null,
    onStopDrag: stopEdit?.onStopDrag,
    onStopDragEnd: stopEdit?.onStopDragEnd,
    onStopClick: stopEdit?.onStopClick ?? traceEdit?.onStopClick,
    onPathNodeDrag: nodeEdit?.onPathNodeDrag,
    onPathNodeDragEnd: nodeEdit?.onPathNodeDragEnd,
    onPathNodeClick: nodeEdit?.onPathNodeClick ?? traceEdit?.onPathNodeClick,
    pathEditable: pathEdit?.editable ?? false,
    pathLegStarts: draftPathLegStarts,
    pathLegHidden: draftPathLegHidden,
    pathUserBends: draftPathUserBends,
    showStopLabels,
    stopLabelScale,
    onBendInsert: pathEdit?.onBendInsert,
    onBendMove: pathEdit?.onBendMove,
    onBendDragStart: pathEdit?.onBendDragStart,
    onBendDragEnd: pathEdit?.onBendDragEnd,
    onBendRemove: pathEdit?.onBendRemove,
    onLegDelete: pathEdit?.onLegDelete,
    snapPathPoint: pathEdit?.snapPathPoint,
    isOnRoad: roadSnap?.isOnRoad,
    traceSelectedStopId: traceEdit?.traceSelectedStopId ?? null,
    traceSelectedPathNodeId: traceEdit?.traceSelectedPathNodeId ?? null,
  }
}

export function IslandMapDrawEditor() {
  const { t, locale } = useLocale()
  const { isLoggedIn } = useAuth()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [drawInteraction, setDrawInteraction] = useState<IslandMapDrawInteraction>('route')
  const [drawRouteId, setDrawRouteId] = useState('')
  const [drawDirectionIndex, setDrawDirectionIndex] = useState(0)
  const avoidParallelSegments = useMemo(
    () => listWorldMapRouteSegmentsExcept(drawRouteId),
    [drawRouteId],
  )
  const drawBuildLabel = formatBuildLabel(readPublishedBuild() ?? 'development', locale)
  const roadSnap = useGeneralMapRoadSnap(isLoggedIn, { avoidParallelSegments })
  const [draftPoints, setDraftPoints] = useState<WorldMapPoint[]>([])
  const [pathLegStarts, setPathLegStarts] = useState<number[]>([])
  const [pathLegControls, setPathLegControls] = useState<(WorldMapPoint | null)[]>([])
  const [pathLegHidden, setPathLegHidden] = useState<boolean[]>([])
  const [pathUserBends, setPathUserBends] = useState<boolean[]>([])
  const [pathManuallyEdited, setPathManuallyEdited] = useState(false)
  const [draftStops, setDraftStops] = useState<WorldMapDrawStop[]>([])
  const [draftPathNodes, setDraftPathNodes] = useState<WorldMapDrawPathNode[]>([])
  const [pendingStop, setPendingStop] = useState<WorldMapDrawStopDraft | null>(null)
  const [pendingPathNode, setPendingPathNode] = useState<WorldMapDrawPathNodeDraft | null>(null)
  const [pendingTraceAnchor, setPendingTraceAnchor] = useState<WorldMapTraceAnchor | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [drawColor, setDrawColor] = useState(readStoredMapDrawColor)
  const [showStopLabels, setShowStopLabels] = useState(readStoredMapDrawStopLabelVisible)
  const [stopLabelScale, setStopLabelScale] = useState(readStoredMapDrawStopLabelScale)
  const [exportHint, setExportHint] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [importConflictState, setImportConflictState] = useState<{
    files: ImportedDrawFile[]
    conflict: PathConflictGroup
  } | null>(null)
  const [exportMergeFiles, setExportMergeFiles] = useState<IslandMapDrawExportMergeFile[]>([])
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const savedViewRef = useRef<NormalizedMapView | null>(null)
  const exportHintTimerRef = useRef<number | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const draftHistoryRef = useRef({
    draftPoints,
    draftStops,
    draftPathNodes,
    pathLegStarts,
    pathLegControls,
    pathLegHidden,
    pathUserBends,
    pathManuallyEdited,
    drawRouteId,
    drawDirectionIndex,
    drawInteraction,
  })
  const undoStackRef = useRef<DrawDraftSnapshot[]>([])
  const redoStackRef = useRef<DrawDraftSnapshot[]>([])
  const [historyTick, setHistoryTick] = useState(0)

  const bumpHistory = useCallback(() => setHistoryTick((tick) => tick + 1), [])

  useEffect(() => {
    draftHistoryRef.current = {
      draftPoints,
      draftStops,
      draftPathNodes,
      pathLegStarts,
      pathLegControls,
      pathLegHidden,
      pathUserBends,
      pathManuallyEdited,
      drawRouteId,
      drawDirectionIndex,
      drawInteraction,
    }
  }, [
    draftPoints,
    draftStops,
    draftPathNodes,
    drawDirectionIndex,
    drawInteraction,
    drawRouteId,
    pathLegControls,
    pathLegHidden,
    pathLegStarts,
    pathUserBends,
    pathManuallyEdited,
  ])

  const captureDrawSnapshot = useCallback(() => {
    const state = draftHistoryRef.current
    return cloneDrawDraftSnapshot({
      draftPoints: state.draftPoints,
      draftStops: state.draftStops,
      draftPathNodes: state.draftPathNodes,
      pathLegStarts: state.pathLegStarts,
      pathLegControls: state.pathLegControls,
      pathLegHidden: state.pathLegHidden,
      pathUserBends: state.pathUserBends,
      pathManuallyEdited: state.pathManuallyEdited,
      drawRouteId: state.drawRouteId,
      drawDirectionIndex: state.drawDirectionIndex,
      drawInteraction: state.drawInteraction,
    })
  }, [])

  const pushDrawHistory = useCallback(() => {
    undoStackRef.current.push(captureDrawSnapshot())
    if (undoStackRef.current.length > DRAW_HISTORY_LIMIT) {
      undoStackRef.current.shift()
    }
    redoStackRef.current = []
    bumpHistory()
  }, [bumpHistory, captureDrawSnapshot])

  const applyDrawSnapshot = useCallback((snapshot: DrawDraftSnapshot) => {
      setDraftPoints(snapshot.draftPoints.map((point) => [point[0], point[1]] as WorldMapPoint))
      setDraftStops(
        snapshot.draftStops.map((stop) => ({
          ...stop,
          point: [stop.point[0], stop.point[1]] as WorldMapPoint,
          name: { ...stop.name },
        })),
      )
      setDraftPathNodes(
        (snapshot.draftPathNodes ?? []).map((node) => ({
          ...node,
          point: [node.point[0], node.point[1]] as WorldMapPoint,
        })),
      )
      setPathLegStarts([...snapshot.pathLegStarts])
      setPathLegControls(
        snapshot.pathLegControls.map((control) =>
          control ? ([control[0], control[1]] as WorldMapPoint) : null,
        ),
      )
      setPathLegHidden([...snapshot.pathLegHidden])
      setPathUserBends(resizePathUserBends(snapshot.pathUserBends ?? [], snapshot.draftPoints.length))
      setPathManuallyEdited(snapshot.pathManuallyEdited)
      setDrawRouteId(snapshot.drawRouteId)
      setDrawDirectionIndex(snapshot.drawDirectionIndex)
      setDrawInteraction(snapshot.drawInteraction)
  }, [])

  const handleViewChange = useCallback((next: NormalizedMapView) => {
    setMapView(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    const preload = () => {
      if (cancelled) return
      for (const url of Object.values(MAP_URLS)) {
        const image = new Image()
        image.decoding = 'async'
        image.src = url
      }
    }
    const idleId =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(preload, { timeout: 4000 })
        : null
    const timerId = idleId == null ? window.setTimeout(preload, 2000) : null
    return () => {
      cancelled = true
      if (idleId != null && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId)
      }
      if (timerId != null) window.clearTimeout(timerId)
    }
  }, [])

  useEffect(() => {
    if (!routeOverlay) {
      if (savedViewRef.current) {
        setMapView(savedViewRef.current)
        savedViewRef.current = null
      }
      return
    }
    savedViewRef.current = mapView
    setMapView(
      fitNormalizedViewToRoutePoints(routeOverlay.points, 'fullscreen'),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refit when route overlay changes
  }, [routeOverlay])

  useEffect(() => {
    if (!routeOverlay) return
    setDrawRouteId(routeOverlay.routeId)
    setDrawDirectionIndex(routeOverlay.directionIndex)
  }, [routeOverlay])

  const effectiveLegStarts = useMemo(
    () => resolveEffectiveLegStarts(pathLegStarts, draftPoints.length, draftStops.length),
    [draftPoints.length, draftStops.length, pathLegStarts],
  )

  useEffect(() => {
    const legCount =
      draftPoints.length >= 2
        ? getPathLegRanges(effectiveLegStarts, draftPoints.length).length
        : 0
    setPathLegControls((controls) => resizeLegControls(controls, legCount))
    setPathLegHidden((hidden) => resizeLegHidden(hidden, legCount))
  }, [draftPoints.length, effectiveLegStarts])

  useEffect(() => {
    if (drawInteraction !== 'path-node') {
      setPendingPathNode(null)
    }
  }, [drawInteraction])

  useEffect(() => {
    if (!isLoggedIn) {
      setDrawMode(false)
      setPendingStop(null)
    }
  }, [isLoggedIn])

  useEffect(() => {
    return () => {
      if (exportHintTimerRef.current != null) {
        window.clearTimeout(exportHintTimerRef.current)
      }
    }
  }, [])

  const showExportHint = useCallback((message: string) => {
    setExportHint(message)
    if (exportHintTimerRef.current != null) {
      window.clearTimeout(exportHintTimerRef.current)
    }
    exportHintTimerRef.current = window.setTimeout(() => {
      setExportHint(null)
      exportHintTimerRef.current = null
    }, 2600)
  }, [])

  const traceRoadSegment = useCallback(
    (from: WorldMapPoint, to: WorldMapPoint, via: Parameters<typeof roadSnap.appendSegment>[2] = []) => {
      if (!roadSnap.index) return [from, to]
      const traced = roadSnap.appendSegment(from, to, via)
      return traced.length >= 2 ? traced : [from, to]
    },
    [roadSnap],
  )

  const appendTracedSegment = useCallback(
    (from: WorldMapTraceAnchor, to: WorldMapTraceAnchor) => {
      const fromPoint = resolveTraceAnchorPoint(from, draftStops, [], draftPathNodes)
      const toPoint = resolveTraceAnchorPoint(to, draftStops, [], draftPathNodes)
      if (!fromPoint || !toPoint) return false
      if (Math.hypot(fromPoint[0] - toPoint[0], fromPoint[1] - toPoint[1]) < 0.00005) return false

      pushDrawHistory()
      setDraftPoints((current) => {
        const start = current.length
        setPathLegStarts((legs) => {
          if (start === 0) return [0]
          const base = legs.length > 0 ? legs : [0]
          if (base.includes(start)) return base
          return [...base, start]
        })

        let basePoints = current
        if (basePoints.length > 0) {
          const last = basePoints[basePoints.length - 1]!
          if (Math.hypot(last[0] - fromPoint[0], last[1] - fromPoint[1]) > 0.00005) {
            basePoints = mergePathPoints(basePoints, [fromPoint])
          }
        }

        const cursor = basePoints.length > 0 ? basePoints[basePoints.length - 1]! : fromPoint
        const traced = traceRoadSegment(cursor, toPoint, [])
        const merged =
          basePoints.length === 0
            ? traced
            : mergePathPoints(basePoints, traced.length > 1 ? traced.slice(1) : traced)

        setPathUserBends((bends) => {
          const next = resizePathUserBends(bends, current.length)
          const added = merged.length - current.length
          return [...next, ...Array.from({ length: Math.max(0, added) }, () => false)]
        })
        return merged
      })
      setPathManuallyEdited(true)
      return true
    },
    [draftPathNodes, draftStops, pushDrawHistory, traceRoadSegment],
  )

  const retraceSpanAroundAnchor = useCallback(
    (
      points: WorldMapPoint[],
      legStarts: number[],
      legHidden: readonly boolean[],
      anchorPoint: WorldMapPoint,
      anchors: readonly { point: WorldMapPoint }[],
    ): { points: WorldMapPoint[]; legStarts: number[] } => {
      if (!roadSnap.index) return { points, legStarts }
      return retraceAdjacentLegsAtAnchor(
        points,
        legStarts,
        legHidden,
        anchorPoint,
        anchors,
        traceRoadSegment,
      )
    },
    [roadSnap.index, traceRoadSegment],
  )

  const openPathNodeEditor = useCallback((node: WorldMapDrawPathNode) => {
    setPendingPathNode({
      point: node.point,
      label: node.label,
      editingNodeId: node.id,
    })
  }, [])

  const handleTraceAnchorPick = useCallback(
    (anchor: WorldMapTraceAnchor) => {
      if (drawInteraction !== 'route') return
      if (
        pendingTraceAnchor &&
        pendingTraceAnchor.kind === anchor.kind &&
        pendingTraceAnchor.id === anchor.id
      ) {
        setPendingTraceAnchor(null)
        return
      }
      if (!pendingTraceAnchor) {
        setPendingTraceAnchor(anchor)
        return
      }
      if (appendTracedSegment(pendingTraceAnchor, anchor)) {
        setPendingTraceAnchor(null)
      }
    },
    [appendTracedSegment, drawInteraction, pendingTraceAnchor],
  )

  const handlePathNodeClick = useCallback(
    (nodeId: string) => {
      if (drawInteraction === 'path-node') {
        const node = draftPathNodes.find((entry) => entry.id === nodeId)
        if (node) openPathNodeEditor(node)
        return
      }
      handleTraceAnchorPick({ kind: 'path-node', id: nodeId })
    },
    [draftPathNodes, drawInteraction, handleTraceAnchorPick, openPathNodeEditor],
  )

  const handleDrawMapClick = useCallback(
    (point: WorldMapPoint) => {
      if (drawInteraction === 'path-node') {
        if (pendingPathNode) return
        setPendingPathNode({ point: roadSnap.snap(point) })
        return
      }
      if (drawInteraction === 'route') {
        setPendingTraceAnchor(null)
        setPendingStop(null)
        setSelectedStopId(null)
        return
      }
      if (pendingStop) return
      setPendingStop({ point: roadSnap.snap(point), query: '' })
    },
    [drawInteraction, pendingPathNode, pendingStop, roadSnap],
  )

  const handleDrawUndo = useCallback(() => {
    if (pendingPathNode) {
      setPendingPathNode(null)
      return
    }
    if (pendingStop) {
      setPendingStop(null)
      setSelectedStopId(null)
      return
    }
    if (pendingTraceAnchor) {
      setPendingTraceAnchor(null)
      return
    }
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(captureDrawSnapshot())
    applyDrawSnapshot(previous)
    bumpHistory()
  }, [
    applyDrawSnapshot,
    bumpHistory,
    captureDrawSnapshot,
    pendingPathNode,
    pendingStop,
    pendingTraceAnchor,
  ])

  const handleDrawRedo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(captureDrawSnapshot())
    applyDrawSnapshot(next)
    bumpHistory()
  }, [applyDrawSnapshot, bumpHistory, captureDrawSnapshot])

  const clearDraftPath = useCallback(() => {
    setDraftPoints([])
    setPathLegStarts([])
    setPathLegControls([])
    setPathLegHidden([])
    setPathUserBends([])
    setPathManuallyEdited(false)
    setPendingTraceAnchor(null)
  }, [])

  const applyClearSelection = useCallback(
    (selection: IslandMapDrawClearSelection) => {
      pushDrawHistory()
      if (selection.path) {
        clearDraftPath()
      }
      if (selection.stops) {
        setDraftStops([])
        setPendingStop(null)
        setSelectedStopId(null)
      }
      if (selection.pathNodes) {
        setDraftPathNodes([])
        setPendingPathNode(null)
      }
      setClearDialogOpen(false)
    },
    [clearDraftPath, pushDrawHistory],
  )

  const openClearDialog = useCallback(() => {
    setClearDialogOpen(true)
  }, [])

  const handleRemoveStop = useCallback(
    (id: string) => {
      pushDrawHistory()
      if (pendingStop?.editingStopId === id) {
        setPendingStop(null)
      }
      if (selectedStopId === id) {
        setSelectedStopId(null)
      }
      setDraftStops((stops) => stops.filter((stop) => stop.id !== id))
      setDraftPoints((points) => {
        if (points.length !== draftStops.length) return points
        const removeIndex = draftStops.findIndex((stop) => stop.id === id)
        if (removeIndex < 0) return points
        return points.filter((_, index) => index !== removeIndex)
      })
    },
    [draftStops, pushDrawHistory, selectedStopId, pendingStop?.editingStopId],
  )

  const openStopEditor = useCallback(
    (stop: WorldMapDrawStop) => {
      setSelectedStopId(stop.id)
      setPendingStop({
        point: stop.point,
        query: locale.startsWith('zh') ? stop.name.zh : stop.name.en || stop.name.zh,
        editingStopId: stop.id,
      })
    },
    [locale],
  )

  const handleStopDrag = useCallback((stopId: string, point: WorldMapPoint) => {
    setDraftStops((stops) => {
      const nextStops = stops.map((stop) => (stop.id === stopId ? { ...stop, point } : stop))
      setDraftPoints((points) => updatePathPointsForStopMove(points, stops, stopId, point))
      return nextStops
    })
  }, [])

  const handleStopDragEnd = useCallback(
    (stopId: string, point: WorldMapPoint) => {
      const snapped = roadSnap.snap(point)
      pushDrawHistory()

      const state = draftHistoryRef.current
      const stop = state.draftStops.find((entry) => entry.id === stopId)
      if (!stop) return

      const nextStops = state.draftStops.map((entry) =>
        entry.id === stopId ? { ...entry, point: snapped } : entry,
      )
      const moved = updatePathPointsForStopMove(state.draftPoints, state.draftStops, stopId, snapped)
      const retraced = retraceSpanAroundAnchor(moved, state.pathLegStarts, state.pathLegHidden, snapped, [
        ...nextStops,
        ...state.draftPathNodes,
      ])

      setDraftStops(nextStops)
      setDraftPoints(retraced.points)
      setPathLegStarts(retraced.legStarts)
      setPathUserBends(Array.from({ length: retraced.points.length }, () => false))
      setPathManuallyEdited(true)
      if (pendingStop?.editingStopId === stopId) {
        setPendingStop((current) => (current ? { ...current, point: snapped } : current))
      }
    },
    [pendingStop?.editingStopId, pushDrawHistory, retraceSpanAroundAnchor, roadSnap],
  )

  const handleStopClick = useCallback(
    (stopId: string) => {
      handleTraceAnchorPick({ kind: 'stop', id: stopId })
    },
    [handleTraceAnchorPick],
  )

  const handlePathNodeDrag = useCallback((nodeId: string, point: WorldMapPoint) => {
    setDraftPathNodes((nodes) => {
      const nextNodes = nodes.map((node) => (node.id === nodeId ? { ...node, point } : node))
      const node = nodes.find((entry) => entry.id === nodeId)
      if (node) {
        setDraftPoints((points) => updatePathPointsForStopMove(points, [node], nodeId, point))
      }
      return nextNodes
    })
  }, [])

  const handlePathNodeDragEnd = useCallback(
    (nodeId: string, point: WorldMapPoint) => {
      const snapped = roadSnap.snap(point)
      pushDrawHistory()

      const state = draftHistoryRef.current
      const node = state.draftPathNodes.find((entry) => entry.id === nodeId)
      if (!node) return

      const nextNodes = state.draftPathNodes.map((entry) =>
        entry.id === nodeId ? { ...entry, point: snapped } : entry,
      )
      const moved = updatePathPointsForStopMove(state.draftPoints, [node], nodeId, snapped)
      const retraced = retraceSpanAroundAnchor(moved, state.pathLegStarts, state.pathLegHidden, snapped, [
        ...state.draftStops,
        ...nextNodes,
      ])

      setDraftPathNodes(nextNodes)
      setDraftPoints(retraced.points)
      setPathLegStarts(retraced.legStarts)
      setPathUserBends(Array.from({ length: retraced.points.length }, () => false))
      setPathManuallyEdited(true)
      if (pendingPathNode?.editingNodeId === nodeId) {
        setPendingPathNode((current) => (current ? { ...current, point: snapped } : current))
      }
    },
    [pendingPathNode?.editingNodeId, pushDrawHistory, retraceSpanAroundAnchor, roadSnap],
  )

  const handleConfirmPendingPathNode = useCallback(() => {
    if (!pendingPathNode) return
    pushDrawHistory()
    if (pendingPathNode.editingNodeId) {
      setDraftPathNodes((nodes) =>
        nodes.map((node) =>
          node.id === pendingPathNode.editingNodeId
            ? {
                ...node,
                point: pendingPathNode.point,
                label: pendingPathNode.label?.trim() || node.label,
              }
            : node,
        ),
      )
      setPendingPathNode(null)
      return
    }
    const id = `node-${Date.now().toString(36)}`
    setDraftPathNodes((nodes) => [
      ...nodes,
      {
        id,
        point: pendingPathNode.point,
        label: pendingPathNode.label?.trim() || undefined,
      },
    ])
    setPendingPathNode(null)
  }, [pendingPathNode, pushDrawHistory])

  const handleRemovePendingPathNode = useCallback(() => {
    if (pendingPathNode?.editingNodeId) {
      pushDrawHistory()
      const nodeId = pendingPathNode.editingNodeId
      setDraftPathNodes((nodes) => nodes.filter((node) => node.id !== nodeId))
    }
    setPendingPathNode(null)
  }, [pendingPathNode, pushDrawHistory])

  const handleBendInsert = useCallback(
    (segmentIndex: number, point: WorldMapPoint) => {
      pushDrawHistory()
      const snapped = roadSnap.snap(point)
      const result = insertPathBendPoint(draftPoints, pathLegStarts, segmentIndex, snapped)
      const insertAt = segmentIndex + 1
      setDraftPoints(result.points)
      setPathLegStarts(result.legStarts)
      setPathUserBends((bends) => {
        const next = resizePathUserBends(bends, draftPoints.length)
        next.splice(insertAt, 0, true)
        return next
      })
      setPathManuallyEdited(true)
    },
    [draftPoints, pathLegStarts, pushDrawHistory, roadSnap],
  )

  const handleBendMove = useCallback(
    (vertexIndex: number, point: WorldMapPoint) => {
      if (!pathUserBends[vertexIndex]) return
      const snapped = roadSnap.index
        ? clampPointToRoadCorridor(roadSnap.index, point)
        : roadSnap.snap(point)
      setDraftPoints(movePathVertex(draftPoints, vertexIndex, snapped))
    },
    [draftPoints, pathUserBends, roadSnap],
  )

  const handleBendDragStart = useCallback(() => {
    pushDrawHistory()
  }, [pushDrawHistory])

  const handleBendDragEnd = useCallback(
    (vertexIndex: number, point: WorldMapPoint) => {
      const snapped = roadSnap.index
        ? clampPointToRoadCorridor(roadSnap.index, point)
        : roadSnap.snap(point)

      if (pathUserBends[vertexIndex]) {
        const retraced = retacePathSpanAroundUserBend(
          draftPoints,
          pathLegStarts,
          pathUserBends,
          vertexIndex,
          snapped,
          (from, to) => traceRoadSegment(from, to),
        )
        if (retraced) {
          setDraftPoints(retraced.points)
          setPathLegStarts(retraced.legStarts)
          setPathUserBends(retraced.userBends)
          setPathManuallyEdited(true)
          return
        }
      }

      setDraftPoints((points) => movePathVertex(points, vertexIndex, snapped))
      setPathManuallyEdited(true)
    },
    [draftPoints, pathLegStarts, pathUserBends, roadSnap, traceRoadSegment],
  )

  const handleBendRemove = useCallback(
    (vertexIndex: number) => {
      if (isStopAnchorIndex(vertexIndex, draftPoints, [...draftStops, ...draftPathNodes])) return
      if (!pathUserBends[vertexIndex]) return
      const result = removePathVertex(draftPoints, pathLegStarts, vertexIndex)
      if (!result) return
      pushDrawHistory()
      setDraftPoints(result.points)
      setPathLegStarts(result.legStarts)
      setPathUserBends((bends) => {
        const next = resizePathUserBends(bends, draftPoints.length)
        next.splice(vertexIndex, 1)
        return next
      })
      setPathManuallyEdited(true)
    },
    [draftPathNodes, draftPoints, draftStops, pathLegStarts, pathUserBends, pushDrawHistory],
  )

  const handlePathLegDelete = useCallback(
    (legIndex: number) => {
      pushDrawHistory()
      setDrawInteraction('route')
      setPendingStop(null)
      setSelectedStopId(null)
      setPendingTraceAnchor(null)

      const state = draftHistoryRef.current
      const removed = removeLegInteriorPoints(
        state.draftPoints,
        state.pathLegStarts,
        state.pathUserBends,
        legIndex,
      )
      if (!removed) return

      setDraftPoints(removed.points)
      setPathLegStarts(removed.legStarts)
      setPathUserBends(removed.userBends)
      setPathLegHidden((hidden) => hidePathLeg(hidden, legIndex))
      setPathManuallyEdited(true)
    },
    [pushDrawHistory],
  )

  const handleConfirmPendingStop = useCallback(() => {
    if (!pendingStop) return
    const query = pendingStop.query.trim()
    if (!query) return
    pushDrawHistory()
    const matched = resolveStopByQuery(query)
    const name = matched
      ? { zh: matched.zh, en: matched.en || matched.zh }
      : { zh: query, en: query }
    if (pendingStop.editingStopId) {
      setDraftStops((stops) =>
        stops.map((stop) =>
          stop.id === pendingStop.editingStopId
            ? { ...stop, point: pendingStop.point, name }
            : stop,
        ),
      )
    } else {
      setDraftStops((stops) => [
        ...stops,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          point: pendingStop.point,
          name,
        },
      ])
    }
    setPendingStop(null)
    setSelectedStopId(null)
  }, [pendingStop, pushDrawHistory])

  const handleInteractionChange = useCallback((interaction: IslandMapDrawInteraction) => {
    setDrawInteraction(interaction)
    setPendingStop(null)
    setSelectedStopId(null)
    setPendingTraceAnchor(null)
    setPendingPathNode(null)
    if (interaction === 'catalog') {
      setDraftPoints([])
      setPathUserBends([])
      setPathManuallyEdited(false)
    }
  }, [])

  const toggleDrawMode = useCallback(() => {
    setDrawMode((current) => {
      const next = !current
      if (next) {
        setLayer('general')
      }
      return next
    })
  }, [])

  const handleDrawEntryClick = useCallback(() => {
    if (isLoggedIn) {
      toggleDrawMode()
      return
    }
    setPermissionDialogOpen(true)
  }, [isLoggedIn, toggleDrawMode])

  const closePermissionDialog = useCallback(() => {
    setPermissionDialogOpen(false)
  }, [])

  const overlayRouteId = routeOverlay?.routeId

  const openExportDialog = useCallback(() => {
    setExportMergeFiles([])
    setExportDialogOpen(true)
  }, [])

  const handleAddExportMergeFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files)
    const next: IslandMapDrawExportMergeFile[] = []
    for (const file of fileArray) {
      try {
        const parsed = parseWorldMapDrawImportJson(readImportJsonText(await file.text()))
        if (!parsed) continue
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          slice: worldMapDrawDraftSliceFromImport(parsed),
        })
      } catch {
        // skip invalid merge files
      }
    }
    if (next.length > 0) {
      setExportMergeFiles((current) => [...current, ...next])
    }
  }, [])

  const handleExportConfirm = useCallback(
    async (selection: WorldMapRouteExportSelection, merged: WorldMapDrawDraftSlice) => {
      const resolvedRouteId = resolveWorldMapExportRouteId(
        merged.routeId || drawRouteId,
        [],
        overlayRouteId,
      )
      if (!resolvedRouteId) {
        showExportHint(t('islandMapDrawExportNeedRouteId'))
        return
      }

      let pointsForExport = merged.points
      if (selection.includePath && pointsForExport.length < 2 && merged.stops.length >= 2) {
        pointsForExport = rebuildStopToStopPath(merged.stops)
      }

      if (selection.includePath && pointsForExport.length < 2) {
        showExportHint(t('islandMapDrawExportNoPath'))
        return
      }

      const exportJson = selection.includeStops || selection.includePathNodes || selection.includePath
      const usingCurrentDraftPath =
        pointsForExport.length >= 2 &&
        pointsForExport.length === draftPoints.length &&
        pointsForExport.every(
          (point, index) =>
            Math.abs(point[0] - (draftPoints[index]?.[0] ?? -1)) < 0.0001 &&
            Math.abs(point[1] - (draftPoints[index]?.[1] ?? -1)) < 0.0001,
        )
      const legStartsForExport = usingCurrentDraftPath ? pathLegStarts : [0]
      const legHiddenForExport = usingCurrentDraftPath ? pathLegHidden : []

      if (selection.includeImage) {
        if (pointsForExport.length < 2 && merged.stops.length < 1) {
          showExportHint(t('islandMapDrawExportNoImage'))
          return
        }
        try {
          await exportWorldMapDrawImage(
            {
              mapImageUrl: MAP_URLS.general,
              routeId: resolvedRouteId,
              points: pointsForExport.length >= 2 ? pointsForExport : rebuildStopToStopPath(merged.stops),
              stops: merged.stops,
              legStarts: legStartsForExport,
              legHidden: legHiddenForExport,
              pathUserBends: usingCurrentDraftPath ? pathUserBends : [],
              strokeColor: drawColor,
              showStopLabels,
              stopLabelScale,
              locale,
            },
            selection.exportBaseName,
          )
        } catch (error) {
          console.error('Route image export failed', error)
          showExportHint(t('islandMapDrawExportImageFailed'))
          return
        }
      }

      if (exportJson) {
        const payload = buildWorldMapRouteExportPayload(
          merged.routeId || drawRouteId,
          merged.directionIndex ?? drawDirectionIndex,
          pointsForExport,
          merged.stops,
          overlayRouteId,
          selection,
          usingCurrentDraftPath
            ? {
                legStarts: pathLegStarts,
                pathLegHidden,
                userBendIndices: pathUserBends.flatMap((isUser, index) => (isUser ? [index] : [])),
              }
            : {},
          usingCurrentDraftPath ? draftPathNodes : [],
        )
        if (!payload) {
          showExportHint(t('islandMapDrawExportNeedRoute'))
          return
        }

        downloadWorldMapRouteJson(payload, selection.exportBaseName)
        const copied = await copyWorldMapRouteJson(payload)
        showExportHint(
          selection.includeImage
            ? copied
              ? t('islandMapDrawExportRouteAndImageDone')
              : t('islandMapDrawExportRouteAndImageDownloaded')
            : copied
              ? t('islandMapDrawExportRouteDone')
              : t('islandMapDrawExportRouteDownloaded'),
        )
      } else if (selection.includeImage) {
        showExportHint(t('islandMapDrawExportImageDone'))
      }

      setExportDialogOpen(false)
      setExportMergeFiles([])
    },
    [
      drawColor,
      drawDirectionIndex,
      drawRouteId,
      draftPathNodes,
      draftPoints,
      locale,
      overlayRouteId,
      pathLegHidden,
      pathLegStarts,
      pathUserBends,
      showStopLabels,
      stopLabelScale,
      showExportHint,
      t,
    ],
  )

  const applyImportedDrawFiles = useCallback(
    (files: readonly ImportedDrawFile[], resolution: PathConflictResolution) => {
      setPendingStop(null)
      setPendingPathNode(null)
      pushDrawHistory()

      const merged = mergeImportedDrawFiles(files, resolution, draftStops)
      if (!merged) {
        showExportHint(t('islandMapDrawImportInvalid'))
        return
      }

      setDrawMode(true)
      setLayer('general')

      if (merged.kind === 'catalog') {
        setDrawInteraction('catalog')
        setDraftPoints([])
        setDraftPathNodes([])
        setPathLegStarts([0])
        setPathLegControls([])
        setPathLegHidden([])
        setPathUserBends([])
        setPathManuallyEdited(false)
        setDraftStops(merged.stops)
        redoStackRef.current = []
        setMapView(
          fitNormalizedViewToRoutePoints(
            merged.stops.map((stop) => stop.point),
            'fullscreen',
          ),
        )
        showExportHint(
          files.length > 1
            ? t('islandMapDrawImportMultiCatalogDone', {
                fileCount: files.length,
                count: merged.stops.length,
              })
            : t('islandMapDrawImportCatalogDone', { count: merged.stops.length }),
        )
        return
      }

      setDrawInteraction('route')
      setDrawRouteId(merged.routeId)
      setDrawDirectionIndex(merged.directionIndex)
      setDraftStops(merged.stops)
      setDraftPoints(merged.points)
      setDraftPathNodes(merged.pathNodes)
      setPathLegStarts(merged.legStarts)
      setPathLegControls([])
      setPathLegHidden(merged.pathLegHidden)
      setPathUserBends(merged.pathUserBends)
      setPathManuallyEdited(merged.points.length >= 2)
      redoStackRef.current = []
      const fitPoints =
        merged.points.length >= 2 ? merged.points : merged.stops.map((stop) => stop.point)
      if (fitPoints.length > 0) {
        setMapView(fitNormalizedViewToRoutePoints(fitPoints, 'fullscreen'))
      }
      if (resolution.kind === 'clearPaths') {
        showExportHint(
          t('islandMapDrawImportConflictClearedDone', {
            routeId: merged.routeId,
            count: merged.stops.length,
          }),
        )
      } else if (files.length > 1) {
        showExportHint(
          t('islandMapDrawImportMultiDone', {
            fileCount: files.length,
            routeId: merged.routeId,
            count: merged.stops.length,
          }),
        )
      } else {
        showExportHint(t('islandMapDrawImportRouteDone', { routeId: merged.routeId }))
      }
    },
    [draftStops, pushDrawHistory, showExportHint, t],
  )

  const handleImportFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      event.target.value = ''
      if (files.length === 0) return

      const importedFiles: ImportedDrawFile[] = []
      for (const file of files) {
        try {
          const parsed = parseWorldMapDrawImportJson(readImportJsonText(await file.text()))
          if (!parsed || parsed.kind === 'virtual') continue
          importedFiles.push({ fileName: file.name, parsed })
        } catch {
          // skip invalid files
        }
      }

      if (importedFiles.length === 0) {
        showExportHint(t('islandMapDrawImportInvalid'))
        return
      }

      const conflict = detectPathConflicts(importedFiles)
      if (conflict) {
        setImportConflictState({ files: importedFiles, conflict })
        return
      }

      applyImportedDrawFiles(importedFiles, { kind: 'keepAll' })
    },
    [applyImportedDrawFiles, showExportHint, t],
  )

  const mapSrc = MAP_URLS[layer]
  const surfaceRouteOverlay = routeOverlay
    ? { routeNumber: routeOverlay.routeNumber, points: routeOverlay.points }
    : null
  const canExport =
    draftStops.length > 0 ||
    draftPoints.length >= 2 ||
    resolveWorldMapExportRouteId(drawRouteId, [], overlayRouteId) !== ''
  const surfaceMaxZoomRatio = drawMode ? DRAW_MAX_ZOOM_RATIO : 8
  const draftStopPoints = draftStops.map((stop) => stop.point)
  const stopEdit = useMemo(
    () =>
      drawMode && drawInteraction === 'route'
        ? {
            selectedStopId,
            onStopDrag: handleStopDrag,
            onStopDragEnd: handleStopDragEnd,
            onStopClick: handleStopClick,
          }
        : undefined,
    [
      drawInteraction,
      drawMode,
      handleStopClick,
      handleStopDrag,
      handleStopDragEnd,
      selectedStopId,
    ],
  )
  const pathEdit = useMemo(
    () =>
      drawMode && drawInteraction === 'route' && draftPoints.length >= 2
        ? {
            editable: true,
            onBendInsert: handleBendInsert,
            onBendMove: handleBendMove,
            onBendDragStart: handleBendDragStart,
            onBendDragEnd: handleBendDragEnd,
            onBendRemove: handleBendRemove,
            onLegDelete: handlePathLegDelete,
            snapPathPoint: roadSnap.snap,
          }
        : undefined,
    [
      drawInteraction,
      drawMode,
      draftPoints.length,
      handleBendDragEnd,
      handleBendDragStart,
      handleBendInsert,
      handleBendMove,
      handleBendRemove,
      handlePathLegDelete,
      pathLegHidden,
      pathUserBends,
      roadSnap.snap,
    ],
  )
  const traceEdit = useMemo(
    () =>
      drawMode && drawInteraction === 'route'
        ? {
            traceSelectedStopId:
              pendingTraceAnchor?.kind === 'stop' ? pendingTraceAnchor.id : null,
            traceSelectedPathNodeId:
              pendingTraceAnchor?.kind === 'path-node' ? pendingTraceAnchor.id : null,
            onStopClick: handleStopClick,
            onPathNodeClick: handlePathNodeClick,
          }
        : undefined,
    [drawInteraction, drawMode, handlePathNodeClick, handleStopClick, pendingTraceAnchor],
  )
  const nodeEdit = useMemo(
    () =>
      drawMode && (drawInteraction === 'route' || drawInteraction === 'path-node')
        ? {
            onPathNodeDrag: handlePathNodeDrag,
            onPathNodeDragEnd: handlePathNodeDragEnd,
            onPathNodeClick: handlePathNodeClick,
          }
        : undefined,
    [drawInteraction, drawMode, handlePathNodeClick, handlePathNodeDrag, handlePathNodeDragEnd],
  )
  const roadSnapSurface = useMemo(
    () => ({ snap: roadSnap.snap, isOnRoad: roadSnap.isOnRoad }),
    [roadSnap.isOnRoad, roadSnap.snap],
  )
  const draftRouteNumber = drawRouteId.trim()
  const canUndo =
    pendingPathNode != null ||
    pendingStop != null ||
    pendingTraceAnchor != null ||
    undoStackRef.current.length > 0
  void historyTick
  const canRedo = redoStackRef.current.length > 0
  const canClear =
    draftPoints.length >= 2 ||
    draftStops.length > 0 ||
    draftPathNodes.length > 0 ||
    pendingStop != null ||
    pendingPathNode != null
  const hasDraftPath = draftPoints.length >= 2

  const exportSourceSlices = useMemo<WorldMapDrawDraftSlice[]>(
    () => [
      {
        routeId: drawRouteId,
        directionIndex: drawDirectionIndex,
        points: [...draftPoints],
        stops: [...draftStops],
        virtualNodes: [],
      },
      ...exportMergeFiles.map((file) => file.slice),
    ],
    [drawDirectionIndex, drawRouteId, draftPoints, draftStops, exportMergeFiles],
  )

  const importExportPanelProps = {
    interaction: drawInteraction,
    routeId: drawRouteId,
    stopCount: draftStops.length,
    pathNodeCount: draftPathNodes.length,
    canExport,
    canClear,
    exportHint,
    onImport: () => importInputRef.current?.click(),
    onExport: openExportDialog,
    onClear: openClearDialog,
    onDrawRequest: !isLoggedIn ? handleDrawEntryClick : undefined,
  }

  const hiddenImportInput = (
    <input
      ref={importInputRef}
      type="file"
      accept=".json,application/json"
      multiple
      className="island-map-draw-import-input"
      onChange={(event) => void handleImportFileChange(event)}
    />
  )

  const guestMapPanel = !isLoggedIn ? <IslandMapImportExportPanel {...importExportPanelProps} /> : null

  const toggleLayer = useCallback(() => {
    setLayer((current) => (current === 'general' ? 'detailed' : 'general'))
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('island-map-fullscreen-open')
    return () => document.documentElement.classList.remove('island-map-fullscreen-open')
  }, [])

  useEffect(() => {
    if (!drawMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handleDrawUndo()
      } else if (event.key === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault()
        handleDrawRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawMode, handleDrawRedo, handleDrawUndo])

  const drawPanel = isLoggedIn ? (
    <div className="island-map-draw-panel">
      <div className="island-map-draw-panel-row">
        <button
          type="button"
          className={`island-map-btn island-map-btn--draw${drawMode ? ' island-map-btn--active' : ''}`.trim()}
          onClick={toggleDrawMode}
          aria-pressed={drawMode}
          title={drawMode ? t('islandMapDrawStopHint') : t('islandMapDrawStartHint')}
        >
          {drawMode ? t('islandMapDrawStop') : t('islandMapDrawStart')}
        </button>
        <button
          type="button"
          className="island-map-btn"
          onClick={handleDrawUndo}
          disabled={!canUndo}
          title={t('islandMapDrawUndoHint')}
        >
          {t('islandMapDrawUndo')}
        </button>
        <button
          type="button"
          className="island-map-btn"
          onClick={handleDrawRedo}
          disabled={!canRedo}
          title={t('islandMapDrawRedoHint')}
        >
          {t('islandMapDrawRedo')}
        </button>
        <button
          type="button"
          className="island-map-btn"
          onClick={openClearDialog}
          disabled={!canClear}
          title={t('islandMapDrawClearHint')}
        >
          {t('islandMapDrawClear')}
        </button>
        <button
          type="button"
          className="island-map-btn island-map-btn--import"
          onClick={() => importInputRef.current?.click()}
          title={t('islandMapDrawImportHint')}
        >
          {t('islandMapDrawImport')}
        </button>
        <button
          type="button"
          className="island-map-btn island-map-btn--export"
          onClick={openExportDialog}
          disabled={!canExport}
          title={t('islandMapDrawExportRouteHint')}
        >
          {t('islandMapDrawExport')}
        </button>
      </div>
      <IslandMapDrawInteractionTabs
        interaction={drawInteraction}
        onInteractionChange={handleInteractionChange}
      />
      <div className="island-map-draw-panel-row island-map-draw-panel-row--meta">
        <label className="island-map-draw-field">
          <span>{t('islandMapDrawRouteId')}</span>
          <input
            value={drawRouteId}
            onChange={(event) => setDrawRouteId(event.target.value.trim())}
            placeholder={resolveWorldMapRouteId('21A') ?? '21'}
            spellCheck={false}
          />
        </label>
        <label className="island-map-draw-field island-map-draw-field--direction">
          <span>{t('islandMapDrawDirection')}</span>
          <input
            type="number"
            min={0}
            max={9}
            value={drawDirectionIndex}
            onChange={(event) => setDrawDirectionIndex(Number(event.target.value) || 0)}
          />
        </label>
        <span className="island-map-draw-count">
          {t('islandMapDrawStopCount', { count: draftStops.length })}
        </span>
        <span className="island-map-draw-count">
          {t('islandMapDrawPathNodeCount', { count: draftPathNodes.length })}
        </span>
      </div>
      {drawMode && drawInteraction === 'route' ? (
        <>
          <IslandMapDrawColorPicker color={drawColor} onColorChange={setDrawColor} />
          <IslandMapDrawStopLabelSettings
            visible={showStopLabels}
            scale={stopLabelScale}
            onVisibleChange={setShowStopLabels}
            onScaleChange={setStopLabelScale}
          />
        </>
      ) : null}
      {drawMode && drawInteraction === 'path-node' ? (
        <IslandMapDrawPathNodePanel
          pendingNode={pendingPathNode}
          nodeCount={draftPathNodes.length}
          onLabelChange={(label) =>
            setPendingPathNode((current) => (current ? { ...current, label } : current))
          }
          onConfirm={handleConfirmPendingPathNode}
          onRemove={handleRemovePendingPathNode}
        />
      ) : null}
      <IslandMapDrawStopPanel
          interaction={drawInteraction}
          routeId={drawRouteId}
          directionIndex={drawDirectionIndex}
          stops={draftStops}
          pendingStop={drawMode ? pendingStop : null}
          onPendingQueryChange={(query) =>
            setPendingStop((current) => (current ? { ...current, query } : current))
          }
          onConfirmPendingStop={handleConfirmPendingStop}
          onCancelPendingStop={() => {
            setPendingStop(null)
            setSelectedStopId(null)
          }}
          onRemoveStop={handleRemoveStop}
          selectedStopId={selectedStopId}
          onEditStop={openStopEditor}
        />
      {drawMode && drawInteraction === 'route' ? (
        <p className="island-map-draw-help">
          {roadSnap.loading ? t('islandMapDrawRoadLoading') : t('islandMapDrawHelp')}
          <span className="island-map-draw-build-tag">{t('buildTag', { time: drawBuildLabel })}</span>
        </p>
      ) : null}
      {drawMode && drawInteraction === 'route' && pendingTraceAnchor ? (
        <p className="island-map-draw-trace-pending">{t('islandMapDrawTracePending')}</p>
      ) : null}
      {drawMode && drawInteraction === 'path-node' ? (
        <p className="island-map-draw-help">
          {roadSnap.loading ? t('islandMapDrawRoadLoading') : t('islandMapDrawPathNodeModeHelp')}
        </p>
      ) : null}
      {exportHint ? <p className="island-map-draw-export-hint">{exportHint}</p> : null}
    </div>
  ) : null

  const node = (
    <div
      className={`island-map island-map--fullscreen island-map--standalone${drawMode ? ' island-map--draw-mode' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      <IslandMapPanZoomSurface
        {...surfaceProps(
          mapSrc,
          'fullscreen',
          'island-map-viewport island-map-viewport--fullscreen',
          mapView,
          handleViewChange,
          surfaceRouteOverlay,
          drawMode,
          drawInteraction,
          draftPoints,
          draftStopPoints,
          draftStops,
          draftPathNodes,
          pendingStop?.point ?? null,
          pendingPathNode?.point ?? null,
          drawColor,
          draftRouteNumber,
          handleDrawMapClick,
          handleDrawUndo,
          surfaceMaxZoomRatio,
          effectiveLegStarts,
          pathLegHidden,
          pathUserBends,
          showStopLabels,
          stopLabelScale,
          stopEdit,
          nodeEdit,
          pathEdit,
          traceEdit,
          roadSnapSurface,
        )}
      />
      <div className="island-map-controls island-map-controls--fullscreen">
        {isLoggedIn ? drawPanel : guestMapPanel}
        <div className="island-map-controls-row">
          <button
            type="button"
            className="island-map-btn island-map-btn--layers"
            onClick={toggleLayer}
            aria-label={t('islandMapLayersAria')}
            title={layer === 'general' ? t('islandMapLayerDetailed') : t('islandMapLayerGeneral')}
          >
            {t('islandMapLayers')}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {hiddenImportInput}
      <IslandMapDrawClearDialog
        open={clearDialogOpen}
        stopCount={draftStops.length}
        pathNodeCount={draftPathNodes.length}
        hasPath={hasDraftPath}
        onCancel={() => setClearDialogOpen(false)}
        onConfirm={applyClearSelection}
      />
      <IslandMapDrawImportConflictDialog
        open={importConflictState != null}
        conflict={importConflictState?.conflict ?? null}
        onCancel={() => setImportConflictState(null)}
        onConfirm={(resolution) => {
          const pending = importConflictState
          setImportConflictState(null)
          if (!pending) return
          applyImportedDrawFiles(pending.files, resolution)
        }}
      />
      <IslandMapDrawExportDialog
        open={exportDialogOpen}
        routeId={drawRouteId}
        directionIndex={drawDirectionIndex}
        stops={draftStops}
        pathNodes={draftPathNodes}
        points={draftPoints}
        mergeFiles={exportMergeFiles}
        sourceSlices={exportSourceSlices}
        overlayRouteId={overlayRouteId}
        onAddMergeFiles={(files) => void handleAddExportMergeFiles(files)}
        onRemoveMergeFile={(id) => setExportMergeFiles((files) => files.filter((file) => file.id !== id))}
        onCancel={() => {
          setExportDialogOpen(false)
          setExportMergeFiles([])
        }}
        onConfirm={(selection, merged) => void handleExportConfirm(selection, merged)}
      />
      <IslandMapDrawPermissionDialogs
        open={permissionDialogOpen}
        onCancel={closePermissionDialog}
        onGoRegister={() => {
          window.location.href = './account.html'
        }}
      />
      {node}
    </>
  )
}
