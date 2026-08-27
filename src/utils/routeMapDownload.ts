import { routeEditorLineToExportSegmentLines } from '../routeEditor/routeEditorBridge'
import type { RouteEditorGraphExport, RouteEditorLine } from '../routeEditor/types'
import type { Locale } from '../i18n/types'
import { isRouteMapImportStorage } from './routeMapImportBundle'
import type { RouteMapViewerDisplay } from './routeMapViewerDisplay'
import { userBendIndicesToFlags } from './routeMapViewerDisplay'
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

export function buildRouteMapDownloadJsonPayload(
  routeId: string,
  directionIndex: number,
  display: RouteMapViewerDisplay | null,
  importPayload: unknown | null,
  imageSize?: { width: number; height: number } | null,
): object | null {
  if (importPayload && isRouteMapImportStorage(importPayload)) {
    const entry = importPayload.directions.find(
      (direction) => readDirectionIndex(direction) === directionIndex,
    )
    if (entry) {
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

  if (!display) return null

  const width = imageSize?.width ?? 4000
  const height = imageSize?.height ?? 4000

  return buildWorldMapRouteExportPayload(
    display.routeNumber,
    directionIndex,
    display.points,
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
  const editorLine: RouteEditorLine | null = display.referenceEditor
    ? {
        id: 1,
        name: display.routeNumber,
        nodes: [...display.referenceEditor.nodes],
        segments: [...display.referenceEditor.segments],
      }
    : null

  const segmentLines =
    editorLine != null
      ? routeEditorLineToExportSegmentLines(
          editorLine,
          imageSize.width,
          imageSize.height,
          display.referenceEditor?.config.showPointLines ?? false,
        )
      : []

  await exportWorldMapDrawImage(
    {
      mapImageUrl: options.mapImageUrl,
      routeId: options.routeId || display.routeNumber,
      points: display.points,
      stops: display.stops,
      legStarts: display.legStarts,
      legHidden: display.pathLegHidden,
      pathUserBends: userBendIndicesToFlags(display.userBendIndices, display.points.length),
      segmentLines,
      strokeColor: display.strokeColor ?? '#ffffff',
      strokeWidth: display.referenceEditor?.lineStyle.width,
      showStopLabels: true,
      stopLabelScale: 1,
      locale: options.locale,
    },
    `${baseName}${suffix}`,
  )
  return true
}
