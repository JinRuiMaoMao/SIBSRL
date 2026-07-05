import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../styles/mapDrawEditor.css'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { fitNormalizedViewToRoutePoints, resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import {
  DRAW_MAX_ZOOM_RATIO,
  DRAW_MIN_ZOOM_RATIO,
} from '../utils/mapDrawOverlayZoom'
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
import type { RouteEditorCarriageway, RouteEditorLabelPosition, RouteEditorLine, RouteEditorMode, RouteEditorNode } from '../routeEditor/types'
import {
  isReferenceEditorExportJson,
  mergeReferenceJsonFiles,
  normalizedToPixel,
  routeEditorLineToExportSegmentLines,
  routeEditorLineToSibsDraft,
  sibsImportToRouteEditorLine,
} from '../routeEditor/routeEditorBridge'
import { mergeManyRouteEditorLines } from '../routeEditor/routeEditorMerge'
import { useRouteEditor } from '../routeEditor/useRouteEditor'
import { IslandMapDrawExportDialog, type IslandMapDrawExportMergeFile } from './IslandMapDrawExportDialog'
import { IslandMapDrawImportConflictDialog } from './IslandMapDrawImportConflictDialog'
import {
  IslandMapDrawClearDialog,
  type IslandMapDrawClearSelection,
} from './IslandMapDrawClearDialog'
import { IslandMapDrawPermissionDialogs } from './IslandMapDrawPermissionDialogs'
import { IslandMapDrawColorPicker } from './IslandMapDrawColorPicker'
import { MapDrawStopNameFields, type MapDrawStopNameSelection } from './MapDrawStopNameFields'
import { MapDrawStopLabelPositionPicker } from './MapDrawStopLabelPositionPicker'
import { loadWorldMapStopCatalog, type WorldMapCatalogStop } from '../utils/worldMapStopCatalog'
import { IslandMapDrawStopLabelSettings } from './IslandMapDrawStopLabelSettings'
import { IslandMapImportExportPanel } from './IslandMapImportExportPanel'
import { IslandMapPanZoomSurface, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { readStoredMapDrawColor } from '../utils/mapDrawColor'
import {
  readStoredMapDrawStopLabelScale,
  readStoredMapDrawStopLabelVisible,
} from '../utils/mapDrawStopLabel'
import { mapDrawNodeScaleFactor } from '../utils/mapDrawNodeScale'
import { findDrawRouteStopSeq } from '../utils/worldMapDrawRouteLookup'
import { consumeMapDrawRouteHandoff } from '../utils/mapDrawRouteHandoff'

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

interface IslandMapDrawEditorProps {
  variant?: 'page' | 'overlay'
  onClose?: () => void
  initialMapView?: NormalizedMapView | null
  initialLayer?: MapLayer
}

export function IslandMapDrawEditor({
  variant = 'page',
  onClose,
  initialMapView = null,
  initialLayer = 'general',
}: IslandMapDrawEditorProps) {
  const isOverlay = variant === 'overlay'
  const { t, locale } = useLocale()
  const { isLoggedIn } = useAuth()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const editor = useRouteEditor(routeOverlay?.routeNumber ?? '默认线路')

  const [layer, setLayer] = useState<MapLayer>(initialLayer)
  const [mapView, setMapView] = useState<NormalizedMapView | null>(initialMapView)
  const [imageSize, setImageSize] = useState<MapImageSize | null>(null)
  const [editorMode, setEditorMode] = useState<RouteEditorMode>('select')
  const [connectCarriageway, setConnectCarriageway] = useState<RouteEditorCarriageway>('single')
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
  const [exportPngPreview, setExportPngPreview] = useState(false)
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
  const [editStopSeq, setEditStopSeq] = useState('')
  const [editLabelPosition, setEditLabelPosition] = useState<RouteEditorLabelPosition>('top')
  const [newStopChiName, setNewStopChiName] = useState('')
  const [newStopEngName, setNewStopEngName] = useState('')
  const [stopCatalog, setStopCatalog] = useState<WorldMapCatalogStop[] | null>(null)

  const exportHintTimerRef = useRef<number | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const savedViewRef = useRef<NormalizedMapView | null>(null)
  const prevImageSizeRef = useRef<MapImageSize | null>(null)
  const connectPendingRef = useRef<number | null>(null)
  const lastPlacedStopIdRef = useRef<number | null>(null)
  const pendingNewStopSeqRef = useRef<number | null>(null)
  const stopFormDirtyRef = useRef(false)
  const prevSelectedNodeIdRef = useRef<number | null>(null)

  const selectedNode = selectedNodeId != null ? editor.manager.getNodeById(selectedNodeId) : null
  const showStopEditPanel =
    selectedNode?.type === 'stop' && (editorMode === 'select' || editorMode === 'addStop')

  const resolveRouteStopSeq = useCallback(
    (zh: string, en: string, explicitSeq?: number): number | null => {
      if (explicitSeq != null && explicitSeq > 0) return explicitSeq
      if (!drawRouteId.trim()) return null
      return findDrawRouteStopSeq(drawRouteId, drawDirectionIndex, zh, en)
    },
    [drawDirectionIndex, drawRouteId],
  )

  useEffect(() => {
    if (selectedNodeId !== prevSelectedNodeIdRef.current) {
      stopFormDirtyRef.current = false
      prevSelectedNodeIdRef.current = selectedNodeId
    }
    if (selectedNodeId == null) {
      setEditChiName('')
      setEditEngName('')
      setEditCornerRadius(0)
      setEditStopSeq('')
      setEditLabelPosition('top')
      return
    }
    const node = editor.manager.getNodeById(selectedNodeId)
    if (!node) return
    if (!stopFormDirtyRef.current) {
      setEditChiName(node.chi_name)
      setEditEngName(node.eng_name)
      setEditCornerRadius(node.cornerRadius)
    }
    if (node.type === 'stop') {
      if (!stopFormDirtyRef.current) {
        if (node.stopSeq != null && node.stopSeq > 0) {
          setEditStopSeq(String(node.stopSeq))
        } else {
          const suggestedSeq = resolveRouteStopSeq(node.chi_name, node.eng_name)
          if (suggestedSeq != null) {
            editor.updateNode(selectedNodeId, { stopSeq: suggestedSeq })
            setEditStopSeq(String(suggestedSeq))
          } else {
            setEditStopSeq('')
          }
        }
      }
      setEditLabelPosition(node.labelPosition)
      return
    }
    if (!stopFormDirtyRef.current) {
      setEditStopSeq('')
    }
    setEditLabelPosition('top')
  }, [editor, editor.manager, resolveRouteStopSeq, selectedNodeId])

  useEffect(() => {
    if (!isLoggedIn) return
    void loadWorldMapStopCatalog()
      .then(setStopCatalog)
      .catch(() => setStopCatalog([]))
  }, [isLoggedIn])

  useEffect(() => {
    if (!imageSize) return
    const prev = prevImageSizeRef.current
    if (prev && (prev.width !== imageSize.width || prev.height !== imageSize.height)) {
      editor.manager.rescaleNodes(imageSize.width / prev.width, imageSize.height / prev.height)
    }
    prevImageSizeRef.current = imageSize
  }, [editor.manager, imageSize])

  useEffect(() => {
    if (isOverlay || !overlayContext) return
    const handoff = consumeMapDrawRouteHandoff()
    if (handoff) overlayContext.setRouteOverlay(handoff)
  }, [isOverlay, overlayContext])

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
    const scale = imageSize ? mapDrawNodeScaleFactor(imageSize.width, imageSize.height) : 1
    editor.manager.updateConfig({
      showLabelsAlways: showStopLabels,
      labelFontSize: Math.max(8, Math.round(11 * stopLabelScale * scale)),
      showPointLines: true,
      showPointIcons: !exportPngPreview,
      showStopIcons: true,
    })
  }, [editor.manager, exportPngPreview, imageSize, showStopLabels, stopLabelScale])

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
  }, [drawColor, drawDirectionIndex, drawRouteId, editor.line, editor.lineStyle, imageSize])

  const enterEditorMode = useCallback((mode: RouteEditorMode) => {
    setEditorMode(mode)
    if (mode === 'addStop') {
      setNewStopChiName('')
      setNewStopEngName('')
      pendingNewStopSeqRef.current = null
      lastPlacedStopIdRef.current = null
    }
    if (mode !== 'select') {
      setSelectedNodeId(null)
    }
    if (mode !== 'connectLine') {
      setConnectPendingNodeId(null)
      connectPendingRef.current = null
      setConnectPreview(null)
    }
  }, [])

  const clearMapSelection = useCallback(() => {
    setSelectedNodeId(null)
    setConnectPendingNodeId(null)
    connectPendingRef.current = null
    setConnectPreview(null)
  }, [])

  useEffect(() => {
    connectPendingRef.current = connectPendingNodeId
  }, [connectPendingNodeId])

  const handleSelectNodeClick = useCallback(
    (nodeId: number) => {
      if (editorMode !== 'select') return
      setSelectedNodeId(nodeId)
    },
    [editorMode],
  )

  const handleConnectNodeClick = useCallback(
    (nodeId: number) => {
      if (editorMode !== 'connectLine') return
      const pending = connectPendingRef.current
      if (pending == null) {
        setConnectPendingNodeId(nodeId)
        connectPendingRef.current = nodeId
        return
      }
      if (pending === nodeId) {
        setConnectPendingNodeId(null)
        connectPendingRef.current = null
        setConnectPreview(null)
        return
      }
      editor.addSegment(pending, nodeId, connectCarriageway)
      setConnectPendingNodeId(nodeId)
      connectPendingRef.current = nodeId
      setConnectPreview(null)
    },
    [connectCarriageway, editor, editorMode],
  )

  const segmentPassthrough =
    editorMode === 'addStop' || editorMode === 'addPoint' || showStopEditPanel

  const allowSegmentDelete =
    editorMode !== 'addStop' && editorMode !== 'addPoint' && !showStopEditPanel

  const handleSegmentDoubleClick = useCallback(
    (segmentId: number) => {
      if (!allowSegmentDelete) return
      editor.deleteSegment(segmentId)
    },
    [allowSegmentDelete, editor],
  )

  const applyStopNameSelection = useCallback(
    (selection: MapDrawStopNameSelection) => {
      setEditChiName(selection.zh)
      setEditEngName(selection.en)
      const seq = resolveRouteStopSeq(selection.zh, selection.en, selection.seq)
      if (seq != null && seq > 0) {
        setEditStopSeq(String(seq))
      } else {
        setEditStopSeq('')
      }

      if (selectedNodeId != null) {
        editor.updateNode(selectedNodeId, {
          chi_name: selection.zh,
          eng_name: selection.en,
          stopSeq: seq != null && seq > 0 ? seq : null,
        })
      }

      stopFormDirtyRef.current = false
    },
    [editor, resolveRouteStopSeq, selectedNodeId],
  )

  const applyEditLabelPosition = useCallback(
    (position: RouteEditorLabelPosition) => {
      setEditLabelPosition(position)
      if (selectedNodeId == null) return
      editor.updateNode(selectedNodeId, { labelPosition: position })
    },
    [editor, selectedNodeId],
  )

  const applyNewStopNameSelection = useCallback(
    (selection: MapDrawStopNameSelection) => {
      setNewStopChiName(selection.zh)
      setNewStopEngName(selection.en)
      pendingNewStopSeqRef.current = resolveRouteStopSeq(selection.zh, selection.en, selection.seq)
    },
    [resolveRouteStopSeq],
  )

  const handleMapClick = useCallback(
    (point: WorldMapPoint) => {
      if (!imageSize) return

      const { x, y } = normalizedToPixel(point, imageSize.width, imageSize.height)
      if (editorMode === 'addStop' && !showStopEditPanel) {
        const chi = newStopChiName.trim()
        const eng = newStopEngName.trim()
        const added = editor.addNode('stop', x, y, chi || eng ? { chi_name: chi, eng_name: eng } : undefined)
        const seq =
          pendingNewStopSeqRef.current ?? resolveRouteStopSeq(chi || added.chi_name, eng || added.eng_name)
        if (seq != null) {
          editor.updateNode(added.id, { stopSeq: seq })
          setEditStopSeq(String(seq))
        } else {
          setEditStopSeq('')
        }
        pendingNewStopSeqRef.current = null
        lastPlacedStopIdRef.current = added.id
        setSelectedNodeId(added.id)
        return
      }
      if (editorMode === 'addPoint') {
        editor.addNode('point', x, y)
        return
      }
    },
    [
      editor,
      editorMode,
      imageSize,
      newStopChiName,
      newStopEngName,
      resolveRouteStopSeq,
      showStopEditPanel,
    ],
  )

  const handleMapPointerMove = useCallback(
    (point: WorldMapPoint | null) => {
      if (!imageSize) {
        setPointerPreview(null)
        setConnectPreview(null)
        return
      }
      if (!point) {
        setPointerPreview(null)
        setConnectPreview(null)
        return
      }
      const pixel = normalizedToPixel(point, imageSize.width, imageSize.height)
      if (editorMode === 'connectLine' && connectPendingNodeId != null) {
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
      if (editorMode === 'connectLine' || editorMode === 'select') {
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

  const deleteNodeById = useCallback(
    (nodeId: number) => {
      editor.deleteNode(nodeId)
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null)
        lastPlacedStopIdRef.current = null
        setNewStopChiName('')
        setNewStopEngName('')
        pendingNewStopSeqRef.current = null
      }
      if (connectPendingNodeId === nodeId || connectPendingRef.current === nodeId) {
        setConnectPendingNodeId(null)
        connectPendingRef.current = null
        setConnectPreview(null)
      }
    },
    [connectPendingNodeId, editor, selectedNodeId],
  )

  const deleteSelectedNode = useCallback(() => {
    if (selectedNodeId == null) return
    deleteNodeById(selectedNodeId)
  }, [deleteNodeById, selectedNodeId])

  const saveSelectedNodeEdits = useCallback(() => {
    if (selectedNodeId == null || !selectedNode) return
    const chi = editChiName.trim()
    const eng = editEngName.trim()
    const seqRaw = editStopSeq.trim()
    const parsedSeq = seqRaw ? Number.parseInt(seqRaw, 10) : null
    editor.updateNode(selectedNodeId, {
      chi_name: selectedNode.type === 'stop' ? chi || eng : editChiName,
      eng_name: selectedNode.type === 'stop' ? eng || chi : editEngName,
      cornerRadius: selectedNode.type === 'point' ? editCornerRadius : selectedNode.cornerRadius,
      ...(selectedNode.type === 'stop'
        ? {
            stopSeq:
              parsedSeq != null && Number.isFinite(parsedSeq) && parsedSeq > 0 ? parsedSeq : null,
          }
        : {}),
    })
    stopFormDirtyRef.current = false
    if (editorMode === 'addStop' && selectedNode.type === 'stop') {
      showExportHint(t('mapDrawStopNameApplied'))
      setSelectedNodeId(null)
      lastPlacedStopIdRef.current = null
      setNewStopChiName('')
      setNewStopEngName('')
      pendingNewStopSeqRef.current = null
    }
  }, [
    editChiName,
    editCornerRadius,
    editEngName,
    editStopSeq,
    editor,
    editorMode,
    selectedNode,
    selectedNodeId,
    showExportHint,
    t,
  ])

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
        merged.routeId || drawRouteId || selection.exportBaseName,
        [],
        overlayRouteId,
      )
      if (!resolvedRouteId) {
        showExportHint(t('islandMapDrawExportNeedFileName'))
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
          const segmentLines = routeEditorLineToExportSegmentLines(
            editor.line,
            imageSize.width,
            imageSize.height,
            editor.config.showPointLines,
          )
          await exportWorldMapDrawImage(
            {
              mapImageUrl: MAP_URLS[layer],
              routeId: resolvedRouteId,
              points: pointsForExport,
              stops: merged.stops.length > 0 ? merged.stops : sibsDraft.stops,
              legStarts: [0],
              legHidden: [],
              pathUserBends: [],
              segmentLines,
              strokeColor: drawColor,
              strokeWidth: editor.lineStyle.width,
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
          resolvedRouteId,
          merged.directionIndex ?? drawDirectionIndex,
          pointsForExport,
          merged.stops.length > 0 ? merged.stops : sibsDraft.stops,
          overlayRouteId,
          selection,
          {},
          merged.stops.length > 0 ? sibsDraft.pathNodes : [],
          sibsDraft.editorGraph,
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
      editor.config.showPointLines,
      editor.line,
      editor.lineStyle.width,
      imageSize,
      layer,
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

      const importSourceCount = files.length + referenceJsonTexts.length
      const shouldReplaceCanvas = importSourceCount === 1

      const referenceLine = mergeReferenceJsonFiles(referenceJsonTexts)
      const merged = files.length > 0 ? mergeImportedDrawFiles(files, resolution, sibsDraft?.stops ?? []) : null

      const importLines: RouteEditorLine[] = []
      if (referenceLine) {
        importLines.push(referenceLine)
      } else if (merged) {
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
        }
      }

      const importLine =
        importLines.length === 0
          ? null
          : importLines.length === 1
            ? importLines[0]!
            : mergeManyRouteEditorLines(importLines)
      if (!importLine) {
        showExportHint(t('islandMapDrawImportInvalid'))
        return
      }

      if (shouldReplaceCanvas) {
        editor.replaceFromImport(importLine, merged?.kind === 'route' ? importLine.name : undefined)
      } else {
        editor.mergeFromImport(importLine, merged?.kind === 'route' ? importLine.name : undefined)
      }

      const fitPoints = importLine.nodes.map(
        (node) => [node.x / imageSize.width, node.y / imageSize.height] as WorldMapPoint,
      )
      if (fitPoints.length >= 2) {
        setMapView(
          fitNormalizedViewToRoutePoints(fitPoints, 'fullscreen', 0.08, {
            min: DRAW_MIN_ZOOM_RATIO,
            max: DRAW_MAX_ZOOM_RATIO,
          }),
        )
      }

      setSelectedNodeId(null)
      setConnectPendingNodeId(null)
      setConnectPreview(null)
      setEditorMode('select')

      if (merged?.kind === 'catalog') {
        showExportHint(
          t('mapDrawImportMergeDone', {
            stops: importLine.nodes.filter((node: RouteEditorNode) => node.type === 'stop').length,
            segments: importLine.segments.length,
          }),
        )
        return
      }
      if (merged?.kind === 'route') {
        showExportHint(
          t('mapDrawImportMergeDone', {
            stops: importLine.nodes.filter((node: RouteEditorNode) => node.type === 'stop').length,
            segments: importLine.segments.length,
          }),
        )
        return
      }
      showExportHint(
        t('mapDrawImportMergeDone', {
          stops: importLine.nodes.filter((node: RouteEditorNode) => node.type === 'stop').length,
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
        if (editorMode === 'connectLine' && connectPendingNodeId != null) {
          clearMapSelection()
          return
        }
        if (editorMode === 'select' && selectedNodeId != null) {
          setSelectedNodeId(null)
          return
        }
        if (editorMode !== 'select') {
          enterEditorMode('select')
        }
        return
      }
      if (event.key === 'Delete' && editorMode === 'select' && selectedNodeId != null) {
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
  }, [
    clearMapSelection,
    connectPendingNodeId,
    deleteSelectedNode,
    editor,
    editorMode,
    enterEditorMode,
    isLoggedIn,
    selectedNodeId,
  ])

  const statusMode =
    editorMode === 'select'
      ? t('mapDrawStatusSelect')
      : editorMode === 'connectLine'
        ? connectPendingNodeId != null
          ? t('mapDrawStatusConnectPending')
          : t('mapDrawStatusConnectLine')
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

  const node = (
    <div
      className={`route-editor-app${isOverlay ? ' route-editor-app--overlay' : ''}${mapDrawMode ? ' route-editor-app--draw-mode' : ''}${exportPngPreview ? ' route-editor-app--export-preview' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      <header className="route-editor-header">
        <div className="route-editor-header-left">
          <h1 className="route-editor-title">{t('mapDrawPageTitle')}</h1>
          {isOverlay ? null : <p className="route-editor-subtitle">{t('mapDrawPageSubtitle')}</p>}
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
          {isOverlay ? (
            <button type="button" className="route-editor-btn route-editor-back" onClick={onClose}>
              {t('mapDrawOverlayClose')}
            </button>
          ) : (
            <a className="route-editor-btn route-editor-back" href="./routes.html">
              {t('mapDrawPageBack')}
            </a>
          )}
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
                  <button type="button" className={`route-editor-btn${editorMode === 'connectLine' ? ' route-editor-btn--active' : ''}`.trim()} onClick={() => enterEditorMode('connectLine')}>
                    {t('mapDrawModeConnectLine')}
                  </button>
                  {editorMode === 'connectLine' ? (
                    <div className="route-editor-btn-row">
                      <button
                        type="button"
                        className={`route-editor-btn${connectCarriageway === 'single' ? ' route-editor-btn--active' : ''}`.trim()}
                        onClick={() => setConnectCarriageway('single')}
                      >
                        {t('mapDrawConnectSingle')}
                      </button>
                      <button
                        type="button"
                        className={`route-editor-btn${connectCarriageway === 'dual' ? ' route-editor-btn--active' : ''}`.trim()}
                        onClick={() => setConnectCarriageway('dual')}
                      >
                        {t('mapDrawConnectDual')}
                      </button>
                    </div>
                  ) : null}
                  {selectedNodeId != null && (editorMode === 'select' || editorMode === 'addStop') ? (
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
                <label className="island-map-draw-stop-label-check">
                  <input
                    type="checkbox"
                    checked={exportPngPreview}
                    onChange={(event) => setExportPngPreview(event.target.checked)}
                  />
                  <span>{t('mapDrawExportPngPreview')}</span>
                </label>
              </section>

              <section className="route-editor-panel">
                {showStopEditPanel && selectedNode ? (
                  <div className="reference-node-info-panel">
                    <h4>{t('mapDrawNodeInfoStop')}</h4>
                    <MapDrawStopNameFields
                      chiName={editChiName}
                      engName={editEngName}
                      routeId={drawRouteId}
                      directionIndex={drawDirectionIndex}
                      catalog={stopCatalog}
                      chiPlaceholder={t('mapDrawAddStopChiPlaceholder')}
                      engPlaceholder={t('mapDrawAddStopEngPlaceholder')}
                      onChiNameChange={(value) => {
                        stopFormDirtyRef.current = true
                        setEditChiName(value)
                      }}
                      onEngNameChange={(value) => {
                        stopFormDirtyRef.current = true
                        setEditEngName(value)
                      }}
                      onSelectSuggestion={applyStopNameSelection}
                      onEnter={saveSelectedNodeEdits}
                    />
                    <label className="route-editor-field">
                      <span>{t('mapDrawStopSeqLabel')}</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={editStopSeq}
                        placeholder={t('mapDrawStopSeqPlaceholder')}
                        onChange={(event) => {
                          stopFormDirtyRef.current = true
                          setEditStopSeq(event.target.value)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            saveSelectedNodeEdits()
                          }
                        }}
                      />
                    </label>
                    <MapDrawStopLabelPositionPicker
                      value={editLabelPosition}
                      onChange={applyEditLabelPosition}
                    />
                    <p className="island-map-draw-help">
                      X: {selectedNode.x}, Y: {selectedNode.y}
                    </p>
                    <button type="button" className="route-editor-btn route-editor-btn--primary" onClick={saveSelectedNodeEdits}>
                      {t('mapDrawNodeSave')}
                    </button>
                    {editorMode === 'addStop' ? (
                      <p className="island-map-draw-help">{t('mapDrawAddStopAfterPlaceHelp')}</p>
                    ) : null}
                  </div>
                ) : editorMode === 'select' && selectedNode?.type === 'point' ? (
                  <div className="reference-node-info-panel">
                    <h4>{t('mapDrawNodeInfoPoint')}</h4>
                    <label className="route-editor-field">
                      <span>{t('mapDrawNodeCornerRadius')}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editCornerRadius}
                        onChange={(event) => setEditCornerRadius(Number(event.target.value) || 0)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            saveSelectedNodeEdits()
                          }
                        }}
                      />
                    </label>
                    <p className="island-map-draw-help">
                      X: {selectedNode.x}, Y: {selectedNode.y}
                    </p>
                    <button type="button" className="route-editor-btn route-editor-btn--primary" onClick={saveSelectedNodeEdits}>
                      {t('mapDrawNodeSave')}
                    </button>
                  </div>
                ) : editorMode === 'addStop' ? (
                  <div className="reference-node-info-panel">
                    <h4>{t('mapDrawAddStopNames')}</h4>
                    <MapDrawStopNameFields
                      chiName={newStopChiName}
                      engName={newStopEngName}
                      routeId={drawRouteId}
                      directionIndex={drawDirectionIndex}
                      catalog={stopCatalog}
                      chiPlaceholder={t('mapDrawAddStopChiPlaceholder')}
                      engPlaceholder={t('mapDrawAddStopEngPlaceholder')}
                      onChiNameChange={setNewStopChiName}
                      onEngNameChange={setNewStopEngName}
                      onSelectSuggestion={applyNewStopNameSelection}
                    />
                    <p className="island-map-draw-help">{t('mapDrawAddStopHelp')}</p>
                  </div>
                ) : editorMode === 'connectLine' && connectPendingNodeId != null ? (
                  <p className="island-map-draw-help">{t('mapDrawConnectPendingHint')}</p>
                ) : editorMode === 'connectLine' ? (
                  <p className="island-map-draw-help">{t('mapDrawConnectLineHint')}</p>
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
              drawInteraction={
                editorMode === 'addStop'
                  ? 'route'
                  : editorMode === 'addPoint'
                    ? 'path-node'
                    : 'route'
              }
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
                      onNodeClick:
                        editorMode === 'select'
                          ? handleSelectNodeClick
                          : editorMode === 'connectLine'
                            ? handleConnectNodeClick
                            : undefined,
                      onSegmentDoubleClick: handleSegmentDoubleClick,
                      segmentPassthrough,
                      allowSegmentDelete,
                      showSegmentOverlapCounts: true,
                      connectCarriageway,
                      onNodeDoubleClick: deleteNodeById,
                      onBackgroundClick:
                        editorMode === 'connectLine'
                          ? clearMapSelection
                          : editorMode === 'select'
                            ? () => setSelectedNodeId(null)
                            : undefined,
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
  )

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
        segmentCount={editor.line.segments.length}
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
