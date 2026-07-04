import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { fitNormalizedViewToRoutePoints, resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
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
import { parseWorldMapDrawImportJson } from '../utils/worldMapRouteImport'
import type { RouteEditorMode } from '../routeEditor/types'
import {
  isReferenceEditorExportJson,
  mergeReferenceJsonFiles,
  normalizedToPixel,
  routeEditorLineToSibsDraft,
  sibsImportToRouteEditorLine,
} from '../routeEditor/routeEditorBridge'
import type { RouteEditorLine } from '../routeEditor/types'
import { useRouteEditor } from '../routeEditor/useRouteEditor'
import { IslandMapDrawExportDialog, type IslandMapDrawExportMergeFile } from './IslandMapDrawExportDialog'
import { IslandMapDrawImportConflictDialog } from './IslandMapDrawImportConflictDialog'
import {
  IslandMapDrawClearDialog,
  type IslandMapDrawClearSelection,
} from './IslandMapDrawClearDialog'
import { IslandMapDrawPermissionDialogs } from './IslandMapDrawPermissionDialogs'
import { IslandMapDrawColorPicker } from './IslandMapDrawColorPicker'
import { IslandMapDrawStopLabelSettings } from './IslandMapDrawStopLabelSettings'
import { IslandMapImportExportPanel } from './IslandMapImportExportPanel'
import { IslandMapPanZoomSurface, DRAW_MAX_ZOOM_RATIO, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { readStoredMapDrawColor } from '../utils/mapDrawColor'
import {
  readStoredMapDrawStopLabelScale,
  readStoredMapDrawStopLabelVisible,
} from '../utils/mapDrawStopLabel'

function readImportJsonText(text: string): unknown {
  return JSON.parse(text.replace(/^\uFEFF/, '').trim())
}

type MapLayer = 'general' | 'detailed'

const MAP_URLS: Record<MapLayer, string> = {
  general: './maps/SIMapGerenal.png',
  detailed: './maps/SIMap.png',
}

interface MapImageSize {
  width: number
  height: number
}

export function IslandMapDrawEditor({ ready = true }: { ready?: boolean }) {
  const { t, locale } = useLocale()
  const { isLoggedIn } = useAuth()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const editor = useRouteEditor(routeOverlay?.routeNumber ?? '默认线路')

  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [imageSize, setImageSize] = useState<MapImageSize | null>(null)
  const [editorMode, setEditorMode] = useState<RouteEditorMode>('select')
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [connectPendingNodeId, setConnectPendingNodeId] = useState<number | null>(null)
  const [connectPreview, setConnectPreview] = useState<{
    fromX: number
    fromY: number
    toX: number
    toY: number
  } | null>(null)
  const [drawRouteId, setDrawRouteId] = useState('')
  const [drawDirectionIndex, setDrawDirectionIndex] = useState(0)
  const [drawColor, setDrawColor] = useState(readStoredMapDrawColor)
  const [showStopLabels, setShowStopLabels] = useState(readStoredMapDrawStopLabelVisible)
  const [stopLabelScale, setStopLabelScale] = useState(readStoredMapDrawStopLabelScale)
  const [exportHint, setExportHint] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [importConflictState, setImportConflictState] = useState<{
    files: ImportedDrawFile[]
    referenceJsonTexts: string[]
    conflict: PathConflictGroup
  } | null>(null)
  const [exportMergeFiles, setExportMergeFiles] = useState<IslandMapDrawExportMergeFile[]>([])
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [pointerPreview, setPointerPreview] = useState<{ type: 'stop' | 'point'; x: number; y: number } | null>(
    null,
  )
  const [editChiName, setEditChiName] = useState('')
  const [editEngName, setEditEngName] = useState('')
  const [editCornerRadius, setEditCornerRadius] = useState(0)
  const [newStopChiName, setNewStopChiName] = useState('')
  const [newStopEngName, setNewStopEngName] = useState('')

  const exportHintTimerRef = useRef<number | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const savedViewRef = useRef<NormalizedMapView | null>(null)

  const selectedNode = selectedNodeId != null ? editor.manager.getNodeById(selectedNodeId) : null

  useEffect(() => {
    if (!selectedNode) {
      setEditChiName('')
      setEditEngName('')
      setEditCornerRadius(0)
      return
    }
    setEditChiName(selectedNode.chi_name)
    setEditEngName(selectedNode.eng_name)
    setEditCornerRadius(selectedNode.cornerRadius)
  }, [selectedNode])

  useEffect(() => {
    if (!routeOverlay) {
      if (savedViewRef.current) {
        setMapView(savedViewRef.current)
        savedViewRef.current = null
      }
      return
    }
    savedViewRef.current = mapView
    setMapView(fitNormalizedViewToRoutePoints(routeOverlay.points, 'fullscreen'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOverlay])

  useEffect(() => {
    if (!routeOverlay) return
    setDrawRouteId(routeOverlay.routeId)
    setDrawDirectionIndex(routeOverlay.directionIndex)
    editor.setLineName(routeOverlay.routeNumber)
  }, [editor, routeOverlay])

  useEffect(() => {
    return () => {
      if (exportHintTimerRef.current != null) window.clearTimeout(exportHintTimerRef.current)
    }
  }, [])

  useEffect(() => {
    editor.manager.updateConfig({
      showLabelsAlways: showStopLabels,
      labelFontSize: Math.round(11 * stopLabelScale),
    })
  }, [editor.manager, showStopLabels, stopLabelScale])

  useEffect(() => {
    editor.manager.updateLineStyle({ color: drawColor })
  }, [drawColor, editor.manager])

  const showExportHint = useCallback((message: string) => {
    setExportHint(message)
    if (exportHintTimerRef.current != null) window.clearTimeout(exportHintTimerRef.current)
    exportHintTimerRef.current = window.setTimeout(() => {
      setExportHint(null)
      exportHintTimerRef.current = null
    }, 2600)
  }, [])

  const sibsDraft = useMemo(() => {
    if (!imageSize) return null
    return routeEditorLineToSibsDraft(
      editor.line,
      { ...editor.lineStyle, color: drawColor },
      imageSize.width,
      imageSize.height,
      drawRouteId,
      drawDirectionIndex,
      editor.config.showPointLines,
    )
  }, [drawColor, drawDirectionIndex, drawRouteId, editor.config.showPointLines, editor.line, editor.lineStyle, imageSize])

  const enterEditorMode = useCallback((mode: RouteEditorMode) => {
    setEditorMode(mode)
    if (mode === 'addStop') {
      setNewStopChiName('')
      setNewStopEngName('')
    }
    if (mode !== 'select') {
      setSelectedNodeId(null)
      setConnectPendingNodeId(null)
      setConnectPreview(null)
    }
  }, [])

  const handleNodeClick = useCallback(
    (nodeId: number) => {
      if (editorMode !== 'select') return
      setSelectedNodeId(nodeId)
      if (connectPendingNodeId == null) {
        setConnectPendingNodeId(nodeId)
        return
      }
      if (connectPendingNodeId === nodeId) {
        setConnectPendingNodeId(null)
        setConnectPreview(null)
        return
      }
      editor.addSegment(connectPendingNodeId, nodeId)
      setConnectPendingNodeId(null)
      setConnectPreview(null)
    },
    [connectPendingNodeId, editor, editorMode],
  )

  const handleSegmentDoubleClick = useCallback(
    (segmentId: number) => {
      editor.deleteSegment(segmentId)
    },
    [editor],
  )

  const handleMapClick = useCallback(
    (point: WorldMapPoint) => {
      if (!imageSize) return
      const { x, y } = normalizedToPixel(point, imageSize.width, imageSize.height)
      if (editorMode === 'addStop') {
        const chi = newStopChiName.trim()
        const eng = newStopEngName.trim()
        editor.addNode('stop', x, y, chi || eng ? { chi_name: chi, eng_name: eng } : undefined)
        return
      }
      if (editorMode === 'addPoint') {
        editor.addNode('point', x, y)
        return
      }
      if (editorMode === 'select') {
        setConnectPendingNodeId(null)
        setConnectPreview(null)
      }
    },
    [editor, editorMode, imageSize, newStopChiName, newStopEngName],
  )

  const handleMapPointerMove = useCallback(
    (point: WorldMapPoint | null) => {
      if (!point || !imageSize) {
        setPointerPreview(null)
        setConnectPreview(null)
        return
      }
      const pixel = normalizedToPixel(point, imageSize.width, imageSize.height)
      if (editorMode === 'select' && connectPendingNodeId != null) {
        const pendingNode = editor.manager.getNodeById(connectPendingNodeId)
        if (pendingNode) {
          setConnectPreview({
            fromX: pendingNode.x,
            fromY: pendingNode.y,
            toX: pixel.x,
            toY: pixel.y,
          })
        }
        setPointerPreview(null)
        return
      }
      if (editorMode === 'select') {
        setPointerPreview(null)
        setConnectPreview(null)
        return
      }
      setPointerPreview({
        type: editorMode === 'addStop' ? 'stop' : 'point',
        x: pixel.x,
        y: pixel.y,
      })
    },
    [connectPendingNodeId, editor.manager, editorMode, imageSize],
  )

  const deleteSelectedNode = useCallback(() => {
    if (selectedNodeId == null) return
    editor.deleteNode(selectedNodeId)
    setSelectedNodeId(null)
  }, [editor, selectedNodeId])

  const saveSelectedNodeEdits = useCallback(() => {
    if (selectedNodeId == null || !selectedNode) return
    editor.updateNode(selectedNodeId, {
      chi_name: editChiName,
      eng_name: editEngName,
      cornerRadius: selectedNode.type === 'point' ? editCornerRadius : selectedNode.cornerRadius,
    })
  }, [editChiName, editCornerRadius, editEngName, editor, selectedNode, selectedNodeId])

  const applyClearSelection = useCallback(
    (selection: IslandMapDrawClearSelection) => {
      if (selection.path) {
        editor.clearSegments()
      }
      if (selection.stops || selection.pathNodes) {
        const typesToRemove = new Set<'stop' | 'point'>()
        if (selection.stops) typesToRemove.add('stop')
        if (selection.pathNodes) typesToRemove.add('point')
        for (const node of [...editor.line.nodes]) {
          if (typesToRemove.has(node.type)) {
            editor.deleteNode(node.id)
          }
        }
      }
      setSelectedNodeId(null)
      setConnectPendingNodeId(null)
      setConnectPreview(null)
      setClearDialogOpen(false)
    },
    [editor],
  )

  const overlayRouteId = routeOverlay?.routeId
  const canExport =
    (sibsDraft?.stops.length ?? 0) > 0 ||
    (sibsDraft?.points.length ?? 0) >= 2 ||
    resolveWorldMapExportRouteId(drawRouteId, [], overlayRouteId) !== ''
  const canClear = editor.line.nodes.length > 0 || editor.line.segments.length > 0
  const hasDraftPath = editor.line.segments.length > 0
  const stopCount = editor.line.nodes.filter((node) => node.type === 'stop').length
  const pathNodeCount = editor.line.nodes.filter((node) => node.type === 'point').length

  const handleExportConfirm = useCallback(
    async (selection: WorldMapRouteExportSelection, merged: WorldMapDrawDraftSlice) => {
      if (!sibsDraft) return
      const resolvedRouteId = resolveWorldMapExportRouteId(
        merged.routeId || drawRouteId,
        [],
        overlayRouteId,
      )
      if (!resolvedRouteId) {
        showExportHint(t('islandMapDrawExportNeedRouteId'))
        return
      }

      let pointsForExport = merged.points.length >= 2 ? merged.points : sibsDraft.points
      if (selection.includePath && pointsForExport.length < 2 && merged.stops.length >= 2) {
        pointsForExport = sibsDraft.points
      }
      if (selection.includePath && pointsForExport.length < 2) {
        showExportHint(t('islandMapDrawExportNoPath'))
        return
      }

      if (selection.includeImage && imageSize) {
        try {
          await exportWorldMapDrawImage(
            {
              mapImageUrl: MAP_URLS.general,
              routeId: resolvedRouteId,
              points: pointsForExport,
              stops: merged.stops.length > 0 ? merged.stops : sibsDraft.stops,
              legStarts: [0],
              legHidden: [],
              pathUserBends: [],
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

      const exportJson = selection.includeStops || selection.includePathNodes || selection.includePath
      if (exportJson) {
        const payload = buildWorldMapRouteExportPayload(
          merged.routeId || drawRouteId,
          merged.directionIndex ?? drawDirectionIndex,
          pointsForExport,
          merged.stops.length > 0 ? merged.stops : sibsDraft.stops,
          overlayRouteId,
          selection,
          {},
          merged.stops.length > 0 ? sibsDraft.pathNodes : [],
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
      imageSize,
      locale,
      overlayRouteId,
      showExportHint,
      showStopLabels,
      sibsDraft,
      stopLabelScale,
      t,
    ],
  )

  const applyImportedDrawFiles = useCallback(
    (
      files: readonly ImportedDrawFile[],
      resolution: PathConflictResolution,
      referenceJsonTexts: readonly string[] = [],
    ) => {
      if (!imageSize) return

      const referenceLine = mergeReferenceJsonFiles(referenceJsonTexts)
      const merged = files.length > 0 ? mergeImportedDrawFiles(files, resolution, sibsDraft?.stops ?? []) : null

      const importLines: RouteEditorLine[] = []
      if (referenceLine) importLines.push(referenceLine)

      if (merged) {
        if (merged.kind === 'catalog') {
          const imported = sibsImportToRouteEditorLine(
            { kind: 'catalog', stops: merged.stops },
            imageSize.width,
            imageSize.height,
          )
          if (imported) importLines.push(imported.line)
        } else {
          const imported = sibsImportToRouteEditorLine(merged, imageSize.width, imageSize.height)
          if (!imported) {
            showExportHint(t('islandMapDrawImportInvalid'))
            return
          }
          importLines.push(imported.line)
          setDrawRouteId(imported.routeId)
          setDrawDirectionIndex(imported.directionIndex)
          const fitPoints = merged.points.length >= 2 ? merged.points : merged.stops.map((stop) => stop.point)
          if (fitPoints.length > 0) {
            setMapView(fitNormalizedViewToRoutePoints(fitPoints, 'fullscreen'))
          }
        }
      }

      const importLine = mergeManyRouteEditorLines(importLines)
      if (!importLine) {
        showExportHint(t('islandMapDrawImportInvalid'))
        return
      }

      editor.mergeFromImport(importLine, merged?.kind === 'route' ? importLine.name : undefined)
      setSelectedNodeId(null)
      setConnectPendingNodeId(null)
      setConnectPreview(null)
      setEditorMode('select')

      if (merged?.kind === 'catalog') {
        showExportHint(
          t('mapDrawImportMergeDone', {
            stops: importLine.nodes.filter((node) => node.type === 'stop').length,
            segments: importLine.segments.length,
          }),
        )
        return
      }
      if (merged?.kind === 'route') {
        showExportHint(
          t('mapDrawImportMergeDone', {
            stops: importLine.nodes.filter((node) => node.type === 'stop').length,
            segments: importLine.segments.length,
          }),
        )
        return
      }
      showExportHint(
        t('mapDrawImportMergeDone', {
          stops: importLine.nodes.filter((node) => node.type === 'stop').length,
          segments: importLine.segments.length,
        }),
      )
    },
    [editor, imageSize, showExportHint, sibsDraft?.stops, t],
  )

  const handleImportFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      event.target.value = ''
      if (files.length === 0) return

      const importedFiles: ImportedDrawFile[] = []
      const referenceJsonTexts: string[] = []
      for (const file of files) {
        try {
          const text = await file.text()
          const raw = readImportJsonText(text)
          if (isReferenceEditorExportJson(raw)) {
            referenceJsonTexts.push(JSON.stringify(raw))
            continue
          }
          const parsed = parseWorldMapDrawImportJson(raw)
          if (!parsed || parsed.kind === 'virtual') continue
          importedFiles.push({ fileName: file.name, parsed })
        } catch {
          // skip invalid
        }
      }

      if (importedFiles.length === 0 && referenceJsonTexts.length === 0) {
        showExportHint(t('islandMapDrawImportInvalid'))
        return
      }

      if (importedFiles.length === 0) {
        applyImportedDrawFiles([], { kind: 'keepAll' }, referenceJsonTexts)
        return
      }

      const conflict = detectPathConflicts(importedFiles)
      if (conflict) {
        setImportConflictState({ files: importedFiles, referenceJsonTexts, conflict })
        return
      }
      applyImportedDrawFiles(importedFiles, { kind: 'keepAll' }, referenceJsonTexts)
    },
    [applyImportedDrawFiles, editor, showExportHint, t],
  )

  const mapDrawMode = editorMode === 'addStop' || editorMode === 'addPoint'
  const mapSrc = MAP_URLS[layer]
  const surfaceRouteOverlay = routeOverlay
    ? { routeNumber: routeOverlay.routeNumber, points: routeOverlay.points }
    : null
  const zoomPercent = Math.round((mapView?.zoomRatio ?? 1) * 100)
  const pointerLabel = t('mapDrawStatusCoords', { x: 0, y: 0 })

  useEffect(() => {
    document.documentElement.classList.add('island-map-fullscreen-open')
    return () => document.documentElement.classList.remove('island-map-fullscreen-open')
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (connectPendingNodeId != null) {
          setConnectPendingNodeId(null)
          setConnectPreview(null)
          return
        }
        enterEditorMode('select')
        return
      }
      if (event.key === 'Delete' && selectedNodeId != null) {
        event.preventDefault()
        deleteSelectedNode()
        return
      }
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        editor.undo()
      } else if (event.key === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault()
        editor.redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [connectPendingNodeId, deleteSelectedNode, editor, enterEditorMode, isLoggedIn, selectedNodeId])

  const statusMode =
    editorMode === 'select'
      ? connectPendingNodeId != null
        ? t('mapDrawStatusConnectPending')
        : t('mapDrawStatusSelect')
      : editorMode === 'addStop'
        ? t('mapDrawStatusAddStop')
        : t('mapDrawStatusAddPoint')

  const exportSourceSlices = useMemo<WorldMapDrawDraftSlice[]>(
    () => [
      {
        routeId: drawRouteId,
        directionIndex: drawDirectionIndex,
        points: sibsDraft?.points ?? [],
        stops: sibsDraft?.stops ?? [],
        virtualNodes: [],
      },
      ...exportMergeFiles.map((file) => file.slice),
    ],
    [drawDirectionIndex, drawRouteId, exportMergeFiles, sibsDraft?.points, sibsDraft?.stops],
  )

  const guestPanel = !isLoggedIn ? (
    <IslandMapImportExportPanel
      interaction="route"
      routeId={drawRouteId}
      stopCount={stopCount}
      pathNodeCount={pathNodeCount}
      canExport={canExport}
      canClear={canClear}
      exportHint={exportHint}
      onImport={() => importInputRef.current?.click()}
      onExport={() => setExportDialogOpen(true)}
      onClear={() => setClearDialogOpen(true)}
      onDrawRequest={() => setPermissionDialogOpen(true)}
    />
  ) : null

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
          {isLoggedIn ? (
            <>
              <button type="button" className="route-editor-btn" onClick={() => editor.undo()} disabled={editor.history.undoCount <= 0}>
                {t('islandMapDrawUndo')}
              </button>
              <button type="button" className="route-editor-btn" onClick={() => editor.redo()} disabled={editor.history.redoCount <= 0}>
                {t('islandMapDrawRedo')}
              </button>
              <button type="button" className="route-editor-btn" onClick={() => importInputRef.current?.click()}>
                {t('islandMapDrawImport')}
              </button>
              <button type="button" className="route-editor-btn" onClick={() => setExportDialogOpen(true)} disabled={!canExport}>
                {t('islandMapDrawExport')}
              </button>
              <button type="button" className="route-editor-btn route-editor-btn--danger" onClick={() => setClearDialogOpen(true)} disabled={!canClear}>
                {t('islandMapDrawClear')}
              </button>
            </>
          ) : null}
          <a className="route-editor-btn route-editor-back" href="./routes.html">
            {t('mapDrawPageBack')}
          </a>
        </div>
      </header>

      <div className="route-editor-body">
        <aside className="route-editor-sidebar">
          {isLoggedIn ? (
            <>
              <section className="route-editor-panel">
                <h3>{t('mapDrawPanelNodes')}</h3>
                <div className="route-editor-btn-row route-editor-btn-row--stack">
                  <button type="button" className={`route-editor-btn route-editor-btn--primary${editorMode === 'addStop' ? ' route-editor-btn--active' : ''}`.trim()} onClick={() => enterEditorMode('addStop')}>
                    {t('mapDrawAddStop')}
                  </button>
                  <button type="button" className={`route-editor-btn route-editor-btn--primary${editorMode === 'addPoint' ? ' route-editor-btn--active' : ''}`.trim()} onClick={() => enterEditorMode('addPoint')}>
                    {t('mapDrawAddPoint')}
                  </button>
                  <button type="button" className={`route-editor-btn${editorMode === 'select' ? ' route-editor-btn--active' : ''}`.trim()} onClick={() => enterEditorMode('select')}>
                    {t('mapDrawModeSelect')}
                  </button>
                  {selectedNodeId != null ? (
                    <button type="button" className="route-editor-btn route-editor-btn--danger" onClick={deleteSelectedNode}>
                      {t('mapDrawDeleteNode')}
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="route-editor-panel">
                <h3>{t('mapDrawPanelMap')}</h3>
                <div className="route-editor-btn-row route-editor-btn-row--stack">
                  <button type="button" className="route-editor-btn" onClick={() => setLayer((current) => (current === 'general' ? 'detailed' : 'general'))}>
                    {t('islandMapLayers')}
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
                {editorMode === 'addStop' ? (
                  <div className="reference-node-info-panel">
                    <h4>{t('mapDrawAddStopNames')}</h4>
                    <label className="route-editor-field">
                      <span>{t('mapDrawNodeChiName')}</span>
                      <input
                        value={newStopChiName}
                        onChange={(event) => setNewStopChiName(event.target.value)}
                        placeholder={t('mapDrawAddStopChiPlaceholder')}
                      />
                    </label>
                    <label className="route-editor-field">
                      <span>{t('mapDrawNodeEngName')}</span>
                      <input
                        value={newStopEngName}
                        onChange={(event) => setNewStopEngName(event.target.value)}
                        placeholder={t('mapDrawAddStopEngPlaceholder')}
                      />
                    </label>
                    <p className="island-map-draw-help">{t('mapDrawAddStopHelp')}</p>
                  </div>
                ) : selectedNode ? (
                  <div className="reference-node-info-panel">
                    <h4>{selectedNode.type === 'stop' ? t('mapDrawNodeInfoStop') : t('mapDrawNodeInfoPoint')}</h4>
                    {selectedNode.type === 'stop' ? (
                      <>
                        <label className="route-editor-field">
                          <span>{t('mapDrawNodeChiName')}</span>
                          <input value={editChiName} onChange={(event) => setEditChiName(event.target.value)} />
                        </label>
                        <label className="route-editor-field">
                          <span>{t('mapDrawNodeEngName')}</span>
                          <input value={editEngName} onChange={(event) => setEditEngName(event.target.value)} />
                        </label>
                      </>
                    ) : (
                      <label className="route-editor-field">
                        <span>{t('mapDrawNodeCornerRadius')}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editCornerRadius}
                          onChange={(event) => setEditCornerRadius(Number(event.target.value) || 0)}
                        />
                      </label>
                    )}
                    <p className="island-map-draw-help">
                      X: {selectedNode.x}, Y: {selectedNode.y}
                    </p>
                    <button type="button" className="route-editor-btn route-editor-btn--primary" onClick={saveSelectedNodeEdits}>
                      {t('mapDrawNodeSave')}
                    </button>
                  </div>
                ) : connectPendingNodeId != null ? (
                  <p className="island-map-draw-help">{t('mapDrawConnectPendingHint')}</p>
                ) : (
                  <p className="island-map-draw-help">{t('mapDrawNodeSelectHint')}</p>
                )}
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
            <section className="route-editor-panel">{guestPanel}</section>
          )}
        </aside>

        <div className="route-editor-workspace">
          <div className="route-editor-map-shell">
            <IslandMapPanZoomSurface
              src={mapSrc}
              mode="fullscreen"
              className="route-editor-map-viewport"
              view={mapView}
              onViewChange={setMapView}
              routeOverlay={surfaceRouteOverlay}
              drawMode={mapDrawMode}
              drawInteraction={editorMode === 'addStop' ? 'catalog' : editorMode === 'addPoint' ? 'path-node' : 'route'}
              draftPoints={[]}
              draftStopPoints={[]}
              draftStops={[]}
              draftPathNodes={[]}
              pendingStopPoint={null}
              pendingPathNodePoint={null}
              draftStrokeColor={drawColor}
              draftRouteNumber={drawRouteId.trim()}
              onDrawMapClick={handleMapClick}
              maxZoomRatio={isLoggedIn ? DRAW_MAX_ZOOM_RATIO : 8}
              pathLegStarts={[0]}
              pathLegHidden={[]}
              pathUserBends={[]}
              showStopLabels={showStopLabels}
              stopLabelScale={stopLabelScale}
              onMapPointerMove={handleMapPointerMove}
              onImageSizeChange={setImageSize}
              referenceEditor={
                isLoggedIn && imageSize
                  ? {
                      nodes: editor.line.nodes,
                      segments: editor.line.segments,
                      lineStyle: { ...editor.lineStyle, color: drawColor },
                      config: editor.config,
                      selectedNodeId,
                      connectPendingNodeId,
                      connectPreview,
                      previewNode: pointerPreview,
                      onNodeClick: editorMode === 'select' ? handleNodeClick : undefined,
                      onSegmentDoubleClick: editorMode === 'select' ? handleSegmentDoubleClick : undefined,
                    }
                  : null
              }
            />
          </div>
          <footer className="route-editor-statusbar">
            <span>{pointerLabel}</span>
            <span>{t('mapDrawStatusNodes', { stops: stopCount, nodes: pathNodeCount })}</span>
            <span>{t('mapDrawStatusZoom', { percent: zoomPercent })}</span>
            <span>{t('mapDrawStatusHistory', { undo: editor.history.undoCount, redo: editor.history.redoCount })}</span>
            <span>{statusMode}</span>
          </footer>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        className="island-map-draw-import-input"
        onChange={(event) => void handleImportFileChange(event)}
      />
      <IslandMapDrawClearDialog
        open={clearDialogOpen}
        stopCount={stopCount}
        pathNodeCount={pathNodeCount}
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
          applyImportedDrawFiles(pending.files, resolution, pending.referenceJsonTexts)
        }}
      />
      <IslandMapDrawExportDialog
        open={exportDialogOpen}
        routeId={drawRouteId}
        directionIndex={drawDirectionIndex}
        stops={sibsDraft?.stops ?? []}
        pathNodes={sibsDraft?.pathNodes ?? []}
        points={sibsDraft?.points ?? []}
        sourceSlices={exportSourceSlices}
        mergeFiles={exportMergeFiles}
        overlayRouteId={overlayRouteId}
        onAddMergeFiles={async (files) => {
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
              // skip
            }
          }
          if (next.length > 0) setExportMergeFiles((current) => [...current, ...next])
        }}
        onRemoveMergeFile={(id) => setExportMergeFiles((current) => current.filter((file) => file.id !== id))}
        onCancel={() => {
          setExportDialogOpen(false)
          setExportMergeFiles([])
        }}
        onConfirm={handleExportConfirm}
      />
      <IslandMapDrawPermissionDialogs
        open={permissionDialogOpen}
        onCancel={() => setPermissionDialogOpen(false)}
        onGoRegister={() => {
          window.location.href = './account.html'
        }}
      />
      {node}
    </>
  )
}
