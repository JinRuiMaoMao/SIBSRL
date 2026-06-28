import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { fitNormalizedViewToRoutePoints, listWorldMapRouteSegmentsExcept, resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import { useIsMapAdmin } from '../hooks/useIsMapAdmin'
import { useGeneralMapRoadSnap } from '../hooks/useGeneralMapRoadSnap'
import { useLocale } from '../i18n/LocaleContext'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { isUserApiConfigured } from '../api/userApiConfig'
import { requestMapDrawPermission, UserApiError } from '../api/userApi'
import {
  buildWorldMapRouteExportPayload,
  copyWorldMapRouteJson,
  downloadWorldMapRouteJson,
  resolveWorldMapExportRouteId,
  type WorldMapRouteExportSelection,
} from '../utils/worldMapRouteExport'
import { worldMapDrawDraftSliceFromImport, type WorldMapDrawDraftSlice } from '../utils/worldMapDrawMerge'
import { rebuildDraftPathFromStops, mergePathPoints, resolveTraceAnchorPoint, traceViaForAnchorTarget } from '../utils/worldMapDrawPath'
import { syncPathEndpointsToStops } from '../utils/worldMapDrawPathEdit'
import { preloadGeneralMapRoadSnapIndex, snapPointToGeneralMapRoad, traceGeneralMapRoadPath, type GeneralMapRoadSnapIndex } from '../utils/generalMapRoadSnap'
import { nextVirtualNodeOrder } from '../utils/worldMapVirtualNodes'
import { parseWorldMapDrawImportJson } from '../utils/worldMapRouteImport'
import { generateWorldMapRouteDraft } from '../utils/worldMapRouteGenerate'
import { resolveStopByQuery } from '../utils/routeBetweenStops'
import type {
  IslandMapDrawInteraction,
  WorldMapDrawStop,
  WorldMapDrawStopDraft,
  WorldMapTraceAnchor,
  WorldMapVirtualNode,
  WorldMapVirtualNodeDraft,
  WorldMapVirtualNodeKind,
} from '../types/worldMapDraw'
import { IslandMapDrawExportDialog, type IslandMapDrawExportMergeFile } from './IslandMapDrawExportDialog'
import {
  IslandMapDrawPermissionDialogs,
  type IslandMapDrawPermissionDialogStep,
} from './IslandMapDrawPermissionDialogs'
import { IslandMapDrawInteractionTabs } from './IslandMapDrawInteractionTabs'
import { IslandMapDrawColorPicker } from './IslandMapDrawColorPicker'
import { IslandMapDrawStopPanel } from './IslandMapDrawStopPanel'
import { IslandMapDrawVirtualNodePanel } from './IslandMapDrawVirtualNodePanel'
import { IslandMapImportExportPanel } from './IslandMapImportExportPanel'
import { IslandMapPanZoomSurface, DRAW_MAX_ZOOM_RATIO, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { formatBuildLabel, readPublishedBuild } from '../utils/buildLabel'
import { readStoredMapDrawColor } from '../utils/mapDrawColor'
function readImportJsonText(text: string): unknown {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  return JSON.parse(trimmed)
}

async function traceImportedRoutePath(
  stops: readonly WorldMapDrawStop[],
  virtualNodes: readonly WorldMapVirtualNode[],
  routeId: string,
  roadSnapReady: boolean,
  roadSnapIndex: GeneralMapRoadSnapIndex | null,
): Promise<WorldMapPoint[]> {
  if (stops.length < 2) return []
  const index = roadSnapReady ? roadSnapIndex : await preloadGeneralMapRoadSnapIndex()
  const avoidParallelSegments = listWorldMapRouteSegmentsExcept(routeId)
  const traceSegment = (
    from: WorldMapPoint,
    to: WorldMapPoint,
    via: Parameters<typeof traceGeneralMapRoadPath>[3] = [],
  ) => traceGeneralMapRoadPath(index, from, to, via, { avoidParallelSegments })
  return rebuildDraftPathFromStops(
    stops,
    traceSegment,
    virtualNodes,
    routeId,
    (node) => index?.toVirtualNodeConstraint(node.point, node.kind) ?? null,
  )
}

type MapLayer = 'general' | 'detailed'

const MAP_URLS: Record<MapLayer, string> = {
  general: './maps/SIMapGerenal.png',
  detailed: './maps/SIMap.png',
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M5 9V5h4V3H3v6h2zm14-6h-6v2h4v4h2V3zM5 19v-4H3v6h6v-2H5zm14 0h-4v2h6v-6h-2v4z"
      />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M9 5H5v4H3V3h6v2zm10 0v6h-2V7h-4V5h6zM5 15v4h4v2H3v-6h2zm14 0h2v6h-6v-2h4v-4z"
      />
    </svg>
  )
}

function HideIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
      />
    </svg>
  )
}

function ShowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  )
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
  draftVirtualNodes: readonly WorldMapVirtualNode[],
  pendingStopPoint: WorldMapPoint | null,
  pendingVirtualNode: { point: WorldMapPoint; kind: WorldMapVirtualNodeKind } | null,
  draftStrokeColor: string,
  draftRouteNumber: string,
  onDrawMapClick: (point: WorldMapPoint) => void,
  onDrawUndo: () => void,
  maxZoomRatio: number,
  stopEdit?: {
    selectedStopId: string | null
    onStopDrag: (stopId: string, point: WorldMapPoint) => void
    onStopDragEnd: (stopId: string, point: WorldMapPoint) => void
    onStopClick: (stopId: string) => void
  },
  pathEdit?: {
    editable: boolean
    onPathPointsChange: (points: WorldMapPoint[]) => void
  },
  traceEdit?: {
    traceSelectedStopId: string | null
    traceSelectedVirtualNodeId: string | null
    onVirtualNodeClick: (nodeId: string) => void
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
    draftVirtualNodes,
    pendingStopPoint,
    pendingVirtualNode,
    draftStrokeColor,
    draftRouteNumber,
    onDrawMapClick,
    onDrawUndo,
    maxZoomRatio,
    className,
    selectedStopId: stopEdit?.selectedStopId ?? null,
    onStopDrag: stopEdit?.onStopDrag,
    onStopDragEnd: stopEdit?.onStopDragEnd,
    onStopClick: stopEdit?.onStopClick,
    pathEditable: pathEdit?.editable ?? false,
    onPathPointsChange: pathEdit?.onPathPointsChange,
    traceSelectedStopId: traceEdit?.traceSelectedStopId ?? null,
    traceSelectedVirtualNodeId: traceEdit?.traceSelectedVirtualNodeId ?? null,
    onVirtualNodeClick: traceEdit?.onVirtualNodeClick,
  }
}

export function IslandMapWidget() {
  const { t, locale } = useLocale()
  const { isLoggedIn, token, email } = useAuth()
  const { refreshProfile } = useUserProfile()
  const isMapAdmin = useIsMapAdmin()
  const userApiEnabled = isUserApiConfigured()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const [expanded, setExpanded] = useState(false)
  const [widgetHidden, setWidgetHidden] = useState(false)
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
  const roadSnap = useGeneralMapRoadSnap(isMapAdmin, { avoidParallelSegments })
  const [draftPoints, setDraftPoints] = useState<WorldMapPoint[]>([])
  const [pathManuallyEdited, setPathManuallyEdited] = useState(false)
  const [draftStops, setDraftStops] = useState<WorldMapDrawStop[]>([])
  const [draftVirtualNodes, setDraftVirtualNodes] = useState<WorldMapVirtualNode[]>([])
  const [pendingStop, setPendingStop] = useState<WorldMapDrawStopDraft | null>(null)
  const [pendingTraceAnchor, setPendingTraceAnchor] = useState<WorldMapTraceAnchor | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [pendingVirtualNode, setPendingVirtualNode] = useState<WorldMapVirtualNodeDraft | null>(null)
  const [drawColor, setDrawColor] = useState(readStoredMapDrawColor)
  const [exportHint, setExportHint] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportMergeFiles, setExportMergeFiles] = useState<IslandMapDrawExportMergeFile[]>([])
  const [generatingRoute, setGeneratingRoute] = useState(false)
  const [permissionDialog, setPermissionDialog] = useState<IslandMapDrawPermissionDialogStep | null>(null)
  const [permissionSending, setPermissionSending] = useState(false)
  const savedViewRef = useRef<NormalizedMapView | null>(null)
  const exportHintTimerRef = useRef<number | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleViewChange = useCallback((next: NormalizedMapView) => {
    setMapView(next)
  }, [])

  useEffect(() => {
    for (const url of Object.values(MAP_URLS)) {
      const image = new Image()
      image.decoding = 'async'
      image.src = url
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
      fitNormalizedViewToRoutePoints(routeOverlay.points, expanded ? 'fullscreen' : 'widget'),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refit when route overlay or mode changes
  }, [expanded, routeOverlay])

  useEffect(() => {
    if (!routeOverlay) return
    setDrawRouteId(routeOverlay.routeId)
    setDrawDirectionIndex(routeOverlay.directionIndex)
  }, [routeOverlay])

  useEffect(() => {
    if (!isMapAdmin) {
      setDrawMode(false)
      setPendingStop(null)
      setPendingVirtualNode(null)
    }
  }, [isMapAdmin])

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

  const traceSegment = useCallback(
    (from: WorldMapPoint, to: WorldMapPoint, via: Parameters<typeof roadSnap.appendSegment>[2] = []) =>
      roadSnap.appendSegment(from, to, via),
    [roadSnap],
  )

  const appendTracedSegment = useCallback(
    (from: WorldMapTraceAnchor, to: WorldMapTraceAnchor) => {
      const fromPoint = resolveTraceAnchorPoint(from, draftStops, draftVirtualNodes)
      const toPoint = resolveTraceAnchorPoint(to, draftStops, draftVirtualNodes)
      if (!fromPoint || !toPoint) return false
      const via = traceViaForAnchorTarget(to, draftVirtualNodes, (node) =>
        roadSnap.toVirtualNodeConstraint(node.point, node.kind),
      )
      const segment = traceSegment(fromPoint, toPoint, via)
      setDraftPoints((current) => {
        if (current.length === 0) {
          return segment.length > 0 ? [...segment] : [fromPoint, toPoint]
        }
        return mergePathPoints(current, segment.length > 1 ? segment.slice(1) : segment)
      })
      setPathManuallyEdited(true)
      return true
    },
    [draftStops, draftVirtualNodes, roadSnap, traceSegment],
  )

  const handleTraceAnchorPick = useCallback(
    (anchor: WorldMapTraceAnchor) => {
      if (drawInteraction !== 'route' || !roadSnap.ready) return
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
        setPendingTraceAnchor(anchor)
      }
    },
    [appendTracedSegment, drawInteraction, pendingTraceAnchor, roadSnap.ready],
  )

  const handleDrawMapClick = useCallback(
    (point: WorldMapPoint) => {
      if (drawInteraction === 'virtual') {
        if (pendingVirtualNode) return
        setPendingVirtualNode({
          point: roadSnap.snapVirtualNode(point, 'north'),
          routeId: drawRouteId.trim() || '21A',
          kind: 'north',
        })
        return
      }
      if (pendingStop) return
      setPendingStop({ point: roadSnap.snap(point), query: '' })
    },
    [drawInteraction, drawRouteId, pendingStop, pendingVirtualNode, roadSnap],
  )

  const handleDrawUndo = useCallback(() => {
    if (pendingVirtualNode) {
      setPendingVirtualNode(null)
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
    if (drawInteraction === 'virtual') {
      setDraftVirtualNodes((nodes) => nodes.slice(0, -1))
      return
    }
    setDraftStops((stops) => {
      const next = stops.slice(0, -1)
      return next
    })
  }, [drawInteraction, pendingStop, pendingTraceAnchor, pendingVirtualNode])

  const clearDraft = useCallback(() => {
    setDraftPoints([])
    setPathManuallyEdited(false)
    setDraftStops([])
    setDraftVirtualNodes([])
    setPendingStop(null)
    setSelectedStopId(null)
    setPendingTraceAnchor(null)
    setPendingVirtualNode(null)
  }, [])

  const handleRemoveStop = useCallback(
    (id: string) => {
      if (pendingStop?.editingStopId === id) {
        setPendingStop(null)
      }
      if (selectedStopId === id) {
        setSelectedStopId(null)
      }
      setDraftStops((stops) => stops.filter((stop) => stop.id !== id))
    },
    [pendingStop?.editingStopId, selectedStopId],
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
    setDraftStops((stops) =>
      stops.map((stop) => (stop.id === stopId ? { ...stop, point } : stop)),
    )
  }, [])

  const handleStopDragEnd = useCallback(
    (stopId: string, point: WorldMapPoint) => {
      const snapped = roadSnap.snap(point)
      setDraftStops((stops) => {
        const next = stops.map((stop) => (stop.id === stopId ? { ...stop, point: snapped } : stop))
        return next
      })
      if (pendingStop?.editingStopId === stopId) {
        setPendingStop((current) => (current ? { ...current, point: snapped } : current))
      }
    },
    [pendingStop?.editingStopId, roadSnap],
  )

  const handleStopClick = useCallback(
    (stopId: string) => {
      handleTraceAnchorPick({ kind: 'stop', id: stopId })
    },
    [handleTraceAnchorPick],
  )

  const handleVirtualNodeClick = useCallback(
    (nodeId: string) => {
      handleTraceAnchorPick({ kind: 'virtual-node', id: nodeId })
    },
    [handleTraceAnchorPick],
  )

  const handlePathPointsChange = useCallback((points: WorldMapPoint[]) => {
    setDraftPoints(points)
    setPathManuallyEdited(true)
  }, [])

  const handleConfirmPendingStop = useCallback(() => {
    if (!pendingStop) return
    const query = pendingStop.query.trim()
    if (!query) return
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
  }, [pendingStop])

  const handleConfirmPendingVirtualNode = useCallback(() => {
    if (!pendingVirtualNode || !pendingVirtualNode.routeId.trim()) return
    const nodeRouteId = pendingVirtualNode.routeId.trim()
    if (!drawRouteId.trim()) {
      setDrawRouteId(nodeRouteId)
    }
    setDraftVirtualNodes((nodes) => [
      ...nodes,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        point: pendingVirtualNode.point,
        routeId: nodeRouteId,
        kind: pendingVirtualNode.kind,
        order: nextVirtualNodeOrder(nodes, nodeRouteId),
      },
    ])
    setPendingVirtualNode(null)
  }, [drawRouteId, pendingVirtualNode])

  const handleRemoveVirtualNode = useCallback((id: string) => {
    setDraftVirtualNodes((nodes) => nodes.filter((node) => node.id !== id))
  }, [])

  const handleInteractionChange = useCallback((interaction: IslandMapDrawInteraction) => {
    setDrawInteraction(interaction)
    setPendingStop(null)
    setSelectedStopId(null)
    setPendingTraceAnchor(null)
    setPendingVirtualNode(null)
    if (interaction === 'catalog') {
      setDraftPoints([])
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
    if (isMapAdmin) {
      toggleDrawMode()
      return
    }
    if (!userApiEnabled) return
    if (!isLoggedIn) {
      setPermissionDialog('register')
      return
    }
    setPermissionDialog('confirm')
  }, [isLoggedIn, isMapAdmin, toggleDrawMode, userApiEnabled])

  const handleGenerateRoute = useCallback(async () => {
    const routeId = drawRouteId.trim()
    if (!routeId) {
      showExportHint(t('islandMapDrawGenerateNeedRouteId'))
      return
    }
    setGeneratingRoute(true)
    try {
      const index = roadSnap.index ?? (await preloadGeneralMapRoadSnapIndex())
      if (!index) {
        showExportHint(t('islandMapDrawGenerateFailed'))
        return
      }
      setLayer('general')
      const traceSeg = (
        from: WorldMapPoint,
        to: WorldMapPoint,
        via: Parameters<typeof traceGeneralMapRoadPath>[3] = [],
      ) =>
        traceGeneralMapRoadPath(index, from, to, via, {
          avoidParallelSegments: listWorldMapRouteSegmentsExcept(routeId),
        })
      const result = await generateWorldMapRouteDraft({
        routeId,
        directionIndex: drawDirectionIndex,
        existingStops: draftStops,
        virtualNodes: draftVirtualNodes,
        snap: (point) => snapPointToGeneralMapRoad(index, point),
        toConstraint: (node) => index.toVirtualNodeConstraint(node.point, node.kind) ?? null,
        traceSegment: traceSeg,
      })
      if (!result) {
        showExportHint(t('islandMapDrawGenerateFailed'))
        return
      }
      setDrawInteraction('route')
      setDraftStops(result.stops)
      const nextPoints =
        pathManuallyEdited && draftPoints.length >= 2
          ? syncPathEndpointsToStops(draftPoints, result.stops)
          : result.points
      setDraftPoints(nextPoints)
      if (!pathManuallyEdited || draftPoints.length < 2) {
        setPathManuallyEdited(false)
      }
      const fitPoints =
        nextPoints.length >= 2 ? nextPoints : result.stops.map((stop) => stop.point)
      if (fitPoints.length > 0) {
        setMapView(fitNormalizedViewToRoutePoints(fitPoints, expanded ? 'fullscreen' : 'widget'))
      }
      showExportHint(
        result.estimatedCount > 0
          ? t('islandMapDrawGenerateDoneEstimated', {
              routeId,
              points: nextPoints.length,
              count: result.estimatedCount,
            })
          : t('islandMapDrawGenerateDone', { routeId, points: nextPoints.length }),
      )
    } catch (error) {
      console.error('Route generate failed', error)
      showExportHint(t('islandMapDrawGenerateFailed'))
    } finally {
      setGeneratingRoute(false)
    }
  }, [
    drawDirectionIndex,
    drawRouteId,
    draftPoints,
    draftStops,
    draftVirtualNodes,
    expanded,
    pathManuallyEdited,
    showExportHint,
    t,
  ])

  const handleSendDrawPermissionRequest = useCallback(async () => {
    if (!token) {
      setPermissionDialog('register')
      return
    }
    setPermissionSending(true)
    try {
      await requestMapDrawPermission(token)
      setPermissionDialog('sent')
    } catch (error) {
      const message =
        error instanceof UserApiError && error.code === 'rate_limited'
          ? t('islandMapDrawPermissionRateLimited')
          : error instanceof UserApiError && error.code === 'already_admin'
            ? t('islandMapDrawPermissionAlreadyAdmin')
            : t('islandMapDrawPermissionSendFailed')
      showExportHint(message)
      setPermissionDialog(null)
      if (error instanceof UserApiError && error.code === 'already_admin') {
        void refreshProfile()
      }
    } finally {
      setPermissionSending(false)
    }
  }, [refreshProfile, showExportHint, t, token])

  const closePermissionDialog = useCallback(() => {
    setPermissionDialog(null)
    setPermissionSending(false)
    void refreshProfile()
  }, [refreshProfile])

  const overlayRouteId = routeOverlay?.routeId

  const openExportDialog = useCallback(() => {
    setExportMergeFiles([])
    setExportDialogOpen(true)
  }, [])

  const handleAddExportMergeFiles = useCallback(async (files: FileList) => {
    const next: IslandMapDrawExportMergeFile[] = []
    for (const file of Array.from(files)) {
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
        merged.virtualNodes,
        overlayRouteId,
      )
      if (!resolvedRouteId) {
        showExportHint(t('islandMapDrawExportNeedRouteId'))
        return
      }

      let pointsForExport = merged.points
      if (selection.includePath && pointsForExport.length < 2 && merged.stops.length >= 2) {
        const index = roadSnap.ready ? roadSnap.index : await preloadGeneralMapRoadSnapIndex()
        pointsForExport = rebuildDraftPathFromStops(
          merged.stops,
          (from, to, via = []) => traceGeneralMapRoadPath(index, from, to, via),
          merged.virtualNodes,
          resolvedRouteId,
          (node) => index?.toVirtualNodeConstraint(node.point, node.kind) ?? null,
        )
      }

      if (selection.includePath && pointsForExport.length < 2) {
        showExportHint(t('islandMapDrawExportNoPath'))
        return
      }

      const payload = buildWorldMapRouteExportPayload(
        merged.routeId || drawRouteId,
        merged.directionIndex ?? drawDirectionIndex,
        pointsForExport,
        merged.stops,
        merged.virtualNodes,
        overlayRouteId,
        selection,
      )
      if (!payload) {
        showExportHint(t('islandMapDrawExportNeedRoute'))
        return
      }

      setExportDialogOpen(false)
      setExportMergeFiles([])
      downloadWorldMapRouteJson(payload)
      const copied = await copyWorldMapRouteJson(payload)
      showExportHint(copied ? t('islandMapDrawExportRouteDone') : t('islandMapDrawExportRouteDownloaded'))
    },
    [
      drawDirectionIndex,
      drawRouteId,
      overlayRouteId,
      roadSnap,
      showExportHint,
      t,
    ],
  )

  const handleImportFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      try {
        const parsed = parseWorldMapDrawImportJson(readImportJsonText(await file.text()))
        if (!parsed) {
          showExportHint(t('islandMapDrawImportInvalid'))
          return
        }

        setPendingStop(null)
        setPendingVirtualNode(null)

        if (parsed.kind === 'catalog') {
          setDrawInteraction('catalog')
          setDraftPoints([])
          setDraftStops(parsed.stops)
          setMapView(
            fitNormalizedViewToRoutePoints(
              parsed.stops.map((stop) => stop.point),
              expanded ? 'fullscreen' : 'widget',
            ),
          )
          showExportHint(t('islandMapDrawImportCatalogDone', { count: parsed.stops.length }))
          return
        }

        if (parsed.kind === 'virtual') {
          setDrawInteraction('virtual')
          setDraftVirtualNodes(parsed.nodes)
          setMapView(
            fitNormalizedViewToRoutePoints(
              parsed.nodes.map((node) => node.point),
              expanded ? 'fullscreen' : 'widget',
            ),
          )
          showExportHint(t('islandMapDrawImportVirtualDone', { count: parsed.nodes.length }))
          return
        }

        setDrawInteraction('route')
        setDrawRouteId(parsed.routeId)
        setDrawDirectionIndex(parsed.directionIndex)
        setDraftStops(parsed.stops)
        const importedVirtualNodes = parsed.virtualNodes ?? []
        setDraftVirtualNodes(importedVirtualNodes)
        const initialPoints = parsed.points.length >= 2 ? parsed.points : []
        setDraftPoints(initialPoints)
        setPathManuallyEdited(initialPoints.length >= 2)
        const fitPoints =
          initialPoints.length >= 2 ? initialPoints : parsed.stops.map((stop) => stop.point)
        if (fitPoints.length > 0) {
          setMapView(fitNormalizedViewToRoutePoints(fitPoints, expanded ? 'fullscreen' : 'widget'))
        }
        showExportHint(t('islandMapDrawImportRouteDone', { routeId: parsed.routeId }))
        if (initialPoints.length < 2 && parsed.stops.length >= 2) {
          void traceImportedRoutePath(
            parsed.stops,
            importedVirtualNodes,
            parsed.routeId,
            roadSnap.ready,
            roadSnap.index,
          )
            .then((nextPoints) => {
              if (nextPoints.length >= 2) {
                setDraftPoints(nextPoints)
                setPathManuallyEdited(false)
              }
            })
            .catch((error) => {
              console.warn('Imported route path trace failed', error)
            })
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          showExportHint(t('islandMapDrawImportInvalid'))
          return
        }
        console.error('Route import failed', error)
        showExportHint(t('islandMapDrawImportInvalid'))
      }
    },
    [expanded, roadSnap, showExportHint, t],
  )

  const mapSrc = MAP_URLS[layer]
  const surfaceRouteOverlay = routeOverlay
    ? { routeNumber: routeOverlay.routeNumber, points: routeOverlay.points }
    : null
  const canExport =
    draftStops.length > 0 ||
    draftVirtualNodes.length > 0 ||
    draftPoints.length >= 2 ||
    resolveWorldMapExportRouteId(drawRouteId, draftVirtualNodes, overlayRouteId) !== ''
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
            onPathPointsChange: handlePathPointsChange,
          }
        : undefined,
    [drawInteraction, drawMode, draftPoints.length, handlePathPointsChange],
  )
  const traceEdit = useMemo(
    () =>
      drawMode && drawInteraction === 'route'
        ? {
            traceSelectedStopId:
              pendingTraceAnchor?.kind === 'stop' ? pendingTraceAnchor.id : null,
            traceSelectedVirtualNodeId:
              pendingTraceAnchor?.kind === 'virtual-node' ? pendingTraceAnchor.id : null,
            onVirtualNodeClick: handleVirtualNodeClick,
          }
        : undefined,
    [drawInteraction, drawMode, handleVirtualNodeClick, pendingTraceAnchor],
  )
  const draftRouteNumber = drawRouteId.trim()
  const pendingVirtualNodeOverlay = pendingVirtualNode
    ? { point: pendingVirtualNode.point, kind: pendingVirtualNode.kind }
    : null
  const canUndo =
    pendingVirtualNode != null ||
    pendingStop != null ||
    (drawInteraction === 'virtual' ? draftVirtualNodes.length > 0 : draftStops.length > 0)
  const canClear =
    draftStops.length > 0 || draftVirtualNodes.length > 0 || pendingStop != null || pendingVirtualNode != null

  const exportSourceSlices = useMemo<WorldMapDrawDraftSlice[]>(
    () => [
      {
        routeId: drawRouteId,
        directionIndex: drawDirectionIndex,
        points: [...draftPoints],
        stops: [...draftStops],
        virtualNodes: [...draftVirtualNodes],
      },
      ...exportMergeFiles.map((file) => file.slice),
    ],
    [drawDirectionIndex, drawRouteId, draftPoints, draftStops, draftVirtualNodes, exportMergeFiles],
  )

  const importExportPanelProps = {
    interaction: drawInteraction,
    routeId: drawRouteId,
    stopCount: draftStops.length,
    virtualNodeCount: draftVirtualNodes.length,
    canExport,
    canClear,
    exportHint,
    onImport: () => importInputRef.current?.click(),
    onExport: openExportDialog,
    onClear: clearDraft,
    onDrawRequest: userApiEnabled && !isMapAdmin ? handleDrawEntryClick : undefined,
  }

  const hiddenImportInput = (
    <input
      ref={importInputRef}
      type="file"
      accept=".json,application/json"
      className="island-map-draw-import-input"
      onChange={(event) => void handleImportFileChange(event)}
    />
  )

  const userMapPanel = !isMapAdmin ? <IslandMapImportExportPanel {...importExportPanelProps} /> : null

  const openFullscreen = useCallback(() => setExpanded(true), [])
  const closeFullscreen = useCallback(() => setExpanded(false), [])
  const toggleLayer = useCallback(() => {
    setLayer((current) => (current === 'general' ? 'detailed' : 'general'))
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('island-map-fullscreen-open', expanded)
    return () => document.documentElement.classList.remove('island-map-fullscreen-open')
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFullscreen()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeFullscreen, expanded])

  const drawPanel = isMapAdmin ? (
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
          onClick={clearDraft}
          disabled={!canClear}
          title={t('islandMapDrawClearHint')}
        >
          {t('islandMapDrawClear')}
        </button>
        <button
          type="button"
          className="island-map-btn island-map-btn--generate"
          onClick={() => void handleGenerateRoute()}
          disabled={generatingRoute || !drawRouteId.trim()}
          title={t('islandMapDrawGenerateHint')}
        >
          {generatingRoute ? t('islandMapDrawGenerating') : t('islandMapDrawGenerate')}
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
          {t('islandMapDrawVirtualCount', { count: draftVirtualNodes.length })}
        </span>
      </div>
      {drawMode && drawInteraction === 'route' ? (
        <IslandMapDrawColorPicker color={drawColor} onColorChange={setDrawColor} />
      ) : null}
      {drawInteraction === 'virtual' ? (
        <IslandMapDrawVirtualNodePanel
          nodes={draftVirtualNodes}
          pendingNode={drawMode ? pendingVirtualNode : null}
          onPendingRouteIdChange={(routeId) =>
            setPendingVirtualNode((current) => (current ? { ...current, routeId } : current))
          }
          onPendingKindChange={(kind) =>
            setPendingVirtualNode((current) =>
              current
                ? { ...current, kind, point: roadSnap.snapVirtualNode(current.point, kind) }
                : current,
            )
          }
          onConfirmPendingNode={handleConfirmPendingVirtualNode}
          onCancelPendingNode={() => setPendingVirtualNode(null)}
          onRemoveNode={handleRemoveVirtualNode}
        />
      ) : null}
      {drawInteraction !== 'virtual' ? (
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
      ) : null}
      {drawMode && drawInteraction === 'route' ? (
        <p className="island-map-draw-help">
          {roadSnap.loading ? t('islandMapDrawRoadLoading') : t('islandMapDrawHelp')}
          <span className="island-map-draw-build-tag">{t('buildTag', { time: drawBuildLabel })}</span>
        </p>
      ) : null}
      {drawMode && drawInteraction === 'route' && pendingTraceAnchor ? (
        <p className="island-map-draw-trace-pending">{t('islandMapDrawTracePending')}</p>
      ) : null}
      {exportHint ? <p className="island-map-draw-export-hint">{exportHint}</p> : null}
    </div>
  ) : null

  const node = expanded ? (
    <div
      className={`island-map island-map--fullscreen${drawMode ? ' island-map--draw-mode' : ''}`.trim()}
      role="dialog"
      aria-modal="true"
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
          draftVirtualNodes,
          pendingStop?.point ?? null,
          pendingVirtualNodeOverlay,
          drawColor,
          draftRouteNumber,
          handleDrawMapClick,
          handleDrawUndo,
          surfaceMaxZoomRatio,
          stopEdit,
          pathEdit,
          traceEdit,
        )}
      />
      <div className="island-map-controls island-map-controls--fullscreen">
        {isMapAdmin ? drawPanel : userMapPanel}
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
          <button
            type="button"
            className="island-map-btn island-map-btn--minimize"
            onClick={closeFullscreen}
            aria-label={t('islandMapMinimize')}
            title={t('islandMapMinimize')}
          >
            <MinimizeIcon />
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div
      className={`island-map island-map--widget${widgetHidden ? ' island-map--widget-collapsed' : ''}${routeOverlay ? ' island-map--widget-route' : ''}${drawMode ? ' island-map--draw-mode' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      {widgetHidden ? null : (
        <IslandMapPanZoomSurface
          {...surfaceProps(
            mapSrc,
            'widget',
            'island-map-viewport island-map-viewport--widget',
            mapView,
            handleViewChange,
            surfaceRouteOverlay,
            drawMode,
            drawInteraction,
            draftPoints,
            draftStopPoints,
            draftStops,
            draftVirtualNodes,
            pendingStop?.point ?? null,
            pendingVirtualNodeOverlay,
            drawColor,
            draftRouteNumber,
            handleDrawMapClick,
            handleDrawUndo,
            surfaceMaxZoomRatio,
            stopEdit,
            pathEdit,
            traceEdit,
          )}
        />
      )}
      <div className="island-map-widget-toolbar">
        {widgetHidden ? (
          <button
            type="button"
            className="island-map-btn island-map-btn--show"
            onClick={() => setWidgetHidden(false)}
            aria-label={t('islandMapShow')}
            title={t('islandMapShow')}
          >
            <ShowIcon />
          </button>
        ) : (
          <>
            {isMapAdmin ? (
              <button
                type="button"
                className={`island-map-btn island-map-btn--draw${drawMode ? ' island-map-btn--active' : ''}`.trim()}
                onClick={handleDrawEntryClick}
                aria-pressed={drawMode}
                title={drawMode ? t('islandMapDrawStopHint') : t('islandMapDrawStartHint')}
              >
                {drawMode ? t('islandMapDrawStop') : t('islandMapDraw')}
              </button>
            ) : userApiEnabled ? (
              <button
                type="button"
                className="island-map-btn island-map-btn--draw"
                onClick={handleDrawEntryClick}
                title={t('islandMapDrawPermissionButtonHint')}
              >
                {t('islandMapDraw')}
              </button>
            ) : null}
            <button
              type="button"
              className="island-map-btn island-map-btn--hide"
              onClick={() => setWidgetHidden(true)}
              aria-label={t('islandMapHide')}
              title={t('islandMapHide')}
            >
              <HideIcon />
            </button>
            <button
              type="button"
              className="island-map-btn island-map-btn--expand"
              onClick={openFullscreen}
              aria-label={t('islandMapExpand')}
              title={t('islandMapExpand')}
            >
              <ExpandIcon />
            </button>
          </>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return node
  return createPortal(
    <>
      {hiddenImportInput}
      <IslandMapDrawExportDialog
        open={exportDialogOpen}
        routeId={drawRouteId}
        directionIndex={drawDirectionIndex}
        stops={draftStops}
        virtualNodes={draftVirtualNodes}
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
        step={permissionDialog}
        applicantEmail={email}
        sending={permissionSending}
        onCancel={closePermissionDialog}
        onConfirmSend={() => void handleSendDrawPermissionRequest()}
        onGoRegister={() => {
          window.location.href = './account.html'
        }}
      />
      {node}
    </>,
    document.body,
  )
}
