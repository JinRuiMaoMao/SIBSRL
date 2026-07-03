import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
import { resolveWorldMapRouteId } from '../data/worldMapRoutes'
import type { WorldMapDrawImportResult } from './worldMapRouteImport'
import { resolveImportedRouteDraft, snapPathNodesOntoPath } from './worldMapDrawPathEdit'
import { worldMapDrawDraftSliceFromImport } from './worldMapDrawMerge'

export interface ImportedDrawFile {
  fileName: string
  parsed: WorldMapDrawImportResult
}

export interface PathConflictEntry {
  fileName: string
  routeId: string
  pointCount: number
}

export interface PathConflictGroup {
  routeId: string
  entries: PathConflictEntry[]
}

export type PathConflictResolution =
  | { kind: 'keepAll' }
  | { kind: 'keepFile'; fileName: string }
  | { kind: 'clearPaths' }

export interface MergedRouteImportDraft {
  routeId: string
  directionIndex: number
  stops: WorldMapDrawStop[]
  points: WorldMapPoint[]
  pathNodes: WorldMapDrawPathNode[]
  legStarts: number[]
  pathLegHidden: boolean[]
  pathUserBends: boolean[]
}

function stopKey(stop: WorldMapDrawStop): string {
  return `${stop.name.zh}|${stop.name.en}|${Math.round(stop.point[0] * 1000)}|${Math.round(stop.point[1] * 1000)}`
}

function mergeStops(stopsLists: readonly WorldMapDrawStop[][]): WorldMapDrawStop[] {
  const merged: WorldMapDrawStop[] = []
  const seen = new Set<string>()
  for (const stops of stopsLists) {
    for (const stop of stops) {
      const key = stopKey(stop)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({
        ...stop,
        id: stop.id || `import-${merged.length}-${Math.random().toString(36).slice(2, 8)}`,
        point: [stop.point[0], stop.point[1]],
        name: { ...stop.name },
      })
    }
  }
  return merged
}

function pathsEquivalent(left: readonly WorldMapPoint[], right: readonly WorldMapPoint[]): boolean {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]!
    const b = right[index]!
    if (Math.abs(a[0] - b[0]) > 0.001 || Math.abs(a[1] - b[1]) > 0.001) return false
  }
  return true
}

function routePathFromParsed(parsed: Extract<WorldMapDrawImportResult, { kind: 'route' }>): WorldMapPoint[] {
  if (parsed.points.length >= 2) return parsed.points.map((point) => [point[0], point[1]] as WorldMapPoint)
  return []
}

export function detectPathConflicts(files: readonly ImportedDrawFile[]): PathConflictGroup | null {
  const routeFiles = files.filter(
    (file): file is ImportedDrawFile & { parsed: Extract<WorldMapDrawImportResult, { kind: 'route' }> } =>
      file.parsed.kind === 'route' && routePathFromParsed(file.parsed).length >= 2,
  )
  if (routeFiles.length < 2) return null

  const byRoute = new Map<string, typeof routeFiles>()
  for (const file of routeFiles) {
    const canonical = resolveWorldMapRouteId(file.parsed.routeId) ?? file.parsed.routeId.trim()
    if (!canonical) continue
    const group = byRoute.get(canonical) ?? []
    group.push(file)
    byRoute.set(canonical, group)
  }

  for (const [routeId, group] of byRoute) {
    if (group.length < 2) continue
    const reference = routePathFromParsed(group[0]!.parsed)
    const hasConflict = group.some((file) => !pathsEquivalent(reference, routePathFromParsed(file.parsed)))
    if (!hasConflict) continue
    return {
      routeId,
      entries: group.map((file) => ({
        fileName: file.fileName,
        routeId,
        pointCount: routePathFromParsed(file.parsed).length,
      })),
    }
  }

  return null
}

function routeDraftFromParsed(
  parsed: Extract<WorldMapDrawImportResult, { kind: 'route' }>,
): MergedRouteImportDraft {
  const imported = resolveImportedRouteDraft({
    points: parsed.points,
    stops: parsed.stops,
    pathNodes: parsed.pathNodes,
    legStarts: parsed.legStarts,
    pathLegHidden: parsed.pathLegHidden,
    userBendIndices: parsed.userBendIndices,
  })
  return {
    routeId: resolveWorldMapRouteId(parsed.routeId) ?? parsed.routeId.trim(),
    directionIndex: parsed.directionIndex,
    stops: parsed.stops.map((stop) => ({
      ...stop,
      point: [stop.point[0], stop.point[1]] as WorldMapPoint,
      name: { ...stop.name },
    })),
    points: imported.points,
    pathNodes: snapPathNodesOntoPath(imported.points, parsed.pathNodes ?? []),
    legStarts: imported.legStarts,
    pathLegHidden: imported.pathLegHidden,
    pathUserBends: imported.pathUserBends,
  }
}

function pickLongestRouteFile(
  files: readonly (ImportedDrawFile & { parsed: Extract<WorldMapDrawImportResult, { kind: 'route' }> })[],
): (ImportedDrawFile & { parsed: Extract<WorldMapDrawImportResult, { kind: 'route' }> }) | null {
  let best: (ImportedDrawFile & { parsed: Extract<WorldMapDrawImportResult, { kind: 'route' }> }) | null = null
  let bestLength = -1
  for (const file of files) {
    const length = routePathFromParsed(file.parsed).length
    if (length > bestLength) {
      best = file
      bestLength = length
    }
  }
  return best
}

export function mergeImportedDrawFiles(
  files: readonly ImportedDrawFile[],
  resolution: PathConflictResolution | null,
  existingStops: readonly WorldMapDrawStop[] = [],
): MergedRouteImportDraft | { kind: 'catalog'; stops: WorldMapDrawStop[] } | null {
  if (files.length === 0) return null

  const catalogOnly = files.every((file) => file.parsed.kind === 'catalog')
  if (catalogOnly) {
    return {
      kind: 'catalog',
      stops: mergeStops([
        existingStops,
        ...files.map((file) => (file.parsed.kind === 'catalog' ? file.parsed.stops : [])),
      ]),
    }
  }

  const routeFiles = files.filter(
    (file): file is ImportedDrawFile & { parsed: Extract<WorldMapDrawImportResult, { kind: 'route' }> } =>
      file.parsed.kind === 'route',
  )
  const catalogStops = files
    .filter((file) => file.parsed.kind === 'catalog')
    .flatMap((file) => (file.parsed.kind === 'catalog' ? file.parsed.stops : []))

  const allStopLists = [
    ...existingStops,
    ...catalogStops,
    ...routeFiles.flatMap((file) => file.parsed.stops),
  ]
  const mergedStops = mergeStops([allStopLists])

  const conflict = detectPathConflicts(files)
  const effectiveResolution = resolution ?? (conflict ? null : { kind: 'keepAll' as const })

  if (conflict && !effectiveResolution) return null

  let routeId = routeFiles[0]?.parsed.routeId ?? ''
  let directionIndex = routeFiles[0]?.parsed.directionIndex ?? 0
  let points: WorldMapPoint[] = []
  let pathNodes: WorldMapDrawPathNode[] = []
  let legStarts: number[] = [0]
  let pathLegHidden: boolean[] = []
  let pathUserBends: boolean[] = []

  const conflictRouteId = conflict?.routeId
  const conflictGroup = conflictRouteId
    ? routeFiles.filter(
        (file) => (resolveWorldMapRouteId(file.parsed.routeId) ?? file.parsed.routeId) === conflictRouteId,
      )
    : []

  if (effectiveResolution?.kind === 'clearPaths') {
    routeId = conflictRouteId ?? routeId
    directionIndex = conflictGroup[0]?.parsed.directionIndex ?? directionIndex
  } else if (effectiveResolution?.kind === 'keepFile') {
    const chosen = routeFiles.find((file) => file.fileName === effectiveResolution.fileName)
    if (!chosen) return null
    const draft = routeDraftFromParsed(chosen.parsed)
    routeId = draft.routeId
    directionIndex = draft.directionIndex
    points = draft.points
    pathNodes = draft.pathNodes
    legStarts = draft.legStarts
    pathLegHidden = draft.pathLegHidden
    pathUserBends = draft.pathUserBends
  } else {
    const pathSource =
      conflictGroup.length > 0 ? pickLongestRouteFile(conflictGroup) : pickLongestRouteFile(routeFiles)
    if (pathSource) {
      const draft = routeDraftFromParsed(pathSource.parsed)
      routeId = draft.routeId
      directionIndex = draft.directionIndex
      points = draft.points
      pathNodes = draft.pathNodes
      legStarts = draft.legStarts
      pathLegHidden = draft.pathLegHidden
      pathUserBends = draft.pathUserBends
    } else {
      const slice = worldMapDrawDraftSliceFromImport(routeFiles[0]!.parsed)
      routeId = slice.routeId
      directionIndex = slice.directionIndex
    }
  }

  return {
    routeId: resolveWorldMapRouteId(routeId) ?? routeId,
    directionIndex,
    stops: mergeStops([mergedStops]),
    points,
    pathNodes,
    legStarts,
    pathLegHidden,
    pathUserBends,
  }
}
