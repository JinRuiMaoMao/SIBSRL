import { routeEditorLineToExportSegmentLines } from '../routeEditor/routeEditorBridge'
import type { RouteEditorGraphExport, RouteEditorLine } from '../routeEditor/types'
import type { Locale } from '../i18n/types'
import { DEFAULT_ROUTE_PATH_COLOR } from './mapDrawColor'
import { isRouteMapImportStorage } from './routeMapImportBundle'
import type { RouteMapViewerDisplay } from './routeMapViewerDisplay'
import { userBendIndicesToFlags } from './routeMapViewerDisplay'
import { resolveRouteMapDisplayPathPoints } from './routeMapTrajectory'
import { exportWorldMapDrawImage } from './worldMapDrawImageExport'
import {
  buildWorldMapRouteExportPayload,
  downloadWorldMapRouteJson,
  resolveExportBaseName,
} from './worldMapRouteExport'

function readDirectionIndex(entry: unknown): number | null {
  if (typeof entry !== 'object' || entry == null) return null
  const value = (entry as { directionIndex?: unknown }).directionIndex
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.round(value)
}

function directionEntryHasPath(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry == null) return false
  const record = entry as {
    points?: unknown
    editorGraph?: { segments?: unknown[] }
  }
  if (Array.isArray(record.points) && record.points.length >= 2) return true
  if (Array.isArray(record.editorGraph?.segments) && record.editorGraph.segments.length > 0) {
    return true
  }
  return false
}

function buildEditorGraphExport(
  display: RouteMapViewerDisplay,
  imageWidth: number,
  imageHeight: number,
): RouteEditorGraphExport | undefined {
  const ref = display.referenceEditor
  if (!ref || ref.segments.length === 0 || imageWidth <= 0 || imageHeight <= 0) return undefined
  return {
    nodes: ref.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      point: [node.x / imageWidth, node.y / imageHeight],
      ...(node.chi_name ? { chi_name: node.chi_name } : {}),
      ...(node.eng_name ? { eng_name: node.eng_name } : {}),
      ...(node.cornerRadius ? { cornerRadius: node.cornerRadius } : {}),
      ...(node.stopSeq != null && node.stopSeq > 0 ? { stopSeq: node.stopSeq } : {}),
      ...(node.labelPosition && node.labelPosition !== 'top' ? { labelPosition: node.labelPosition } : {}),
    })),
    segments: ref.segments.map((segment) => ({
      from: segment.fromNodeId,
      to: segment.toNodeId,
    })),
  }
}

function resolveRouteMapPathColor(display: RouteMapViewerDisplay): string {
  return (
    display.strokeColor ??
    display.referenceEditor?.lineStyle.color ??
    DEFAULT_ROUTE_PATH_COLOR
  )
}

function resolveExportPathPoints(
  display: RouteMapViewerDisplay,
  imageSize?: { width: number; height: number } | null,
): RouteMapViewerDisplay['points'] {
  if (imageSize) {
    const sampled = resolveRouteMapDisplayPathPoints(display, imageSize)
    if (sampled.length >= 2) return [...sampled]
  }
  return display.points.length >= 2 ? [...display.points] : []
}

function buildPayloadFromDisplay(
  routeId: string,
  directionIndex: number,
  display: RouteMapViewerDisplay,
  imageSize?: { width: number; height: number } | null,
): object | null {
  const exportPoints = resolveExportPathPoints(display, imageSize)
  const hasEditorGraph = Boolean(display.referenceEditor?.segments.length)
  if (exportPoints.length < 2 && display.stops.length === 0 && display.pathNodes.length === 0 && !hasEditorGraph) {
    return null
  }

  const width = imageSize?.width ?? 4000
  const height = imageSize?.height ?? 4000

  return buildWorldMapRouteExportPayload(
    display.routeNumber,
    directionIndex,
    exportPoints,
    display.stops,
    routeId,
    {
      includeStops: true,
      includePathNodes: true,
      includePath: true,
      includeImage: false,
      exportBaseName: '',
    },
    {
      pathLegHidden: display.pathLegHidden,
      userBendIndices: display.userBendIndices,
    },
    display.pathNodes,
    buildEditorGraphExport(display, width, height),
  )
}

export function buildRouteMapDownloadJsonPayload(
  routeId: string,
  directionIndex: number,
  display: RouteMapViewerDisplay | null,
  importPayload: unknown | null,
  imageSize?: { width: number; height: number } | null,
): object | null {
  if (display) {
    const fromDisplay = buildPayloadFromDisplay(routeId, directionIndex, display, imageSize)
    if (fromDisplay) return fromDisplay
  }

  if (importPayload && isRouteMapImportStorage(importPayload)) {
    const entry = importPayload.directions.find(
      (direction) => readDirectionIndex(direction) === directionIndex,
    )
    if (entry && directionEntryHasPath(entry)) {
      return {
        routeId: importPayload.routeId,
        ...(typeof importPayload.note === 'string' && importPayload.note.trim()
          ? { note: importPayload.note.trim() }
          : {}),
        directions: [entry],
      }
    }
  }

  if (importPayload && typeof importPayload === 'object') {
    return importPayload
  }

  return null
}

export function downloadRouteMapJson(
  routeId: string,
  directionIndex: number,
  display: RouteMapViewerDisplay | null,
  importPayload: unknown | null,
  imageSize?: { width: number; height: number } | null,
): boolean {
  const payload = buildRouteMapDownloadJsonPayload(
    routeId,
    directionIndex,
    display,
    importPayload,
    imageSize,
  )
  if (!payload) return false
  const baseName = resolveExportBaseName('', routeId || display?.routeNumber || 'route')
  const suffix = directionIndex > 0 ? `-dir${directionIndex}` : ''
  if ('routeId' in payload && typeof (payload as { routeId?: string }).routeId === 'string') {
    downloadWorldMapRouteJson(payload as Parameters<typeof downloadWorldMapRouteJson>[0], `${baseName}${suffix}`)
    return true
  }
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${baseName}${suffix}.json`
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}

async function downloadStaticImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('image fetch failed')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

function resolvePngSegmentLines(
  display: RouteMapViewerDisplay,
  imageSize: { width: number; height: number },
  pathPoints: readonly RouteMapViewerDisplay['points'][number][],
): ReturnType<typeof routeEditorLineToExportSegmentLines> {
  if (pathPoints.length >= 2) return []

  const ref = display.referenceEditor
  if (!ref) return []

  const editorLine: RouteEditorLine = {
    id: 1,
    name: display.routeNumber,
    nodes: [...ref.nodes],
    segments: [...ref.segments],
  }

  return routeEditorLineToExportSegmentLines(
    editorLine,
    imageSize.width,
    imageSize.height,
    true,
  )
}

export async function downloadRouteMapPng(options: {
  routeId: string
  directionIndex: number
  display: RouteMapViewerDisplay | null
  mapImageUrl: string
  locale: Locale
  staticImageUrl?: string | null
  imageSize?: { width: number; height: number } | null
}): Promise<boolean> {
  const baseName = resolveExportBaseName('', options.routeId || options.display?.routeNumber || 'route')
  const suffix = options.directionIndex > 0 ? `-dir${options.directionIndex}` : ''
  const filename = `${baseName}${suffix}.png`

  if (options.staticImageUrl && !options.display) {
    await downloadStaticImage(options.staticImageUrl, filename)
    return true
  }

  if (!options.display || !options.imageSize) return false

  const { display, imageSize } = options
  const pathPoints = resolveExportPathPoints(display, imageSize)
  const segmentLines = resolvePngSegmentLines(display, imageSize, pathPoints)

  await exportWorldMapDrawImage(
    {
      mapImageUrl: options.mapImageUrl,
      routeId: options.routeId || display.routeNumber,
      points: pathPoints,
      stops: display.stops,
      legStarts: pathPoints.length >= 2 ? [0] : display.legStarts,
      legHidden: pathPoints.length >= 2 ? [] : display.pathLegHidden,
      pathUserBends:
        pathPoints.length >= 2
          ? []
          : userBendIndicesToFlags(display.userBendIndices, display.points.length),
      segmentLines,
      strokeColor: resolveRouteMapPathColor(display),
      strokeWidth: display.referenceEditor?.lineStyle.width,
      showStopLabels: true,
      stopLabelScale: 1,
      locale: options.locale,
    },
    `${baseName}${suffix}`,
  )
  return true
}
