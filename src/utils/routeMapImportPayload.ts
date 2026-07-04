import type { WorldMapDrawImportResult } from './worldMapRouteImport'
import { parseWorldMapDrawImportJson } from './worldMapRouteImport'

export type RouteMapImportPayload = Extract<WorldMapDrawImportResult, { kind: 'route' }>

export function parseRouteMapImportPayload(raw: unknown): RouteMapImportPayload | null {
  const parsed = parseWorldMapDrawImportJson(raw)
  return parsed?.kind === 'route' ? parsed : null
}

export function isRouteMapImportPayload(raw: unknown): raw is RouteMapImportPayload {
  return parseRouteMapImportPayload(raw) != null
}
