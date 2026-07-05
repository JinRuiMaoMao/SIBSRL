import type { WorldMapDrawImportResult } from './worldMapRouteImport'
import {
  parseWorldMapDrawImportJson,
  parseWorldMapDrawImportJsonForDirection,
} from './worldMapRouteImport'

export type RouteMapImportPayload = Extract<WorldMapDrawImportResult, { kind: 'route' }>

export function parseRouteMapImportPayload(
  raw: unknown,
  directionIndex?: number,
): RouteMapImportPayload | null {
  const parsed =
    directionIndex != null
      ? parseWorldMapDrawImportJsonForDirection(raw, directionIndex)
      : parseWorldMapDrawImportJson(raw)
  return parsed?.kind === 'route' ? parsed : null
}

export function isRouteMapImportPayload(raw: unknown): raw is RouteMapImportPayload {
  return parseRouteMapImportPayload(raw) != null
}
