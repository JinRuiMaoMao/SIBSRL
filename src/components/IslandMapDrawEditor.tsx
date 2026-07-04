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
import { rebuildStopToStopPath, resolveEffectiveLegStarts } from '../utils/worldMapDrawPath'
import { getPathLegRanges, resizeLegHidden, resizePathUserBends } from '../utils/worldMapDrawPathEdit'
import { resizeLegControls } from '../utils/worldMapDrawPathCurve'
import { cloneDrawDraftSnapshot, DRAW_HISTORY_LIMIT, type DrawDraftSnapshot } from '../utils/worldMapDrawHistory'
import {
  inferNodeOrderFromDraft,
  rebuildPathFromNodeOrder,
  removeNodeFromOrder,
} from '../utils/worldMapDrawNodeOrder'
import { parseWorldMapDrawImportJson } from '../utils/worldMapRouteImport'
import { resolveStopByQuery } from '../utils/routeBetweenStops'
import type {
  IslandMapDrawInteraction,
  RouteEditorMode,
  WorldMapDrawStop,
  WorldMapDrawStopDraft,
  WorldMapDrawPathNode,
  WorldMapOrderedNodeRef,
  WorldMapSelectedNodeRef,
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
import { IslandMapDrawColorPicker } from './IslandMapDrawColorPicker'
import { IslandMapDrawStopLabelSettings } from './IslandMapDrawStopLabelSettings'
import { IslandMapDrawStopPanel } from './IslandMapDrawStopPanel'
import { IslandMapImportExportPanel } from './IslandMapImportExportPanel'
import { IslandMapPanZoomSurface, DRAW_MAX_ZOOM_RATIO, type NormalizedMapView } from './IslandMapPanZoomSurface'
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

export function IslandMapDrawEditor({ ready = true }: { ready?: boolean }) {
  const { t, locale } = useLocale()
  const { isLoggedIn } = useAuth()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [editorMode, setEditorMode] = useState<RouteEditorMode>('select')
  const [nodeOrder, setNodeOrder] = useState<WorldMapOrderedNodeRef[]>([])
  const [drawRouteId, setDrawRouteId] = useState('')
  const [drawDirectionIndex, setDrawDirectionIndex] = useState(0)
  const avoidParallelSegments = useMemo(
    () => listWorldMapRouteSegmentsExcept(drawRouteId),
    [drawRouteId],
  )
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
  const [selectedNode, setSelectedNode] = useState<WorldMapSelectedNodeRef | null>(null)
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
    editorMode,
    nodeOrder,
  })
  const undoStackRef = useRef<DrawDraftSnapshot[]>([])
  const redoStackRef = useRef<DrawDraftSnapshot[]>([])
  const [historyTick, setHistoryTick] = useState(0)
  const [pointerPoint, setPointerPoint] = useState<WorldMapPoint | null>(null)

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
      editorMode,
      nodeOrder,
    }
  }, [
    draftPoints,
    draftStops,
    draftPathNodes,
    drawDirectionIndex,
    editorMode,
    drawRouteId,
    nodeOrder,
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
      drawInteraction:
        state.editorMode === 'addStop'
          ? 'catalog'
          : state.editorMode === 'addPoint'
            ? 'path-node'
            : 'route',
      editorMode: state.editorMode,
      nodeOrder: state.nodeOrder.map((entry) => ({ ...entry })),
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
      setEditorMode(snapshot.editorMode ?? 'select')
      setNodeOrder(
        snapshot.nodeOrder?.map((entry) => ({ ...entry })) ??
          inferNodeOrderFromDraft(
            snapshot.draftStops,
            snapshot.draftPathNodes ?? [],
            snapshot.draftPoints,
          ),
      )
      setSelectedNode(null)
      setPendingStop(null)
      setSelectedStopId(null)
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
    if (!isLoggedIn) {
      setEditorMode('select')
      setPendingStop(null)
      setSelectedNode(null)
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

  const applyPathFromOrder = useCallback(
    (
      order: readonly WorldMapOrderedNodeRef[],
      stops: readonly WorldMapDrawStop[],
      pathNodes: readonly WorldMapDrawPathNode[],
    ) => {
      const rebuilt = rebuildPathFromNodeOrder(order, stops, pathNodes)
      setDraftPoints(rebuilt.points.map((point) => [point[0], point[1]] as WorldMapPoint))
      setPathLegStarts([...rebuilt.legStarts])
      setPathLegHidden([...rebuilt.legHidden])
      setPathUserBends([...rebuilt.userBends])
      setPathLegControls([...rebuilt.legControls])
      setPathManuallyEdited(rebuilt.points.length >= 2)
    },
    [],
  )

  const addStopAt = useCallback(
    (point: WorldMapPoint) => {
      pushDrawHistory()
      const snapped = roadSnap.snap(point)
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const stopNumber = draftHistoryRef.current.draftStops.length + 1
      const stop: WorldMapDrawStop = {
        id,
        point: snapped,
        name: { zh: `站点${stopNumber}`, en: `Stop ${stopNumber}` },
      }
      const nextStops = [...draftHistoryRef.current.draftStops, stop]
      const nextOrder: WorldMapOrderedNodeRef[] = [
        ...draftHistoryRef.current.nodeOrder,
        { kind: 'stop', id },
      ]
      setDraftStops(nextStops)
      setNodeOrder(nextOrder)
      applyPathFromOrder(nextOrder, nextStops, draftHistoryRef.current.draftPathNodes)
    },
    [applyPathFromOrder, pushDrawHistory, roadSnap],
  )

  const addPathNodeAt = useCallback(
    (point: WorldMapPoint) => {
      pushDrawHistory()
      const snapped = roadSnap.snap(point)
      const id = `node-${Date.now().toString(36)}`
      const node: WorldMapDrawPathNode = { id, point: snapped }
      const nextNodes = [...draftHistoryRef.current.draftPathNodes, node]
      const nextOrder: WorldMapOrderedNodeRef[] = [
        ...draftHistoryRef.current.nodeOrder,
        { kind: 'path-node', id },
      ]
      setDraftPathNodes(nextNodes)
      setNodeOrder(nextOrder)
      applyPathFromOrder(nextOrder, draftHistoryRef.current.draftStops, nextNodes)
    },
    [applyPathFromOrder, pushDrawHistory, roadSnap],
  )

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return
    pushDrawHistory()
    const nextOrder = removeNodeFromOrder(draftHistoryRef.current.nodeOrder, selectedNode)
    let nextStops = draftHistoryRef.current.draftStops
    let nextNodes = draftHistoryRef.current.draftPathNodes
    if (selectedNode.kind === 'stop') {
      nextStops = nextStops.filter((stop) => stop.id !== selectedNode.id)
      setDraftStops(nextStops)
      if (pendingStop?.editingStopId === selectedNode.id) setPendingStop(null)
      if (selectedStopId === selectedNode.id) setSelectedStopId(null)
    } else {
      nextNodes = nextNodes.filter((node) => node.id !== selectedNode.id)
      setDraftPathNodes(nextNodes)
    }
    setNodeOrder(nextOrder)
    setSelectedNode(null)
    applyPathFromOrder(nextOrder, nextStops, nextNodes)
  }, [applyPathFromOrder, pendingStop?.editingStopId, pushDrawHistory, selectedNode, selectedStopId])

  const handleDrawMapClick = useCallback(
    (point: WorldMapPoint) => {
      if (editorMode === 'addStop') {
        addStopAt(point)
        return
      }
      if (editorMode === 'addPoint') {
        addPathNodeAt(point)
      }
    },
    [addPathNodeAt, addStopAt, editorMode],
  )

  const handleDrawUndo = useCallback(() => {
    if (pendingStop && !pendingStop.editingStopId) {
      setPendingStop(null)
      setSelectedStopId(null)
      return
    }
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(captureDrawSnapshot())
    applyDrawSnapshot(previous)
    bumpHistory()
  }, [applyDrawSnapshot, bumpHistory, captureDrawSnapshot, pendingStop])

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
    setNodeOrder([])
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
        setSelectedNode(null)
        setNodeOrder((order) => order.filter((entry) => entry.kind !== 'stop'))
      }
      if (selection.pathNodes) {
        setDraftPathNodes([])
        setSelectedNode(null)
        setNodeOrder((order) => order.filter((entry) => entry.kind !== 'path-node'))
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
      if (selectedNode?.kind === 'stop' && selectedNode.id === id) {
        setSelectedNode(null)
      }
      const nextStops = draftHistoryRef.current.draftStops.filter((stop) => stop.id !== id)
      const nextOrder = removeNodeFromOrder(draftHistoryRef.current.nodeOrder, { kind: 'stop', id })
      setDraftStops(nextStops)
      setNodeOrder(nextOrder)
      applyPathFromOrder(nextOrder, nextStops, draftHistoryRef.current.draftPathNodes)
    },
    [applyPathFromOrder, pendingStop?.editingStopId, pushDrawHistory, selectedNode, selectedStopId],
  )

  const openStopEditor = useCallback(
    (stop: WorldMapDrawStop) => {
      setSelectedStopId(stop.id)
      setSelectedNode({ kind: 'stop', id: stop.id })
      setPendingStop({
        point: stop.point,
        query: locale.startsWith('zh') ? stop.name.zh : stop.name.en || stop.name.zh,
        editingStopId: stop.id,
      })
    },
    [locale],
  )

  const handleStopDrag = useCallback(
    (stopId: string, point: WorldMapPoint) => {
      setDraftStops((stops) => {
        const nextStops = stops.map((stop) => (stop.id === stopId ? { ...stop, point } : stop))
        applyPathFromOrder(nodeOrder, nextStops, draftPathNodes)
        return nextStops
      })
    },
    [applyPathFromOrder, draftPathNodes, nodeOrder],
  )

  const handleStopDragEnd = useCallback(
    (stopId: string, point: WorldMapPoint) => {
      const snapped = roadSnap.snap(point)
      pushDrawHistory()
      const nextStops = draftHistoryRef.current.draftStops.map((entry) =>
        entry.id === stopId ? { ...entry, point: snapped } : entry,
      )
      setDraftStops(nextStops)
      applyPathFromOrder(
        draftHistoryRef.current.nodeOrder,
        nextStops,
        draftHistoryRef.current.draftPathNodes,
      )
      if (pendingStop?.editingStopId === stopId) {
        setPendingStop((current) => (current ? { ...current, point: snapped } : current))
      }
    },
    [applyPathFromOrder, pendingStop?.editingStopId, pushDrawHistory, roadSnap],
  )

  const handleStopClick = useCallback(
    (stopId: string) => {
      if (editorMode !== 'select') return
      const stop = draftStops.find((entry) => entry.id === stopId)
      if (stop) openStopEditor(stop)
    },
    [draftStops, editorMode, openStopEditor],
  )

  const handlePathNodeClick = useCallback(
    (nodeId: string) => {
      if (editorMode !== 'select') return
      setSelectedNode({ kind: 'path-node', id: nodeId })
    },
    [editorMode],
  )

  const handlePathNodeDrag = useCallback(
    (nodeId: string, point: WorldMapPoint) => {
      setDraftPathNodes((nodes) => {
        const nextNodes = nodes.map((node) => (node.id === nodeId ? { ...node, point } : node))
        applyPathFromOrder(nodeOrder, draftStops, nextNodes)
        return nextNodes
      })
    },
    [applyPathFromOrder, draftStops, nodeOrder],
  )

  const handlePathNodeDragEnd = useCallback(
    (nodeId: string, point: WorldMapPoint) => {
      const snapped = roadSnap.snap(point)
      pushDrawHistory()
      const nextNodes = draftHistoryRef.current.draftPathNodes.map((entry) =>
        entry.id === nodeId ? { ...entry, point: snapped } : entry,
      )
      setDraftPathNodes(nextNodes)
      applyPathFromOrder(
        draftHistoryRef.current.nodeOrder,
        draftHistoryRef.current.draftStops,
        nextNodes,
      )
    },
    [applyPathFromOrder, pushDrawHistory, roadSnap],
  )

  const handleConfirmPendingStop = useCallback(() => {
    if (!pendingStop?.editingStopId) return
    const query = pendingStop.query.trim()
    if (!query) return
    pushDrawHistory()
    const matched = resolveStopByQuery(query)
    const name = matched
      ? { zh: matched.zh, en: matched.en || matched.zh }
      : { zh: query, en: query }
    setDraftStops((stops) =>
      stops.map((stop) =>
        stop.id === pendingStop.editingStopId ? { ...stop, point: pendingStop.point, name } : stop,
      ),
    )
    setPendingStop(null)
  }, [pendingStop, pushDrawHistory])

  const enterEditorMode = useCallback((mode: RouteEditorMode) => {
    setEditorMode(mode)
    if (mode !== 'select') {
      setPendingStop(null)
      setSelectedStopId(null)
      setSelectedNode(null)
    }
  }, [])

  const handleDrawEntryClick = useCallback(() => {
    if (!isLoggedIn) {
      setPermissionDialogOpen(true)
    }
  }, [isLoggedIn])

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
      setSelectedNode(null)
      pushDrawHistory()

      const merged = mergeImportedDrawFiles(files, resolution, draftStops)
      if (!merged) {
        showExportHint(t('islandMapDrawImportInvalid'))
        return
      }

      setEditorMode('select')
      setLayer('general')

      if (merged.kind === 'catalog') {
        const order = merged.stops.map((stop) => ({ kind: 'stop' as const, id: stop.id }))
        setDraftPoints([])
        setDraftPathNodes([])
        setPathLegStarts([0])
        setPathLegControls([])
        setPathLegHidden([])
        setPathUserBends([])
        setPathManuallyEdited(false)
        setDraftStops(merged.stops)
        setNodeOrder(order)
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

      const order = inferNodeOrderFromDraft(merged.stops, merged.pathNodes, merged.points)
      setDrawRouteId(merged.routeId)
      setDrawDirectionIndex(merged.directionIndex)
      setDraftStops(merged.stops)
      setDraftPoints(merged.points)
      setDraftPathNodes(merged.pathNodes)
      setNodeOrder(order)
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
  const mapDrawInteraction: IslandMapDrawInteraction =
    editorMode === 'addStop' ? 'catalog' : editorMode === 'addPoint' ? 'path-node' : 'route'
  const mapDrawMode = editorMode === 'addStop' || editorMode === 'addPoint'
  const mapAddPreviewStop = editorMode === 'addStop' ? pointerPoint : null
  const mapAddPreviewNode = editorMode === 'addPoint' ? pointerPoint : null
  const surfaceMaxZoomRatio = isLoggedIn ? DRAW_MAX_ZOOM_RATIO : 8
  const draftStopPoints = draftStops.map((stop) => stop.point)
  const stopEdit = useMemo(
    () =>
      isLoggedIn && editorMode === 'select'
        ? {
            selectedStopId,
            onStopDrag: handleStopDrag,
            onStopDragEnd: handleStopDragEnd,
            onStopClick: handleStopClick,
          }
        : undefined,
    [editorMode, handleStopClick, handleStopDrag, handleStopDragEnd, isLoggedIn, selectedStopId],
  )
  const nodeEdit = useMemo(
    () =>
      isLoggedIn && editorMode === 'select'
        ? {
            onPathNodeDrag: handlePathNodeDrag,
            onPathNodeDragEnd: handlePathNodeDragEnd,
            onPathNodeClick: handlePathNodeClick,
          }
        : undefined,
    [editorMode, handlePathNodeClick, handlePathNodeDrag, handlePathNodeDragEnd, isLoggedIn],
  )
  const selectionHighlight = useMemo(
    () =>
      isLoggedIn && editorMode === 'select'
        ? {
            traceSelectedStopId: selectedNode?.kind === 'stop' ? selectedNode.id : null,
            traceSelectedPathNodeId:
              selectedNode?.kind === 'path-node' ? selectedNode.id : null,
            onStopClick: handleStopClick,
            onPathNodeClick: handlePathNodeClick,
          }
        : undefined,
    [editorMode, handlePathNodeClick, handleStopClick, isLoggedIn, selectedNode],
  )
  const roadSnapSurface = useMemo(
    () => ({ snap: roadSnap.snap, isOnRoad: roadSnap.isOnRoad }),
    [roadSnap.isOnRoad, roadSnap.snap],
  )
  const draftRouteNumber = drawRouteId.trim()
  const canUndo = undoStackRef.current.length > 0
  void historyTick
  const canRedo = redoStackRef.current.length > 0
  const canClear =
    draftPoints.length >= 2 ||
    draftStops.length > 0 ||
    draftPathNodes.length > 0 ||
    nodeOrder.length > 0
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
    interaction: mapDrawInteraction,
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

  const handleZoomIn = useCallback(() => {
    setMapView((current) => {
      const base = current ?? { centerX: 0.5, centerY: 0.5, zoomRatio: 1 }
      return {
        ...base,
        zoomRatio: Math.min(surfaceMaxZoomRatio, base.zoomRatio * 1.25),
      }
    })
  }, [surfaceMaxZoomRatio])

  const handleZoomOut = useCallback(() => {
    setMapView((current) => {
      const base = current ?? { centerX: 0.5, centerY: 0.5, zoomRatio: 1 }
      return {
        ...base,
        zoomRatio: Math.max(0.45, base.zoomRatio / 1.25),
      }
    })
  }, [])

  const handleZoomReset = useCallback(() => setMapView(null), [])

  const handleFitView = useCallback(() => {
    const fitPoints = [
      ...draftStops.map((stop) => stop.point),
      ...draftPathNodes.map((node) => node.point),
      ...draftPoints,
    ]
    if (fitPoints.length === 0) {
      setMapView(null)
      return
    }
    setMapView(fitNormalizedViewToRoutePoints(fitPoints, 'fullscreen'))
  }, [draftPathNodes, draftPoints, draftStops])

  const undoCount = undoStackRef.current.length
  const redoCount = redoStackRef.current.length
  const zoomPercent = Math.round((mapView?.zoomRatio ?? 1) * 100)
  const pointerLabel = pointerPoint
    ? t('mapDrawStatusCoords', {
        x: Math.round(pointerPoint[0] * 10000) / 100,
        y: Math.round(pointerPoint[1] * 10000) / 100,
      })
    : t('mapDrawStatusCoords', { x: 0, y: 0 })
  const statusMode =
    editorMode === 'select'
      ? t('mapDrawStatusSelect')
      : editorMode === 'addStop'
        ? t('mapDrawStatusAddStop')
        : t('mapDrawStatusAddPoint')

  useEffect(() => {
    document.documentElement.classList.add('island-map-fullscreen-open')
    return () => document.documentElement.classList.remove('island-map-fullscreen-open')
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        enterEditorMode('select')
        return
      }
      if (event.key === 'Delete' && selectedNode) {
        event.preventDefault()
        deleteSelectedNode()
        return
      }
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
  }, [
    deleteSelectedNode,
    enterEditorMode,
    handleDrawRedo,
    handleDrawUndo,
    isLoggedIn,
    selectedNode,
  ])

  const headerActions = isLoggedIn ? (
    <>
      <button
        type="button"
        className="route-editor-btn"
        onClick={handleDrawUndo}
        disabled={!canUndo}
        title={t('islandMapDrawUndoHint')}
      >
        {t('islandMapDrawUndo')}
      </button>
      <button
        type="button"
        className="route-editor-btn"
        onClick={handleDrawRedo}
        disabled={!canRedo}
        title={t('islandMapDrawRedoHint')}
      >
        {t('islandMapDrawRedo')}
      </button>
      <button
        type="button"
        className="route-editor-btn"
        onClick={() => importInputRef.current?.click()}
        title={t('islandMapDrawImportHint')}
      >
        {t('islandMapDrawImport')}
      </button>
      <button
        type="button"
        className="route-editor-btn"
        onClick={openExportDialog}
        disabled={!canExport}
        title={t('islandMapDrawExportRouteHint')}
      >
        {t('islandMapDrawExport')}
      </button>
      <button
        type="button"
        className="route-editor-btn route-editor-btn--danger"
        onClick={openClearDialog}
        disabled={!canClear}
        title={t('islandMapDrawClearHint')}
      >
        {t('islandMapDrawClear')}
      </button>
    </>
  ) : null

  const sidebar = isLoggedIn ? (
    <>
      <section className="route-editor-panel">
        <h3>{t('mapDrawPanelNodes')}</h3>
        <div className="route-editor-btn-row route-editor-btn-row--stack">
          <button
            type="button"
            className={`route-editor-btn route-editor-btn--primary${editorMode === 'addStop' ? ' route-editor-btn--active' : ''}`.trim()}
            onClick={() => enterEditorMode('addStop')}
            aria-pressed={editorMode === 'addStop'}
            title={t('mapDrawAddStopHint')}
          >
            {t('mapDrawAddStop')}
          </button>
          <button
            type="button"
            className={`route-editor-btn route-editor-btn--primary${editorMode === 'addPoint' ? ' route-editor-btn--active' : ''}`.trim()}
            onClick={() => enterEditorMode('addPoint')}
            aria-pressed={editorMode === 'addPoint'}
            title={t('mapDrawAddPointHint')}
          >
            {t('mapDrawAddPoint')}
          </button>
          <button
            type="button"
            className={`route-editor-btn${editorMode === 'select' ? ' route-editor-btn--active' : ''}`.trim()}
            onClick={() => enterEditorMode('select')}
            aria-pressed={editorMode === 'select'}
            title={t('mapDrawModeSelectHint')}
          >
            {t('mapDrawModeSelect')}
          </button>
          {selectedNode ? (
            <button
              type="button"
              className="route-editor-btn route-editor-btn--danger"
              onClick={deleteSelectedNode}
              title={t('mapDrawDeleteNodeHint')}
            >
              {t('mapDrawDeleteNode')}
            </button>
          ) : null}
        </div>
      </section>

      <section className="route-editor-panel">
        <h3>{t('mapDrawPanelMap')}</h3>
        <div className="route-editor-btn-row route-editor-btn-row--stack">
          <button
            type="button"
            className="route-editor-btn"
            onClick={toggleLayer}
            title={layer === 'general' ? t('islandMapLayerDetailed') : t('islandMapLayerGeneral')}
          >
            {t('islandMapLayers')}
          </button>
          <button type="button" className="route-editor-btn" onClick={handleZoomIn}>
            {t('mapDrawZoomIn')}
          </button>
          <button type="button" className="route-editor-btn" onClick={handleZoomOut}>
            {t('mapDrawZoomOut')}
          </button>
          <button type="button" className="route-editor-btn" onClick={handleZoomReset}>
            {t('mapDrawZoomReset')}
          </button>
          <button type="button" className="route-editor-btn" onClick={handleFitView}>
            {t('mapDrawZoomFit')}
          </button>
        </div>
        <IslandMapDrawColorPicker color={drawColor} onColorChange={setDrawColor} />
        <IslandMapDrawStopLabelSettings
          visible={showStopLabels}
          scale={stopLabelScale}
          onVisibleChange={setShowStopLabels}
          onScaleChange={setStopLabelScale}
        />
      </section>

      <section className="route-editor-panel">
        <IslandMapDrawStopPanel
          interaction="route"
          routeId={drawRouteId}
          directionIndex={drawDirectionIndex}
          stops={draftStops}
          pendingStop={pendingStop}
          onPendingQueryChange={(query) =>
            setPendingStop((current) => (current ? { ...current, query } : current))
          }
          onConfirmPendingStop={handleConfirmPendingStop}
          onCancelPendingStop={() => {
            setPendingStop(null)
            setSelectedStopId(null)
            setSelectedNode(null)
          }}
          onRemoveStop={handleRemoveStop}
          selectedStopId={selectedStopId}
          onEditStop={openStopEditor}
        />
        {selectedNode?.kind === 'path-node' ? (
          <p className="island-map-draw-help">{t('mapDrawSelectedPathNode')}</p>
        ) : null}
        {editorMode === 'addStop' ? (
          <p className="island-map-draw-help">
            {roadSnap.loading ? t('islandMapDrawRoadLoading') : t('mapDrawAddStopHelp')}
          </p>
        ) : null}
        {editorMode === 'addPoint' ? (
          <p className="island-map-draw-help">
            {roadSnap.loading ? t('islandMapDrawRoadLoading') : t('mapDrawAddPointHelp')}
          </p>
        ) : null}
        {exportHint ? <p className="island-map-draw-export-hint">{exportHint}</p> : null}
      </section>

      <section className="route-editor-panel route-editor-panel-tips">
        <h3>{t('mapDrawPanelTips')}</h3>
        <p>{t('mapDrawTipClickMap')}</p>
        <p>{t('mapDrawTipDrag')}</p>
        <p>{t('mapDrawTipKeys')}</p>
      </section>
    </>
  ) : (
    <section className="route-editor-panel">{guestMapPanel}</section>
  )

  const node = ready ? (
    <div
      className={`route-editor-app${mapDrawMode ? ' route-editor-app--draw-mode' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      <header className="route-editor-header">
        <div className="route-editor-header-left">
          <h1 className="route-editor-title">{t('mapDrawPageTitle')}</h1>
          <p className="route-editor-subtitle">{t('mapDrawPageSubtitle')}</p>
        </div>
        <div className="route-editor-header-middle">
          <label className="route-editor-field">
            <span>{t('islandMapDrawRouteId')}</span>
            <input
              value={drawRouteId}
              onChange={(event) => setDrawRouteId(event.target.value.trim())}
              placeholder={resolveWorldMapRouteId('21A') ?? '21'}
              spellCheck={false}
            />
          </label>
          <label className="route-editor-field">
            <span>{t('islandMapDrawDirection')}</span>
            <input
              type="number"
              min={0}
              max={9}
              value={drawDirectionIndex}
              onChange={(event) => setDrawDirectionIndex(Number(event.target.value) || 0)}
            />
          </label>
        </div>
        <div className="route-editor-header-right">
          {headerActions}
          <a className="route-editor-btn route-editor-back" href="./routes.html">
            {t('mapDrawPageBack')}
          </a>
        </div>
      </header>

      <div className="route-editor-body">
        <aside className="route-editor-sidebar">{sidebar}</aside>
        <div className="route-editor-workspace">
          <div className="route-editor-map-shell">
            <IslandMapPanZoomSurface
              {...surfaceProps(
                mapSrc,
                'fullscreen',
                'route-editor-map-viewport',
                mapView,
                handleViewChange,
                surfaceRouteOverlay,
                mapDrawMode,
                mapDrawInteraction,
                draftPoints,
                draftStopPoints,
                draftStops,
                draftPathNodes,
                mapAddPreviewStop,
                mapAddPreviewNode,
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
                undefined,
                selectionHighlight,
                roadSnapSurface,
              )}
              onMapPointerMove={setPointerPoint}
            />
          </div>
          <footer className="route-editor-statusbar">
            <span>{pointerLabel}</span>
            <span>
              {t('mapDrawStatusNodes', {
                stops: draftStops.length,
                nodes: draftPathNodes.length,
              })}
            </span>
            <span>{t('mapDrawStatusZoom', { percent: zoomPercent })}</span>
            <span>{t('mapDrawStatusHistory', { undo: undoCount, redo: redoCount })}</span>
            <span>{statusMode}</span>
          </footer>
        </div>
      </div>
    </div>
  ) : null

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
